const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const normalizers = {
  trim: (s) => s.trim(),
  caseInsensitive: (s) => s.toLowerCase(),
};
const matchers = {
  exact: (sub, val) => sub === val,
  contains: (sub, val) => sub.includes(val),
};
const playerNum = (joinIndex, N) => ((joinIndex - 1) % N) + 1;
const isAdmin = async (uid) => (await db.doc(`admins/${uid}`).get()).exists;
const findComp = (game, id) => {
  for (const st of game.steps || []) for (const c of st.components || []) if (c.id === id) return c;
  return null;
};
const mintCode = (len = 6, alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789") =>
  Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

// ---- instance ledger / lifecycle ----
// Data-gated: only rooms carrying `instanceId` write anything. Rooms without one (dev/legacy) are untouched.
// The ledger lives on the INSTANCE, never on the room, so the listened-to room doc stays tiny.
const instRefOf = (room) => (room && room.instanceId) ? db.doc(`instances/${room.instanceId}`) : null;
const seatName = (room, uid) => (room && room.seats && room.seats[uid] && room.seats[uid].name) || "";
const nowIso = () => new Date().toISOString();
const entry = (room, uid, e) => Object.assign({ t: Date.now(), uid: uid || null, name: seatName(room, uid) }, e);
// one write per instance per transaction (entries may be many, fields optional)
const instLog = (tx, room, uid, entries, fields) => {
  const ref = instRefOf(room); if (!ref) return;
  const upd = Object.assign({ updatedAt: nowIso() }, fields || {});
  if (entries && entries.length) upd.ledger = FieldValue.arrayUnion(...entries.map(e => entry(room, uid, e)));
  tx.set(ref, upd, { merge: true });
};
const instLogDirect = async (room, uid, entries, fields) => {
  const ref = instRefOf(room); if (!ref) return;
  const upd = Object.assign({ updatedAt: nowIso() }, fields || {});
  if (entries && entries.length) upd.ledger = FieldValue.arrayUnion(...entries.map(e => entry(room, uid, e)));
  await ref.set(upd, { merge: true });
};
const instGet = async (tx, room) => {
  const ref = instRefOf(room); if (!ref) return null;
  const s = await tx.get(ref); return s.exists ? s.data() : null;
};
const isFinalElement = (game, elementId) => {
  if (game.finalElement) return game.finalElement === elementId;
  const board = (game.steps || []).find(st => st.kind === "board" && st.chain);
  const chain = (board && board.chain) || [];
  return chain.length > 0 && chain[chain.length - 1] === elementId;
};
const finishFields = (room, points) => ({
  status: "finished", finishedAt: nowIso(), finalPoints: points,
  durationMs: Date.now() - (room.startedAt || Date.now()),
});
// After a finish commits: one coupon per seated player. Idempotent via instance.couponsMinted.
// Coupon shape/size come from config/platform.finishCoupon { pct, days }; defaults 10% / 90 days.
async function mintFinishCoupons(roomCode) {
  try {
    const room = (await db.doc(`rooms/${roomCode}`).get()).data();
    if (!room || !room.instanceId) return;
    const iRef = db.doc(`instances/${room.instanceId}`);
    const inst = (await iRef.get()).data();
    if (!inst || inst.couponsMinted) return;
    const cfg = (((await db.doc("config/platform").get()).data() || {}).finishCoupon) || {};
    const pct = Number(cfg.pct ?? 10), days = Number(cfg.days ?? 90);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const minted = [];
    for (const uid of Object.keys(room.seats || {})) {
      let code = "TT" + mintCode(6);
      for (let i = 0; i < 5 && (await db.doc(`coupons/${code}`).get()).exists; i++) code = "TT" + mintCode(6);
      const c = { code, discountPct: pct, games: 1, expiresAt, ownerUid: uid, source: "finish",
        instanceId: room.instanceId, gameId: inst.gameId || room.gameId || null, createdAt: nowIso(), used: false, usedBy: [] };
      await db.doc(`coupons/${code}`).set(c);
      await db.doc(`users/${uid}`).set({ coupons: FieldValue.arrayUnion({ code, discountPct: pct, expiresAt, used: false, source: "finish" }) }, { merge: true });
      minted.push(code);
    }
    await iRef.set({ couponsMinted: true, coupons: minted }, { merge: true });
  } catch (e) { console.error("mintFinishCoupons", e); }
}

exports.judge = onCall(async (req) => {
  const { action = "submit", gameId, roomCode, stepId, submission, hintIndex, seatId, name, ready, hintKey, outcomeKey } = req.data || {};
  const callerUid = req.auth && req.auth.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "sign in to play");
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");

  const gameSnap = await db.doc(`games/${gameId}`).get();
  if (!gameSnap.exists) throw new HttpsError("not-found", "game not found");
  const game = gameSnap.data();
  const scoring = game.scoring || {};
  const __mode = (r) => (r && r.mode) || "easy";
  const __hintStart = (r) => ((scoring.modes && scoring.modes[__mode(r)] && scoring.modes[__mode(r)].hintStart) || 0);
  const N = game.N || 3;
  const lastStep = (game.steps || []).length - 1;

  // ---- createRoom: no roomCode needed ----
  // ---- listJudged: which elements have answer docs (drives the generic admin test row) ----
  if (action === "listJudged") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const snap = await db.collection(`games/${gameId}/answers`).get();
    const out = {};
    snap.forEach(d => { out[d.id] = d.data().requires || null; });
    return { elements: out };
  }
  // ---- solveUpTo: flag everything before elementId as solved (walks requires chain in answer docs) ----
  if (action === "solveUpTo") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const { elementId } = req.data || {};
    const snap = await db.collection(`games/${gameId}/answers`).get();
    const reqMap = {};
    snap.forEach(d => { reqMap[d.id] = d.data().requires || null; });
    if (!(elementId in reqMap)) throw new HttpsError("not-found", `no answer doc for ${elementId}`);
    const upd = {}; let cur = reqMap[elementId], guard = 0;
    while (cur && guard++ < 20) { upd[`flags.${cur}`] = true; cur = reqMap[cur]; }
    if (Object.keys(upd).length) await roomRef.update(upd);
    return { solved: Object.keys(upd).map(k => k.slice(6)) };
  }
  // ---- installScenes: admin. One step per chain element; shared desk layout parked at the end. ----
  if (action === "installScenes") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const gref = db.doc(`games/${gameId}`);
    const g = (await gref.get()).data();
    if (!g) throw new HttpsError("not-found", "game not found");
    // drop only generated scene steps; preserve end screens (vault, vault2, ...) exactly as authored
    let steps = g.steps.filter(st => !st.el);
    const bIdx = steps.findIndex(st => st.kind === "board");
    const board = steps[bIdx];
    if (!board || !board.chain) throw new HttpsError("failed-precondition", "board with chain required");
    const scenes = board.chain.map(el => ({ id: "sc_" + el, kind: "board", uses: board.id, el }));
    const tail = steps.slice(bIdx + 1);
    steps = [...steps.slice(0, bIdx), ...scenes, ...tail, board];
    await gref.update({ steps });
    return { steps: steps.map(s => s.id) };
  }
  if (action === "patchAnswer") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const { elementId, patch } = req.data || {};
    if (!elementId || !patch) throw new HttpsError("invalid-argument", "elementId and patch required");
    await db.doc(`games/${gameId}/answers/${elementId}`).set(patch, { merge: true });
    return { ok: true, elementId };
  }
  // ---- patchStore: admin. Merge keys into games/{id}.store (testRoom, published toggle lives top-level) ----
  if (action === "patchStore") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const { patch, published } = req.data || {};
    const upd = {};
    if (patch && typeof patch === "object") upd.store = patch;
    if (typeof published === "boolean") upd.published = published;
    if (!Object.keys(upd).length) throw new HttpsError("invalid-argument", "patch or published required");
    await db.doc(`games/${gameId}`).set(upd, { merge: true });
    return { ok: true, gameId, keys: Object.keys(upd.store || {}), published: upd.published };
  }
  if (action === "createRoom") {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let tries = 0; tries < 5; tries++) {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      if (!(await db.doc(`rooms/${code}`).get()).exists) break;
    }
    await db.doc(`rooms/${code}`).set({
      gameId, phase: "lobby", step: 0, points: scoring.start ?? 100,
      startedAt: null, solved: {}, hintsUsed: {}, seats: {}, flags: {}, prog: {},
    });
    return { roomCode: code };
  }

  // ---- admin testing powers ----
  if (action === "peekAnswer") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const aSnap = await db.doc(`games/${gameId}/answers/${stepId}`).get();
    return { answer: aSnap.exists ? aSnap.data() : null };
  }
  if (action === "listRooms") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const qs = await db.collection("rooms").orderBy("startedAt", "desc").limit(50).get().catch(async () =>
      await db.collection("rooms").limit(50).get());
    return { rooms: qs.docs.map(d => { const r = d.data(); return {
      code: d.id, gameId: r.gameId, phase: r.phase, step: r.step, points: r.points,
      startedAt: r.startedAt || null,
      players: Object.values(r.seats || {}).sort((a,b)=>a.joinIndex-b.joinIndex).map(s => s.name),
    }; }) };
  }

  if (!roomCode) throw new HttpsError("invalid-argument", "roomCode required");
  const roomRef = db.doc(`rooms/${roomCode}`);

  if (action === "resetRoom") {
    const room = (await roomRef.get()).data() || {};
    if (!(await isAdmin(callerUid)) && room.buyerUid !== callerUid)
      throw new HttpsError("permission-denied", "admins or the director only");
    const seats = room.seats || {};
    for (const k of Object.keys(seats)) seats[k].ready = false;
    const gdoc = (await db.doc(`games/${gameId}`).get()).data() || {};
    const firstScene = (gdoc.steps || []).findIndex(st => st.el);
    await roomRef.set({
      gameId, phase: firstScene >= 0 ? "play" : "lobby",
      step: firstScene >= 0 ? firstScene : 0,
      points: scoring.start ?? 100,
      startedAt: firstScene >= 0 ? Date.now() : null,
      solved: {}, hintsUsed: {}, seats, flags: {}, prog: {},
    });
    await instLogDirect(room, callerUid, [{ kind: "reset" }], { status: "played", playedAt: nowIso() });
    return { reset: true, step: firstScene >= 0 ? firstScene : 0 };
  }

  if (action === "setStep") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const step = Number(stepId);
    if (!Number.isInteger(step) || step < 0 || step > lastStep)
      throw new HttpsError("invalid-argument", "bad step");
    const g2 = (await db.doc(`games/${gameId}`).get()).data();
    const tgt = g2 && g2.steps && g2.steps[step];
    if (tgt && tgt.el) {
      const b2 = g2.steps.find(st => st.kind === "board" && st.chain) || {};
      const ci = (b2.chain || []).indexOf(tgt.el);
      const flags = {};
      (b2.chain || []).slice(0, Math.max(ci, 0)).forEach(id => { flags[id] = true; });
      await roomRef.update({ step, flags, prog: {}, popup: null });
    } else {
      await roomRef.update({ step });
    }
    return { step };
  }

  // ---- setShape: broadcast a widget's transient shape into shared prog (fish bowl) ----
  if (action === "clearProg") {
    const { elementId } = req.data || {};
    if (!elementId) throw new HttpsError("invalid-argument", "elementId required");
    await roomRef.update({ [`prog.${elementId}`]: [] });
    return { cleared: elementId };
  }

  if (action === "patchComponent") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const { compId, patch } = req.data || {};
    if (!compId || !patch) throw new HttpsError("invalid-argument", "compId and patch required");
    const gref = db.doc(`games/${gameId}`);
    const g = (await gref.get()).data();
    if (!g) throw new HttpsError("not-found", "game not found");
    let hit = false;
    for (const st of g.steps) for (const c of (st.components || [])) {
      if (c.id === compId) { Object.assign(c, patch); hit = true; }
    }
    if (!hit) throw new HttpsError("not-found", `component ${compId} not found`);
    await gref.update({ steps: g.steps });
    return { ok: true, compId };
  }
  if (action === "setShape") {
    const { elementId, shape } = req.data || {};
    if (!elementId || !shape) throw new HttpsError("invalid-argument", "elementId and shape required");
    const ok = ["line","square","triangle"];
    if (!ok.includes(shape)) throw new HttpsError("invalid-argument", "bad shape");
    await roomRef.update({ [`prog.${elementId}_shape`]: shape });
    return { shape };
  }

  // ---- fixFishAnswer: one-time admin. Update fish answer to new shape labels. ----
  if (action === "fixFishAnswer") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    await db.doc(`games/${gameId}/answers/fish`).set({
      type: "sequence",
      value: ["black@line", "blue@square", "yellow@triangle"],
      requires: "uv"
    });
    return { ok: true, value: ["black@line","blue@square","yellow@triangle"] };
  }

  // ---- setFreeplay: admin/testing. When true, judge ignores `requires` so elements can be tested in isolation. ----
  if (action === "setFreeplay") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const on = !!(req.data && req.data.on);
    await roomRef.update({ freeplay: on });
    return { freeplay: on };
  }
  // ---- patchBoard: admin. Merge arbitrary top-level keys into the board step (data-not-code). ----
  if (action === "patchBoard") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const patch = (req.data && req.data.patch) || {};
    if (!patch || typeof patch !== "object") throw new HttpsError("invalid-argument", "patch object required");
    const gref = db.doc(`games/${gameId}`);
    const g = (await gref.get()).data();
    if (!g) throw new HttpsError("not-found", "game not found");
    const board = g.steps.find(st => st.kind === "board" && st.chain);
    if (!board) throw new HttpsError("not-found", "board step not found");
    Object.assign(board, patch);
    await gref.update({ steps: g.steps });
    return { ok: true, keys: Object.keys(patch) };
  }
  // ---- setupFish: one-time admin. Adds the P2 colored-buttons component to the board. ----
  if (action === "setupFish") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const gref = db.doc(`games/${gameId}`);
    const g = (await gref.get()).data();
    if (!g) throw new HttpsError("not-found", "game not found");
    const board = g.steps.find(st => st.kind === "board" && st.chain);
    if (!board) throw new HttpsError("not-found", "board step not found");
    board.components = board.components.filter(c => c.id !== "fishbtns");
    board.components.push({
      id: "fishbtns", x: 50, y: 62, w: 26, type: "widget", widget: "fishbtns",
      visibleTo: [2], showWhen: "uv", elementId: "fish",
      name_key: "el.fishbtns.name", caption_key: "el.fishbtns.caption",
      params: { colors: ["black","blue","yellow"], shapeFrom: "fish" }
    });
    await gref.update({ steps: g.steps });
    return { ok: true, components: board.components.length };
  }

  if (action === "join") {
    if (!seatId || !name) throw new HttpsError("invalid-argument", "seatId and name required");
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      const seats = room.seats || {};
      if (!seats[seatId]) {
        const joinIndex = Object.keys(seats).length + 1;
        seats[seatId] = { joinIndex, name, ready: false, lastSeen: Date.now() };
        tx.update(roomRef, { seats });
      } else if (seats[seatId].name !== name) {
        seats[seatId].name = name;
        tx.update(roomRef, { seats });
      }
      return { joinIndex: seats[seatId].joinIndex, player: playerNum(seats[seatId].joinIndex, N) };
    });
  }

  if (action === "ready") {
    if (!seatId) throw new HttpsError("invalid-argument", "seatId required");
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      const seats = room.seats || {};
      if (!seats[seatId]) throw new HttpsError("failed-precondition", "join first");
      seats[seatId].ready = !!ready;
      // start when the READY seats cover every player number 1..N; idle seats (absent director, a dropped
      // phone) never block the table. Absent seats keep their joinIndex and slot in when they arrive.
      const covered = new Set(Object.values(seats).filter((s) => s.ready).map((s) => playerNum(s.joinIndex, N)));
      const upd = { seats };
      let phase = room.phase;
      if (room.phase === "lobby" && covered.size >= N) {
        phase = "play";
        upd.phase = phase;
        upd.startedAt = Date.now();
        instLog(tx, room, callerUid, [{ kind: "start" }], { status: "played", playedAt: nowIso() });
      }
      tx.update(roomRef, upd);
      return { phase };
    });
  }

  if (action === "forceStart") {
    const room = (await roomRef.get()).data() || {};
    if (!(await isAdmin(callerUid)) && room.buyerUid !== callerUid)
      throw new HttpsError("permission-denied", "admins or the director only");
    await roomRef.update({ phase: "play", startedAt: Date.now() });
    await instLogDirect(room, callerUid, [{ kind: "start", forced: true }], { status: "played", playedAt: nowIso() });
    return { phase: "play" };
  }

  if (action === "advance") {
    const fromStep = Number(stepId);
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      let step = room.step || 0;
      if (step === fromStep && step < lastStep) {
        step = step + 1;
        const nxt = game.steps && game.steps[step];
        if (nxt && nxt.kind === "board" && !nxt.el && game.steps[step + 1] && game.steps[step + 1].el) {
          step = step + 1;
          tx.update(roomRef, { step, flags: {}, prog: {}, popup: null });
        } else {
          tx.update(roomRef, { step });
        }
      }
      return { step };
    });
  }

  // ---- hint: per-step (kidnAPPed) or per-element (board) via elementId ----
  if (action === "hint") {
    const elementId = req.data && req.data.elementId;
    const hkey = elementId || stepId;
    if (typeof hintIndex !== "number" || hkey === undefined)
      throw new HttpsError("invalid-argument", "stepId or elementId, and hintIndex required");
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      const used = (room.hintsUsed && room.hintsUsed[hkey]) || 0;
      let points = room.points;
      let charged = false;
      const __hs = __hintStart(room);
      const canShow = hintIndex >= __hs && (hintIndex < used || (hintIndex === used && hintIndex < (scoring.hints || []).length));      if (!canShow) throw new HttpsError("failed-precondition", "hint locked");
      const upd = { popup: { id: Date.now(), kind: "hint", bodyKey: hintKey || null } };
      if (hintIndex === used) {
        points += scoring.hints[hintIndex];
        charged = true;
        upd.points = points;
        upd[`hintsUsed.${hkey}`] = used + 1;
        instLog(tx, room, callerUid, [{ kind: "hint", ref: String(hkey), idx: hintIndex, points: scoring.hints[hintIndex] }]);
      }
      tx.update(roomRef, upd);
      return { points, charged };
    });
  }

  if (action === "skip") {
    if (stepId === undefined) throw new HttpsError("invalid-argument", "stepId required");
    const comps = ((game.steps || [])[Number(stepId)] || {}).components || [];
    const inp = comps.find((c) => c.type === "input");
    const need = ((inp && inp.hints) || []).length;
    if (!need) throw new HttpsError("failed-precondition", "this step cannot be skipped");
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      if (room.solved && room.solved[stepId]) return { skipped: false, step: room.step || 0 };
      const used = (room.hintsUsed && room.hintsUsed[stepId]) || 0;
      if (used < need) throw new HttpsError("failed-precondition", "skip unlocks after all hints are used");
      let step = room.step || 0;
      const upd = { [`solved.${stepId}`]: true, [`skipped.${stepId}`]: true, popup: { id: Date.now(), kind: "skip", bodyKey: "popup.skippedBody" } };
      const target = Math.min(Number(stepId) + 1, lastStep);
      if (target > step) { step = target; upd.step = step; }
      instLog(tx, room, callerUid, [{ kind: "skip", ref: String(stepId) }]);
      tx.update(roomRef, upd);
      return { skipped: true, step };
    });
  }

  // ---- skipElement: board version — flag flips, zero points ----
  if (action === "skipElement") {
    const elementId = req.data && req.data.elementId;
    if (!elementId) throw new HttpsError("invalid-argument", "elementId required");
     // skipElement: advances step like solve; hint count from per-scene texts, gated by hintStart
    // resolve scene by hintEl mapping first (handles split like sc_uv hintEl=lamp, el=uv), fall back to el match — by texts.hintEl
    let sIdx = game.steps.findIndex(st => {
      const tx = (game.texts && game.texts[st.id]) || {};
      return tx.hintEl === elementId;
    });
    if (sIdx < 0) sIdx = game.steps.findIndex(st => st.el === elementId);
    const sceneId = sIdx >= 0 ? game.steps[sIdx].id : null;
    const sceneEl = sIdx >= 0 ? (game.steps[sIdx].el || elementId) : elementId;
    const allHints = (sceneId && game.texts && game.texts[sceneId] && game.texts[sceneId].hints) || [];
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      if (room.flags && room.flags[sceneEl]) return { skipped: false, step: room.step || 0 };
      const visible = allHints.length - __hintStart(room);
      if (visible < 1) throw new HttpsError("failed-precondition", "this element cannot be skipped");
      const used = (room.hintsUsed && room.hintsUsed[elementId]) || 0;
      if (used < visible) throw new HttpsError("failed-precondition", "skip unlocks after all hints are used");
      const upd = {
        [`flags.${sceneEl}`]: true,
        [`prog.${sceneEl}`]: [],
        popup: { id: Date.now(), kind: "skip", bodyKey: "popup.skippedBody", solver: (room.seats && room.seats[callerUid] && room.seats[callerUid].name) || "" },
      };
      if (sIdx >= 0) { const target = sIdx + 1; if (target > (room.step || 0)) upd.step = target; }
      instLog(tx, room, callerUid, [{ kind: "skip", ref: sceneEl }]);
      tx.update(roomRef, upd);
      return { skipped: true, step: upd.step || room.step || 0 };
    });
  }

  // ---- submitElement: board widgets. Types: equals | action | sequence ----
  // sequence = one press per call; progress lives in room.prog, the expected
  // order never leaves the server. Element ids must stay dot-free (FieldPath).
  if (action === "submitElement") {
    const { elementId, value } = req.data || {};
    if (!elementId) throw new HttpsError("invalid-argument", "elementId required");
    const aSnap = await db.doc(`games/${gameId}/answers/${elementId}`).get();
    if (!aSnap.exists) throw new HttpsError("not-found", `no answer for element ${elementId}`);
    const a = aSnap.data();
    const comp = findComp(game, elementId) || {};
    const pts = comp.points || 0;
    const popupKey = comp.popup_key || null;
    const wrongPenalty = comp.wrongPenalty || 0;
    const norm = (x) => String(x).trim().toLowerCase();
    const type = a.type || "equals";

    const __res = await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      const inst = await instGet(tx, room);
      if (room.flags && room.flags[elementId])
        return { correct: true, already: true, points: room.points };
      const sIdx = game.steps.findIndex(st => st.el === elementId);
      if (sIdx >= 0) {
        if (room.step !== sIdx && !room.freeplay)
          throw new HttpsError("failed-precondition", "not available yet");
      } else if (a.requires && !room.freeplay && !(room.flags && room.flags[a.requires])) {
        throw new HttpsError("failed-precondition", "not available yet");
      }
      const solver = (room.seats && room.seats[callerUid] && room.seats[callerUid].name) || "";
      const solve = () => {
        const newPts = room.points + pts;
        tx.update(roomRef, {
          points: newPts,
          step: (sIdx >= 0 ? sIdx + 1 : room.step),
          [`flags.${elementId}`]: true,
          [`prog.${elementId}`]: [],
          popup: { id: Date.now(), kind: "win", bodyKey: popupKey, solver },
        });
        const fin = isFinalElement(game, elementId) && !!inst && inst.status !== "finished";
        const ents = [{ kind: "solve", ref: elementId, points: pts }];
        if (fin) ents.push({ kind: "finish", points: newPts, ms: Date.now() - (room.startedAt || Date.now()) });
        instLog(tx, room, callerUid, ents, fin ? finishFields(room, newPts) : null);
        return { correct: true, complete: true, points: newPts, finished: fin };
      };

      if (type === "equals") {
        if (norm(value) === norm(a.value)) return solve();
        instLog(tx, room, callerUid, [{ kind: "wrong", ref: elementId, points: wrongPenalty || 0 }]);
        if (wrongPenalty) {
          tx.update(roomRef, { points: room.points + wrongPenalty });
          return { correct: false, points: room.points + wrongPenalty };
        }
        return { correct: false, points: room.points };
      }

      if (type === "action") return solve();

      if (type === "sequence") {
        const expected = a.value || [];
        const att = (req.data && req.data.attemptId) || null;
        const storedAtt = (room.prog && room.prog[elementId + "_att"]) || null;
        let prog = (room.prog && room.prog[elementId]) || [];
        if (att && att !== storedAtt) prog = [];
        const idx = prog.length;
        const attWrite = att ? { [`prog.${elementId}_att`]: att } : {};
        if (idx < expected.length && norm(value) === norm(expected[idx])) {
          const next = [...prog, expected[idx]];
          if (next.length >= expected.length) return solve();
          tx.update(roomRef, Object.assign({ [`prog.${elementId}`]: next }, attWrite));
          return { correct: true, progress: next.length, total: expected.length, points: room.points };
        }
        tx.update(roomRef, Object.assign({ [`prog.${elementId}`]: [] }, attWrite));
        return { correct: false, miss: true, progress: 0, total: expected.length, points: room.points };
      }

      throw new HttpsError("failed-precondition", `unknown answer type: ${type}`);
    });
    if (__res && __res.finished) await mintFinishCoupons(roomCode);
    return __res;
  }

  if (action === "submit") {
    if (typeof submission !== "string" || stepId === undefined)
      throw new HttpsError("invalid-argument", "stepId and submission required");
    const aSnap = await db.doc(`games/${gameId}/answers/${stepId}`).get();
    if (!aSnap.exists) throw new HttpsError("not-found", `no answer defined for step ${stepId}`);
    const a = aSnap.data();

    let sub = submission, val = a.value;
    const vals = a.values ? (Array.isArray(a.values) ? a.values : Object.values(a.values)) : null;
    for (const n of a.normalize || ["trim", "caseInsensitive"]) {
      const fn = normalizers[n];
      if (fn) { sub = fn(sub); val = fn(val); }
    }
    const matcher = matchers[a.match || "exact"];
    if (!matcher) throw new HttpsError("failed-precondition", `unknown match type: ${a.match}`);
    const normAll = (x) => { let y = String(x); for (const n of a.normalize || ["trim", "caseInsensitive"]) { const fn = normalizers[n]; if (fn) y = fn(y); } return y; };
    const correct = vals ? vals.some((v) => matcher(sub, normAll(v))) : matcher(sub, val);

    const __res = await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      const inst = await instGet(tx, room);
      let points = room.points;
      let step = room.step || 0;
      const alreadySolved = room.solved && room.solved[stepId];
      let timeBonus = 0;
      let finished = false;

      if (!alreadySolved) {
        if (correct) {
          points += scoring.solve || 0;
          if (String(stepId) === String(game.lastAnswerStep)) {
            const mins = (Date.now() - (room.startedAt || Date.now())) / 60000;
            for (const tb of (scoring.timeBonus || []).sort((x, y) => x.underMin - y.underMin)) {
              if (mins < tb.underMin) { timeBonus = tb.bonus; break; }
            }
            points += timeBonus;
          }
          const upd = { points, [`solved.${stepId}`]: true, popup: { id: Date.now(), kind: "win", bodyKey: outcomeKey || null } };
          const target = Math.min(Number(stepId) + 1, lastStep);
          if (target > step) { step = target; upd.step = step; }
          finished = String(stepId) === String(game.lastAnswerStep) && !!inst && inst.status !== "finished";
          const ents = [{ kind: "solve", ref: String(stepId), points: (scoring.solve || 0) + timeBonus }];
          if (finished) ents.push({ kind: "finish", points, ms: Date.now() - (room.startedAt || Date.now()) });
          instLog(tx, room, callerUid, ents, finished ? finishFields(room, points) : null);
          tx.update(roomRef, upd);
        } else {
          points += scoring.mistake || 0;
          instLog(tx, room, callerUid, [{ kind: "wrong", ref: String(stepId), points: scoring.mistake || 0 }]);
          tx.update(roomRef, { points, popup: { id: Date.now(), kind: "lose" } });
        }
      }
      return { correct, points, timeBonus, step, finished };
    });
    if (__res && __res.finished) await mintFinishCoupons(roomCode);
    return __res;
  }

  throw new HttpsError("invalid-argument", `unknown action: ${action}`);
});

