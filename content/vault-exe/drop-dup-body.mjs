import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const ref = db.collection('games').doc('vault-exe');
const g = (await ref.get()).data();
const drop = { story: 'st.b', instructions: 'in.b' };
let removed = 0;
const steps = g.steps.map(st => {
  if (drop[st.id]) {
    const before = (st.components || []).length;
    st.components = (st.components || []).filter(c => c.id !== drop[st.id]);
    removed += before - st.components.length;
  }
  return st;
});
await ref.set({ steps }, { merge: true });
const check = (await ref.get()).data();
for (const st of check.steps) {
  if (drop[st.id]) console.log('STEP', st.id, 'now has', (st.components||[]).map(c=>c.id).join(','));
}
console.log('REMOVED', removed, 'duplicate body components');