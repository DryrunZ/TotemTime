#!/usr/bin/env node
// Art of War — patch 4: launch on the landing page + new prices ($15 / ₪45 per player, every game).
//   node patch-aow-4.mjs            (from repo root)
// Anchored + idempotent. Touches public/index.html only.
import { readFileSync, writeFileSync } from 'node:fs';

const MARK = 'AOW:patch4';
const file = 'public/index.html';
let html = readFileSync(file, 'utf8');
if (html.includes(MARK)) { console.log('already applied — nothing to do'); process.exit(0); }

const edits = [
// ---- prices (the JS fills every .px-per / .px-min / totals from this) ----
[`var PRICES = { en:{ per:10, sym:"$", loc:"en-US" }, he:{ per:30, sym:"₪", loc:"he-IL" } };`,
 `var PRICES = { en:{ per:15, sym:"$", loc:"en-US" }, he:{ per:45, sym:"₪", loc:"he-IL" } };  // ${MARK}`],
[`kidnAPPed, Vault.exe, and more coming. $10 per player, from 3 players.">`,
 `kidnAPPed, Vault.exe and Sun Tzu: The Art of War. $15 per player, from 3 players.">`],
[`Cooperate or fail. From $10 per player.">`, `Cooperate or fail. From $15 per player.">`],
[`<b class="px-per">$10</b><span data-t="stat.price">`, `<b class="px-per">$15</b><span data-t="stat.price">`],
[`<b class="px-per">$10</b><span data-t="price.per">`, `<b class="px-per">$15</b><span data-t="price.per">`],
[`<h2 data-t="price.title">Ten dollars a player. That's it.</h2>`, `<h2 data-t="price.title">Fifteen dollars a player. That's it.</h2>`],
[`"price.title": "שלושים שקל לשחקן. זהו.",`, `"price.title": "45 שקל לשחקן. זהו.",`],

// ---- hero shelf: Sun Tzu is live ----
[`<a class="ph p3 soon" href="#g-artofwar"><img src="assets/site/poster-suntzu.jpg" alt="Sun Tzu: The Art of War" loading="eager" decoding="async"><span class="cap">Sun Tzu<small data-t="shelf.soon">Coming soon</small></span></a>`,
 `<a class="ph p3" href="#g-artofwar"><img src="assets/site/poster-suntzu.jpg" alt="Sun Tzu: The Art of War" loading="eager" decoding="async"><span class="cap">Sun Tzu<small data-t="shelf.play">Play now</small></span></a>`],

// ---- games section intro ----
[`And one still in the workshop.</p>`, `And Sun Tzu's five principles, applied to your own business challenge.</p>`],
[`ואחד שעדיין במעבדה.",`, `וחמשת העקרונות של סון טסו — על האתגר העסקי שלכם.",`],

// ---- the game card ----
[`<article class="game soon rv" id="g-artofwar"`, `<article class="game rv" id="g-artofwar"`],
[`alt="Sun Tzu — The Art of War" loading="lazy" decoding="async" width="1280" height="720"><div class="badges"><span class="chip warn" data-t="games.soon">Coming soon</span></div></div>`,
 `alt="Sun Tzu — The Art of War" loading="lazy" decoding="async" width="1280" height="720"><div class="badges"><span class="chip warn" data-t="games.new">New</span></div></div>`],
[`<span class="kind" data-t="games.k.ai">Strategy · vs. AI</span>
          <h3>Sun Tzu: The Art of War</h3>`,
 `<span class="kind" data-t="games.k.ai">Strategy · For business teams</span>
          <h3>Sun Tzu: The Art of War</h3>
          <div class="tags"><span class="chip" data-t="tag.p36">3–6 players</span><span class="chip" data-t="tag.m45">~45 min</span><span class="chip" data-t="tag.heonly">Hebrew</span></div>`],
[`<p data-t="games.artofwar">Know yourself, know your enemy. See, think and move before the others — against an AI that adapts to your team and learns from the move you just made. In the workshop.</p>`,
 `<p data-t="games.artofwar">Five riddles unlock five of Sun Tzu's principles. After each one, your team writes how it applies to your own business challenge — one you set when you buy, or the classic: how does our lemonade stand beat the new one down the road? At the end, Sun Tzu himself reads your plan and hands out fortune cookies.</p>`],
[`<a class="btn ghost sm" href="mailto:totem@totemtime.com?subject=Sun%20Tzu%20-%20tell%20me%20when" data-t="games.notify">Tell me when it's out</a>`,
 `<button class="btn sm" data-act="buy" data-t="games.buy">Buy game</button>
            <span class="tiny muted"><span class="px-min">from $45</span> · <span data-t="games.from3">3 players</span></span>`],
[`"games.k.ai": "אסטרטגיה · מול AI",`, `"games.k.ai": "אסטרטגיה · לצוותים עסקיים",\n      "tag.heonly": "עברית",`],
[`"games.artofwar": "דע את עצמך, דע את האויב. לראות, לחשוב ולזוז לפני האחרים — מול AI שמסתגל לקבוצה שלכם ולומד מהמהלך שרק עשיתם. נמצא בעבודה.",`,
 `"games.artofwar": "חמש חידות פותחות חמישה עקרונות של סון טסו. אחרי כל אחת, הצוות כותב איך העיקרון עובד באתגר העסקי שלכם — זה שתגדירו ברכישה, או הקלאסי: איך דוכן הלימונדה שלנו ינצח את החדש שנפתח במורד הרחוב? ובסוף, סון טסו בעצמו קורא את התוכנית שלכם ומחלק עוגיות מזל.",`],
];

for (const [anchor] of edits) {
  const n = html.split(anchor).length - 1;
  if (n !== 1) { console.error(`ABORT: anchor found ${n}x — nothing written:\n${anchor.slice(0, 140)}`); process.exit(1); }
}
for (const [anchor, repl] of edits) html = html.replace(anchor, () => repl);
writeFileSync(file, html);
console.log(`✓ patched ${file} (${edits.length} edits).`);
