const fs=require("fs");
let h=fs.readFileSync("public/game.html","utf8");
if(!h.includes('c-aud')){
  h=h.replace('  if(c.type==="warning")',
    '  if(c.type==="audio"){ const src=c.src||t(c.src_key); return src ? `<audio class="c-aud" src="${src}" controls preload="metadata"></audio>` : ""; }\n  if(c.type==="warning")');
  h=h.replace('.c-vid.pv{cursor:pointer;}', '.c-vid.pv{cursor:pointer;}.c-aud{width:100%;margin:4px 0;}');
  fs.writeFileSync('public/game.html',h);
  console.log('audio component added');
} else { console.log('audio already present'); }
