#!/usr/bin/env node
// Art of War — patch 1: `reflection` + `counting` components.
//   node patch-aow-1.mjs            (from repo root)
// Anchored: aborts with NO changes if any anchor is missing. Idempotent: skips if already applied.
// Gated on component type, so kidnAPPed / Vault.exe never reach the new code.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MARK = 'AOW:patch1';
const files = { fn: 'functions/index.js', html: 'public/game.html' };
const src = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
if (src.fn.includes(MARK) || src.html.includes(MARK)) { console.log('already applied — nothing to do'); process.exit(0); }

const edits = [
// ---------------- judge: reflect action ----------------
['fn', `  if (action === "advance") {`,
`  // ---- ${MARK} reflect: Art of War. The step's designated writer saves one strategy per chapter.
  // Gated on a component of type "reflection" on the current step. Director/admin may write for an absent player.
  if (action === "reflect") {
    const sIdx = Number(stepId);
    const rc = (((game.steps || [])[sIdx] || {}).components || []).find((c) => c.type === "reflection");
    if (!rc) throw new HttpsError("failed-precondition", "no reflection on this step");
    const text = String((req.data && req.data.text) || "").replace(/\\s+/g, " ").trim().slice(0, rc.maxLength || 200);
    if (text.length < (rc.minLength || 1)) throw new HttpsError("invalid-argument", "too short");
    const admin = await isAdmin(callerUid);
    return await db.runTransaction(async (tx) => {
      const room = (await tx.get(roomRef)).data();
      if (!room) throw new HttpsError("not-found", "room not found");
      if ((room.step || 0) !== sIdx) throw new HttpsError("failed-precondition", "not on this step");
      const ch = String(rc.chapter);
      if (room.refl && room.refl[ch]) return { already: true };
      const seat = room.seats && room.seats[callerUid];
      const pn = seat ? playerNum(seat.joinIndex, N) : 0;
      if (pn !== rc.writer && !admin && room.buyerUid !== callerUid)
        throw new HttpsError("permission-denied", "not your turn to write");
      const refl = { text, by: seatName(room, callerUid), at: nowIso() };
      tx.update(roomRef, { [\`refl.\${ch}\`]: refl });
      // instance copy feeds the oracle + strategies collage. Nested object (not a dotted key): instLog uses set+merge.
      instLog(tx, room, callerUid, [{ kind: "reflect", ref: ch }], { reflections: { [ch]: refl } });
      return { saved: true };
    });
  }

  if (action === "advance") {`],

// ---------------- judge: advance blocked until the reflection exists ----------------
['fn', `      if (step === fromStep && step < lastStep) {
        step = step + 1;`,
`      // ${MARK}: a reflection step only advances once its strategy is saved
      const __rc = (((game.steps || [])[step] || {}).components || []).find((c) => c.type === "reflection");
      if (__rc && !(room.refl && room.refl[String(__rc.chapter)])) return { step, blocked: "reflection" };
      if (step === fromStep && step < lastStep) {
        step = step + 1;`],

// ---------------- client: room.refl into state ----------------
['html', `  S.prog = r.prog || {};\n`, `  S.prog = r.prog || {};\n  S.refl = r.refl || {}; // ${MARK}\n`],

// ---------------- client: render hook ----------------
['html', `app.innerHTML = S.photoScreen ? photoView() : (S.mode==="player" ? playerView() : adminView()); initPanos();`,
         `app.innerHTML = S.photoScreen ? photoView() : (S.mode==="player" ? playerView() : adminView()); initPanos(); aowAfterRender();`],

// ---------------- client: comp() dispatch ----------------
['html', `  if(c.type==="widget") return wcomp(c,inter);\n`,
`  if(c.type==="widget") return wcomp(c,inter);
  if(c.type==="reflection") return aowRefl(c,inter);   // ${MARK}
  if(c.type==="counting") return aowCount(c);\n`],

// ---------------- client: the components ----------------
['html', `function comp(c,inter){`,
`// ===== ${MARK}: Art of War components (reflection, counting). Only reached via their own c.type. =====
const aowEsc = (s)=> String(s==null?"":s).replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let AOW_CAM = null;             // one camera stream for the whole page; reattached after every render
function aowRefl(c,inter){
  const ch=String(c.chapter), r=(S.refl||{})[ch];
  if(r){
    const by=t("refl.by").split("{name}").join(aowEsc(r.by));
    return \`<p class="c-sub" style="margin-top:14px">\${t("refl.saved")}</p><blockquote class="c-quote aow-refl">\${aowEsc(r.text)}<span class="c-quote-who" style="margin:8px 0 0">\${by}</span></blockquote><button class="cta" data-action="advance">\${t("refl.continue")}</button>\`;
  }
  const amWriter = S.player===c.writer || (S.isAdmin && S.mode!=="player");
  if(!amWriter || !inter){
    return \`<p class="c-sub aow-wait">✍️ \${t("refl.waiting").split("{n}").join(c.writer)}</p>\`;
  }
  const max=c.maxLength||120, v=W["refl_"+ch]||"";
  return \`<p class="c-sub" style="margin-top:14px"><b>\${t(c.prompt_key)}</b></p>
    <textarea class="input aow-ta" id="refl_\${ch}" data-ch="\${ch}" maxlength="\${max}" rows="3" placeholder="\${t("refl.placeholder")}">\${aowEsc(v)}</textarea>
    <div class="aow-cnt"><span id="reflmsg_\${ch}"></span><span id="reflcnt_\${ch}">\${v.length}/\${max}</span></div>
    <button class="cta" data-reflsave="\${ch}" data-min="\${c.minLength||1}">\${t("refl.submit")}</button>\`;
}
function aowRng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let x=a; x=Math.imul(x^(x>>>15),x|1); x^=x+Math.imul(x^(x>>>7),x|61); return ((x^(x>>>14))>>>0)/4294967296; }; }
function aowCount(c){
  const p=c.params||{}, ww=p.worldWidth||300, n=p.count||1, size=p.size||16;
  const wPct=size*100/ww, rnd=aowRng(p.seed||1), pts=[];
  for(let i=0;i<n;i++){
    let best=null;
    for(let k=0;k<60;k++){                 // rejection sampling: keep items apart so they are countable
      const x=2+rnd()*(96-wPct), y=6+rnd()*(78-size*0.6);
      const d=pts.reduce((m,q)=>Math.min(m,Math.hypot((q.x-x)*ww/100,(q.y-y))),1e9);
      if(!best||d>best.d) best={x,y,d};
      if(d>size*1.1) break;
    }
    pts.push(best);
  }
  const items=pts.map((q,i)=>\`<img class="aow-item" src="\${p.item}" alt="" draggable="false" data-emoji="\${aowEsc(p.emoji||"")}" style="left:\${q.x}%;top:\${q.y}%;width:\${wPct}%;--r:\${(i*47%30)-15}deg;--d:\${(i%5)*0.4}s" onerror="this.outerHTML='<span class=&quot;aow-item aow-emo&quot; style=&quot;'+this.getAttribute('style')+';font-size:'+(\${size}*0.75)+'vw&quot;>'+this.dataset.emoji+'</span>'">\`).join("");
  const camBtn = p.camera && !AOW_CAM && !W._aowCamErr ? \`<button class="chip aow-cambtn" data-aowcam>\${t("count.start")}</button>\` : "";
  const err = W._aowCamErr ? \`<p class="c-sub aow-camerr">\${t("count.noCamera")}</p>\` : "";
  return \`<div class="aow-ar"><video class="aow-cam" playsinline muted autoplay></video>
    <div class="aow-scroll" data-aowscroll="\${c.id}"><div class="aow-world" style="width:\${ww}%">\${items}</div></div>
    \${camBtn}\${ww>100?\`<div class="aow-swipe">\${t("count.swipe")}</div>\`:""}</div>\${err}\`;
}
function aowAfterRender(){
  // camera: reattach the live stream to the freshly rendered <video>; stop it once no counting view is on screen
  const vids=document.querySelectorAll("video.aow-cam");
  if(AOW_CAM && !vids.length){ AOW_CAM.getTracks().forEach(tr=>tr.stop()); AOW_CAM=null; }
  vids.forEach(v=>{ if(AOW_CAM){ v.srcObject=AOW_CAM; v.play().catch(()=>{}); v.classList.add("on"); } });
  document.querySelectorAll("[data-aowscroll]").forEach(el=>{ const k="_aowsc_"+el.dataset.aowscroll; if(W[k]) el.scrollLeft=W[k]; el.onscroll=()=>{ W[k]=el.scrollLeft; }; });
  // reflection draft survives room-snapshot re-renders
  const ta=document.querySelector("textarea.aow-ta");
  if(ta && W._aowFocus===ta.id){ ta.focus(); const L=ta.value.length; try{ ta.setSelectionRange(L,L); }catch(e){} }
}
document.addEventListener("input",(e)=>{ const ta=e.target.closest&&e.target.closest("textarea.aow-ta"); if(!ta) return;
  const ch=ta.dataset.ch; W["refl_"+ch]=ta.value; const cn=document.getElementById("reflcnt_"+ch); if(cn) cn.textContent=ta.value.length+"/"+ta.maxLength; });
document.addEventListener("focusin",(e)=>{ if(e.target.matches&&e.target.matches("textarea.aow-ta")) W._aowFocus=e.target.id; });
document.addEventListener("focusout",(e)=>{ const el=e.target; if(!(el.matches&&el.matches("textarea.aow-ta"))) return; setTimeout(()=>{ if(el.isConnected) W._aowFocus=null; },0); });  // removed by a re-render -> keep focus
document.addEventListener("click",(e)=>{
  const cam=e.target.closest("[data-aowcam]");
  if(cam){ e.preventDefault(); cam.disabled=true;
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" }, audio:false })
          .then(s=>{ AOW_CAM=s; render(); }).catch(()=>{ W._aowCamErr=true; render(); })
      : (W._aowCamErr=true, render());
    return; }
  const sv=e.target.closest("[data-reflsave]");
  if(sv){ e.preventDefault();
    const ch=sv.dataset.reflsave, ta=document.getElementById("refl_"+ch), txt=((ta&&ta.value)||"").trim(), min=+sv.dataset.min||1;
    const msg=document.getElementById("reflmsg_"+ch);
    if(txt.length<min){ if(msg) msg.textContent=t("refl.tooShort").split("{min}").join(min); return; }
    sv.disabled=true;
    judge({ action:"reflect", gameId:GAME_ID, roomCode:ROOM_CODE, stepId:S.step, text:txt })
      .then(()=>{ W._aowFocus=null; })
      .catch(err=>{ console.error("reflect failed",err); sv.disabled=false; if(msg) msg.textContent=err.message||"error"; });
    return; }
}, true);
document.head.insertAdjacentHTML("beforeend", \`<style>
.aow-ta{min-height:96px;resize:none;font:inherit;line-height:1.5}
.aow-cnt{display:flex;justify-content:space-between;font-size:12px;color:var(--tt-muted,#999);margin:4px 2px 10px}
.aow-cnt span:first-child{color:#ff8a8a}
.aow-wait{margin-top:18px;padding:14px;border:1px dashed var(--tt-border,#333);border-radius:12px;text-align:center}
.aow-ar{position:relative;height:62vh;max-height:560px;border-radius:16px;overflow:hidden;margin:12px 0;background:radial-gradient(120% 90% at 50% 20%,#2a2f3a,#0b0c10)}
.aow-cam{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}
.aow-cam.on{opacity:1}
.aow-scroll{position:absolute;inset:0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.aow-scroll::-webkit-scrollbar{display:none}
.aow-world{position:relative;height:100%}
.aow-item{position:absolute;height:auto;transform:rotate(var(--r));filter:drop-shadow(0 6px 10px rgba(0,0,0,.55));animation:aowfloat 3.2s ease-in-out var(--d) infinite;pointer-events:none;-webkit-user-select:none;user-select:none;line-height:1;text-align:center}
@keyframes aowfloat{0%,100%{translate:0 0}50%{translate:0 -8px}}
.aow-cambtn{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:2;background:var(--tt-accent,#D0F267);color:#111;font-weight:700}
.aow-swipe{position:absolute;left:0;right:0;top:10px;text-align:center;font-size:12px;color:#fff;text-shadow:0 1px 3px #000;pointer-events:none;opacity:.85}
.aow-camerr{font-size:12px;opacity:.7}
</style>\`);
// ===== /${MARK} =====
function comp(c,inter){`],
];

// ---- apply in memory; abort on any missing/duplicate anchor ----
for (const [k, anchor] of edits) {
  const n = src[k].split(anchor).length - 1;
  if (n !== 1) { console.error(`ABORT: anchor found ${n}x in ${files[k]}:\n${anchor.slice(0, 120)}`); process.exit(1); }
}
for (const [k, anchor, repl] of edits) src[k] = src[k].replace(anchor, () => repl);

// ---- syntax gate before writing anything ----
const tmp = mkdtempSync(join(tmpdir(), 'aow-'));
writeFileSync(join(tmp, 'index.js'), src.fn);
const mod = src.html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!mod) { console.error('ABORT: module script not found in game.html'); process.exit(1); }
writeFileSync(join(tmp, 'game.mjs'), mod[1]);
try {
  execSync(`node --check ${join(tmp, 'index.js')}`, { stdio: 'inherit' });
  execSync(`node --check ${join(tmp, 'game.mjs')}`, { stdio: 'inherit' });
} catch { console.error('ABORT: syntax check failed — nothing written'); process.exit(1); }

writeFileSync(files.fn, src.fn);
writeFileSync(files.html, src.html);
console.log(`✓ patched ${files.fn} and ${files.html} (${edits.length} edits). Syntax OK.`);
