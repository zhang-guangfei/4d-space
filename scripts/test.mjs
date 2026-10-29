import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const runs=[['apps/fps-demo',['tests.mjs']],['apps/fps-demo',['camera-engine-tests.mjs']],['apps/fps-demo',null],...['geometry','rooms','campaign','ui','rooms-ui'].map(n=>['apps/learning-demo',[`tests/${n}.test.mjs`]])];
for(const [cwd,args] of runs){const command=args?process.execPath:'npm';const a=args??['run','test:chapter'];console.log(`\n=== ${cwd}: ${command} ${a.join(' ')} ===`);const r=spawnSync(command,a,{cwd:root+cwd,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
console.log('PASS all current FPS base/camera/chapter suites and five learning suites; not a real-GPU playtest.');
