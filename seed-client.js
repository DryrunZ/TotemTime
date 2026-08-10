const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const fs = require("fs");

const firebaseConfig = {
  apiKey: "AIzaSyBQmvVChIFVvL6KImIHyZ5-k-1NiWlmqEo",
  authDomain: "totemtime-357a2.firebaseapp.com",
  projectId: "totemtime-357a2",
  storageBucket: "totemtime-357a2.firebasestorage.app",
  messagingSenderId: "45407463366",
  appId: "1:45407463366:web:5699ef4b82ba279f5ff4c7"
};

const db = getFirestore(initializeApp(firebaseConfig));
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

async function main() {
  const base = "games/haunted-manor";
  await setDoc(doc(db, "games", "haunted-manor"), read(`${base}/game.json`));
  const answers = read(`${base}/answers.json`);
  for (const [k, v] of Object.entries(answers)) {
    if (k.startsWith("_")) continue;
    await setDoc(doc(db, "games", "haunted-manor", "answers", k), v);
  }
  await setDoc(doc(db, "games", "haunted-manor", "locales", "he"), read(`${base}/locales/he.json`));
  await setDoc(doc(db, "games", "haunted-manor", "locales", "en"), read(`${base}/locales/en.json`));
  console.log("✓ Seeded haunted-manor (game + answers + he/en).");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
