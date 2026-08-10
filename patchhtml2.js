const fs=require("fs");
let h=fs.readFileSync("public/game.html","utf8");
if(!h.includes('c-pano')){
  h=h.replace('<title>TotemTime</title>',
    '<title>TotemTime</title>\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>\n<script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>');
  h=h.replace('  if(c.type==="warning")',
    '  if(c.type==="pano"){ const src=c.src||t(c.src_key); return src ? `<div class="c-pano" data-pano="${src}"></div>` : ""; }\n  if(c.type==="warning")');
  h=h.replace('.c-aud{width:100%;margin:4px 0;}',
    '.c-aud{width:100%;margin:4px 0;}.c-pano{width:100%;height:300px;border-radius:14px;overflow:hidden;border:1px solid var(--tt-border);background:#000;}');
  h=h.replace('function render(){',
    'function initPanos(){ if(!window.pannellum) return; document.querySelectorAll(".c-pano").forEach(el=>{ if(el.dataset.init) return; el.dataset.init="1"; try{ pannellum.viewer(el,{type:"equirectangular",panorama:el.dataset.pano,autoLoad:true,showZoomCtrl:true,showFullscreenCtrl:true}); }catch(e){} }); }\nfunction render(){');
  h=h.replace('app.innerHTML = S.mode==="player" ? playerView() : adminView();',
    'app.innerHTML = S.mode==="player" ? playerView() : adminView(); initPanos();');
  fs.writeFileSync('public/game.html',h);
  console.log('pano viewer added');
} else { console.log('pano already present'); }
