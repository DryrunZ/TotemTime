const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc } = require("firebase/firestore");
const db = getFirestore(initializeApp({
  apiKey:"AIzaSyBQmvVChIFVvL6KImIHyZ5-k-1NiWlmqEo",
  authDomain:"totemtime-357a2.firebaseapp.com",
  projectId:"totemtime-357a2",
  storageBucket:"totemtime-357a2.firebasestorage.app",
  messagingSenderId:"45407463366",
  appId:"1:45407463366:web:5699ef4b82ba279f5ff4c7"
}));
(async()=>{
  const ref=doc(db,"games","kidnapped-il");
  const g=(await getDoc(ref)).data();
  g.steps.find(s=>s.id==="step_2").components.find(c=>c.id==="c1").visibleTo=[1,2];
  await setDoc(ref,g);
  console.log("Patched: Kabea image now players 1,2 only.");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
