import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdirSync, writeFileSync } from 'node:fs';
initializeApp({ credential: applicationDefault(), projectId: 'totemtime-357a2' });
const db = getFirestore();

const game = (await db.doc('games/kidnapped-il').get()).data();
const he = (await db.doc('games/kidnapped-il/locales/he').get()).data() || {};
const en = (await db.doc('games/kidnapped-il/locales/en').get()).data() || {};
mkdirSync('games/kidnapped-il/locales', { recursive: true });
writeFileSync('games/kidnapped-il/game.json', JSON.stringify(game, null, 2));
writeFileSync('games/kidnapped-il/locales/he.json', JSON.stringify(he, null, 2));
writeFileSync('games/kidnapped-il/locales/en.json', JSON.stringify(en, null, 2));

console.log(`title=${game.title_key} N=${game.N} steps=${(game.steps||[]).length} scoring=${JSON.stringify(game.scoring||{})}`);
console.log((game.steps||[]).map((s,i)=>`step${i}: ${(s.components||[]).map(c=>c.type+(c.visibleTo==='all'?'(all)':'('+JSON.stringify(c.visibleTo)+')')).join(' ')}`).join('\n'));
console.log('--- FIRST 3 STEPS ---');
console.log(JSON.stringify((game.steps||[]).slice(0,3), null, 1));
console.log('--- WORDS THOSE STEPS USE (he) ---');
const keys = new Set(JSON.stringify((game.steps||[]).slice(0,3)).match(/"[a-zA-Z0-9_.]+_key":"([^"]+)"/g)?.map(m=>m.split('":"')[1].replace('"','')) || []);
for (const k of keys) console.log(`${k} = ${JSON.stringify(he[k])}`);