// ---- claimGame: free-launch checkout replacement ----
exports.claimGame = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign in first");

  const { gameId, seatCount, language, claimCode } = req.data || {};
  if (!gameId || !seatCount) throw new HttpsError("invalid-argument", "gameId and seatCount required");

  const gameSnap = await db.doc(`games/${gameId}`).get();
  if (!gameSnap.exists) throw new HttpsError("not-found", "game not found");
  const game = gameSnap.data();
  const store = game.store || {};

  if (!store.freeLaunch) throw new HttpsError("failed-precondition", "this game is not claimable");
  const expected = String(store.claimCode || "").trim().toLowerCase();
  if (!expected || String(claimCode || "").trim().toLowerCase() !== expected)
    throw new HttpsError("permission-denied", "bad claim code");

  const seats = Number(seatCount);
  const allowed = store.seatOptions || [3, 6, 9];
  if (!allowed.includes(seats)) throw new HttpsError("invalid-argument", "bad seat count");

  // mint a room (same alphabet as createRoom)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let tries = 0; tries < 5; tries++) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    if (!(await db.doc(`rooms/${code}`).get()).exists) break;
  }
  const scoring = game.scoring || {};
  await db.doc(`rooms/${code}`).set({
    gameId, phase: "lobby", step: 0, points: scoring.start ?? 100, buyerUid: uid,
    startedAt: null, solved: {}, hintsUsed: {}, seats: {}, flags: {}, prog: {},
  });

  const instRef = db.collection("instances").doc();
  await db.doc(`rooms/${code}`).update({ instanceId: instRef.id });
  await instRef.set({
    gameId, buyerUid: uid, seatCount: seats,
    language: language || game.defaultLanguage || "he",
    code, customization: {}, createdAt: new Date().toISOString(),
  });

  return { instanceId: instRef.id, code };
});

