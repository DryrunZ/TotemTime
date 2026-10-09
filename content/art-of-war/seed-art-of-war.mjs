#!/usr/bin/env node
// Seed Sun Tzu: The Art of War content into Firestore.
//
//   python3 build.py              # regenerate game.json + answers.private.json
//   node seed-art-of-war.mjs [--project totemtime-357a2]
//
// Auth: gcloud ADC (run with GOOGLE_APPLICATION_CREDENTIALS unset).
// Full-document set() on purpose; every doc is read back with getDocFromServer-equivalent
// (admin SDK reads are always server reads) and field counts compared.
// published:false — storefront only. Test via a room doc: ?game=art-of-war&room=<CODE>&dev=1

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argIdx = process.argv.indexOf('--project');
const projectId = argIdx > -1 ? process.argv[argIdx + 1] : (process.env.GOOGLE_CLOUD_PROJECT || 'totemtime-357a2');
const load = (p) => JSON.parse(readFileSync(join(here, p), 'utf8'));

const game    = load('game.json');
const answers = load('answers.private.json');   // { "<stepIndex>": { values, value, match, normalize } }
const he      = load('locales/he.json');

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

const docs = [
  ['games/art-of-war',            game],
  ['games/art-of-war/locales/he', he],
  ...Object.entries(answers).map(([step, a]) => [`games/art-of-war/answers/${step}`, a]),
];

// drop stale answer docs (step indices that no longer carry an input)
const live = new Set(Object.keys(answers));
for (const d of (await db.collection('games/art-of-war/answers').get()).docs)
  if (!live.has(d.id)) { await d.ref.delete(); console.log(`- removed stale answers/${d.id}`); }

let failed = false;
for (const [path, data] of docs) {
  await db.doc(path).set(data);
  const snap = await db.doc(path).get();
  const wrote = Object.keys(snap.data() ?? {}).length, local = Object.keys(data).length;
  const ok = snap.exists && wrote === local;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${path.padEnd(34)} fields ${wrote}/${local}`);
}
console.log(failed ? '\nSeed FAILED verification.' : `\nSeeded to ${projectId}. published:false.`);
process.exit(failed ? 1 : 0);
