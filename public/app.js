import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const statusEl = document.getElementById("status");
function show(msg, ok) {
  statusEl.textContent = msg;
  statusEl.className = ok ? "ok" : "err";
}

async function main() {
  if (firebaseConfig.apiKey === "PASTE_ME") {
    show("Paste your Firebase config into config.js, then reload.", false);
    return;
  }
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const ref = doc(db, "_healthcheck", "ping");
    await setDoc(ref, { at: serverTimestamp() });
    const snap = await getDoc(ref);
    show(snap.exists() ? "Firebase connected \u2713  Firestore read/write works." : "Connected, but read returned nothing.", snap.exists());
  } catch (e) {
    show("Connection failed: " + e.message, false);
  }
}
main();
