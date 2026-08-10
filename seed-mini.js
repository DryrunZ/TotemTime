const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const firebaseConfig = {
  apiKey: "AIzaSyBQmvVChIFVvL6KImIHyZ5-k-1NiWlmqEo",
  authDomain: "totemtime-357a2.firebaseapp.com",
  projectId: "totemtime-357a2",
  storageBucket: "totemtime-357a2.firebasestorage.app",
  messagingSenderId: "45407463366",
  appId: "1:45407463366:web:5699ef4b82ba279f5ff4c7"
};
const db = getFirestore(initializeApp(firebaseConfig));
const BASE = "https://totemtime-357a2.web.app/assets/games/kidnapped-il";

const game = {
  gameId:"kidnapped-il", title_key:"game.title", N:3, stepCount:4, defaultLanguage:"he",
  steps:[
    { id:"step_1", kind:"screen", components:[
      { id:"c1", type:"text", visibleTo:"all", text_key:"s1.text" },
      { id:"c2", type:"cta",  visibleTo:"all", label_key:"common.continue", action:"advance" } ]},
    { id:"step_2", kind:"puzzle", advanceOnSolve:true, components:[
      { id:"c1", type:"image", visibleTo:"all", src:BASE+"/workstation.png" },
      { id:"c2", type:"text",  visibleTo:[3], text_key:"s2.frame" },
      { id:"c3", type:"input", visibleTo:[3], placeholder_key:"common.answer", hints:["s2.h1","s2.h2"], demoAnswer:"kabea", outcome_key:"s2.out" } ]},
    { id:"step_3", kind:"screen", components:[
      { id:"c1", type:"text", visibleTo:"all", text_key:"s3.text" },
      { id:"c2", type:"cta",  visibleTo:"all", label_key:"common.continue", action:"advance" } ]},
    { id:"step_4", kind:"puzzle", advanceOnSolve:true, components:[
      { id:"c1", type:"video", visibleTo:[1], src:BASE+"/riddle2-p1.mp4" },
      { id:"c2", type:"input", visibleTo:[1], placeholder_key:"common.answer", hints:["s4.h1","s4.h2"], demoAnswer:"maker", outcome_key:"s4.out" },
      { id:"c3", type:"image", visibleTo:[2], src:BASE+"/riddle2-p2.png" },
      { id:"c4", type:"text",  visibleTo:[2], text_key:"s4.p2" },
      { id:"c5", type:"image", visibleTo:[3], src:BASE+"/riddle2-p3.png" },
      { id:"c6", type:"text",  visibleTo:[3], text_key:"s4.p3" } ]}
  ]
};

const he = {
  "game.title":"החטיפה",
  "topbar.player":"שחקן","topbar.points":"נק'","topbar.stage":"שלב","countdown.getReady":"המשחק מתחיל בעוד",
  "common.continue":"המשך","common.answer":"הקלידו את התשובה",
  "popup.hint":"רמז","popup.next":"הבא",
  "win.title":"תשובה נכונה","win.cta":"המשך",
  "lose.title":"אופס… טעות","lose.body":"זו לא התשובה. דברו עם הצוות ונסו שוב.","lose.cta":"נסו שוב",
  "s1.text":"פיטר נחטף. בדקנו — אף אחד אחר לא בא לעזור. זה רק אתם. בלי לחץ, אבל עבודת צוות וקצת חשיבה ממש מומלצות כרגע. לכו למצוא אותו.",
  "s2.frame":"הגיע הזמן לפרוץ (חוקית, תירגעו). הנה תחנת העבודה של פיטר. הסיסמה שלו? חמש אותיות. באנגלית. איפשהו באינטרנט מסתתרת התשובה. בלי לחץ — פשוט פצחו אותה והצילו אותו.",
  "s2.h1":"מיהו דבוז'אק? האם קיים דבוז'אק מפורסם נוסף מלבד המלחין הצ'כי מהמאה ה-19?",
  "s2.h2":"קיימת פריסת מקלדת בשם דבוז'אק. אפשר לבדוק אותה דרך תמונה או כלי מקוון. איך הייתם מאייתים VANDA?",
  "s2.out":"מצוין! פצחתם את הסיסמה.",
  "s3.text":"אנחנו בתוך המחשב של פיטר — סיוט דיגיטלי של אינספור תיקיות. מצאנו את מכתב הכופר: מיליון דולר (פיהוק), ותקשיבו לזה — סרטון של הבוס שלנו רוקד את ריקוד תינוק הכריש. שיא המבוכה. מתחילים לעבוד?",
  "s4.h1":"4 סימנים — מה הם אומרים ומה אפשר להבין מהם?",
  "s4.h2":"מה המשמעות? רמז אחד גורם לכם להגדיר משהו באופן מלא, והשני ממקד אתכם מתוך ההסבר המלא.",
  "s4.out":"כל הכבוד! פתרתם את החידה.",
  "s4.p2":"הלו הלו, לא כולם מתכנתים כאן. מה בדיוק הכוונה?",
  "s4.p3":"אלכסנדר הגדול, עומק, לכל פעולה יש תגובה שווה והפוכה."
};

async function main(){
  await setDoc(doc(db,"games","kidnapped-il"), game);
  await setDoc(doc(db,"games","kidnapped-il","locales","he"), he);
  console.log("✓ Seeded kidnapped-il (4 screens).");
  process.exit(0);
}
main().catch(e => { console.error("SEED FAILED:", e.message); process.exit(1); });
