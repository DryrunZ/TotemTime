#!/bin/bash
# usage: ./make-admin.sh someone@email.com
set -e
EMAIL="${1:?usage: ./make-admin.sh email}"
cd /workspaces/TotemTime

firebase auth:export /tmp/tt-users.json --format=json > /dev/null
UID=$(node -e '
const u = require("/tmp/tt-users.json").users.find(u => (u.email||"").toLowerCase() === process.argv[1].toLowerCase());
if (!u) { console.error("no user with that email"); process.exit(1); }
console.log(u.localId);' "$EMAIL")
echo "uid for $EMAIL: $UID"

cp firestore.rules /tmp/tt-rules.locked
cat > firestore.rules << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
RULES
firebase deploy --only firestore:rules > /dev/null

cp public/config.js /tmp/tt-config.mjs
UID="$UID" EMAIL="$EMAIL" node --input-type=module -e '
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "/tmp/tt-config.mjs";
const db = getFirestore(initializeApp(firebaseConfig));
await setDoc(doc(db, "admins", process.env.UID), { email: process.env.EMAIL, role: "admin", addedAt: new Date().toISOString() });
console.log("admin granted:", process.env.EMAIL);
process.exit(0);
'

mv /tmp/tt-rules.locked firestore.rules
firebase deploy --only firestore:rules > /dev/null
echo "rules re-locked. done."
