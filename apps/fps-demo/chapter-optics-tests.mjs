// Independent optical oracle. Tests math + real Babylon matrices, not GPU pixels.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/chapter-topology.js';
import * as O from './dist/optics.js';
import {StationRenderer} from './dist/station-renderer.js';
const noop=()=>{};
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,
 window:{addEventListener:noop,removeEventListener:noop},
 document:{addEventListener:noop,removeEventListener:noop},navigator:{}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./dist/vendor/babylon.js',import.meta.url),'utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
let matrices=0;
try {
 for(const id of T.CELL_IDS){
  const n=T.normalFor(id);
  const state=id==='W+'?T.initialState():{normal:n,frame:T.canonicalFrame(n),p:T.scale(n,T.H)};
  const instances=O.buildOpticalInstances(state,'lower');
  assert.equal(instances.length,49);
  for(const instance of instances){
   const node=new B.TransformNode('matrix oracle',scene);
   StationRenderer.prototype.setTransform.call({B},node,instance.transform);
   node.computeWorldMatrix(true);
   const p=[.2,-.5,.8],actual=B.Vector3.TransformCoordinates(new B.Vector3(...p),node.getWorldMatrix()).asArray();
   const expected=T.mapPoint(instance.transform,p);
   // Babylon matrix storage is Float32; atlas arithmetic remains double precision.
   assert.ok(Math.max(...actual.map((x,j)=>Math.abs(x-expected[j])))<1e-6);
   if(instance.depth===4){
    const planes=O.clipPlanes(instance.quads,[0,0,0]);
    assert.equal(planes.length,20);
    assert.equal(T.cellId(instance.normal),id);
    assert.ok(O.insideClips(instance.transform.offset,planes));
    assert.ok(!O.insideClips(instance.transform.offset.map(x=>x*.1),planes),'No false near-room self image');
   }
   node.dispose();matrices++;
  }
 }
} finally {scene.dispose();engine.dispose();}
// Independent segment/rectangle oracle: a point is visible along a path iff
// the eye-to-point segment intersects EVERY intervening rectangular portal.
// Seeded samples make any regression reproducible.
let seed=0x5eed1234;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function intersects(eye,p,q){
 const min=q[0].map((_,k)=>Math.min(...q.map(x=>x[k])));
 const max=q[0].map((_,k)=>Math.max(...q.map(x=>x[k])));
 const axis=min.findIndex((x,k)=>max[k]-x<1e-7);
 assert.ok(axis>=0,'Signed-axis unfolding must preserve axis-aligned portal planes');
 const t=(min[axis]-eye[axis])/(p[axis]-eye[axis]);
 if(t<0||t>1||!Number.isFinite(t))return false;
 return min.every((v,k)=>k===axis||(eye[k]+t*(p[k]-eye[k])>=v&&eye[k]+t*(p[k]-eye[k])<=max[k]));
}
let decisions=0;
for(let c=0;c<30;c++){
 const state=T.advance(T.initialState(),Array.from({length:3},()=>random()*40-20)).state;
 const eye=T.localPoint(state);
 for(const instance of O.buildOpticalInstances(state,c%2?'upper':'lower').slice(1)){
  const planes=O.clipPlanes(instance.quads,eye);
  for(let j=0;j<100;j++){
   const p=Array.from({length:3},()=>random()*80-40);
   const expected=instance.quads.every(q=>intersects(eye,p,q));
   const actual=O.insideClips(p,planes);
   if(actual!==expected){
    // Render clipping intentionally biases each depth plane by .002 units to
    // avoid seam z-fighting. Only a point inside that bias band may differ.
    const margin=Math.min(...planes.map(pl=>T.dot(pl.slice(0,3),p)+pl[3]));
    assert.ok(Math.abs(margin)<=.003,JSON.stringify({eye,p,path:instance.path,expected,actual,margin}));
   }
   decisions++;
  }
 }
}
console.log(`PASS optics: ${matrices} Babylon affine transforms including reflected root; full-loop return and near-clone exclusion; ${decisions} seeded clip decisions vs independent segment/rectangle oracle. No GPU rasterization claim.`);
