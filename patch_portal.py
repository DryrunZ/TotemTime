import sys, re
P = "public/portal.html"
src = open(P, encoding="utf-8").read()
orig = src
edits = []

def rep(old, new, name):
    global src
    n = src.count(old)
    if n != 1:
        print(f"ABORT: anchor '{name}' found {n} times (expected 1). No changes written.")
        sys.exit(1)
    src = src.replace(old, new)
    edits.append(name)

# ---------- 1. English strings: add new keys ----------
rep('''    "games.role.director":"Director",
    "games.role.player":"Player",''',
'''    "games.role.director":"Director",
    "games.role.player":"Player",
    "games.finished.title":"Finished games",
    "games.finished.sub":"Played to the end. Your story so far.",
    "games.finished.at":"Finished {date}",
    "games.points":"{n} points",
    "games.duration":"{m} min",
    "games.ledger":"Game log",
    "games.ledger.empty":"No events recorded.",
    "games.delete":"Delete",
    "games.delete.title":"Delete this game?",
    "games.delete.warn":"It disappears from My Games for you and your team. This cannot be undone.",
    "games.delete.go":"Yes, delete it",
    "games.delete.done":"Game deleted",
    "games.custom.badge":"Personalized",
    "ledger.start":"Game started",
    "ledger.reset":"Game reset",
    "ledger.solve":"Solved {ref}",
    "ledger.wrong":"Wrong answer on {ref}",
    "ledger.hint":"Hint {n} on {ref}",
    "ledger.skip":"Skipped {ref}",
    "ledger.finish":"Finished the game",''', "en.keys")

