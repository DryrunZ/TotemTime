import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const ref = db.collection('games').doc('vault-exe');
const g = (await ref.get()).data();
const kill = ['side1','side2','side3'];
let removed = 0;
const steps = g.steps.map(st => {
  if (st.components) {
    const before = st.components.length;
    st.components = st.components.filter(c => !kill.includes(c.id));
    removed += before - st.components.length;
  }
  return st;
});
await ref.set({ steps }, { merge: true });
console.log('REMOVED', removed, 'side caption components');