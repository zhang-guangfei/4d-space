import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'apps/fps-demo/dist');
const output = join(root, '_site_codex');
// The research exports and the old four-room demo remain available in source control.
const sourceOnly = new Set(['v3.html', 'game-v3.js', 'look-v3.js', 'game.js', 'style.css', 'physics.js',
  'standing-technician.js', 'seated-thinker.js']);
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const entry of await readdir(source)) {
  if (sourceOnly.has(entry)) continue;
  await cp(join(source, entry), join(output, entry), { recursive: true });
}
console.log('Built _site_codex/ with chapter2/ and local runtime assets.');
