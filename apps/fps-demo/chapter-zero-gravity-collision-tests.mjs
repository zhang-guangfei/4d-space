/** Production collision regression: fixed room atlas is not a render-distance box. */
import assert from 'node:assert/strict';
import * as T from './dist/chapter-topology.js';
import * as M from './dist/chapter-motion.js';
import * as compatibility from './chapter-motion.mjs';
import {STATUE_BOUNDS,statuePlacement,statueBlocked,statueSeparations} from './dist/statue-placement.js';
const near=(a,b,tolerance=1e-7)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<tolerance,`${a} != ${b}`));};
const stateAt=(id,p)=>{const normal=T.normalFor(id);return {normal,frame:T.canonicalFrame(normal),p:p||T.scale(normal,T.H)};};
const position=(s,local)=>T.add(T.scale(s.normal,T.H),T.tangentToWorld(s.frame,local));
const assertClear=r=>assert.ok(M.positionClear(r.state,r.state.p,'lower'),`invalid ${T.cellId(r.state.normal)} ${r.state.p}`);
assert.equal(compatibility.advanceWithCollision,M.advanceWithCollision,'legacy import must exercise shipped physics');
assert.equal(compatibility.positionClear,M.positionClear);
let placements=0,apertures=0,recoveries=0,flights=0,seams=0;
for(const id of ['Y+','Y-']){
 const upper=statuePlacement(id),lower=statuePlacement(id,'lower'),center=lower.bounds.min.map((v,k)=>(v+lower.bounds.max[k])/2);
 assert.equal(lower.kind,upper.kind);assert.deepEqual(lower.axes,upper.axes);assert.deepEqual(lower.frame,upper.frame);
 near(upper.origin,T.scale(upper.axes[1],-T.H));near(T.add(lower.origin,lower.axes.reduce((p,a,k)=>T.add(p,T.scale(a,center[k])),[0,0,0])),[0,0,0]);placements++;
 // Both old screenshots' feet-at-floor position and every interior of the NEW
 // centered bounds recover, including a motionless resume/first lower frame.
 const s=stateAt(id),oldFeet=T.add(s.p,[0,0,-T.H,0]);
 for(const p of [oldFeet,T.add(oldFeet,[0,0,.03,0]),s.p,...[-.9,-.3,.3,.9].map(y=>T.add(s.p,[0,0,y,0]))])for(let axis=0;axis<3;axis++)for(const sign of [-1,0,1]){
  const input=[0,0,0];input[axis]=sign*.04;
  const initial={...s,p},r=M.advanceWithCollision(initial,T.scale(input,10),input,'lower');assertClear(r);assert.ok(r.crossings.length<=1);if(!r.crossings.length){assert.deepEqual(r.state.frame,s.frame);assert.deepEqual(r.state.normal,s.normal);}
  assert.ok(Math.hypot(...T.sub(r.state.p,initial.p))<1.2,'local separation, not a room-center respawn');
  const again=M.advanceWithCollision(r.state,[0,0,0],[0,0,0],'lower');assertClear(again);near(again.state.p,r.state.p);assert.equal(again.corrections.length,0);recoveries++;
 }
 // A centered statue remains a physical obstacle in every direction, but its
 // expanded proxy can be bypassed by a clear side lane (never whole-room block).
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const local=[0,0,0];local[axis]=sign*2;const start={...s,p:position(s,local)},delta=T.scale(local,-1),hit=M.advanceWithCollision(start,delta,delta,'lower');
  assertClear(hit);assert.ok(hit.collisions.length>0);assert.equal(hit.crossings.length,0);assert.ok(Math.hypot(...T.sub(hit.state.p,s.p))>.3);assert.equal(hit.velocity[axis],0);
  const reverse=[0,0,0];reverse[axis]=sign*.2;const escaped=M.advanceWithCollision(hit.state,reverse,reverse,'lower');assertClear(escaped);near(T.sub(escaped.state.p,hit.state.p),T.tangentToWorld(hit.state.frame,reverse));
 }
 // Inward velocity alone is removed by depenetration; tangent/outward survives.
 const r=M.recoverCollision(s,[1,2,3],'lower'),contact=r.corrections[0],normal=T.worldToTangent(s.frame,contact.normal),speed=T.dot([1,2,3],normal);
 near(r.velocity,T.sub([1,2,3],T.scale(normal,Math.min(0,speed))));assertClear(r);
 assert.ok(statueBlocked(s.normal,s.p,.2,'lower'));assert.ok(!statueBlocked(s.normal,oldFeet,.2,'lower'));
 const candidates=statueSeparations(s.normal,s.p,.2,'lower');assert.equal(candidates.length,6);assert.ok(candidates.every(c=>c.distance>=candidates[0].distance));near([Math.hypot(...T.sub(r.state.p,s.p))],[candidates[0].distance]);
}
for(const id of T.CELL_IDS){const n=T.normalFor(id),base=stateAt(id);for(const face of T.cellNeighbors(n)){
 const other=[0,1,2,3].filter(i=>i!==T.axisOf(n)&&i!==T.axisOf(face));
 // Center and near both edges of both aperture axes, including floating feet,
 // overhead and previously blocked Z−↔Y± doors.
 for(const axis of other)for(const offset of [-.874,0,.874]){
  const p=T.add(base.p,T.scale(face,T.H-.3));p[axis]=offset;const start={...base,p},d=T.worldToTangent(base.frame,T.scale(face,.6)),r=M.advanceWithCollision(start,T.scale(d,10),d,'lower');
  assert.ok(M.positionClear(start,p,'lower'));assertClear(r);assert.equal(r.crossings.length,1);assert.equal(r.collisions.length,0);assert.equal(T.cellId(r.state.normal),T.cellId(face));near(r.velocity,T.scale(d,10));apertures++;
 }
 // 480m is 20 atlas loops, far beyond12 visible rooms or80 render slots.
 // Offset .7 on X/W where possible avoids the real central sculptures.
 const safe=[0,3,2,1].find(i=>i!==T.axisOf(n)&&i!==T.axisOf(face)),p=[...base.p];p[safe]=.7;
 const start={...base,p},direction=T.worldToTangent(base.frame,face),r=M.advanceWithCollision(start,T.scale(direction,7.65),T.scale(direction,480),'lower');
 assertClear(r);assert.equal(r.crossings.length,80);assert.equal(r.collisions.length,0);near(r.state.p,start.p);near(r.state.frame.flat(),start.frame.flat());near(r.velocity,T.scale(direction,7.65));flights++;seams+=r.crossings.length;
 // Wall outside the real circular aperture stays solid, including huge steps.
 const blocked=[...base.p];blocked[safe]=1.2;const wall=M.advanceWithCollision({...base,p:blocked},T.scale(direction,7.65),T.scale(direction,30),'lower');assertClear(wall);assert.equal(wall.crossings.length,0);assert.ok(wall.collisions.length>0);
}}
// Lower hatch changes shape/height on initial unlock. Recover its old grounded
// aperture band before rendering/resume, not after an attempted new jet.
// A future/oversized prop reaching a destination door must be rejected in the
// destination chart, not admitted then repaired after getting trapped. The
// bound mutation is test-local and always restored; shipped bounds stay exact.
const savedHeights=Object.fromEntries(Object.entries(STATUE_BOUNDS).map(([k,b])=>[k,b.max[1]]));
try{
 for(const bounds of Object.values(STATUE_BOUNDS))bounds.max[1]=6;
 for(const source of ['Z+','Z-'])for(const target of ['Y+','Y-']){
  const s=stateAt(source),face=T.normalFor(target);s.p=T.add(s.p,T.scale(face,T.H-.1));const delta=T.worldToTangent(s.frame,T.scale(face,.3)),r=M.advanceWithCollision(s,T.scale(delta,10),delta,'lower');
  assertClear(r);assert.equal(r.crossings.length,0);assert.ok(r.collisions.length>0);assert.equal(T.cellId(r.state.normal),source);
 }
}finally{for(const [k,h] of Object.entries(savedHeights))STATUE_BOUNDS[k].max[1]=h;}

