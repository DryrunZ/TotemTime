import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const g = (await db.collection('games').doc('vault-exe').get()).data();
const board = g.steps.find(st => st.id === 'board');
console.log('BOARD components (non-widget text-bearing):');
for (const c of (board.components || [])) {
  if (c.type !== 'widget') console.log('  id=' + c.id, 'type=' + c.type, 'text_key=' + (c.text_key||c.body_key||c.name_key||''), 'visibleTo=' + JSON.stringify(c.visibleTo));
}