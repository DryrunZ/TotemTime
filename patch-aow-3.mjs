#!/usr/bin/env node
// Art of War — patch 3: the Sun Tzu oracle (LLM finale) + full record keeping.
//   node patch-aow-3.mjs            (from repo root, after patch-aow-1 and -2)
// - New callable `oracle` (separate from judge, so judge never loads the Gemini secret).
//   Runs once per play-through (cached in oracles/{roomCode}, keyed by room.startedAt). Never hangs:
//   any failure returns the fallback cookies from the locale.
// - Records: reflection text + oracle result go to instances/{id} (reflections, oracle) and the ledger.
// - Client: `oracle` component on the finale screen.
// Anchored + idempotent + syntax-gated.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MARK = 'AOW:patch3';
const files = { fn: 'functions/index.js', html: 'public/game.html' };
const src = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
if (src.fn.includes(MARK) || src.html.includes(MARK)) { console.log('already applied — nothing to do'); process.exit(0); }
if (!src.html.includes('AOW:patch2')) { console.error('ABORT: run patch-aow-1.mjs and patch-aow-2.mjs first'); process.exit(1); }

const edits = [
// ---------------- functions: secret import ----------------
['fn', `const { onCall, HttpsError } = require("firebase-functions/v2/https");\n`,
`const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");   // ${MARK}
const GEMINI_KEY = defineSecret("GEMINI_API_KEY");\n`],

// ---------------- functions: reflection text into the ledger ----------------
['fn', `instLog(tx, room, callerUid, [{ kind: "reflect", ref: ch }], { reflections: { [ch]: refl } });`,
       `instLog(tx, room, callerUid, [{ kind: "reflect", ref: ch, text }], { reflections: { [ch]: refl } });  // ${MARK}: text in ledger`],

// ---------------- functions: oracle callable ----------------
['fn', `// ---- claimGame: free-launch checkout replacement ----`,
`// ---- ${MARK} oracle: Art of War finale. Sun Tzu reads the team's 5 strategies and answers with
// encouragement + 2-3 fortune-cookie tips. One Gemini call per play-through (cached, keyed by room.startedAt).
// Data-gated: only games carrying game.oracle. Never hangs: any failure -> locale fallback.
const oracleFallback = (loc, cfg) => ({
  opening: loc["oracle.fallback.opening"] || "",
  perStrategy: [],
  cookies: (cfg.fallback_keys || []).map((k) => loc[k]).filter(Boolean),
});
async function askGemini(system, user, model) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent\`, {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY.value() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    });
    if (!r.ok) throw new Error(\`gemini \${r.status}: \${(await r.text()).slice(0, 300)}\`);
    const j = await r.json();
    const txt = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || "").join("");
    const out = JSON.parse(txt.replace(/^\`\`\`(json)?|\`\`\`$/g, "").trim());
    const str = (x) => typeof x === "string" && x.trim();
    if (!str(out.opening) || !Array.isArray(out.perStrategy) || out.perStrategy.length !== 5 || !out.perStrategy.every(str)
        || !Array.isArray(out.cookies) || out.cookies.length < 2 || !out.cookies.every(str))
      throw new Error("gemini: bad shape " + txt.slice(0, 200));
    return { opening: out.opening.trim(), perStrategy: out.perStrategy.map((s) => s.trim()), cookies: out.cookies.slice(0, 3).map((s) => s.trim()) };
  } finally { clearTimeout(timer); }
}
exports.oracle = onCall({ secrets: [GEMINI_KEY], timeoutSeconds: 60 }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign in to play");
  const { roomCode } = req.data || {};
  if (!roomCode) throw new HttpsError("invalid-argument", "roomCode required");
  const room = (await db.doc(\`rooms/\${roomCode}\`).get()).data();
  if (!room) throw new HttpsError("not-found", "room not found");
  if (!(room.seats && room.seats[uid]) && room.buyerUid !== uid && !(await isAdmin(uid)))
    throw new HttpsError("permission-denied", "players only");
  const game = (await db.doc(\`games/\${room.gameId}\`).get()).data() || {};
  const cfg = game.oracle;
  if (!cfg) throw new HttpsError("failed-precondition", "this game has no oracle");

  const runKey = room.startedAt || null;               // a reset starts a new run -> a new answer
  const ref = db.doc(\`oracles/\${roomCode}\`);
  const claim = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref); const d = s.exists ? s.data() : null;
    if (d && d.runKey === runKey) {
      if (d.status === "ready") return { ready: d };
      if (d.status === "pending" && Date.now() - d.t < 60000) return { pending: true };
    }
    tx.set(ref, { status: "pending", t: Date.now(), runKey, gameId: room.gameId });
    return { go: true };
  });
  if (claim.ready) return { status: "ready", result: claim.ready.result };
  if (claim.pending) return { status: "pending" };

  const lang = room.language || game.defaultLanguage || "he";
  const loc = (await db.doc(\`games/\${room.gameId}/locales/\${lang}\`).get()).data() || {};
  const inst = room.instanceId ? ((await db.doc(\`instances/\${room.instanceId}\`).get()).data() || {}) : {};
  const challenge = String(((inst.customization || {})[cfg.challengeField]) || loc["custom.business_challenge.default"] || "").trim();
  const strategies = (cfg.principles || []).map((p, i) => ({
    n: i + 1, word: loc[p.word_key] || "", quote: loc[p.quote_key] || "",
    plan: (((room.refl || {})[String(p.chapter)]) || {}).text || "",
  }));
  const user = \`Business challenge: \${challenge}\\n\\n\` + strategies.map((s) =>
    \`\${s.n}. Principle "\${s.word}": \${s.quote}\\n   The team's plan: \${s.plan || "(left blank)"}\`).join("\\n\\n");

  const cfgP = (((await db.doc("config/platform").get()).data() || {}).oracle) || {};
  const model = cfgP.model || "gemini-3.8-flash";
  let result, fallback = false, error = null;
  try { result = await askGemini(loc[cfg.system_key] || "", user, model); }
  catch (e) { console.error("oracle", e); error = String(e.message || e).slice(0, 300); result = oracleFallback(loc, cfg); fallback = true; }

  const at = nowIso();
  await ref.set({ status: "ready", result, model, fallback, error, at, runKey, gameId: room.gameId, challenge, strategies });
  // permanent record on the instance + ledger (data-gated: instance rooms only)
  await instLogDirect(room, uid, [{ kind: "oracle", model, fallback, result }],
    { oracle: { result, model, fallback, at, challenge } });
  return { status: "ready", result };
});

// ---- claimGame: free-launch checkout replacement ----`],

// ---------------- client: dispatch ----------------
['html', `  if(c.type==="minigame") return aowMini(c,inter);   // AOW:patch2\n`,
`  if(c.type==="minigame") return aowMini(c,inter);   // AOW:patch2
  if(c.type==="oracle") return aowOracle(c);   // ${MARK}\n`],

// ---------------- client: component ----------------
['html', `// ===== /AOW:patch1 =====`,
`// ===== ${MARK}: oracle (finale). One server call per run; polls while another player's call is in flight. =====
const oracleFn = httpsCallable(getFunctions(fbApp), "oracle", { timeout: 70000 });
function aowOracleFetch(){
  if(W._orBusy) return; W._orBusy=true;
  oracleFn({ roomCode: ROOM_CODE }).then(r=>{
    const d=r.data||{}; W._orBusy=false;
    if(d.status==="ready"){ W._oracle=d.result; render(); }
    else setTimeout(aowOracleFetch, 3000);
  }).catch(e=>{ console.error("oracle", e); W._orBusy=false; W._orErr=true; render(); });
}
function aowOracle(c){
  const res=W._oracle;
  if(!res){
    if(!W._orErr) aowOracleFetch();
    return W._orErr ? \`<p class="c-sub">—</p>\`
      : \`<div class="or-wait"><div class="or-cookie">🥠</div><p class="c-sub">\${t("oracle.loading")}</p></div>\`;
  }
  const pr=(S.game.oracle&&S.game.oracle.principles)||[];
  const cards=pr.map((p,i)=>{
    const mine=((S.refl||{})[String(p.chapter)]||{}).text||"", say=(res.perStrategy||[])[i]||"";
    if(!mine && !say) return "";
    return \`<div class="or-card"><div class="or-word">\${t(p.word_key)}</div>
      \${mine?\`<p class="or-mine">«\${aowEsc(mine)}»</p>\`:""}\${say?\`<p class="or-say">\${aowEsc(say)}</p>\`:""}</div>\`;
  }).join("");
  const cookies=(res.cookies||[]).map((k,i)=>\`<div class="or-fc" style="--d:\${i*0.25}s"><span>🥠</span><p>\${aowEsc(k)}</p></div>\`).join("");
  return \`\${res.opening?\`<blockquote class="c-quote"><span class="c-quote-who">\${t("tzu.who")}</span>\${aowEsc(res.opening)}</blockquote>\`:""}
    \${cards?\`<p class="c-sub or-h">\${t("oracle.strategies")}</p>\${cards}\`:""}
    \${cookies?\`<p class="c-sub or-h">\${t("oracle.cookies")}</p>\${cookies}\`:""}\`;
}
document.head.insertAdjacentHTML("beforeend", \`<style>
.or-wait{text-align:center;margin:40px 0}
.or-cookie{font-size:64px;animation:orwob 1.2s ease-in-out infinite}
@keyframes orwob{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg) scale(1.08)}}
.or-h{margin:22px 0 8px;font-weight:800;color:var(--tt-accent,#D0F267)}
.or-card{border:1px solid var(--tt-border,#2a2a2a);border-radius:14px;padding:12px 14px;margin:8px 0;background:rgba(255,255,255,.03)}
.or-word{font-weight:900;font-size:18px;color:var(--tt-accent,#D0F267);margin-bottom:4px}
.or-mine{margin:0 0 6px;color:var(--tt-muted,#aaa);font-size:14px;line-height:1.45}
.or-say{margin:0;font-size:15px;line-height:1.5}
.or-fc{display:flex;gap:12px;align-items:flex-start;margin:10px 0;padding:14px;border-radius:14px;background:#f3ead2;color:#2a2410;animation:mgpop .5s cubic-bezier(.2,1.6,.4,1) var(--d) both}
.or-fc span{font-size:28px;line-height:1}
.or-fc p{margin:0;font-size:15px;line-height:1.45;font-weight:600}
</style>\`);
// ===== /AOW:patch1 =====`],
];

for (const [k, anchor] of edits) {
  const n = src[k].split(anchor).length - 1;
  if (n !== 1) { console.error(`ABORT: anchor found ${n}x in ${files[k]}:\n${anchor.slice(0, 120)}`); process.exit(1); }
}
for (const [k, anchor, repl] of edits) src[k] = src[k].replace(anchor, () => repl);

const tmp = mkdtempSync(join(tmpdir(), 'aow-'));
writeFileSync(join(tmp, 'index.js'), src.fn);
writeFileSync(join(tmp, 'game.mjs'), src.html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
try {
  execSync(`node --check ${join(tmp, 'index.js')}`, { stdio: 'inherit' });
  execSync(`node --check ${join(tmp, 'game.mjs')}`, { stdio: 'inherit' });
} catch { console.error('ABORT: syntax check failed — nothing written'); process.exit(1); }

writeFileSync(files.fn, src.fn);
writeFileSync(files.html, src.html);
console.log(`✓ patched ${files.fn} and ${files.html} (${edits.length} edits). Syntax OK.`);