// ---- getInvitePreview: pre-auth peek for the invite signup screen ----
exports.getInvitePreview = onCall(async (req) => {
  const { instanceId, token } = req.data || {};
  if (!instanceId || !token) throw new HttpsError("invalid-argument", "instanceId and token required");
  const invSnap = await db.doc(`instances/${instanceId}/invites/${token}`).get();
  if (!invSnap.exists) throw new HttpsError("not-found", "invite not found");
  const inv = invSnap.data();
  const instSnap = await db.doc(`instances/${instanceId}`).get();
  const inst = instSnap.exists ? instSnap.data() : {};
  return {
    name: inv.name || "",
    email: inv.email || "",
    status: inv.status || "pending",
    gameId: inst.gameId || null,
    language: inst.language || "he",
  };
});

// ---- addSeat: director grows the group, capped at 2x the purchased base ----
exports.addSeat = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign in first");
  const { instanceId } = req.data || {};
  if (!instanceId) throw new HttpsError("invalid-argument", "instanceId required");

  const ref = db.doc(`instances/${instanceId}`);
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "instance not found");
    const inst = snap.data();
    if (inst.buyerUid !== uid) throw new HttpsError("permission-denied", "director only");
    const base = inst.baseSeatCount || inst.seatCount;
    const cap = base * 2;
    if (inst.seatCount >= cap)
      throw new HttpsError("failed-precondition", `seat cap reached (${cap})`);
    tx.update(ref, { baseSeatCount: base, seatCount: inst.seatCount + 1 });
    return { seatCount: inst.seatCount + 1, cap };
  });
});

