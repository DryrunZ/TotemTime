import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const ref = db.collection('games').doc('vault-exe');
const g = (await ref.get()).data();

// comp id -> its after-narrator key
const map = {
  radio: 'sc_radio.after', train: 'sc_train.after', calc: 'sc_calc.after',
  uv: 'sc_uv.after', fish: 'sc_fish.after', clock: 'sc_clock.after', laptop: 'sc_laptop.after'
};
let changed = 0;
const steps = g.steps.map(st => {
  (st.components || []).forEach(c => {
    const id = c.elementId || c.id;
    if (map[id]) {
      if (c.popup_key !== map[id]) { c.popup_key = map[id]; changed++; }
    }
  });
  return st;
});
await ref.set({ steps }, { merge: true });

const check = (await ref.get()).data();
for (const st of check.steps) for (const c of (st.components||[])) {
  const id = c.elementId || c.id;
  if (map[id]) console.log(id, '-> popup_key =', c.popup_key);
}
console.log('CHANGED', changed, 'popup_key pointers');