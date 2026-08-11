const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

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

exports.judge = onCall(async (req) => {
  const { action = "submit", gameId, roomCode, stepId, submission, hintIndex, seatId, name, ready, hintKey, outcomeKey } = req.data || {};
  const callerUid = req.auth && req.auth.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "sign in to play");
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");

  const gameSnap = await db.doc(`games/${gameId}`).get();
  if (!gameSnap.exists) throw new HttpsError("not-found", "game not found");
  const game = gameSnap.data();
  const scoring = game.scoring || {};
  const N = game.N || 3;
  const lastStep = (game.steps || []).length - 1;

  // ---- createRoom: no roomCode needed ----
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
    await roomRef.set({
      gameId, phase: "lobby", step: 0, points: scoring.start ?? 100,
      startedAt: null, solved: {}, hintsUsed: {}, seats, flags: {}, prog: {},
    });
    return { reset: true };
  }

  if (action === "setStep") {
    if (!(await isAdmin(callerUid))) throw new HttpsError("permission-denied", "admins only");
    const step = Number(stepId);
    if (!Number.isInteger(step) || step < 0 || step > lastStep)
      throw new HttpsError("invalid-argument", "bad step");
    await roomRef.update({ step });
    return { step };
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
      const covered = new Set(Object.values(seats).map((s) => playerNum(s.joinIndex, N)));
      const allReady = Object.values(seats).every((s) => s.ready);
      const upd = { seats };
      let phase = room.phase;
      if (room.phase === "lobby" && covered.size >= N && allReady) {
        phase = "play";
        upd.phase = phase;
        upd.startedAt = Date.now();
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
        tx.update(roomRef, { step });
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
      const canShow = hintIndex < used || (hintIndex === used && hintIndex < (scoring.hints || []).length);
      if (!canShow) throw new HttpsError("failed-precondition", "hint locked");
      const upd = { popup: { id: Date.now(), kind: "hint", bodyKey: hintKey || null } };
      if (hintIndex === used) {
        points += scoring.hints[hintIndex];
        charged = true;
        upd.points = points;
        upd[`hintsUsed.${hkey}`] = used + 1;
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
      tx.update(roomRef, upd);
      return { skipped: true, step };
    });
  }

  // ---- skipElement: board version — flag flips, zero points ----
  if (action === "skipElement") {
    const elementId = req.data && req.data.elementId;
    if (!elementId) throw new HttpsError("invalid-argument", "elementId required");
    const comp = findComp(game, elementId);
    const need = ((comp && comp.hints) || []).length;
    if (!need) throw new HttpsError("failed-precondition", "this element cannot be skipped");
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      if (room.flags && room.flags[elementId]) return { skipped: false };
      const used = (room.hintsUsed && room.hintsUsed[elementId]) || 0;
      if (used < need) throw new HttpsError("failed-precondition", "skip unlocks after all hints are used");
      tx.update(roomRef, {
        [`flags.${elementId}`]: true,
        [`prog.${elementId}`]: [],
        popup: { id: Date.now(), kind: "skip", bodyKey: "popup.skippedBody" },
      });
      return { skipped: true };
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

    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      if (room.flags && room.flags[elementId])
        return { correct: true, already: true, points: room.points };
      if (a.requires && !(room.flags && room.flags[a.requires]))
        throw new HttpsError("failed-precondition", "not available yet");
      const solver = (room.seats && room.seats[callerUid] && room.seats[callerUid].name) || "";
      const solve = () => {
        tx.update(roomRef, {
          points: room.points + pts,
          [`flags.${elementId}`]: true,
          [`prog.${elementId}`]: [],
          popup: { id: Date.now(), kind: "win", bodyKey: popupKey, solver },
        });
        return { correct: true, complete: true, points: room.points + pts };
      };

      if (type === "equals") {
        if (norm(value) === norm(a.value)) return solve();
        if (wrongPenalty) {
          tx.update(roomRef, { points: room.points + wrongPenalty });
          return { correct: false, points: room.points + wrongPenalty };
        }
        return { correct: false, points: room.points };
      }

      if (type === "action") return solve();

      if (type === "sequence") {
        const expected = a.value || [];
        const prog = (room.prog && room.prog[elementId]) || [];
        const idx = prog.length;
        if (idx < expected.length && norm(value) === norm(expected[idx])) {
          const next = [...prog, expected[idx]];
          if (next.length >= expected.length) return solve();
          tx.update(roomRef, { [`prog.${elementId}`]: next });
          return { correct: true, progress: next.length, total: expected.length, points: room.points };
        }
        tx.update(roomRef, { [`prog.${elementId}`]: [] });
        return { correct: false, miss: true, progress: 0, total: expected.length, points: room.points };
      }

      throw new HttpsError("failed-precondition", `unknown answer type: ${type}`);
    });
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

    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      let points = room.points;
      let step = room.step || 0;
      const alreadySolved = room.solved && room.solved[stepId];
      let timeBonus = 0;

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
          tx.update(roomRef, upd);
        } else {
          points += scoring.mistake || 0;
          tx.update(roomRef, { points, popup: { id: Date.now(), kind: "lose" } });
        }
      }
      return { correct, points, timeBonus, step };
    });
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
