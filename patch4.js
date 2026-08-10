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
  if(!ids.includes("step_7")) g.steps.push({ id:"step_7", kind:"screen", components:[
    { id:"c1", type:"text", visibleTo:"all", text_key:"s7.text" },
    { id:"c2", type:"cta", visibleTo:"all", label_key:"common.continue", action:"advance" }
  ]});
  if(!ids.includes("step_8")) g.steps.push({ id:"step_8", kind:"puzzle", advanceOnSolve:true, components:[
    { id:"c1", type:"audio", visibleTo:[1], src:BASE+"/voicemail.mp3" },
    { id:"c2", type:"audio", visibleTo:[2], src:BASE+"/voicemail.mp3" },
    { id:"c3", type:"input", visibleTo:[3], placeholder_key:"common.answer", hints:["a.h1","a.h2"], demoAnswer:"612", outcome_key:"a.out" }
  ]});
  g.stepCount=g.steps.length;
  await setDoc(gref,g);
  const lref=doc(db,"games","kidnapped-il","locales","he");
  const he=(await getDoc(lref)).data()||{};
  Object.assign(he,{
    "s7.text":"אוקי אוקי אוקי. מצאנו מספר טלפון. אולי נתקשר? נראה אם מישהו עונה?",
    "a.h1":"אנחנו מחפשים 3 ספרות. יש לכם רעיון?",
    "a.h2":"זה לא באמת טיול, נכון? אולי נפתח מפה ונעקוב אחרי הקווים.",
    "a.out":"מצוין! שלושת הספרות נכונות."
  });
  await setDoc(lref,he);
  console.log("Added storyline + audio puzzle (steps 7 & 8).");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
