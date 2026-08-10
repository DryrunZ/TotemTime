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

const game = {
  gameId: "kidnapped-il", title_key: "game.title", N: 3, stepCount: 5, defaultLanguage: "he",
  steps: [
    { id: "step_1", kind: "screen", gate: { type: "live", threshold: 3 }, components: [
      { id: "c1", type: "title",    visibleTo: "all", text_key: "s1.title" },
      { id: "c2", type: "subtitle", visibleTo: "all", text_key: "s1.subtitle" },
      { id: "c3", type: "cta",      visibleTo: "all", label_key: "s1.cta", action: "advance" } ] },
    { id: "step_2", kind: "screen", components: [
      { id: "c1", type: "title",   visibleTo: "all", text_key: "s2.title" },
      { id: "c2", type: "rules",   visibleTo: "all", items_key: "s2.rules" },
      { id: "c3", type: "warning", visibleTo: "all", text_key: "s2.warning" },
      { id: "c4", type: "cta",     visibleTo: "all", label_key: "s2.cta", action: "advance" } ] },
    { id: "step_3", kind: "screen", components: [
      { id: "c1", type: "title", visibleTo: "all", text_key: "s3.title" },
      { id: "c2", type: "image", visibleTo: "all", src_key: "s3.image" },
      { id: "c3", type: "text",  visibleTo: "all", text_key: "s3.body" },
      { id: "c4", type: "cta",   visibleTo: "all", label_key: "s3.cta", action: "advance" } ] },
    { id: "step_4", kind: "puzzle", advanceOnSolve: true, components: [
      { id: "c1", type: "image", visibleTo: [1], src_key: "s4.cipher" },
      { id: "c2", type: "text",  visibleTo: [2], text_key: "s4.clue" },
      { id: "c3", type: "input", visibleTo: [3], placeholder_key: "s4.placeholder",
        hints: ["s4.hint1", "s4.hint2"], demoAnswer: "kabea", outcome_key: "s4.outcome" } ] },
    { id: "step_5", kind: "screen", components: [
      { id: "c1", type: "title",    visibleTo: "all", text_key: "s5.title" },
      { id: "c2", type: "subtitle", visibleTo: "all", text_key: "s5.subtitle" } ] }
  ]
};

const he = {
  "game.title": "החטיפה",
  "topbar.player": "שחקן", "topbar.points": "נק'", "topbar.stage": "שלב",
  "countdown.getReady": "המשחק מתחיל בעוד",
  "s1.title": "בואו נפתור את זה.",
  "s1.subtitle": "אתם צוות של שישה. כדי להתחיל, לחצו יחד — או שלפחות שלושה מכם צריכים ללחוץ.",
  "s1.cta": "אני מוכן/ה",
  "s2.title": "איך משחקים",
  "s2.rules": ["עבדו יחד ותקשרו.", "כל שחקן עשוי לראות דברים שונים.", "שחקנים עם אותו מספר שחקן רואים אותו מידע.", "שתפו את מה שאתם רואים כדי לפתור את האתגר."],
  "s2.warning": "אל תציצו במסכים של שחקנים אחרים. דברו, אל תרמו!",
  "s2.cta": "המשך",
  "s3.title": "ובכן… זה קצת מביך",
  "s3.image": "תמונת כופר של פיטר, קשור",
  "s3.body": "פיטר נחטף. בדקנו — אף אחד אחר לא בא לעזור. זה רק אתם. בלי לחץ, אבל עבודת צוות וקצת חשיבה ממש מומלצות עכשיו. לכו למצוא אותו.",
  "s3.cta": "למצוא אותו",
  "s4.cipher": "רשת הצופן", "s4.clue": "המפתח מוסתר בפריסת המקלדת",
  "s4.placeholder": "הקלידו את התשובה",
  "s4.hint1": "מיהו דבוז'אק? האם יש דבוז'אק מפורסם נוסף מלבד המלחין הצ'כי מהמאה ה-19?",
  "s4.hint2": "קיימת פריסת מקלדת בשם דבוז'אק. איך הייתם מאייתים VANDA?",
  "s4.outcome": "פיצחתם את זה — ומצאתם את פיטר. עבודת צוות מצוינת.",
  "s5.title": "פיטר בטוח", "s5.subtitle": "מצאתם אותו. האתגר הבא נטען…",
  "popup.hint": "רמז", "popup.next": "הבא",
  "win.title": "תשובה נכונה", "win.cta": "המשך",
  "lose.title": "אופס… טעות", "lose.body": "זו לא התשובה. דברו עם הצוות ונסו שוב.", "lose.cta": "נסו שוב"
};

const en = {
  "game.title": "KidnAPPed",
  "topbar.player": "Player", "topbar.points": "pts", "topbar.stage": "Stage",
  "countdown.getReady": "The game starts in",
  "s1.title": "Let's Solve This.",
  "s1.subtitle": "You're a team of six. To start, click together — or at least three of you need to click.",
  "s1.cta": "I'm Ready",
  "s2.title": "How to Play",
  "s2.rules": ["Work together and communicate.", "Each player may see different things.", "Players with the same Player Number see the same information.", "Share what you see to solve the challenge."],
  "s2.warning": "Don't look at other players' screens. Talk, don't cheat!",
  "s2.cta": "Continue",
  "s3.title": "Well… This Is Awkward",
  "s3.image": "A grainy ransom photo of Peter, tied up",
  "s3.body": "Peter's been kidnapped. We checked — no one else is coming. It's just you. No pressure, but teamwork and brains are highly recommended right now. Go find him.",
  "s3.cta": "Go find him",
  "s4.cipher": "The cipher grid", "s4.clue": "The key is hidden in the keyboard layout",
  "s4.placeholder": "Type your answer",
  "s4.hint1": "Who is Dvorak? Is there another famous Dvorak besides the 19th-century composer?",
  "s4.hint2": "There's a Dvorak keyboard layout. How would you spell VANDA?",
  "s4.outcome": "You cracked it — and found Peter. Great teamwork.",
  "s5.title": "Peter's Safe", "s5.subtitle": "You found him. The next challenge is loading…",
  "popup.hint": "Hint", "popup.next": "Next",
  "win.title": "Correct Answer", "win.cta": "Continue",
  "lose.title": "Oops… Wrong", "lose.body": "That's not it. Talk it through and try again.", "lose.cta": "Try Again"
};

async function main() {
  await setDoc(doc(db, "games", "kidnapped-il"), game);
  await setDoc(doc(db, "games", "kidnapped-il", "locales", "he"), he);
  await setDoc(doc(db, "games", "kidnapped-il", "locales", "en"), en);
  console.log("✓ Seeded kidnapped-il (game + he/en).");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
