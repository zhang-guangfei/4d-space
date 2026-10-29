// CPU geometry / lifecycle only: no WebGL rasterization, hardware input or FPS claim.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as T from './dist/chapter-topology.js';
import {buildVisibleOpticalInstances,opticalClipEye} from './dist/visible-optics.js';
import {StationRenderer} from './dist/station-renderer.js';

const EPS=1e-7;
assert.deepEqual(opticalClipEye([.3,-.4,1.2],T.initialState()),[.3,-.4,1.2],'interior optical eye unchanged');
assert.deepEqual(opticalClipEye([T.H,-T.H,0],T.initialState()),[T.H-.0001,-T.H+.0001,0],'only seam cone gets tiny interior inset');
const near=(a,b,label)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<EPS,`${label}: ${a} != ${b}`));
const direction=(axis,sign)=>[0,1,2].map(k=>k===axis?sign:0);
const lookAlong=d=>({yaw:Math.atan2(d[0],d[2]),pitch:-Math.asin(d[1])});
const centered=id=>{const normal=T.normalFor(id);return {normal,p:T.scale(normal,T.H),frame:T.canonicalFrame(normal)};};
const assertSelection=(state,look,label)=>{
 const list=buildVisibleOpticalInstances(state,'lower',look,{fov:1.16,aspect:4/3});
 assert.equal(list[0].depth,0,label+' current room always resident');
 assert.equal(T.cellId(list[0].normal),T.cellId(state.normal),label+' current chart');
 assert.ok(list.length<=80,label+' bounded shared pool');
 assert.ok(list.some(x=>x.depth===12&&x.straight),label+' next ten clear plus two guard rooms');
 const counts={};
 for(const x of list){const id=T.cellId(x.normal);counts[id]=(counts[id]||0)+1;assert.ok(counts[id]<=10);assert.ok(x.transform.rotation.flat().concat(x.transform.offset).every(Number.isFinite));if(x.depth)assert.ok(list.some(parent=>parent.key===x.path.slice(0,-1).join('/')));}
 const root=list[0];
 near(T.mapPoint(root.transform,T.worldToTangent(T.canonicalFrame(state.normal),T.sub(state.p,T.scale(state.normal,T.H)))),T.localPoint(state),label+' recentered root');
 return list;
};

// All 48 directions immediately before and after the real topology crossing.
// An entry aperture in front of the eye must not vanish merely because it is
// closer than the camera's projection near clip. It reveals geometry beyond it.
let seamViews=0;
for(const id of T.CELL_IDS)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
 const d=direction(axis,sign),look=lookAlong(d);
 for(const edgeOffset of [0,.86,-.86])for(const distance of [.25,.001,1e-7,0]){
  const before=centered(id),point=T.scale(d,T.H-distance);point[(axis+1)%3]=edgeOffset;before.p=T.add(before.p,T.tangentToWorld(before.frame,point));
  const next=T.cellId(T.tangentToWorld(before.frame,d));
  const list=assertSelection(before,look,`${id} ${axis}/${sign} before ${distance}`);
  assert.ok(list.some(x=>x.depth===1&&T.cellId(x.normal)===next),'next room present before crossing');
  const behind=buildVisibleOpticalInstances(before,'lower',lookAlong(T.scale(d,-1)));
  assert.ok(!behind.some(x=>x.depth===1&&T.cellId(x.normal)===next),'portal behind view is not force-rendered');
  const crossed=T.advance(before,T.scale(d,distance+.125));
  assert.equal(crossed.crossings.length,1);assert.equal(T.cellId(crossed.state.normal),next);
  assertSelection(crossed.state,look,`${id} ${axis}/${sign} after`);
  const returnView=assertSelection(crossed.state,lookAlong(T.scale(d,-1)),`${id} ${axis}/${sign} looking back after`);
  assert.ok(returnView.some(x=>x.depth===1&&T.cellId(x.normal)===id),'previous room already present when looking back');seamViews+=3;
 }
}

