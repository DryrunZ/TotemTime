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
const BASE="https://totemtime-357a2.web.app/assets/games/kidnapped-il";
(async()=>{
  const ref=doc(db,"games","kidnapped-il");
  const g=(await getDoc(ref)).data();
  const s4=g.steps.find(s=>s.id==="step_4");
  s4.components.find(c=>c.id==="c1").pauseImage=BASE+"/riddle2-reveal.png";
  s4.components.find(c=>c.id==="c2").demoAnswer="version";
  await setDoc(ref,g);
  console.log("Patched: pause-reveal image + answer=version.");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
