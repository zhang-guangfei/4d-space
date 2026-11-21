import assert from 'node:assert/strict';
import {doorCompass} from './dist/door-compass.js';
import {viewBasis} from './dist/chapter-motion.js';
import {canonicalFrame,cellNeighbors,cellId,normalFor,initialState,transportFrame} from './dist/chapter-topology.js';

const start=initialState();
assert.deepEqual(doorCompass(start,viewBasis(0,0),'upper').map(d=>d.target),
 ['X+','X-','Y+','Y-','Z+','Z-']);
assert.deepEqual(doorCompass(start,viewBasis(Math.PI/2,0),'upper').map(d=>d.open),
 [false,false,true,true,false,false]);
for(const n of cellNeighbors(normalFor('W+'))){
 const frame=transportFrame(start.frame,start.normal,n);
 for(const pitch of [-1.5,-.7,0,.7,1.5])for(const yaw of [-2,-1,0,.78,1,2]){
  const entries=doorCompass({normal:n,frame},viewBasis(yaw,pitch),'lower');
  assert.deepEqual(entries.map(e=>e.target).sort(),cellNeighbors(n).map(cellId).sort());
  assert.ok(entries.every(e=>e.open));
 }
}
const rolled={forward:[0,0,1],right:[0,1,0],up:[-1,0,0]};
assert.equal(doorCompass({normal:normalFor('W+'),frame:canonicalFrame(normalFor('W+'))},rolled,'lower')[4].target,'Y-');
console.log('PASS six unique camera-relative door bearings through seams, pitch and roll.');
