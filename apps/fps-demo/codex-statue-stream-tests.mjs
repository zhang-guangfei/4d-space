import assert from 'node:assert/strict';
import {selectStatueLOD, statueData, STATUE_ASSETS} from './dist/classical-statues.js';

const level=(distance,flags={})=> selectStatueLOD({kind:'stone',distance,software:true,...flags});
assert.equal(level(6), 'mid');
assert.equal(level(6,{native:true}), 'high');
assert.equal(level(6,{zoom:true}), 'high');
assert.equal(level(2.7), 'high');
assert.equal(level(3.1,{previous:'high'}), 'high');
assert.equal(level(3.4,{previous:'high'}), 'mid');
assert.equal(level(8.4,{previous:'mid'}), 'mid');
assert.equal(level(9.9,{previous:'mid'}), 'low');
assert.equal(level(7,{kind:'bronze'}), 'low');
assert.equal(level(7,{kind:'bronze',zoom:true}), 'high');
const medium=statueData('stone','mid');
assert.equal(medium.indices.length/3,32000);
assert.equal(medium.positions.length,medium.normals.length);
assert.ok(medium.indices.every(index=>index<medium.positions.length/3));
const {min,max}=STATUE_ASSETS.stone.bounds;
assert.ok(medium.positions.every((v,i)=>v>=min[i%3]-1e-6&&v<=max[i%3]+1e-6));
for(const lod of ['low','mid','high']){
 const cavity=statueData('stone',lod).uvs.filter((_,i)=>i%2===0);
 assert.ok(cavity.every(n=>n>=0&&n<=1));
 assert.ok(cavity.some(n=>n<.2)&&cavity.some(n=>n>.98));
}
console.log('PASS sculpture streaming levels, optical inspection, 32K geometry bounds and cavity bake.');