// ---- archiveInstance: soft delete. Director or admin. Data stays; the portal just stops showing it. ----
exports.archiveInstance = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign in first");
  const { instanceId, restore } = req.data || {};
  if (!instanceId) throw new HttpsError("invalid-argument", "instanceId required");
  const ref = db.doc(`instances/${instanceId}`);
  const inst = (await ref.get()).data();
  if (!inst) throw new HttpsError("not-found", "instance not found");
  if (inst.buyerUid !== uid && !(await isAdmin(uid)))
    throw new HttpsError("permission-denied", "director or admin only");
  const archived = !restore;
  await ref.set({ archived, archivedAt: archived ? nowIso() : null, archivedBy: archived ? uid : null }, { merge: true });
  return { instanceId, archived };
});

// ---- adminCoupon: create / delete coupons. Coupon = { code, discountPct, games, expiresAt, ownerUid|null } ----
exports.adminCoupon = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid || !(await isAdmin(uid))) throw new HttpsError("permission-denied", "admins only");
  const { op, code, discountPct, games, expiresAt, ownerUid } = req.data || {};
  if (op === "delete") {
    if (!code) throw new HttpsError("invalid-argument", "code required");
    await db.doc(`coupons/${String(code).toUpperCase()}`).delete();
    return { deleted: String(code).toUpperCase() };
  }
  if (op === "create") {
    const pct = Number(discountPct);
    const n = Number(games || 1);
    if (!(pct >= 1 && pct <= 100)) throw new HttpsError("invalid-argument", "discountPct 1..100");
    if (!(n >= 1)) throw new HttpsError("invalid-argument", "games >= 1");
    const exp = new Date(expiresAt || 0);
    if (isNaN(exp) || exp.getTime() < Date.now()) throw new HttpsError("invalid-argument", "expiresAt must be a future date");
    let c = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!c) c = "TT" + mintCode(6);
    const ref = db.doc(`coupons/${c}`);
    if ((await ref.get()).exists) throw new HttpsError("already-exists", "coupon code exists");
    const cp = { code: c, discountPct: pct, games: n, expiresAt: exp.toISOString(), ownerUid: ownerUid || null,
      source: "admin", createdBy: uid, createdAt: nowIso(), used: false, usedBy: [] };
    await ref.set(cp);
    if (ownerUid) await db.doc(`users/${ownerUid}`).set({ coupons: FieldValue.arrayUnion({ code: c, discountPct: pct, expiresAt: cp.expiresAt, used: false, source: "admin" }) }, { merge: true });
    return { coupon: cp };
  }
  throw new HttpsError("invalid-argument", "op must be create|delete");
});