// Preserve grounded upper X/W doors: their opening is lower than the room
// center, and the physical eye retains its global Z=-1.32m through transport.
let upperViews=0;
for(const id of ['W+','X+','W-','X-'])for(const next of T.cellNeighbors(id).filter(n=>[0,3].includes(T.axisOf(n)))){
 const start=centered(id),worldDirection=next,d=T.worldToTangent(start.frame,worldDirection),look=lookAlong(d);
 for(const distance of [.001,1e-7,0]){
  const before=T.copyState(start);before.p=T.add(before.p,T.scale(worldDirection,T.H-distance));before.p[2]=-1.32;
  const inspect=(state,gaze,neighbor)=>{const list=buildVisibleOpticalInstances(state,'upper',gaze,{fov:1.16,aspect:4/3});assert.equal(list[0].key,T.cellId(state.normal));assert.ok(list.some(x=>x.depth===12&&x.straight),'grounded upper full corridor remains selected');assert.ok(list.some(x=>x.depth===1&&T.cellId(x.normal)===neighbor),'grounded upper immediate neighbor remains selected');assert.equal(state.p[2],-1.32,'physical grounded eye height unchanged');upperViews++;};
  inspect(before,look,T.cellId(next));const behind=buildVisibleOpticalInstances(before,'upper',lookAlong(T.scale(d,-1)));assert.ok(!behind.some(x=>x.depth===1&&T.cellId(x.normal)===T.cellId(next)),'upper portal behind view is not force-rendered');
  const after=T.advance(before,T.scale(d,distance+.125));assert.equal(after.crossings.length,1);inspect(after.state,look,T.cellId(T.tangentToWorld(after.state.frame,d)));inspect(after.state,lookAlong(T.scale(d,-1)),id);
 }
}
console.log(`PASS ${upperViews} grounded upper before/exact/after/lookback views over all8 directed X/W seams; eye remains worldZ=-1.32m.`);

// Clip stabilization uses cell coordinates, not view-axis bounds. A rotated
// chart can validly have eye components beyond +/-H without being at a wall.
for(const id of T.CELL_IDS){
 const s=centered(id),cf=s.frame,angle=.7;
 s.frame=[T.add(T.scale(cf[0],Math.cos(angle)),T.scale(cf[2],Math.sin(angle))),cf[1],T.add(T.scale(cf[0],-Math.sin(angle)),T.scale(cf[2],Math.cos(angle)))];
 const interior=T.worldToTangent(s.frame,T.tangentToWorld(cf,[2.5,.2,2.5]));assert.ok(interior.some(v=>Math.abs(v)>T.H));near(opticalClipEye(interior,s),interior,'rotated valid interior eye unchanged');
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const canonicalDirection=direction(axis,sign),point=T.scale(canonicalDirection,T.H),d=T.worldToTangent(s.frame,T.tangentToWorld(cf,canonicalDirection));point[(axis+1)%3]=.86;
  s.p=T.add(T.scale(s.normal,T.H),T.tangentToWorld(cf,point));const eye=T.localPoint(s),clipEye=opticalClipEye(eye,s),canonicalClip=T.worldToTangent(cf,T.tangentToWorld(s.frame,clipEye));
  assert.ok(Math.abs(Math.hypot(...T.sub(clipEye,eye))-.0001)<1e-8,'exactly0.1mm inset along canonical seam normal');
  assert.ok(Math.abs(canonicalClip[axis]-sign*(T.H-.0001))<1e-8);assertSelection(s,lookAlong(d),'rotated exact seam');
 }
}

// Actual topological transport, not teleporting root IDs, in each of six
// tangent directions from every cell. Traversal exceeds rendering depth/budget
// many times, while local coordinates remain bounded and frame stays exact.
let longSeams=0;
for(const id of T.CELL_IDS)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
 const d=direction(axis,sign),look=lookAlong(d);let state=centered(id),first=T.copyState(state);
 for(let i=0;i<128;i++){
  const moved=T.advance(state,T.scale(d,2*T.H));assert.equal(moved.crossings.length,1);state=moved.state;
  assert.ok(T.localPoint(state).every(v=>Math.abs(v)<=T.H+EPS));
  assertSelection(state,look,`${id} direction ${axis}/${sign} seam ${i}`);longSeams++;
 }
 assert.equal(T.cellId(state.normal),id);near(state.p,first.p,'128-seam point closure');near(state.frame.flat(),first.frame.flat(),'128-seam frame closure');
}
console.log(`PASS ${seamViews} pre/post seam selections over all 48 directed doors; ${longSeams} straight transported crossings without a render-budget/world boundary.`);

