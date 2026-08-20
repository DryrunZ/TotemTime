// content/vault-exe/install-texts.mjs
// Installs the VAULT.EXE narrator texts + hint routing + scoring into games/vault-exe.
// Idempotent: preserves any already-filled hints/guide strings on rerun.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'totemtime-357a2' });
const db = getFirestore(app);

const texts = {
  story: {
    plot: 'לדויד יש כספת.\nומסתבר שיש בפנים משהו שהוא ממש לא רוצה שתראו.\nדויד יכול היה פשוט לתת לכם את זה.\nאבל לא. יש שולחן, חפצים, רמזים וכספת נעולה.\nמה מחכה בפנים? אין לנו מושג.\nאבל אם דויד טרח להחביא את זה ככה — כנראה ששווה להציץ.',
    button: 'פתחו את השולחן'
  },
  instructions: {
    plot: 'יש רק בעיה אחת קטנה.\nדויד לא בנה על זה שלכספת יש חיים משלה.\nVAULT.EXE הופעלה.\nכל אחד מכם רואה דברים אחרים. בלי לדבר ולשתף פעולה — לא תגיעו רחוק.\nנתקעתם? רמזים יעלו לכם בנקודות, אבל בשביל זה הם שם. נגמרו הרמזים ועדיין אין מושג? תוכלו לדלג על השלב.\nוהשעון כבר רץ. גם הזמן שווה נקודות.\nבקיצור: תדברו. תחשבו. ותזוזו.',
    button: 'נראה אותך'
  },
  sc_radio: {
    after: 'גלגלתם קובייה. מרשים.\nהאנושות שוברת שיאים חדשים.\nואז איכשהו הפכתם את זה לתדר.\nאני מודה — לרגע קטן היה פה משהו שנראה כמעט כמו חשיבה.',
    hintsTo: 3, hints: [], guide: ''
  },
  sc_train: {
    after: 'הרכבת הגיעה לתחנה.\nואתם, באופן מפתיע, הגעתם איתה.\nלא רע.\nזה מתחיל להיות קצת מעצבן.',
    hintsTo: 3, hints: [], guide: ''
  },
  sc_calc: {
    after: 'השתמשתם במחשבון.\nואפילו לא ניסיתם לחלק משהו.\nיפה.\nVAULT.EXE מעדכנת את הערכת הסיכון לגביכם מ״נמוך״ ל״מעצבן״.',
    hintsTo: 2, hints: [], guide: ''
  },
  sc_uv: {
    after: 'אה. מצאתם גם את זה.\nכנראה שחושך באמת מוציא מכם את המיטב.\nעוד משהו שהיה מוסתר כבר לא מוסתר.\nאני מתחילה להתגעגע אליכם מלפני כמה דקות.',
    hintsTo: 2, hints: [], guide: ''
  },
  sc_fish: {
    after: 'רגע. הדגים עזרו לכם?\nאני צריכה רגע לעבד את זה.\nשלושה אנשים, מנורת UV, לוח צבעים ודגי זהב.\nדויד, יש לנו הרבה על מה לדבר אחרי זה.',
    hintsTo: 3, hints: [], guide: ''
  },
  sc_clock: {
    after: 'עכשיו אתם גם קוראים תנועות של דגים.\nזה נהיה אישי.\nאני לא יודעת מה יותר מטריד — שזה עבד,\nאו שכבר התחלתם להבין איך הראש שלי עובד.',
    hintsTo: 1, hints: [], guide: ''
  },
  sc_laptop: {
    after: 'לא. לא. לא.\nזה היה אמור לעצור אתכם.\nהרצף התקבל.\nאני מריצה בדיקה נוספת.\nועוד אחת.\nליתר ביטחון.',
    hintsTo: 1, hints: [], guide: ''
  },
  vault: {
    plot: 'גישה לכספת: מאושרת.\nלצערי.\nעשיתם את זה.\nאני מציעה שנעצור כאן, נמחק את התוצאות, ונעמיד פנים שזה מעולם לא קרה.\nלא?\nכמובן שלא.',
    button: 'פתחו את הכספת',
    final: 'VAULT.EXE — UNLOCKED\nטוב. ניצחתם. מרוצים?\nגישה אושרה. נגד שיקול דעתי.\nהכספת של דויד פתוחה.\n{vault_content}\n{closing_line}\nאני VAULT.EXE.\nולא נדבר יותר על מה שקרה כאן.'
  }
};

const scoring = { scenePoints: 100, hintCosts: [5, 10, 15], skipPoints: 0 };

const ref = db.collection('games').doc('vault-exe');
const snap = await ref.get();
if (!snap.exists) { console.error('ABORT: games/vault-exe not found'); process.exit(1); }

const existing = snap.get('texts') || {};
let preserved = 0;
for (const k of Object.keys(texts)) {
  const ex = existing[k];
  if (!ex) continue;
  if (Array.isArray(ex.hints) && ex.hints.length) { texts[k].hints = ex.hints; preserved++; }
  if (typeof ex.guide === 'string' && ex.guide.length) { texts[k].guide = ex.guide; preserved++; }
}

await ref.set({ texts, scoring }, { merge: true });

const check = await ref.get();
const got = check.get('texts') || {};
const keys = Object.keys(got).sort();
const filled = keys.filter(k => got[k].plot || got[k].after).length;
console.log('WROTE texts:', keys.join(','));
console.log('VERIFIED', filled, 'of', keys.length, 'entries have text; preserved', preserved, 'existing hint/guide fields');
console.log('SCORING', JSON.stringify(check.get('scoring')));
