import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let count=0;
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','vendor','_site'].includes(e.name))continue;const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(/\.(mjs|js)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);count++;}}}
walk(root);console.log(`PASS syntax: ${count} JavaScript files (unchanged vendor excluded).`);
