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
  if(!ids.includes("step_11")) g.steps.push({ id:"step_11", kind:"screen", components:[
    { id:"c1", type:"text", visibleTo:"all", text_key:"s11.text" },
    { id:"c2", type:"cta", visibleTo:"all", label_key:"common.continue", action:"advance" }
  ]});
  if(!ids.includes("step_12")) g.steps.push({ id:"step_12", kind:"puzzle", advanceOnSolve:true, components:[
    { id:"c1", type:"image", visibleTo:[1], src:BASE+"/final1.png" },
    { id:"c2", type:"image", visibleTo:[2], src:BASE+"/final2.png" },
    { id:"c3", type:"input", visibleTo:[2], placeholder_key:"common.answer", hints:["f.h1","f.h2"], demoAnswer:"משה", matchMode:"contains", outcome_key:"f.out" },
    { id:"c4", type:"image", visibleTo:[3], src:BASE+"/final3.png" }
  ]});
  if(!ids.includes("step_13")) g.steps.push({ id:"step_13", kind:"screen", components:[
    { id:"c1", type:"text", visibleTo:"all", text_key:"s13.text" },
    { id:"c2", type:"cta", visibleTo:"all", label_key:"coupon.cta", action:"coupon" }
  ]});
  g.stepCount=g.steps.length;
  await setDoc(gref,g);
  const lref=doc(db,"games","kidnapped-il","locales","he");
  const he=(await getDoc(lref)).data()||{};
  Object.assign(he,{
    "s11.text":"חברים, אנחנו כבר שם. עוד רגע אחד. המעטפה עם הגיטרה מחזיקה שלושה פתקים ומסר מוזר. עקבו מנקודת המבט שלי — מה הכוונה?",
    "f.h1":"זוכרים שאמרו לנו 'עקבו אחר נקודת המבט שלי'? מה זה יכול להיות?",
    "f.h2":"יש לנו כתובת אימייל, נכון? נשלח אליה ונראה מה התשובה. אולי ננגן משהו.",
    "f.out":"מצאתם אותו! פיטר משוחרר.",
    "s13.text":"מצאנו אותו. הוא חי. שבח לאל! לקבלת קופון למשחק הבא, לחצו למטה. כל אחד יכול לבחור את המשחק שלו.",
    "coupon.cta":"קבלו קופון 🎁",
    "coupon.soon":"בקרוב — קופונים למשחק הבא!"
  });
  await setDoc(lref,he);
  console.log("Added storyline + final puzzle + outro (steps 11, 12, 13).");
  process.exit(0);
})().catch(e=>{console.error("FAILED:",e.message);process.exit(1);});
