import fs from "fs";
let h = fs.readFileSync("public/game.html", "utf8");
let ok = true;
const step = (name, done, fn) => {
  if (done) { console.log("= " + name + ": already applied"); return; }
  const before = h; h = fn(h);
  if (h === before) { console.error("X " + name + ": NO MATCH"); ok = false; }
  else console.log("+ " + name + ": applied");
};

step("import onSnapshot", h.includes("onSnapshot"), s =>
  s.replace(/import \{ getFirestore, doc, getDoc \}/, "import { getFirestore, doc, getDoc, onSnapshot }"));

step("room listener", h.includes("__roomListener"), s =>
  s.replace(/boot\(\);/,
`// __roomListener: room is the source of truth for step, points, timer
let roomStarted = 0;
onSnapshot(doc(db, "rooms", ROOM_CODE), (snap) => {
  const r = snap.data(); if (!r) return;
  roomStarted = r.startedAt || 0;
  S.points = r.points;
  if (r.step !== undefined && r.step !== S.step) { S.step = r.step; }
  render();
});
setInterval(() => {
  if (!roomStarted) return;
  S.elapsed = Math.floor((Date.now() - roomStarted) / 1000);
  const el = document.getElementById("timer");
  if (el) el.textContent = fmt(S.elapsed);
}, 1000);
boot();`));

step("advance via judge", h.includes('action:"advance"'), s =>
  s.replace(/if\(el\.dataset\.action==="advance"\) nextStep\(\);/,
    'if(el.dataset.action==="advance") judge({ action:"advance", gameId: GAME_ID, roomCode: ROOM_CODE, stepId: String(S.step) }).catch(e=>console.error("advance failed",e));'));

step("win popup no local advance", !/if\(w\) nextStep\(\)/.test(h), s =>
  s.replace(/const w=S\.popup&&S\.popup\.win; S\.popup=null; if\(w\) nextStep\(\); else render\(\);/,
    'S.popup=null; render();'));

if (!ok) { console.error("\nNO MATCH somewhere — file NOT saved."); process.exit(1); }
fs.writeFileSync("public/game.html", h);
console.log("\nAll green — saved.");