for(const normal of ['W+','W-','X+','X-'])for(const face of T.cellNeighbors(normal).filter(v=>[0,3].includes(T.axisOf(v))))for(const sign of [-1,1]){
 const s=stateAt(normal);s.p=T.add(s.p,T.scale(face,T.H-.05));s.p[2]=M.upperEyeZ();const old=[...s.p];assert.ok(M.positionClear(s,s.p,'upper'));assert.ok(!M.positionClear(s,s.p,'lower'));
 const velocity=T.worldToTangent(s.frame,T.scale(face,sign*2)),r=M.recoverCollision(s,velocity,'lower');assertClear(r);assert.equal(r.corrections.length,1);near([Math.hypot(...T.sub(r.state.p,old))],[.150001]);assert.deepEqual(r.state.frame,s.frame);recoveries++;
 const wall=M.advanceWithCollision(r.state,velocity,T.scale(velocity,.5),'lower');assertClear(wall);
}
// Diagonal+boost and low frame rate retain finite, clear states while hitting
// and sliding around a statue, wall or door. Reversing thrust can leave contact.
for(const id of ['Y+','Y-'])for(const dt of [1/240,1/60,.05,.2])for(const boost of [false,true]){
 let s=stateAt(id);s.p[0]=1.4;let velocity=[0,0,0];let distance=0;
 for(let i=0;i<100;i++){
  const thrust=M.integrateSuitThrust(velocity,i<50?[1,1,1]:[-1,-1,-1],.73,-.39,dt,boost),r=M.advanceWithCollision(s,thrust.velocity,thrust.displacement,'lower');assertClear(r);assert.ok(r.state.p.every(Number.isFinite));assert.ok(r.velocity.every(Number.isFinite));assert.ok(Math.hypot(...r.velocity)<=7.65+1e-7);distance+=Math.hypot(...T.sub(s.p,r.state.p));s=r.state;velocity=r.velocity;
 }
 assert.ok(distance>.01);
}
console.log(`PASS production zeroG collision: ${placements} exact geometric-centered A/B statues; ${apertures} aperture center/edge crossings; ${recoveries} initial/legacy/phase overlap recoveries; ${flights} 480m flights / ${seams} seams; solid statues/walls, outward escape, diagonal/boost/low-dt finite motion; compatibility module is production re-export.`);
