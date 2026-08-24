import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const g = (await db.collection('games').doc('vault-exe').get()).data();
console.log('STEPS (index : id : kind : el : uses):');
g.steps.forEach((st, i) => {
  console.log(i, ':', st.id, ':', st.kind || '-', ':', st.el || '-', ':', st.uses || '-');
});