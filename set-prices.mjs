#!/usr/bin/env node
// Set every game's store price to $15 (1500 cents). Dry run by default — shows what would change.
//   node set-prices.mjs            # preview only
//   node set-prices.mjs --apply    # write
// Merge-only: touches store.price / store.currency, nothing else.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault(), projectId: 'totemtime-357a2' });
const db = getFirestore();
const APPLY = process.argv.includes('--apply');
for (const d of (await db.collection('games').get()).docs) {
  const s = d.data().store || {};
  console.log(`${d.id.padEnd(14)} published=${d.data().published !== false}  price ${s.price ?? '-'} ${s.currency ?? ''} -> 1500 usd  freeLaunch=${!!s.freeLaunch} claimCode=${s.claimCode ?? '-'}`);
  if (APPLY) await d.ref.set({ store: { price: 1500, currency: 'usd' } }, { merge: true });
}
console.log(APPLY ? '\n✓ prices written' : '\n(preview only — run with --apply to write)');
