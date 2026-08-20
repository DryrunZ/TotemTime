import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore(initializeApp({ projectId: 'totemtime-357a2' }));
const g = (await db.collection('games').doc('vault-exe').get()).data();
const scenes = ['radio','train','calc','uv','fish','clock','laptop'];
for (const st of g.steps) {
  if (!st.el) continue;
  for (const c of (st.components||[])) {
    const id = c.elementId || c.id;
    if (scenes.includes(st.el) || scenes.includes(id)) {
      if (c.type === 'widget' || c.popup_key !== undefined) {
        console.log('el=' + st.el, 'comp=' + id, 'popup_key=' + (c.popup_key || '(none)'));
      }
    }
  }
}
console.log('--- texts.after keys available ---');
for (const [k,v] of Object.entries(g.texts||{})) if (v.after) console.log(k, '->', v.after);