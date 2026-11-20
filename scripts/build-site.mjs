/**
 * Assembles a clean, self-contained static site into `_site/` for GitHub Pages
 * or any static hosting service:
 *   /            -> Unified Portal Hub (apps/hub)
 *   /play/       -> Chapter 1 + Chapter 2 real-time Babylon.js apps (apps/fps-demo/dist)
 *   /lab/        -> 4D Hypercube Lab & 9th Room Story (apps/learning-demo/dist)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, '_site');

// Legacy unused multi-megabyte mesh files in fps-demo/dist not imported by chapter 1 or 2
const OMIT_IN_PLAY = new Set(['seated-thinker.js', 'standing-technician.js']);

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

copyDir(path.join(root, 'apps/hub'), outDir);
copyDir(path.join(root, 'apps/fps-demo/dist'), path.join(outDir, 'play'), OMIT_IN_PLAY);
copyDir(path.join(root, 'apps/learning-demo/dist'), path.join(outDir, 'lab'));

// Ensure GitHub Pages serves all static files without Jekyll interference
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

console.log(`Built static playable site at ${outDir}`);
