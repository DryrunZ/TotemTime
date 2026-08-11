#!/usr/bin/env node
// Seed Vault.exe content docs into Firestore.
//
//   node seed-vault-exe.mjs [--project totemtime-357a2]
//
// Auth (first match wins): GOOGLE_APPLICATION_CREDENTIALS env,
// ./serviceAccount.json next to this script, or gcloud ADC.
//
// Uses set() — full-document replace — on purpose. With set(), dotted keys
// like "el.die.name" are stored as LITERAL field names. Any later PARTIAL
// update() to these docs MUST use new FieldPath('el.die.name'): plain string
// paths in update() silently create nested maps (the s4.h1 lesson).
//
// The script reads every doc back after writing and compares field counts,
// so a seed can never fail silently again.

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argIdx = process.argv.indexOf('--project');
const projectId =
  argIdx > -1 ? process.argv[argIdx + 1]
              : (process.env.GOOGLE_CLOUD_PROJECT || 'totemtime-357a2');

const load = (p) => JSON.parse(readFileSync(join(here, p), 'utf8'));
const game    = load('game.json');
const answers = load('answers.private.json');
const en      = load('locales/en.json');
const he      = load('locales/he.json');

const saPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (existsSync(join(here, 'serviceAccount.json')) ? join(here, 'serviceAccount.json') : null);

initializeApp(
  saPath
    ? { credential: cert(JSON.parse(readFileSync(saPath, 'utf8'))), projectId }
    : { credential: applicationDefault(), projectId }
);
const db = getFirestore();

const countTodos = (o) => (JSON.stringify(o).match(/TODO/g) || []).length;

const docs = [
  ['games/vault-exe',                 game],
  ['games/vault-exe/private/answers', answers],
  ['games/vault-exe/locales/en',      en],
  ['games/vault-exe/locales/he',      he],
];

let failed = false;
for (const [path, data] of docs) {
  await db.doc(path).set(data);            // idempotent full replace
  const snap  = await db.doc(path).get();  // verify by reading back
  const wrote = Object.keys(snap.data() ?? {}).length;
  const local = Object.keys(data).length;
  const ok    = snap.exists && wrote === local;
  if (!ok) failed = true;
  console.log(
    `${ok ? '\u2713' : '\u2717'} ${path.padEnd(36)} fields ${wrote}/${local}   TODOs ${countTodos(data)}`
  );
}

console.log(
  failed
    ? '\nSeed FAILED verification — check credentials/project before trusting anything.'
    : `\nSeeded to ${projectId}. published:false — invisible to players until flipped.`
);
process.exit(failed ? 1 : 0);
