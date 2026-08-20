import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const g = (await db.collection('games').doc('vault-exe').get()).data();
for (const st of g.steps) {
  if (st.id === 'story' || st.id === 'instructions') {
    console.log('STEP', st.id, 'kind=' + st.kind, 'layout=' + (st.layout||'none'));
    for (const c of (st.components||[])) {
      console.log('  comp id=' + c.id, 'type=' + c.type, 'name_key=' + (c.name_key||''), 'body_key=' + (c.body_key||c.text_key||''));
    }
  }
}