# ---------- 2. Hebrew: full parity ----------
rep('''  he: {
    "app.tagline":"בורחים ביחד. מכל מקום.",''',
'''  he: {
    "app.tagline":"בורחים ביחד. מכל מקום.",

    "auth.email.ph":"you@example.com", "auth.password.ph":"לפחות 6 תווים",
    "auth.name.ph":"איך לקרוא לך?",
    "auth.forgot":"שכחת סיסמה?",
    "auth.reset.sent":"שלחנו מייל לאיפוס הסיסמה.",
    "auth.reset.need_email":"קודם מלאו את האימייל.",
    "auth.have_account":"כבר יש לך חשבון?",
    "auth.no_account":"חדשים כאן?",
    "auth.accept":"בהמשך את/ה מאשר/ת את תנאי השימוש ומדיניות הפרטיות.",
    "auth.err.generic":"משהו לא עבד. בדקו את הפרטים ונסו שוב.",
    "auth.err.invalid":"אימייל או סיסמה שגויים.",
    "auth.err.exists":"האימייל הזה כבר רשום.",
    "auth.err.weak":"הסיסמה קצרה מדי.",
    "auth.signout":"יציאה",

    "games.sub":"כל מה שקניתם או הוזמנתם אליו.",
    "games.empty.title":"עדיין אין משחקים",
    "games.empty.body":"קנו משחק, או בקשו ממנהל המשחק קישור הזמנה.",
    "games.empty.cta":"לחנות",
    "games.replay":"לשחק שוב",
    "games.status.ready":"מוכן למשחק",
    "games.status.playing":"בעיצומו",
    "games.status.done":"הסתיים",
    "games.role.director":"מנהל המשחק",
    "games.role.player":"שחקן",
    "games.seats":"{used} מתוך {total} מקומות",
    "games.players_short":"{n} שחקנים",
    "games.finished.title":"משחקים שהסתיימו",
    "games.finished.sub":"שיחקתם עד הסוף. הסיפור שלכם עד כה.",
    "games.finished.at":"הסתיים {date}",
    "games.points":"{n} נקודות",
    "games.duration":"{m} דק׳",
    "games.ledger":"יומן המשחק",
    "games.ledger.empty":"לא נרשמו אירועים.",
    "games.delete":"מחיקה",
    "games.delete.title":"למחוק את המשחק?",
    "games.delete.warn":"הוא ייעלם מ״המשחקים שלי״ אצלך ואצל הצוות. אי אפשר לבטל.",
    "games.delete.go":"כן, למחוק",
    "games.delete.done":"המשחק נמחק",
    "games.custom.badge":"מותאם אישית",
    "ledger.start":"המשחק התחיל",
    "ledger.reset":"המשחק אופס",
    "ledger.solve":"פתרתם את {ref}",
    "ledger.wrong":"תשובה שגויה ב-{ref}",
    "ledger.hint":"רמז {n} ב-{ref}",
    "ledger.skip":"דילגתם על {ref}",
    "ledger.finish":"סיימתם את המשחק",

    "store.sub":"בוחרים משחק, בוחרים גודל צוות, משחקים הערב.",
    "store.from":"החל מ-",
    "store.buy":"לקנות",
    "store.seats":"גודל הצוות",
    "store.seats.n":"{n} שחקנים",
    "store.coupon":"קוד קופון",
    "store.coupon.apply":"הפעלה",
    "store.coupon.ok":"הקופון הופעל — {pct}% הנחה",
    "store.coupon.bad":"הקופון לא תקף.",
    "store.total":"סה״כ",
    "store.claim.ph":"יש לכם קוד? הכניסו אותו כאן",
    "store.claim.bad":"הקוד לא נכון.",
    "store.claimed":"המשחק שלכם! תמצאו אותו ב״המשחקים שלי״.",
    "store.checkout":"המשך לתשלום",
    "store.checkout.soon":"התשלום עדיין לא מחובר. ההזמנה הוכנה — נשלים את הרכישה כשהתשלום יעלה לאוויר.",
    "store.empty":"עדיין לא פורסמו משחקים.",
    "store.what":"מה מקבלים",
    "store.perk.1":"משחק אחד לשיתוף, משחקים ביחד",
    "store.perk.2":"אתם מנהלי המשחק — הזמינו את הצוות",
    "store.perk.3":"הופכים אותו לאישי עם תמונות ומילים משלכם",

    "coupons.sub":"מרוויחים במשחק. מנצלים במשחק הבא.",
    "coupons.empty.title":"עדיין אין קופונים",
    "coupons.empty.body":"סיימו משחק ונשאיר לכם אחד כאן.",
    "coupons.off":"{pct}% הנחה",
    "coupons.expires":"בתוקף עד {date}",
    "coupons.expired":"פג תוקף",
    "coupons.used":"נוצל",
    "coupons.copy":"העתקה",
    "coupons.copied":"הועתק",
    "coupons.use":"לנצל",

    "account.sub":"השם, הפרצוף והשפה שלך.",
    "account.avatar":"אווטאר",
    "account.avatar.pick":"בחירת אווטאר",
    "account.nickname":"כינוי",
    "account.nickname.ph":"מה הצוות יראה במשחק",
    "account.fullname":"שם מלא",
    "account.email":"אימייל",
    "account.email.locked":"את האימייל אי אפשר לשנות כאן.",
    "account.language":"שפה",
    "account.type":"סוג חשבון",
    "account.type.personal":"פרטי",
    "account.type.company":"חברה",
    "account.company":"שם החברה",
    "account.member_since":"חבר/ה מאז {date}",
    "account.save":"שמירה",
    "account.saved":"נשמר",
    "account.stats.played":"משחקים ששוחקו",
    "account.stats.done":"הושלמו",
    "account.stats.coupons":"קופונים",
    "account.danger":"אזור מסוכן",
    "account.delete":"מחיקת החשבון שלי",
    "account.delete.warn":"מוחק לצמיתות את הפרופיל, ההיסטוריה והקופונים. משחקים שקניתם נשארים אצל הצוות אבל תאבדו גישה. אי אפשר לבטל.",
    "account.delete.confirm":"הקלידו DELETE לאישור",
    "account.delete.pw":"אישור הסיסמה",
    "account.delete.go":"למחוק לצמיתות",
    "account.delete.done":"החשבון נמחק.",
    "account.delete.needpw":"הכניסו שוב את הסיסמה כדי להמשיך.",

    "dir.sub":"הזמינו את הצוות והפכו כל משחק לאישי.",
    "dir.empty.title":"עדיין לא מנהלים משחק",
    "dir.empty.body":"קנו משחק ותהפכו למנהלי המשחק שלו.",
    "dir.invite":"הזמנת שחקנים",
    "dir.customize":"התאמה אישית",
    "dir.back":"חזרה",

    "inv.sub":"נשארו {left} מקומות מתוך {total}. הוסיפו שם ואימייל ושתפו את הקישור.",
    "inv.full":"כל {total} המקומות תפוסים.",
    "inv.name":"שם השחקן",
    "inv.name.ph":"דנה",
    "inv.email":"אימייל",
    "inv.add":"יצירת הזמנה",
    "inv.you":"את/ה (מנהל המשחק)",
    "inv.pending":"הוזמן",
    "inv.accepted":"הצטרף",
    "inv.share":"שיתוף",
    "inv.remove":"הסרה",
    "inv.remove.confirm":"להסיר את {name} מהמשחק?",
    "inv.link":"קישור הזמנה",
    "inv.share.title":"שתפו את ההזמנה",
    "inv.share.with":"או שתפו בקישור",
    "inv.share.msg":"{name}, הוזמנת לשחק איתנו ב-{game} ב-TotemTime. מצטרפים כאן: {link}",
    "inv.created":"ההזמנה נוצרה",
    "inv.none":"עדיין לא הוזמנו שחקנים.",
    "inv.err.dupe":"האימייל הזה כבר הוזמן.",
    "inv.err.email":"הכניסו אימייל תקין.",

    "cust.sub":"כמה מילים ותמונות משלכם הופכות משחק למשחק שלכם.",
    "cust.none":"במשחק הזה אין עדיין מה להתאים.",
    "cust.locked":"המשחק התחיל, ולכן ההתאמה האישית נעולה.",
    "cust.save":"שמירת ההתאמה",
    "cust.saved":"ההתאמה נשמרה",
    "cust.upload":"העלאה",
    "cust.replace":"החלפה",
    "cust.remove":"הסרה",
    "cust.drop":"לחצו להעלאת תמונה",
    "cust.drop.video":"לחצו להעלאת וידאו",
    "cust.or_url":"…או הדביקו קישור",
    "cust.default":"משתמש בברירת המחדל",
    "cust.uploading":"מעלה…",
    "cust.toobig":"הקובץ גדול מדי (עד {mb} MB).",
    "cust.preview":"תצוגה מקדימה",

    "join.title":"הוזמנת",
    "join.body":"{director} הזמין/ה אותך לשחק {game}.",
    "join.cta":"הצטרפות למשחק",
    "join.signin":"היכנסו כדי לאשר את ההזמנה",
    "join.done":"אתם בפנים! המשחק עכשיו ב״המשחקים שלי״.",
    "join.bad":"קישור ההזמנה כבר לא תקף.",

    "common.copied":"הקישור הועתק", "common.saving":"שומר…", "common.loading":"טוען…",
    "common.error":"משהו השתבש. נסו שוב.",
    "common.whatsapp":"וואטסאפ", "common.email":"אימייל", "common.telegram":"טלגרם",
    "common.more":"עוד", "common.optional":"לא חובה", "common.free":"חינם",''', "he.parity")