// ---- adminOverview: everything the admin page shows, one call, server-side (no client rules needed) ----
exports.adminOverview = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid || !(await isAdmin(uid))) throw new HttpsError("permission-denied", "admins only");
  const [gs, is, us, cs] = await Promise.all([
    db.collection("games").get(), db.collection("instances").get(),
    db.collection("users").get(), db.collection("coupons").get(),
  ]);
  const games = gs.docs.map(d => { const g = d.data(); return {
    id: d.id, published: g.published !== false, store: g.store || {}, stepCount: (g.steps || []).length,
    N: g.N || 3, defaultLanguage: g.defaultLanguage || "he", title_key: g.title_key || null, customizable: (g.customizable || []).length,
  }; });
  const instances = is.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = us.docs.map(d => { const u = d.data(); return {
    uid: d.id, email: u.email || "", displayName: u.displayName || "", nickname: u.nickname || "", avatar: u.avatar || "",
    preferredLanguage: u.preferredLanguage || "", createdAt: u.createdAt || "", instances: u.instances || [], coupons: u.coupons || [],
  }; });
  const coupons = cs.docs.map(d => ({ id: d.id, ...d.data() }));
  const admins = (await db.collection("admins").get()).docs.map(d => d.id);
  return { games, instances, users, coupons, admins };
});