const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(){},removeEventListener(){},setAttribute(){}});
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document:{createElement:canvas,addEventListener(){},removeEventListener(){}},window:{addEventListener(){},removeEventListener(){}},navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;
B.RawCubeTexture=class{constructor(scene,faces,size){const t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const engine=new B.NullEngine({renderWidth:1024,renderHeight:768}),scene=new B.Scene(engine),camera=new B.UniversalCamera('test eyes',B.Vector3.Zero(),scene),renderer=new StationRenderer(B,scene);
let state=T.initialState();renderer.rebuild(state,'lower');
const savedPool=[...renderer.pool],savedCounts=[scene.meshes.length,scene.materials.length,scene.textures.length],savedSerial=renderer.serial,created={mesh:0,material:0,texture:0};
for(const [method,key]of [['addMesh','mesh'],['addMaterial','material'],['addTexture','texture']]){const original=scene[method];scene[method]=function(...args){created[key]++;return original.apply(this,args);};}
let bound=0;const seen=new Set(),directed=new Set();
function bind(s,d){
 const originalPoint=[...s.p],originalCamera=camera.position.asArray(),realEye=T.localPoint(s);
 const look=lookAlong(d),list=assertSelection(s,look,'actual pooled scene');renderer.rebuild(s,'lower',list);renderer.update(s,look,'lower',0,{left:-10,right:-10},false);
 near(s.p,originalPoint,'optics never moves physical state');near(camera.position.asArray(),originalCamera,'optics never moves camera');
 for(const x of renderer.instances)for(const material of x.materials)near(material._vectors3.eye.asArray(),realEye,'lighting/material eye stays real');
 assert.equal(renderer.instances[0].depth,0);assert.equal(T.cellId(renderer.instances[0].normal),T.cellId(s.normal));
 assert.ok(renderer.instances[0].node.isEnabled());
 assert.ok(renderer.pool.every((x,i)=>x===savedPool[i]));assert.equal(renderer.serial,savedSerial);
 assert.deepEqual([scene.meshes.length,scene.materials.length,scene.textures.length],savedCounts);assert.deepEqual(created,{mesh:0,material:0,texture:0});
 assert.ok(renderer.instances.every(x=>x.materials.every(m=>m._floats.planeCount<=20&&m._vectors4Arrays.clipPlanes.length===80&&m._vectors4Arrays.clipPlanes.every(Number.isFinite))));
 seen.add(T.cellId(s.normal));bound++;
}
try{
 for(const id of T.CELL_IDS)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const d=direction(axis,sign);state=centered(id);state.p=T.add(state.p,T.tangentToWorld(state.frame,T.scale(d,T.H)));bind(state,d);
  const root=renderer.instances[0],shell=root.meshes.find(mesh=>mesh.material?.name.includes('/shell/'));
  assert.ok(shell?.isEnabled(),'owning opaque shell stays resident');assert.equal(shell.material.disableDepthWrite,false);assert.equal(shell.material._floats.planeCount,0);
  root.node.computeWorldMatrix(true);shell.computeWorldMatrix(true);
  const wallOrigin=T.scale(d,T.H-.5);wallOrigin[(axis+1)%3]=1.5;
  const wallHit=new B.Ray(new B.Vector3(...wallOrigin),new B.Vector3(...d),.6).intersectsMesh(shell,false);assert.ok(wallHit.hit,'solid wall still blocks off-aperture forward ray');assert.ok(Math.abs(wallHit.distance-.5)<1e-5);
  const apertureOrigin=T.scale(d,T.H-.5);apertureOrigin[(axis+1)%3]=.86;
  assert.ok(!new B.Ray(new B.Vector3(...apertureOrigin),new B.Vector3(...d),.6).intersectsMesh(shell,false).hit,'open hatch remains open near passable rim');
  const crossed=T.advance(state,T.scale(d,.2));directed.add(id+'>'+T.cellId(crossed.state.normal));state=crossed.state;bind(state,d);
 }
 // Repeated, direction-changing travel also transports nontrivial holonomy.
 state=T.initialState();
 for(let i=0;i<384;i++){
  const axis=(i*17+Math.floor(i/7))%3,sign=(i%5<2?-1:1),d=direction(axis,sign);
  const moved=T.advance(state,T.scale(d,2*T.H));assert.equal(moved.crossings.length,1);state=moved.state;bind(state,d);
  if(i%64===0){camera.position.set(...T.localPoint(state));const look=lookAlong(d);camera.rotation.set(look.pitch,look.yaw,0);scene.render();}
 }
 assert.equal(seen.size,8);assert.equal(directed.size,48);
 console.log(`PASS ${bound} Babylon NullEngine pool rebinds with all 8 roots / 48 directed seams and long turning transport: stable 80 slots, zero new mesh/material/texture registrations, finite <=20 clip planes. Not GPU/FPS.`);
}finally{renderer.dispose();scene.dispose();engine.dispose();}
