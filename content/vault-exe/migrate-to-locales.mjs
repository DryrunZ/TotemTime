// migrate-to-locales.mjs
// Splits games/vault-exe.texts (inline Hebrew) into: locale keys -> locales/he, and key-based texts.
// SCOPE: only games/vault-exe. Proves kidnapped-il locale is untouched.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));

const GAME = 'vault-exe';
const gref = db.collection('games').doc(GAME);
const heref = gref.collection('locales').doc('he');

const kref = db.collection('games').doc('kidnapped-il').collection('locales').doc('he');
const kBefore = Object.keys((await kref.get()).data() || {}).length;

const gsnap = await gref.get();
if (!gsnap.exists) { console.error('ABORT: games/vault-exe not found'); process.exit(1); }
const texts = gsnap.get('texts') || {};
if (!Object.keys(texts).length) { console.error('ABORT: no texts map'); process.exit(1); }

const heKeys = {};
const newTexts = {};

for (const [scene, v] of Object.entries(texts)) {
  const nt = {};
  for (const field of ['plot', 'after', 'button', 'final', 'guide']) {
    if (typeof v[field] === 'string' && v[field].length) {
      const key = scene + '.' + field;
      heKeys[key] = v[field];
      nt[field] = key;
    }
  }
  if (Array.isArray(v.hints)) {
    const hintKeys = [];
    v.hints.forEach((h, i) => {
      if (typeof h !== 'string' || !h.length) return;
      const looksLikeKey = /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(h);
      const key = looksLikeKey ? h : (scene + '.hint' + (i + 1));
      if (!looksLikeKey) heKeys[key] = h;
      hintKeys.push(key);
    });
    nt.hints = hintKeys;
  } else {
    nt.hints = [];
  }
  if (typeof v.hintsTo === 'number') nt.hintsTo = v.hintsTo;
  newTexts[scene] = nt;
}

await heref.set(heKeys, { merge: true });
await gref.set({ texts: newTexts }, { merge: true });

const heAfter = (await heref.get()).data() || {};
const kAfter = Object.keys((await kref.get()).data() || {}).length;
const gotTexts = (await gref.get()).get('texts') || {};

console.log('WROTE', Object.keys(heKeys).length, 'locale keys to games/' + GAME + '/locales/he');
console.log('SAMPLE story.plot =', JSON.stringify((heAfter['story.plot'] || '').slice(0, 30)) + '...');
console.log('TEXTS now keys: sc_radio =', JSON.stringify(gotTexts.sc_radio));
console.log('KIDNAPPED locales/he keys: before', kBefore, 'after', kAfter, kBefore === kAfter ? '(UNCHANGED)' : '(CHANGED - INVESTIGATE)');