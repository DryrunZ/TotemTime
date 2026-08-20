import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const he = (await db.collection('games').doc('vault-exe').collection('locales').doc('he').get()).data() || {};
for (const k of ['popups.radio','popups.train','popups.calc','popups.uv','popups.clock','popups.laptop']) {
  console.log(k, '=', JSON.stringify((he[k]||'(empty)').slice(0,50)));
}
console.log('--- your narrator ---');
for (const k of ['sc_radio.after','sc_train.after']) {
  console.log(k, '=', JSON.stringify((he[k]||'(empty)').slice(0,50)));
}