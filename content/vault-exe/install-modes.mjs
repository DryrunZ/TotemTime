import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const ref = db.collection('games').doc('vault-exe');
const snap = await ref.get();
if (!snap.exists) { console.error('ABORT: games/vault-exe not found'); process.exit(1); }
const scoring = snap.get('scoring') || {};
scoring.hints = [-5, -10, -15];
scoring.modes = { easy: { hintStart: 0 }, hard: { hintStart: 1 } };
delete scoring.hintCosts; delete scoring.scenePoints; delete scoring.skipPoints;
await ref.set({ scoring }, { merge: true });
const got = (await ref.get()).get('scoring');
console.log('WROTE scoring:', JSON.stringify(got));
console.log('CHECK len', (got.hints||[]).length, 'easy', got.modes.easy.hintStart, 'hard', got.modes.hard.hintStart);
