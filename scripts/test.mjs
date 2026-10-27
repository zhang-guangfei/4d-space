import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const runs = [
 ['apps/fps-demo', ['tests.mjs']],
 ['apps/fps-demo', ['camera-engine-tests.mjs']],
 ['apps/fps-demo', ['smoke.mjs']],
 ...['geometry','rooms','campaign','ui','rooms-ui'].map(n=>['apps/learning-demo',[`tests/${n}.test.mjs`]])
];
for (const [cwd,args] of runs) {
 console.log(`\n=== ${cwd}: node ${args.join(' ')} ===`);
 const r = spawnSync(process.execPath,args,{cwd:root+cwd,stdio:'inherit'});
 if(r.error) throw r.error;
 if(r.status!==0) process.exit(r.status??1);
}
console.log('\nPASS: all 8 suites; mock/NullEngine checks are not a physical-browser playtest.');
