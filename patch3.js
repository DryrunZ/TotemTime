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
  if(!ids.includes("step_5")) g.steps.push({ id:"step_5", kind:"screen", components:[
    { id:"c1", type:"text", visibleTo:"all", text_key:"s5.text" },
    { id:"c2", type:"cta", visibleTo:"all", label_key:"common.continue", action:"advance" }
  ]});
  if(!ids.includes("step_6")) g.steps.push({ id:"step_6", kind:"puzzle", advanceOnSolve:true, components:[
    { id:"c1", type:"image", visibleTo:[1], src:BASE+"/maze1.png" },
    { id:"c2", type:"image", visibleTo:[3], src:BASE+"/maze2.png" },
    { id:"c3", type:"image", visibleTo:[2], src:BASE+"/maze3.png" },
    { id:"c4", type:"input", visibleTo:[2], placeholder_key:"common.answer", hints:["m.h1","m.h2"], demoAnswer:"067781236", outcome_key:"m.out" }
  ]});
  g.stepCount=g.steps.length;
  await setDoc(gref,g);

  const lref=doc(db,"games","kidnapped-il","locales","he");
  const he=(await getDoc(lref)).data()||{};
  Object.assign(he,{
    "s5.text":"וואו, מי הם האנשים המפחידים האלה? המצב נראה מדאיג מאוד. אין ספק שזו דרך מאוד מוזרה להגיד לנו מה הסיסמה לרשתות החברתיות. בואו נראה מה מסתתר שם, בסדר??",
    "m.h1":"מה השם של המבוך? מה מחפשים ברשתות החברתיות?",
    "m.h2":"פתרו את המבוך, וחברו את ה… לפי הסדר.",
    "m.out":"מצוין! מצאתם את המספר."
  });
  await setDoc(lref,he);
  console.log("Added storyline + maze (steps 5 & 6).");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
