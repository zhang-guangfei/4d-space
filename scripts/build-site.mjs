/**
 * Assembles the pure First-Person 3D game (Chapter 1 + Chapter 2) directly at
 * the site root `_site/` for GitHub Pages deployment:
 *   /index.html & /chapter.html -> Chapter 1: 回廊空间站（含第一人称六向舱门导航罗盘）
 *   /chapter2.html              -> Chapter 2: 折页之间（16 小节五幕第一人称 + 常驻高维操作台）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, '_site');
const OMIT_FILES = new Set(['seated-thinker.js', 'standing-technician.js']);

function copyDir(src, dst, omitNames = new Set()) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (omitNames.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

copyDir(path.join(root, 'apps/fps-demo/dist'), outDir, OMIT_FILES);
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// Minimal valid 16x16 32-bit BGRA ICO (deep space #071522 with cyan #4de6d3 & gold #f7c346 nested hypercube)
{
  const W = 16, H = 16;
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type = ICO
  header.writeUInt16LE(1, 4);      // count = 1
  header[6] = W; header[7] = H;    // width, height
  header[8] = 0; header[9] = 0;    // palette, reserved
  header.writeUInt16LE(1, 10);     // planes
  header.writeUInt16LE(32, 12);    // bpp
  const bmpSize = 40 + W * H * 4 + H * 4;
  header.writeUInt32LE(bmpSize, 14);
  header.writeUInt32LE(22, 18);    // offset

  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(W, 4);
  dib.writeInt32LE(H * 2, 8);      // XOR + AND mask height
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(W * H * 4, 20);

  const pixels = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = ((H - 1 - y) * W + x) * 4;
      const onOuter = (x === 2 || x === 13) && y >= 2 && y <= 13 || (y === 2 || y === 13) && x >= 2 && x <= 13;
      const onInner = (x === 5 || x === 10) && y >= 5 && y <= 10 || (y === 5 || y === 10) && x >= 5 && x <= 10;
      let r = 7, g = 21, b = 34;
      if (onOuter) { r = 77; g = 230; b = 211; }
      else if (onInner) { r = 247; g = 195; b = 70; }
      pixels[idx] = b; pixels[idx + 1] = g; pixels[idx + 2] = r; pixels[idx + 3] = 255;
    }
  }
  const andMask = Buffer.alloc(H * 4, 0);
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), Buffer.concat([header, dib, pixels, andMask]));
}

console.log(`Built pure First-Person 3D game site (Chapter 1 + Chapter 2) at ${outDir}`);
