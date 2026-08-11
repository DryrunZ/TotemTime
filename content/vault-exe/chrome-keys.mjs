// UI chrome keys the runtime expects — merged into both vault locales.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault(), projectId: 'totemtime-357a2' });
const db = getFirestore();
const he = { 'topbar.player':'שחקן', 'topbar.points':'נק׳', 'topbar.stage':'שלב',
  'win.title':'יפה!', 'win.cta':'סגור', 'lose.title':'לא זה…', 'lose.body':'נסו שוב', 'lose.cta':'סגור',
  'popup.hint':'רמז', 'popup.close':'סגור', 'popup.skip':'דלג', 'popup.skipped':'דילגתם', 'popup.skippedBody':'ממשיכים הלאה — בלי נקודות.',
  'countdown.getReady':'מתכוננים', 'game.title':'Vault.exe' };
const en = { 'topbar.player':'Player', 'topbar.points':'pts', 'topbar.stage':'Stage',
  'win.title':'Nice!', 'win.cta':'Close', 'lose.title':'Not it…', 'lose.body':'Try again', 'lose.cta':'Close',
  'popup.hint':'Hint', 'popup.close':'Close', 'popup.skip':'Skip', 'popup.skipped':'Skipped', 'popup.skippedBody':'Moving on — no points.',
  'countdown.getReady':'Get ready', 'game.title':'Vault.exe' };
await db.doc('games/vault-exe/locales/he').set(he, { merge: true });
await db.doc('games/vault-exe/locales/en').set(en, { merge: true });
console.log('✓ chrome keys merged into he + en');
