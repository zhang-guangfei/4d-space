/**
 * Assembles the pure First-Person 3D game (Chapter 1 + Chapter 2) directly at
 * the site root `_site/` for GitHub Pages deployment:
 *   /index.html & /chapter.html -> Chapter 1: 回廊空间站
 *   /chapter2.html              -> Chapter 2: 折页之间 (6 first-person + God-View sections)
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

console.log(`Built pure First-Person 3D game site (Chapter 1 + Chapter 2) at ${outDir}`);
