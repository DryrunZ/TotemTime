// collage.js — builds the end-of-game souvenir. Pure rendering; no Firestore here.
// Text is drawn as vector paths via opentype.js so Hebrew renders without system fonts.
const sharp = require("sharp");
const opentype = require("opentype.js");
const path = require("path");

const W = 1080, H = 1350, PAD = 48, GAP = 18;
const _fb = require("fs").readFileSync(path.join(__dirname, "assets", "Heebo-Bold.ttf"));
const FONT = opentype.parse(_fb.buffer.slice(_fb.byteOffset, _fb.byteOffset + _fb.byteLength));
const HEB = /[\u0590-\u05FF]/;

// minimal bidi for drawing RTL text left-to-right glyph by glyph: reverse token order, reverse chars inside Hebrew tokens
function visual(s) {
  s = String(s || "");
  if (!HEB.test(s)) return s;
  const toks = s.split(/(\s+)/);
  return toks.reverse().map(t => (HEB.test(t) || /^[\s.,!?:;'"()\-–—]+$/.test(t)) ? [...t].reverse().join("") : t).join("");
}
function textPath(s, size, cx, y, fill, maxW) {
  let v = visual(s);
  let w = FONT.getAdvanceWidth(v, size);
  while (maxW && w > maxW && size > 18) { size -= 2; w = FONT.getAdvanceWidth(v, size); }
  const p = FONT.getPath(v, cx - w / 2, y, size);
  return `<path fill="${fill}" d="${p.toPathData(1)}"/>`;
}
function roundedMask(w, h, r) {
  return Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
}
function grid(n) {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

/**
 * @param {Buffer[]} photos   raw image buffers (any orientation)
 * @param {object} meta       { title, subtitle, footer }
 * @returns {Promise<Buffer>} jpeg
 */
async function renderCollage(photos, meta) {
  const n = Math.max(1, photos.length);
  const { cols, rows } = grid(n);
  const top = 210, bottom = H - 150;
  const areaW = W - 2 * PAD, areaH = bottom - top;
  const tw = Math.floor((areaW - (cols - 1) * GAP) / cols);
  const th = Math.floor((areaH - (rows - 1) * GAP) / rows);
  const lastRowCount = n - (rows - 1) * cols;

  const layers = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const inLast = r === rows - 1;
    const rowCount = inLast ? lastRowCount : cols;
    const rowW = rowCount * tw + (rowCount - 1) * GAP;
    const x0 = PAD + Math.floor((areaW - rowW) / 2) + c * (tw + GAP);
    const y0 = top + r * (th + GAP);
    const img = await sharp(photos[i]).rotate().resize(tw, th, { fit: "cover", position: "attention" })
      .composite([{ input: roundedMask(tw, th, 28), blend: "dest-in" }]).png().toBuffer();
    layers.push({ input: img, left: x0, top: y0 });
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141416"/><stop offset="1" stop-color="#0B0B0C"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="${PAD}" y="${top - 14}" width="${areaW}" height="${areaH + 28}" rx="36" fill="#000" opacity="0.35"/>
    ${textPath(meta.title || "", 64, W / 2, 118, "#D0F267", areaW)}
    ${textPath(meta.subtitle || "", 30, W / 2, 172, "#A5AABE", areaW)}
    ${textPath(meta.footer || "", 26, W / 2, H - 78, "#6B6F89", areaW)}
    <rect x="${W / 2 - 60}" y="${H - 52}" width="120" height="6" rx="3" fill="#D0F267"/>
  </svg>`;

  return sharp(Buffer.from(svg)).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

module.exports = { renderCollage };
