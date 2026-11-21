import assert from 'node:assert/strict';
import * as T from './dist/chapter-topology.js';
import {buildOpticalInstances,clipPlanes} from './dist/optics.js';
import {buildVisibleOpticalInstances as visible,clipPortalPolygon,cameraClipPlanes} from './dist/visible-optics.js';
import {portalRectangle} from './dist/portal-scissors.js';
const pose=(eye=[0,0,0])=>{const s=T.initialState();s.p=T.add(T.scale(s.normal,T.H),T.tangentToWorld(s.frame,eye));return s;};
const keys=a=>a.map(x=>x.key);
assert.deepEqual(clipPortalPolygon([[-2,-1,1],[2,-1,1],[2,1,1],[-2,1,1]],[[1,0,0,0]]),[[0,-1,1],[2,-1,1],[2,1,1],[0,1,1]]);
assert.deepEqual(clipPortalPolygon([[0,0,0],[1,0,0],[0,1,0]],[[0,0,1,-1]]),[]);
const center=visible(pose(),'lower');
assert.ok(keys(center).includes('W+/X+/W-/X-/W+'),'visible straight full-depth self image');
assert.ok(keys(visible(pose(),'lower',{yaw:Math.PI/2})).includes('W+/Y-/W-/Y+/W+'));
assert.ok(keys(visible(pose(),'lower',{pitch:-Math.PI/2})).includes('W+/Z+/W-/Z-/W+'));
const old=new Set(buildOpticalInstances(pose(),'lower').map(x=>x.path.join('/')));
for(const [eye,path]of [[[-2.8,0,-2.8],'W+/X+/Y-/W-'],[[-2.8,0,-1.8],'W+/X+/Y-/W-/X-']]){
 assert.ok(!old.has(path),'fixture must exercise previously omitted turning path');
 assert.ok(keys(visible(pose(eye),'lower')).includes(path),'side-then-forward path must survive at depth3/4');
}
// Independent axis-aligned segment/rectangle oracle: witness ray crosses EVERY portal in order.
// A scissor is only a conservative broad phase. Independent ray witnesses
// and polygon rims must stay inside it at every tested camera angle and size.
function containsProjectedRim(polygon, eye, camera, bounds) {
 for (const [width, height] of [[1280,720],[961,541]]) {
  const rect=portalRectangle(bounds,width,height);
  if (!rect) continue;
  for (const p of polygon) {
   const v=p.map((n,i)=>n-eye[i]);
   const z=T.dot(v,camera.basis.forward);
   const x=(1+T.dot(v,camera.basis.right)/(z*camera.tx))*width/2;
   const y=(1+T.dot(v,camera.basis.up)/(z*camera.ty))*height/2;
   assert.ok(x>=rect.x-1e-5 && x<=rect.x+rect.width+1e-5);
   assert.ok(y>=rect.y-1e-5 && y<=rect.y+rect.height+1e-5);
  }
 }
}
assert.equal(portalRectangle(null,100,100),null);
assert.equal(portalRectangle([-1,-1,1,1],100,100),null);
assert.deepEqual(portalRectangle([-.5,-.5,.5,.5],100,100),{x:24,y:24,width:52,height:52});
function crosses(eye,end,quad,previous){
 const lo=[0,1,2].map(i=>Math.min(...quad.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...quad.map(p=>p[i])));
 const axis=lo.findIndex((v,i)=>Math.abs(v-hi[i])<1e-7);assert.ok(axis>=0);
 const t=(lo[axis]-eye[axis])/(end[axis]-eye[axis]);assert.ok(t>=previous-1e-7&&t>=0&&t<=1);
 for(let i=0;i<3;i++)assert.ok(eye[i]+t*(end[i]-eye[i])>=lo[i]-1e-7&&eye[i]+t*(end[i]-eye[i])<=hi[i]+1e-7);
 return t;
}
let witnesses=0;
for(const mode of ['upper','lower'])for(const eye of [[0,0,0],[-2.8,0,-1.8],[2.9,.7,-2.8]])for(let yaw=-3;yaw<=3;yaw+=.5){
 const s=pose(eye),look={yaw,pitch:.13},list=visible(s,mode,look),camera=cameraClipPlanes(eye,look),counts={};
 assert.equal(list[0].depth,0);assert.ok(list.length<=80);assert.equal(new Set(keys(list)).size,list.length);
 assert.deepEqual(keys(list),keys(visible(s,mode,look)),'deterministic');
 for(const x of list){counts[T.cellId(x.normal)]=(counts[T.cellId(x.normal)]||0)+1;assert.ok(counts[T.cellId(x.normal)]<=10);if(!x.depth)continue;
  assert.ok(x.depth<=(x.straight?12:4)&&x.quads.length===x.depth);
  assert.ok(list.some(parent=>parent.key===x.path.slice(0,-1).join('/')),'selected path retains its parent');
  const polygon=clipPortalPolygon(x.quads.at(-1),[...camera.planes,...clipPlanes(x.quads.slice(0,-1),eye)]);assert.ok(polygon.length>=3);
  containsProjectedRim(polygon,eye,camera,x.screenBounds);
  const c=[0,1,2].map(i=>polygon.reduce((sum,p)=>sum+p[i],0)/polygon.length),end=c.map((v,i)=>eye[i]+(v-eye[i])*1.001);let previous=0;
  for(const quad of x.quads)previous=crosses(eye,end,quad,previous);witnesses++;
 }
 const wide=new Set(keys(list));for(const x of visible(s,mode,look,{fov:.28}))assert.ok(wide.has(x.key),'zoom cannot introduce a geometrically invisible path');
}
for(const id of T.CELL_IDS){const n=T.normalFor(id),s={normal:n,frame:T.canonicalFrame(n),p:T.scale(n,T.H)};for(let yaw=0;yaw<6.2;yaw+=1.2){const list=visible(s,'lower',{yaw});assert.equal(list[0].key,id);assert.ok(list.some(x=>x.depth===1));}}
assert.equal(visible(pose(),'lower',{}, {maxInstances:1}).length,1);
console.log(`PASS visible optics: straight depth12 (10 clear +2 guard) / turning depth3/4, rotated look/all8roots, zoom subset, bounded deterministic selection, ${witnesses} independent ordered portal-ray witnesses. Geometry only, not GPU pixels.`);