# ---------- 3. loadEverything: hide archived ----------
rep('''  S.instances = [...byId.values()];
  await Promise.all(S.instances.map(async i => { i.game = await loadGame(i.gameId); }));''',
'''  S.instances = [...byId.values()].filter(i => !i.archived);
  await Promise.all(S.instances.map(async i => { i.game = await loadGame(i.gameId); }));''', "archived.filter")

# ---------- 4. statusOf reads the lifecycle status ----------
rep('''function statusOf(inst){
  if (inst.completedAt || (inst.room && inst.room.status === "completed")) return "done";
  if (inst.playedAt   || (inst.room && inst.room.status === "playing"))   return "playing";
  return "ready";
}''',
'''function statusOf(inst){
  if (inst.status === "finished" || inst.finishedAt || inst.completedAt) return "done";
  if (inst.status === "played" || inst.playedAt) return "playing";
  return "ready";
}
/* customization on the banner: first image the director set is the cover; a badge marks it personalized */
function custCover(inst){
  const man = (inst.game && inst.game.customizable) || [];
  const c = inst.customization || {};
  for (const f of man) if (f.type === "image" && c[f.key]) return c[f.key];
  for (const k in c) if (/^https?:\\/\\//.test(String(c[k])) && /\\.(png|jpe?g|webp|gif)(\\?|$)/i.test(String(c[k]))) return c[k];
  return "";
}
function custTitleBits(inst){
  const man = (inst.game && inst.game.customizable) || [];
  const c = inst.customization || {};
  return man.filter(f => (f.type === "text" || !f.type) && c[f.key] && String(c[f.key]).trim() && String(c[f.key]).length <= 40)
            .slice(0, 2).map(f => String(c[f.key]).trim());
}
const isCustomized = inst => Object.values(inst.customization || {}).some(v => String(v||"").trim());

function ledgerLine(e){
  const ref = e.ref != null ? String(e.ref) : "";
  const k = e.kind;
  let txt = k === "hint" ? t("ledger.hint",{n:(e.idx||0)+1, ref}) : t("ledger."+k, {ref});
  if (txt === "ledger."+k) txt = k + (ref ? " " + ref : "");
  const pts = typeof e.points === "number" && e.points ? ` <b class="${e.points>0?"lime":""}" style="${e.points<0?"color:var(--danger)":""}">${e.points>0?"+":""}${e.points}</b>` : "";
  const tm = e.t ? new Date(e.t).toLocaleTimeString(S.lang==="he"?"he-IL":"en-GB",{hour:"2-digit",minute:"2-digit"}) : "";
  return `<div class="rowitem" style="padding:9px 0">
    <span class="tiny muted" style="min-width:44px" dir="ltr">${esc(tm)}</span>
    <span class="small grow">${esc(txt)}${e.name?` <span class="muted">· ${esc(e.name)}</span>`:""}</span>${pts}
  </div>`;
}
function ledgerSheet(id){
  const i = instById(id); if (!i) return;
  const rows = (i.ledger || []).slice().sort((a,b)=>(a.t||0)-(b.t||0)).map(ledgerLine).join("");
  sheet(`<h3 class="h2" style="margin-bottom:4px">${esc(t("games.ledger"))}</h3>
    <p class="small muted" style="margin-bottom:12px">${esc(i.title||i.gameId)}${i.finishedAt?` · ${esc(t("games.finished.at",{date:fmtDate(i.finishedAt)}))}`:""}</p>
    ${rows || `<p class="small muted">${esc(t("games.ledger.empty"))}</p>`}
    <button class="btn ghost block" style="margin-top:16px" data-act="closesheet">${esc(t("common.close"))}</button>`);
}
function deleteGameSheet(id){
  const i = instById(id); if (!i) return;
  sheet(`<h3 class="h2" style="color:var(--danger);margin-bottom:8px">${esc(t("games.delete.title"))}</h3>
    <p class="body" style="margin-bottom:6px"><b>${esc(i.title||i.gameId)}</b>${i.code?` · ${esc(i.code)}`:""}</p>
    <p class="small muted" style="margin-bottom:18px">${esc(t("games.delete.warn"))}</p>
    <button class="btn solid-danger block" data-act="deletegame" data-v="${esc(i.id)}">${esc(t("games.delete.go"))}</button>
    <button class="btn link" style="margin:8px auto 0;display:block" data-act="closesheet">${esc(t("common.cancel"))}</button>`);
}
async function deleteGame(id){
  const btn = document.querySelector('[data-act="deletegame"]'); if (btn){ btn.disabled = true; btn.textContent = t("common.saving"); }
  try{
    await httpsCallable(fns, "archiveInstance")({ instanceId: id });
    closeSheet(); toast(t("games.delete.done"));
    await loadEverything(); await resolveTitles(); render();
  }catch(ex){ console.warn(ex); toast(t("common.error"), "bad"); if (btn){ btn.disabled=false; btn.textContent=t("games.delete.go"); } }
}''', "statusOf+helpers")

