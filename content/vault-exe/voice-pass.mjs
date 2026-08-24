// Voice pass: the owner narrates. Rewrites locale values on disk + Firestore.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: 'totemtime-357a2' });
const db = getFirestore();

const he = {
  "screens.story.title": "",
  "screens.story.body": "שלום. אם אתם קוראים את זה, אני לא כאן. אולי נעלמתי באופן מסתורי. אולי אני בים. תבחרו את הגרסה שאתם מעדיפים.\n\nמה שחשוב: השארתי לכם את שולחן העבודה שלי, ומאחוריו — כספת. ובתוכה הדבר הכי יקר שיש לי. לא, לא אגיד מה. זה כל הקטע.\n\nהשולחן יודע את הדרך. הוא קצת עקשן, כמוני. תתחילו לגעת בדברים.\n\n— {owner_name}",
  "screens.instructions.title": "",
  "screens.instructions.body": "שלושה טלפונים, שולחן אחד. כל אחד מכם קיבל צד אחר שלו. אף אחד לא רואה הכול — ככה תכננתי, ולא בטעות.\n\nמצאתם משהו? תגידו בקול. כן, לדבר עם אנשים. איזו דרישה.\n\nנתקעתם? יש לוח רמזים למטה. כל רמז עולה נקודות, ואני שופט. קריאה חוזרת — חינם, אני לא מפלצת. ואם ממש אין סיכוי, אחרי הרמז האחרון יופיע דילוג. בלי נקודות. תחיו עם זה.\n\nמי שפותר — כולם רואים. גם את הנקודות, גם את הקרדיט.\n\nבהצלחה. תצטרכו.\n\n— {owner_name}",
  "screens.finale.body": "המנעול מסתובב. הדלת נפתחת. הדבר הכי יקר שיש לי — שלכם.\n\n{treasure_caption}\n\nמה, ציפיתם לזהב? אני מקווה שנהניתם מהדרך. זה היה כל הרעיון.\n\nתודה ששיחקתם. קופון למשחק הבא מחכה לכם בחשבון. הרווחתם אותו. בקושי, אבל הרווחתם.\n\n— {owner_name}",
  "side.1": "הצד השקט של השולחן. רדיו, מנורה, והמחשב. אל תשפכו כלום. — {owner_name}",
  "side.2": "הצד עם הצעצועים. תיהנו. בעדינות. — {owner_name}",
  "side.3": "צד הניירת. כן, גם המבחן ההוא. — {owner_name}",
  "el.die.caption": "הקובייה שלי. יש לה דעות משלה.",
  "el.test.caption": "מבחן אחד גרוע וכרטיס אחד שחור. בלי שיפוטיות.",
  "el.radio.caption": "הרדיו שלי. עוד עובד. תתפלאו.",
  "el.audio.caption": "אפשר לנגן שוב. אני סבלני. הייתי.",
  "el.train.caption": "הצעצוע האהוב עליי. תיזהרו איתו.",
  "el.cal_small.caption": "זה לא היה שם קודם.",
  "el.cal_big.caption": "תמונות מהחיים שלי. אל תצחקו על התסרוקת.",
  "el.calc.caption": "ישן, כמוני. מדויק, כמוני.",
  "el.bulb.caption": "לא זוכר שקניתי אותה.",
  "el.lamp.caption": "מנורת העבודה שלי. אור טוב זה הכול.",
  "el.notebook.caption": "אף פעם לא כתבתי בה. כאילו.",
  "el.fish.caption": "הדגים שלי. חכמים ממה שנראה.",
  "el.clock.caption": "תמיד דייקתי. תמיד.",
  "el.book.caption": "סגור. גם לי היו סודות.",
  "el.laptop.caption": "המחשב שלי. הסיסמה? חמודים.",
  "popups.radio": "‏1125 FM. התחנה שלי. {player_name} — כל הכבוד. הקובייה והמבחן לא שמרו על הסוד.",
  "popups.train": "הרכבת הגיעה בזמן. כל תו בסדר הנכון. {player_name}, היד שלך יציבה משלי.",
  "popups.calc": "‏3954607. תאריך שלא קיים, מספר שדווקא כן. {player_name} — חשבון פשוט. יחסית.",
  "popups.uv": "המתג נלחץ. תסתכלו מסביב — הכול השתנה. באדיבות {player_name}.",
  "popups.fish": "הדגים זוכרים הכול. תמיד ידעתי. תראו מה הם כותבים. הקרדיט של {player_name}.",
  "popups.clock": "‏08:10. השעה שלי. תמיד הייתה. {player_name} — מדויק. משהו נפתח.",
  "popups.laptop": "‏Vault.exe רץ. {player_name}, פתחת את המחשב שלי. עכשיו — הכספת. כולם, להרים את הראש.",
  "hints.radio.1": "רמז? כבר? טוב. הקובייה לא מקולקלת, והמבחן לא נכשל סתם. תקריאו אותם בקול.",
  "hints.radio.2": "ארבע הטלות: 1125. הציון והכרטיס: FM. תכוונו ותלחצו ON. בבקשה.",
  "hints.train.1": "הקול ברדיו מקריא חמישה תווים. המסילה מציגה אותם מעורבבים. הסדר של הקול קובע.",
  "hints.train.2": "‏B, אחר כך G, אחר כך 7, אחר כך F, אחר כך 3 — בדיוק כשהרכבת עוברת. החטאה מאפסת רק את הריצה.",
  "hints.calc.1": "אחת מהתמונות שלי מציגה תאריך שלא ייתכן. תאריכים בלתי אפשריים הם הקודים הכי טובים.",
  "hints.calc.2": "‏3954607. שווה. זהו.",
  "hints.uv.1": "הנורה הקטנה לא הופיעה בשביל היופי. המתג של המנורה חיכה לה.",
  "hints.uv.2": "תלחצו על המתג של המנורה. האור הרביעי לא נועד לקריאה.",
  "hints.fish.1": "המחברת כבר לא ריקה. הציור הוא הוראות: צורה, צבע, סדר.",
  "hints.fish.2": "לב — שחור. ריבוע — כחול. משולש — צהוב. בסדר הזה.",
  "hints.clock.1": "הדגים הפסיקו לשחות. הם כותבים. משמאל לימין.",
  "hints.clock.2": "‏08:10. תאשרו.",
  "hints.laptop.1": "הספר לא נפתח בשביל התמונה. תסתכלו מה מודפס לידה.",
  "hints.laptop.2": "הרמז בספר נותן את ששת הסמלים בסדר. לחיצה שגויה מאפסת הכול. בלי לחץ.",
  "win.title": "כל הכבוד. באמת."
};

