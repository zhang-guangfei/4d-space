import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {statueData,STATUE_ASSETS} from './dist/classical-statues.js';
// Triangle-position streams hashed BEFORE normal repair. Re-indexing split
// corners may change vertex counts but must never change approved sculpture shape.
const hashes={
 bronze:{high:'f29f5124c39fa2339ec5efbf99311f2ef6dea163d88e434f757e9994dec8784f',low:'68125f17ea8b7516918c0d0cac951432c631000dbd149f6bf4564623cbd35e08'},
 stone:{high:'8b005e0e7307a294b758ea27a93dc576ca7a9347242b3f64f2a70eca5f88f90d',low:'374bb0c273f942cad8f6cb1affdd2d6adbf8b58c85cf6ffd69d2bb56fa4564ea'}
};
let totalGroups=0,maxAngle=0;
for(const kind of ['bronze','stone'])for(const lod of ['high','low']){
 const d=statueData(kind,lod),groups=new Map(),p=Buffer.from(d.positions.buffer,d.positions.byteOffset,d.positions.byteLength),hash=createHash('sha256');
 for(const i of d.indices)hash.update(p.subarray(i*12,i*12+12));
 assert.equal(hash.digest('hex'),hashes[kind][lod],kind+lod+' geometry unchanged');
 for(let i=0;i<d.positions.length;i+=3){
  const len=Math.hypot(...d.normals.subarray(i,i+3));assert.ok(Math.abs(len-1)<2e-5,'finite unit source normals');
  const key=Array.from(d.positions.subarray(i,i+3),x=>x.toFixed(5)).join(',');
  const ids=groups.get(key)||[];ids.push(i);groups.set(key,ids);
 }
 let count=0;
 for(const ids of groups.values())if(ids.length>1){count++;for(const i of ids)for(const j of ids){
  let dot=0;for(let k=0;k<3;k++)dot+=d.normals[i+k]*d.normals[j+k];
  const angle=Math.acos(Math.min(1,Math.max(-1,dot)))*180/Math.PI;maxAngle=Math.max(maxAngle,angle);
  assert.ok(angle<5,`${kind}/${lod} false UV-island normal discontinuity ${angle} degrees at ${i},${j}`);
 }}
 assert.ok(count>10,'actually exercised source split vertices');totalGroups+=count;
 assert.equal(d.indices.length/3,lod==='high'?STATUE_ASSETS[kind].triangles:STATUE_ASSETS[kind].lodTriangles);
}
console.log(`PASS source split/corner normals: ${totalGroups} UV-split groups, worst ${maxAngle.toFixed(3)}deg; all4 approved triangle-position streams unchanged.`);