# ---------- 5. viewGames: banner customization, finished section, delete ----------
rep('''  const cards = S.instances.map(i => {
    const st  = statusOf(i);
    const cov = coverOf(i.game);
    const seatsUsed = 1 + (i.invitesCount || 0);
    return `
    <article class="gamecard">
      <div class="cover" style="${cov?`background-image:url('${esc(cov)}')`:""}">
        <div class="over">
          <span class="chip ${st==="done"?"dead":st==="playing"?"warn":"lime"}">
            <span class="dot"></span>${esc(t("games.status."+st))}</span>
          <span class="chip ${i.role==="director"?"blue":""}">${esc(t("games.role."+i.role))}</span>
        </div>
      </div>
      <div class="body">
        <h3 class="h2">${esc(i.title || i.gameId)}</h3>
        <p class="small muted" style="margin-bottom:14px">
          ${esc(t("games.seats",{used:seatsUsed,total:i.seatCount||seatsUsed}))}
          ${i.code?` · ${esc(t("games.code"))} <b class="lime">${esc(i.code)}</b>`:""}
        </p>
        <button class="btn block" data-act="play" data-v="${esc(i.id)}">
          ${esc(st==="playing"?t("games.resume"):st==="done"?t("games.replay"):t("games.start"))}
        </button>
        ${i.role==="director" ? `
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn ghost sm grow" data-act="go" data-v="invites/${esc(i.id)}">👥 ${esc(t("dir.invite"))}</button>
          <button class="btn ghost sm grow" data-act="go" data-v="customize/${esc(i.id)}">✨ ${esc(t("dir.customize"))}</button>
        </div>` : ""}
      </div>
    </article>`;
  }).join("");

  return pageTitle(t("games.title"), t("games.sub")) + `<div class="cols">${cards}</div>`;''',
'''  const card = i => {
    const st  = statusOf(i);
    const cc  = custCover(i);
    const cov = cc || coverOf(i.game);
    const bits = custTitleBits(i);
    const seatsUsed = 1 + (i.invitesCount || 0);
    return `
    <article class="gamecard">
      <div class="cover" style="${cov?`background-image:url('${esc(cov)}')`:""}">
        <div class="over">
          <span class="chip ${st==="done"?"dead":st==="playing"?"warn":"lime"}">
            <span class="dot"></span>${esc(t("games.status."+st))}</span>
          <span class="row" style="gap:6px">
            ${isCustomized(i)?`<span class="chip lime">✨ ${esc(t("games.custom.badge"))}</span>`:""}
            <span class="chip ${i.role==="director"?"blue":""}">${esc(t("games.role."+i.role))}</span>
          </span>
        </div>
      </div>
      <div class="body">
        <h3 class="h2">${esc(i.title || i.gameId)}</h3>
        ${bits.length?`<p class="small lime" style="margin-top:2px">${esc(bits.join(" · "))}</p>`:""}
        <p class="small muted" style="margin:4px 0 14px">
          ${esc(t("games.seats",{used:seatsUsed,total:i.seatCount||seatsUsed}))}
          ${i.code?` · ${esc(t("games.code"))} <b class="lime">${esc(i.code)}</b>`:""}
        </p>
        <button class="btn block" data-act="play" data-v="${esc(i.id)}">
          ${esc(st==="playing"?t("games.resume"):st==="done"?t("games.replay"):t("games.start"))}
        </button>
        ${i.role==="director" ? `
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn ghost sm grow" data-act="go" data-v="invites/${esc(i.id)}">👥 ${esc(t("dir.invite"))}</button>
          <button class="btn ghost sm grow" data-act="go" data-v="customize/${esc(i.id)}">✨ ${esc(t("dir.customize"))}</button>
          <button class="btn danger sm" data-act="deletegamesheet" data-v="${esc(i.id)}" aria-label="${esc(t("games.delete"))}">🗑</button>
        </div>` : ""}
      </div>
    </article>`;
  };
  const finishedCard = i => {
    const cov = custCover(i) || coverOf(i.game);
    const mins = i.durationMs ? Math.round(i.durationMs/60000) : null;
    return `
    <article class="gamecard">
      <div class="cover" style="aspect-ratio:21/9;${cov?`background-image:url('${esc(cov)}')`:""}">
        <div class="over"><span class="chip dead"><span class="dot"></span>${esc(t("games.status.done"))}</span>
          ${isCustomized(i)?`<span class="chip lime">✨ ${esc(t("games.custom.badge"))}</span>`:""}</div>
      </div>
      <div class="body">
        <div class="row between" style="align-items:flex-start">
          <div class="grow">
            <h3 class="h2">${esc(i.title || i.gameId)}</h3>
            <p class="small muted" style="margin-top:2px">${esc(t("games.finished.at",{date:fmtDate(i.finishedAt)}))}
              ${typeof i.finalPoints==="number"?` · <b class="lime">${esc(t("games.points",{n:i.finalPoints}))}</b>`:""}
              ${mins!=null?` · ${esc(t("games.duration",{m:mins}))}`:""}</p>
          </div>
        </div>
        <div class="row" style="gap:8px;margin-top:12px">
          <button class="btn ghost sm grow" data-act="ledger" data-v="${esc(i.id)}">📜 ${esc(t("games.ledger"))}</button>
          <button class="btn ghost sm grow" data-act="play" data-v="${esc(i.id)}">${esc(t("games.replay"))}</button>
          ${i.role==="director"?`<button class="btn danger sm" data-act="deletegamesheet" data-v="${esc(i.id)}" aria-label="${esc(t("games.delete"))}">🗑</button>`:""}
        </div>
      </div>
    </article>`;
  };
  const live = S.instances.filter(i => statusOf(i) !== "done");
  const done = S.instances.filter(i => statusOf(i) === "done");

  let out = pageTitle(t("games.title"), t("games.sub"));
  out += live.length ? `<div class="cols">${live.map(card).join("")}</div>`
                     : emptyState("🎟️", t("games.empty.title"), t("games.empty.body"), t("games.empty.cta"), "store");
  if (done.length) out += `
    <div class="page-title" style="margin-top:28px"><h2 class="h2">${esc(t("games.finished.title"))}</h2>
      <p class="small muted" style="margin-top:4px">${esc(t("games.finished.sub"))}</p></div>
    <div class="cols">${done.map(finishedCard).join("")}</div>`;
  return out;''', "viewGames")

# ---------- 6. customize lock uses lifecycle ----------
rep('''  const locked   = !!(inst.playedAt || (inst.room && inst.room.status !== "not_started"));''',
'''  const locked   = !!(inst.playedAt || inst.status === "played" || inst.status === "finished");''', "cust.locked")

# ---------- 7. click actions ----------
rep('''    case "deleteaccount": deleteSheet(); break;''',
'''    case "deleteaccount": deleteSheet(); break;
    case "deletegamesheet": deleteGameSheet(v); break;
    case "deletegame":  await deleteGame(v); break;
    case "ledger":      ledgerSheet(v); break;''', "actions")

if src == orig:
    print("ABORT: nothing changed"); sys.exit(1)
open(P, "w", encoding="utf-8").write(src)
print("OK patched:", ", ".join(edits))
print("size", len(orig), "->", len(src))
