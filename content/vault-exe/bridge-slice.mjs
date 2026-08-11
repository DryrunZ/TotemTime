// Vertical-slice bridge: engine-dialect step + answer + test room.
// Rerunnable — resets room VAULT1 each time.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault(), projectId: 'totemtime-357a2' });
const db = getFirestore();

const boardStep = {
  id: 'board',
  kind: 'board',
  advanceOnClose: false,
  gate: null,
  components: [
    { id: 'die_name',  type: 'subtitle', visibleTo: [2], text_key: 'el.die.name' },
    { id: 'die_info',  type: 'text',     visibleTo: [2], text_key: 'el.die.caption' },
    { id: 'radio', type: 'widget', widget: 'stepper', visibleTo: [1],
      points: 500, popup_key: 'popups.radio',
      name_key: 'el.radio.name', caption_key: 'el.radio.caption',
      params: { min: 875, max: 1300, step: 25, start: 950, unitKey: 'el.radio.unit' } },
    { id: 'test_name', type: 'subtitle', visibleTo: [3], text_key: 'el.test.name' },
    { id: 'test_info', type: 'text',     visibleTo: [3], text_key: 'el.test.caption' }
  ]
};

await db.doc('games/vault-exe').set({
  N: 3,
  defaultLanguage: 'he',
  scoring: { start: 100, solve: 0, mistake: 0, hints: [-20, -30] },
  steps: [boardStep]
}, { merge: true });

await db.doc('games/vault-exe/answers/radio').set({ type: 'equals', value: 1125 });

await db.doc('rooms/VAULT1').set({
  gameId: 'vault-exe', phase: 'play', step: 0, points: 100,
  startedAt: Date.now(), solved: {}, hintsUsed: {}, flags: {}, seats: {}
});

const g = (await db.doc('games/vault-exe').get()).data();
const a = (await db.doc('games/vault-exe/answers/radio').get()).exists;
const r = (await db.doc('rooms/VAULT1').get()).data();
console.log(`✓ game doc: steps=${g.steps.length}, N=${g.N}`);
console.log(`✓ answers/radio: ${a}`);
console.log(`✓ room VAULT1: phase=${r.phase}, flags=${JSON.stringify(r.flags)}`);
