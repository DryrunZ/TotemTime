import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const state = { game: null, locales: {}, lang: "he", player: 1, stepIndex: 0 };
const stage = document.getElementById("stage");
const meta = document.getElementById("meta");
const t = (k) => (state.locales[state.lang] && state.locales[state.lang][k]) || k;
const visible = (c) => c.visibleTo === "all" || (Array.isArray(c.visibleTo) && c.visibleTo.includes(state.player));

async function load() {
  const gs = await getDoc(doc(db, "games", "haunted-manor"));
  if (!gs.exists()) { stage.innerHTML = "<p class='dim'>No game in Firestore yet — run the seed step.</p>"; return; }
  state.game = gs.data();
  for (const l of ["he", "en"]) {
    const ls = await getDoc(doc(db, "games", "haunted-manor", "locales", l));
    state.locales[l] = ls.exists() ? ls.data() : {};
  }
  render();
}

function componentHTML(c) {
  if (c.type === "text")   return `<div class="card">${t(c.text_key)}</div>`;
  if (c.type === "image")  return `<div class="card img">🖼 <span>${t(c.src_key)}</span></div>`;
  if (c.type === "input")  return `<div class="card"><input placeholder="${t(c.hint_key)}"><button>${state.lang==='he'?'שלח':'Submit'}</button></div>`;
  if (c.type === "button") return `<div class="card"><button class="big">${t(c.label_key)}</button></div>`;
  return "";
}

function render() {
  document.documentElement.dir = state.lang === "he" ? "rtl" : "ltr";
  const step = state.game.steps[state.stepIndex];
  meta.textContent = `${t(state.game.title_key)} · ${state.lang==='he'?'שלב':'Step'} ${state.stepIndex+1} · ${state.lang==='he'?'שחקן':'Player'} ${state.player} (N=${state.game.N})`;
  const mine = step.components.filter(visible);
  const others = step.components.filter((c) => !visible(c));
  stage.innerHTML =
    `<h3>${state.lang==='he'?'מה שאתה רואה':'What you see'}</h3>` +
    (mine.map(componentHTML).join("") || "<p class='dim'>—</p>") +
    `<h3 class="muted">${state.lang==='he'?'מוסתר ממך':'Hidden from you'}</h3>` +
    (others.map((c)=>`<div class="ghost">${c.type} → ${Array.isArray(c.visibleTo)?c.visibleTo.join(','):'all'}</div>`).join("") || "<p class='dim'>—</p>");
  document.querySelectorAll("[data-player]").forEach((b)=>b.classList.toggle("on", +b.dataset.player===state.player));
  document.querySelectorAll("[data-lang]").forEach((b)=>b.classList.toggle("on", b.dataset.lang===state.lang));
  document.querySelectorAll("[data-step]").forEach((b)=>b.classList.toggle("on", +b.dataset.step===state.stepIndex));
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-player],[data-lang],[data-step]");
  if (!el) return;
  if (el.dataset.player !== undefined) state.player = +el.dataset.player;
  if (el.dataset.lang !== undefined) state.lang = el.dataset.lang;
  if (el.dataset.step !== undefined) state.stepIndex = +el.dataset.step;
  render();
});

load();
