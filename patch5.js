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
  const gref=doc(db,"games","kidnapped-il");
  const g=(await getDoc(gref)).data();
  const ids=g.steps.map(s=>s.id);
  if(!ids.includes("step_9")) g.steps.push({ id:"step_9", kind:"screen", components:[
    { id:"c1", type:"text", visibleTo:"all", text_key:"s9.text" },
    { id:"c2", type:"cta", visibleTo:"all", label_key:"common.continue", action:"advance" }
  ]});
  if(!ids.includes("step_10")) g.steps.push({ id:"step_10", kind:"puzzle", advanceOnSolve:true, components:[
    { id:"c1", type:"pano",  visibleTo:[1], src:BASE+"/pano-plain.jpg" },
    { id:"c2", type:"input", visibleTo:[1], placeholder_key:"common.answer", hints:["p.h1","p.h2"], demoAnswer:"גיטרה", outcome_key:"p.out" },
    { id:"c3", type:"pano",  visibleTo:[2], src:BASE+"/pano-guitar.jpg" },
    { id:"c4", type:"pano",  visibleTo:[3], src:BASE+"/pano-plain.jpg" }
  ]});
  g.stepCount=g.steps.length;
  await setDoc(gref,g);
  const lref=doc(db,"games","kidnapped-il","locales","he");
  const he=(await getDoc(lref)).data()||{};
  Object.assign(he,{
    "s9.text":"טוב, אנחנו מתקרבים — זה בטוח, לא? עכשיו בואו נתרכז. מה מסתתר מאחורי הדלת?",
    "p.h1":"מצאו את ההבדלים. יש משהו שונה בין התמונות. קדימה, סומכים עליכם.",
    "p.h2":"שחקן 2 הוא השונה. מה רואים אצלו ולא אצל האחרים?",
    "p.out":"מצוין! מצאתם את הגיטרה."
  });
  await setDoc(lref,he);
  console.log("Added storyline + 360 puzzle (steps 9 & 10).");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
