const admin = require("firebase-admin");
const fs = require("fs");
const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

async function main() {
  const base = "games/haunted-manor";
  const game = read(`${base}/game.json`);
  const answers = read(`${base}/answers.json`);
  const he = read(`${base}/locales/he.json`);
  const en = read(`${base}/locales/en.json`);

  await db.doc("games/haunted-manor").set(game);
  for (const [stepId, val] of Object.entries(answers)) {
    if (stepId.startsWith("_")) continue;
    await db.doc(`games/haunted-manor/answers/${stepId}`).set(val);
  }
  await db.doc("games/haunted-manor/locales/he").set(he);
  await db.doc("games/haunted-manor/locales/en").set(en);
  console.log("✓ Seeded haunted-manor (game + answers + he/en locales).");
}
main().catch((e) => { console.error(e); process.exit(1); });
