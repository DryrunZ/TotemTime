#!/usr/bin/env node
// Art of War — patch 2: `minigame` component (memory | stars | rps). Client-only.
//   node patch-aow-2.mjs            (from repo root, after patch-aow-1)
// Anchored + idempotent + syntax-gated, same as patch 1.
// A win shows the reward word and is remembered per room in localStorage, so a refresh keeps it.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MARK = 'AOW:patch2';
const file = 'public/game.html';
let html = readFileSync(file, 'utf8');
if (html.includes(MARK)) { console.log('already applied — nothing to do'); process.exit(0); }
if (!html.includes('AOW:patch1')) { console.error('ABORT: run patch-aow-1.mjs first'); process.exit(1); }

const edits = [
['  if(c.type==="counting") return aowCount(c);\n',
 `  if(c.type==="counting") return aowCount(c);\n  if(c.type==="minigame") return aowMini(c,inter);   // ${MARK}\n`],

['// ===== /AOW:patch1 =====',
`// ===== ${MARK}: mini-games. State lives in W (survives room re-renders); a win also in localStorage. =====
const MG_FACES = ["🐉","🏯","⚔️","🏹","🐎","🥠"];
const MG_RPS = ["rock","paper","scissors"], MG_ICON = { rock:"✊", paper:"✋", scissors:"✌️" };
const MG_BEATS = { rock:"scissors", paper:"rock", scissors:"paper" };   // key beats value
const mgKey = (c)=> "tt.mg."+ROOM_CODE+"."+c.id;
function mgState(c){
  if(!W["mg_"+c.id]){
    let won=false; try{ won = localStorage.getItem(mgKey(c))==="1"; }catch(e){}
    W["mg_"+c.id] = { won };
  }
  return W["mg_"+c.id];
}
function mgWin(c){
  const s=mgState(c); s.won=true; s.running=false;
  try{ localStorage.setItem(mgKey(c),"1"); }catch(e){}
  if(navigator.vibrate) try{ navigator.vibrate([60,40,120]); }catch(e){}
  render();
}
function aowMini(c,inter){
  const s=mgState(c), p=c.params||{};
  if(s.won) return \`<div class="mg-won"><p class="c-sub">\${t(c.won_key)}</p><div class="mg-word">\${t(c.reward_key)}</div></div>\`;
  if(!inter) return \`<p class="c-sub">🎮 \${t(c.name_key)}</p>\`;
  if(c.kind==="memory"){
    const pairs=p.pairs||3;
    if(!s.deck){ const f=MG_FACES.slice(0,pairs); s.deck=[...f,...f].sort(()=>Math.random()-.5); s.open=[]; s.done=[]; }
    const cards=s.deck.map((f,i)=>{ const up=s.open.includes(i)||s.done.includes(i);
      return \`<button class="mg-card \${up?"up":""} \${s.done.includes(i)?"done":""}" data-mg="\${c.id}" data-i="\${i}">\${up?f:"?"}</button>\`; }).join("");
    return \`<div class="mg-mem">\${cards}</div>\`;
  }
  if(c.kind==="stars"){
    const target=p.target||5, n=s.caught||0;
    const lbl=t("mg.caught").split("{n}").join(n).split("{of}").join(target);
    return \`<div class="mg-sky" id="mgsky_\${c.id}" data-mgsky="\${c.id}">
      <div class="mg-hud" id="mghud_\${c.id}">\${lbl}</div>
      \${s.running?"":\`<button class="cta mg-go" data-mg="\${c.id}" data-go="1">\${t("mg.start")}</button>\`}</div>\`;
  }
  if(c.kind==="rps"){
    const need=p.wins||2, w=s.wins||0;
    const last = s.last ? \`<div class="mg-rps-last"><span>\${MG_ICON[s.last.me]}</span><small>vs</small><span>\${MG_ICON[s.last.sys]}</span></div>
      <p class="c-sub">\${t(s.last.res==="win"?"mg.youWin":s.last.res==="lose"?"mg.youLose":"mg.draw")}</p>\` : "";
    const btns=MG_RPS.map(k=>\`<button class="mg-rps-btn" data-mg="\${c.id}" data-pick="\${k}"><span>\${MG_ICON[k]}</span>\${t("mg."+k)}</button>\`).join("");
    return \`<div class="mg-rps">\${last}<p class="c-sub mg-score">\${t("mg.score").split("{n}").join(w).split("{of}").join(need)}</p><div class="mg-rps-row">\${btns}</div></div>\`;
  }
  return "";
}
// stars: one global ticker drops a star into whichever running sky is on screen
setInterval(()=>{
  document.querySelectorAll("[data-mgsky]").forEach(sky=>{
    const c=findComp(sky.dataset.mgsky); if(!c) return; const s=mgState(c); if(!s.running||s.won) return;
    const st=document.createElement("button"); st.className="mg-star"; st.textContent="⭐"; st.dataset.mgstar=c.id;
    st.style.left=(6+Math.random()*80)+"%"; st.style.animationDuration=(2.2+Math.random()*1.2)+"s";
    st.addEventListener("animationend",()=>st.remove()); sky.appendChild(st);
  });
}, 650);
document.addEventListener("pointerdown",(e)=>{
  const st=e.target.closest&&e.target.closest("[data-mgstar]"); if(!st) return;
  e.preventDefault(); const c=findComp(st.dataset.mgstar); if(!c) return; const s=mgState(c), target=(c.params||{}).target||5;
  st.remove(); s.caught=(s.caught||0)+1;
  const hud=document.getElementById("mghud_"+c.id); if(hud) hud.textContent=t("mg.caught").split("{n}").join(s.caught).split("{of}").join(target);
  if(s.caught>=target) mgWin(c);
}, true);
document.addEventListener("click",(e)=>{
  const b=e.target.closest&&e.target.closest("[data-mg]"); if(!b) return;
  e.preventDefault(); const c=findComp(b.dataset.mg); if(!c) return; const s=mgState(c), p=c.params||{};
  if(s.won) return;
  if(c.kind==="stars" && b.dataset.go){ s.running=true; s.caught=s.caught||0; render(); return; }
  if(c.kind==="memory"){
    const i=+b.dataset.i; if(s.busy||s.open.includes(i)||s.done.includes(i)) return;
    s.open.push(i);
    if(s.open.length===2){
      const [a,bb]=s.open;
      if(s.deck[a]===s.deck[bb]){ s.done.push(a,bb); s.open=[]; if(s.done.length===s.deck.length){ render(); setTimeout(()=>mgWin(c),500); return; } }
      else { s.busy=true; setTimeout(()=>{ s.open=[]; s.busy=false; render(); },800); }
    }
    render(); return;
  }
  if(c.kind==="rps"){
    const me=b.dataset.pick, pity=p.pityAfter||3;
    let sys=MG_RPS[Math.floor(Math.random()*3)];
    if((s.streak||0)>=pity) sys=MG_BEATS[me];               // pity: nobody gets stuck on luck
    const res = sys===me ? "draw" : (MG_BEATS[me]===sys ? "win" : "lose");
    s.streak = res==="win" ? 0 : (s.streak||0)+1;
    if(res==="win") s.wins=(s.wins||0)+1;
    s.last={ me, sys, res };
    if((s.wins||0)>=(p.wins||2)){ render(); setTimeout(()=>mgWin(c),900); return; }
    render(); return;
  }
}, true);
document.head.insertAdjacentHTML("beforeend", \`<style>
.mg-won{text-align:center;margin:18px 0;padding:22px 12px;border-radius:16px;background:radial-gradient(circle at 50% 30%,rgba(208,242,103,.18),transparent 70%);border:1px solid rgba(208,242,103,.35)}
.mg-word{font-size:44px;font-weight:900;color:var(--tt-accent,#D0F267);letter-spacing:2px;animation:mgpop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes mgpop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
.mg-mem{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
.mg-card{aspect-ratio:3/4;border-radius:14px;border:1px solid var(--tt-border,#333);background:linear-gradient(145deg,#1d2230,#11141b);color:var(--tt-muted,#888);font-size:30px;font-weight:800;cursor:pointer;transition:transform .2s,background .2s;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.mg-card.up{background:#f3ead2;color:#111;font-size:40px;transform:rotateY(0) scale(1.03)}
.mg-card.done{background:var(--tt-accent,#D0F267);opacity:.85}
.mg-sky{position:relative;height:48vh;max-height:420px;margin:14px 0;border-radius:16px;overflow:hidden;background:linear-gradient(#070a1a,#1b1340);touch-action:manipulation}
.mg-hud{position:absolute;top:10px;left:0;right:0;text-align:center;font-weight:800;color:#fff;z-index:2;pointer-events:none}
.mg-go{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:auto;padding-inline:36px;z-index:3}
.mg-star{position:absolute;top:-60px;font-size:40px;line-height:1;padding:10px;background:none;border:0;cursor:pointer;animation:mgfall linear forwards;-webkit-user-select:none;user-select:none;touch-action:manipulation}
@keyframes mgfall{to{transform:translateY(calc(48vh + 80px)) rotate(200deg)}}
.mg-rps{text-align:center;margin:14px 0}
.mg-rps-last{display:flex;justify-content:center;align-items:center;gap:18px;font-size:54px;margin-bottom:4px}
.mg-rps-last small{font-size:14px;color:var(--tt-muted,#888)}
.mg-score{font-weight:700}
.mg-rps-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.mg-rps-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 4px;border-radius:14px;border:1px solid var(--tt-border,#333);background:#161a22;color:inherit;font:inherit;font-size:14px;cursor:pointer;touch-action:manipulation}
.mg-rps-btn span{font-size:36px}
.mg-rps-btn:active{transform:scale(.94);background:#232a36}
</style>\`);
// ===== /${MARK} =====
// ===== /AOW:patch1 =====`],
];

for (const [anchor] of edits) {
  const n = html.split(anchor).length - 1;
  if (n !== 1) { console.error(`ABORT: anchor found ${n}x:\n${anchor.slice(0, 100)}`); process.exit(1); }
}
for (const [anchor, repl] of edits) html = html.replace(anchor, () => repl);

const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/);
const tmp = mkdtempSync(join(tmpdir(), 'aow-'));
writeFileSync(join(tmp, 'game.mjs'), mod[1]);
try { execSync(`node --check ${join(tmp, 'game.mjs')}`, { stdio: 'inherit' }); }
catch { console.error('ABORT: syntax check failed — nothing written'); process.exit(1); }

writeFileSync(file, html);
console.log(`✓ patched ${file} (${edits.length} edits). Syntax OK.`);
