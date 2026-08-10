const fs=require("fs");
let h=fs.readFileSync("public/game.html","utf8");
const rep=(s,a,b)=>s.split(a).join(b);
let msg=[];
if(!h.includes('rel="icon"')){
  h=rep(h,'<title>TotemTime</title>','<title>TotemTime</title>\n<link rel="icon" type="image/png" href="/assets/games/kidnapped-il/logo.png"/>');
  msg.push('favicon');
}
if(!h.includes('data-match=')){
  h=rep(h,'data-submit="${c.demoAnswer}" data-outcome="${c.outcome_key}" ${dis}',
          'data-submit="${c.demoAnswer}" data-outcome="${c.outcome_key}" data-match="${c.matchMode||"exact"}" ${dis}');
  h=rep(h,'const ok=val.trim().toLowerCase()===(el.dataset.submit||"").toLowerCase();',
          'const guess=val.trim().toLowerCase(); const ans=(el.dataset.submit||"").toLowerCase(); const ok=el.dataset.match==="contains"?guess.includes(ans):guess===ans;');
  h=rep(h,'if(el.hasAttribute("data-action")){ if(el.dataset.action==="advance") nextStep(); }',
          'if(el.hasAttribute("data-action")){ if(el.dataset.action==="advance") nextStep(); else if(el.dataset.action==="coupon"){ S.popup={kind:"win",title:"🎁",body:t("coupon.soon"),cta:t("popup.next")}; render(); } }');
  msg.push('contains-match','coupon');
}
fs.writeFileSync("public/game.html",h);
console.log(msg.length?("patched: "+msg.join(", ")):"already patched");