const en = {
  "screens.story.title": "You have an inheritance. Sort of.",
  "screens.story.body": "Hello. If you're reading this, I'm not here. Maybe I vanished mysteriously. Maybe I'm at the beach. Pick the version you prefer.\n\nWhat matters: I left you my desk, and behind it — a vault. Inside it, the most valuable thing I own. No, I won't say what. That's the whole point.\n\nThe desk knows the way. It's a little stubborn, like me. Start touching things.\n\n— {owner_name}",
  "screens.instructions.title": "Before you touch my things",
  "screens.instructions.body": "Three phones, one desk. Each of you got a different side of it. Nobody sees everything — I planned it that way, and not by accident.\n\nFound something? Say it out loud. Yes, talking to people. What an ask.\n\nStuck? There's a hint board at the bottom. Every hint costs points, and I'm judging. Re-reading is free — I'm not a monster. And if it's truly hopeless, a skip appears after the last hint. Zero points. Live with it.\n\nWhoever solves — everyone sees. The points and the credit.\n\nGood luck. You'll need it.\n\n— {owner_name}",
  "screens.finale.body": "The lock spins. The door swings. The most valuable thing I own — yours.\n\n{treasure_caption}\n\nWhat, you expected gold? I hope you enjoyed the way there. That was the whole idea.\n\nThanks for playing. A coupon for the next game is waiting on your account. You earned it. Barely, but you earned it.\n\n— {owner_name}",
  "side.1": "The quiet side of the desk. Radio, lamp, and the laptop. Don't spill anything. — {owner_name}",
  "side.2": "The toy side. Enjoy. Gently. — {owner_name}",
  "side.3": "The paperwork side. Yes, including that test. — {owner_name}",
  "el.die.caption": "My die. It has opinions.",
  "el.test.caption": "One bad test and one black card. No judgment.",
  "el.radio.caption": "My radio. Still works. Surprise.",
  "el.audio.caption": "Play it again if you like. I'm patient. Was.",
  "el.train.caption": "My favorite toy. Careful with it.",
  "el.cal_small.caption": "That wasn't there before.",
  "el.cal_big.caption": "Pictures from my life. Don't laugh at the haircut.",
  "el.calc.caption": "Old, like me. Accurate, like me.",
  "el.bulb.caption": "Don't remember buying that.",
  "el.lamp.caption": "My work lamp. Good light is everything.",
  "el.notebook.caption": "Never wrote in it. Allegedly.",
  "el.fish.caption": "My fish. Smarter than they look.",
  "el.clock.caption": "I was always punctual. Always.",
  "el.book.caption": "Shut tight. I had secrets too.",
  "el.laptop.caption": "My laptop. The password? Cute.",
  "popups.radio": "1125 FM. My station. {player_name} — well done. The die and the test couldn't keep a secret.",
  "popups.train": "The train arrived on time. Every character in order. {player_name}, steadier hands than mine.",
  "popups.calc": "3954607. A date that can't exist, a number that very much does. {player_name} — simple math. Relatively.",
  "popups.uv": "The switch is pressed. Look around — everything changed. Courtesy of {player_name}.",
  "popups.fish": "The fish remember everything. I always knew. Look what they're writing. Credit to {player_name}.",
  "popups.clock": "08:10. My hour. Always was. {player_name} — precise. Something just opened.",
  "popups.laptop": "Vault.exe is running. {player_name}, you opened my laptop. Now — the vault. Everyone, look up.",
  "hints.radio.1": "A hint? Already? Fine. The die isn't broken, and the test didn't fail by accident. Read them out loud.",
  "hints.radio.2": "Four rolls: 1125. The grade and the card: FM. Tune, then press ON. Please.",
  "hints.train.1": "The voice reads five characters. The track shows them scrambled. The voice's order decides.",
  "hints.train.2": "B, then G, then 7, then F, then 3 — exactly as the train passes. A miss only resets the current run.",
  "hints.calc.1": "One of my pictures shows a date that cannot exist. Impossible dates make the best codes.",
  "hints.calc.2": "3954607. Equals. That's it.",
  "hints.uv.1": "The little bulb didn't appear for decoration. The lamp's switch was waiting for it.",
  "hints.uv.2": "Press the lamp's switch. The fourth light isn't for reading.",
  "hints.fish.1": "The notebook isn't blank anymore. The drawing is instructions: shape, color, order.",
  "hints.fish.2": "Heart — black. Square — blue. Triangle — yellow. In that order.",
  "hints.clock.1": "The fish stopped swimming. They're writing. Left to right.",
  "hints.clock.2": "08:10. Confirm.",
  "hints.laptop.1": "The book didn't open for the photo. Look at what's printed beside it.",
  "hints.laptop.2": "The book's clue gives the six symbols in order. A wrong press resets everything. No pressure.",
  "win.title": "Well done. Really."
};

for (const [lang, patch] of [["he", he], ["en", en]]) {
  const path = `content/vault-exe/locales/${lang}.json`;
  const disk = JSON.parse(readFileSync(path, 'utf8'));
  const merged = { ...disk, ...patch };
  writeFileSync(path, JSON.stringify(merged, null, 2));
  await db.doc(`games/vault-exe/locales/${lang}`).set(merged);
  const back = (await db.doc(`games/vault-exe/locales/${lang}`).get()).data();
  console.log(`✓ ${lang}: disk+firestore keys=${Object.keys(back).length}`);
}
console.log('sample:', JSON.stringify((await db.doc('games/vault-exe/locales/he').get()).data()["el.laptop.caption"]));
