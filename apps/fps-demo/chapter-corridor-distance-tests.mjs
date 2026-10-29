// Real mesh + independent numerical ray audit; not WebGL pixels or GPU timing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from './dist/chapter-topology.js';
import * as O from './dist/optics.js';
import {buildVisibleOpticalInstances as visible} from './dist/visible-optics.js';
import {StationRenderer} from './dist/station-renderer.js';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>T.scale(a,1/Math.hypot(...a));
const center=q=>q[0].map((_,i)=>q.reduce((s,p)=>s+p[i],0)/q.length);
const lookAt=d=>({yaw:Math.atan2(d[0],d[2]),pitch:-Math.asin(d[1]/Math.hypot(...d))});
function straight(state,first,mode){
 let parent={normal:state.normal,transform:{rotation:T.canonicalFrame(state.normal).map(a=>T.worldToTangent(state.frame,a)),offset:[0,0,0]},path:[T.cellId(state.normal)],quads:[],depth:0},previous=null,list=[parent];
 for(let depth=1;depth<=12;depth++){
  const n=depth===1?first:T.scale(previous,-1),quad=O.portalQuad(parent.normal,n,parent.transform,mode),child={normal:n,transform:T.composeTransforms(parent.transform,T.portalTransform(parent.normal,n)),path:[...parent.path,T.cellId(n)],quads:[...parent.quads,quad],depth};
  previous=parent.normal;parent=child;list.push(child);
 }return list;
}
// Generic orthonormal rectangle ray oracle; no call to clipPlanes or its math.
function crosses(eye,end,q){
 const u=T.sub(q[1],q[0]),v=T.sub(q[3],q[0]),n=cross(u,v),d=T.sub(end,eye),den=T.dot(n,d);
 if(Math.abs(den)<1e-10)return null;
 const t=T.dot(n,T.sub(q[0],eye))/den;if(t<0||t>1)return null;
 const h=T.sub(T.add(eye,T.scale(d,t)),q[0]),a=T.dot(h,u)/T.dot(u,u),b=T.dot(h,v)/T.dot(v,v);
 return a>=-1e-9&&a<=1+1e-9&&b>=-1e-9&&b<=1+1e-9?t:null;
}
function oracle(eye,end,quads){let previous=-1;for(const q of quads){const t=crosses(eye,end,q);if(t===null||t<previous-1e-9)return false;previous=t;}return true;}
let seed=0x9c6e2;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
// Rotate a tangent frame away from signed-axis coordinates (including roll).
function rotatedFrame(frame){const a=.37,b=-.61,c=.49,rotate=([x,y,z])=>{let u=[Math.cos(a)*x-Math.sin(a)*y,Math.sin(a)*x+Math.cos(a)*y,z];u=[u[0],Math.cos(b)*u[1]-Math.sin(b)*u[2],Math.sin(b)*u[1]+Math.cos(b)*u[2]];return [Math.cos(c)*u[0]+Math.sin(c)*u[2],u[1],-Math.sin(c)*u[0]+Math.cos(c)*u[2]];};return [[1,0,0],[0,1,0],[0,0,1]].map(v=>T.tangentToWorld(frame,rotate(v)));}
let decisions=0,chains=0,frusta=0;
for(const mode of ['upper','lower'])for(const id of T.CELL_IDS)for(const rotate of [false,true]){
 const n=T.normalFor(id),canonical=T.canonicalFrame(n),frame=rotate?rotatedFrame(canonical):canonical,state={normal:n,frame,p:T.scale(n,T.H)};
 for(const first of T.cellNeighbors(n)){
  const list=straight(state,first,mode);
  // Aim along the aperture centerline in the arbitrary transported frame.
  const outward=unit(list[1].transform.offset),eyeOnAxis=T.sub(center(list[1].quads[0]),T.scale(outward,T.H)),aimed={...state,p:T.add(T.scale(n,T.H),T.tangentToWorld(frame,eyeOnAxis))};
  for(const fov of [1.16,.28]){const selected=visible(aimed,mode,lookAt(outward),{fov});assert.ok(selected.some(x=>x.depth===12),'all8 roots/all6 axes/rotated pitch and roll retain twelve straight shells/ten clear rooms');assert.ok(selected.length<=80);frusta++;}
  for(const canonicalEye of [[0,0,0],[.63,-1.32,2.999],[-2.99,.74,-2.999]]){
   const eye=T.worldToTangent(frame,T.tangentToWorld(canonical,canonicalEye));
   for(const x of list.filter(x=>x.depth>=3)){
    assert.ok(O.canCompactPortalChain(x.quads,eye),'validated congruent portals in signed/rotated charts');
    const full=O.clipPlanes(x.quads,eye),compact=O.renderClipPlanes(x.quads,eye);assert.equal(compact.length,10);
    const q=x.quads.at(-1),u=unit(T.sub(q[1],q[0])),v=unit(T.sub(q[3],q[0])),forward=unit(T.sub(center(q),center(x.quads[0])));
    for(let j=0;j<24;j++){
     const end=T.add(T.add(T.add(center(q),T.scale(u,(random()-.5)*5)),T.scale(v,(random()-.5)*5)),T.scale(forward,.01+random()*5));
     const expected=oracle(eye,end,x.quads),a=O.insideClips(end,full),b=O.insideClips(end,compact);assert.equal(b,a,'endpoint compression preserves every full-chain decision');
     if(a!==expected){const margin=Math.min(...full.map(p=>T.dot(p.slice(0,3),end)+p[3]));assert.ok(Math.abs(margin)<=.003,'only intentional2mm depth bias may differ');}decisions++;
    }
   }chains++;
  }
 }
}
const invalid=straight(T.initialState(),T.normalFor('X+'),'lower').at(-1).quads.map(q=>q.map(p=>[...p]));invalid[4][0][0]+=.01;
assert.equal(O.canCompactPortalChain(invalid,[0,0,0]),false);assert.throws(()=>O.renderClipPlanes(invalid,[0,0,0]),/budget/,'never silently truncate an unvalidated60-plane path');
// Straight12 receives pool priority even when a small caller budget competes with side views.
for(const mode of ['upper','lower'])for(let yaw of [0,Math.PI])for(const fov of [1.16,.28]){
 const s=T.initialState();if(mode==='upper')s.p[2]=-1.32;
 const list=visible(s,mode,{yaw},{fov,maxInstances:13});assert.equal(list.length,13);assert.ok(list.every(x=>x.straight));assert.ok(list.some(x=>x.depth===12));assert.ok(list.every(x=>O.renderClipPlanes(x.quads,T.localPoint(s)).length<=20));
 const full=visible(s,mode,{yaw},{fov});assert.ok(full.filter(x=>!x.straight).every(x=>x.depth<=4));
}
// Every old/new camera-relative chain overlaps continuously at each6m seam.
let seamChecks=0;
for(const mode of ['upper','lower'])for(const direction of [-1,1]){
 let state=T.initialState();if(mode==='upper')state.p[2]=-1.32;
 for(let seam=0;seam<8;seam++){
  const before=T.advance(state,[0,0,direction*(T.H-1e-5)]).state,after=T.advance(before,[0,0,direction*2e-5]).state,look={yaw:direction===1?0:Math.PI};
  for(const fov of [1.16,.28]){
   const pre=visible(before,mode,look,{fov}),post=visible(after,mode,look,{fov});assert.ok(pre.some(x=>x.depth===12));assert.ok(post.some(x=>x.depth===12));
   for(const x of pre.filter(x=>x.straight&&x.depth>=2)){
    const next=post.find(y=>y.path.join('/')===x.path.slice(1).join('/'));assert.ok(next,'shared straight geometry stays allocated after seam');
    const p=T.sub(T.mapPoint(x.transform,[.27,-.19,.38]),T.localPoint(before)),q=T.sub(T.mapPoint(next.transform,[.27,-.19,.38]),T.localPoint(after));assert.ok(Math.hypot(...T.sub(p,q))<.000021);seamChecks++;
   }
  }state=T.advance(after,[0,0,direction*(T.H-1e-5)]).state;
 }
}
// Haze is AFTER all ten complete room shells, not instead of those rooms.
const farthestTenthCorner=Math.hypot(11*6,6,6);assert.equal(O.opticalDistanceFade(farthestTenthCorner),0);assert.equal(O.opticalDistanceFade(72),1);assert.ok(O.OPTICAL_FADE_START>66&&O.OPTICAL_FADE_END<=72);
assert.match(fs.readFileSync('dist/chapter.js','utf8'),/camera\.maxZ=80/,'camera range encloses ten clear6m rooms plus two populated guard rooms');
let stressViews=0,maxSelected=0,maxPerCell=0;
for(const mode of ['upper','lower'])for(const id of T.CELL_IDS)for(let i=0;i<100;i++){
 const normal=T.normalFor(id),frame=T.canonicalFrame(normal),eye=[random()*5.998-2.999,random()*5.998-2.999,random()*5.998-2.999],state={normal,frame,p:T.add(T.scale(normal,T.H),T.tangentToWorld(frame,eye))},list=visible(state,mode,{yaw:random()*Math.PI*2,pitch:(random()-.5)*Math.PI},{fov:i%2?.28:1.16,aspect:[4/3,16/9,21/9][i%3]}),keys=new Set(list.map(x=>x.key)),counts={};
 maxSelected=Math.max(maxSelected,list.length);assert.ok(list.length<=80);
 for(const x of list){const id=T.cellId(x.normal);counts[id]=(counts[id]||0)+1;maxPerCell=Math.max(maxPerCell,counts[id]);assert.ok(counts[id]<=10);assert.ok(x.depth<=(x.straight?12:4));assert.ok(O.renderClipPlanes(x.quads,eye).length<=20);if(x.depth)assert.ok(keys.has(x.path.slice(0,-1).join('/')));}stressViews++;
}
console.log(`PASS ${stressViews} seeded F/normal stress views across8 roots, both modes and3 aspect ratios: max${maxSelected} selected, max${maxPerCell} per cell; pool/shader budgets and parent paths retained.`);
console.log(`PASS long-corridor geometry: ${chains} aligned/rotated/off-axis chains, ${decisions} compact/full/oracle decisions, ${seamChecks} shared forward/back/F seam instances, ${frusta} all-root/all-axis/rotated frusta, straight12/clear10 priority, turning4, fail-closed20-plane budget, ten rooms unchanged before distance fade.`);

// Audit actual generated Babylon shell triangles, not just abstract rectangles.
const canvas=()=>({width:512,height:128,getContext:()=>new Proxy({},{get:()=>()=>{}})}),sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene),triangles=new Map();
function templateTriangles(n,mode){const key=T.cellId(n)+mode;if(triangles.has(key))return triangles.get(key);const list=[];for(const {kind,mesh} of renderer.template(n,mode).meshes){if(!['shell','trim','accent'].includes(kind))continue;const pos=mesh.getVerticesData(B.VertexBuffer.PositionKind),indices=mesh.getIndices();for(let i=0;i<indices.length;i+=3)list.push(indices.slice(i,i+3).map(j=>pos.slice(j*3,j*3+3)));}triangles.set(key,list);return list;}
function hitRay(o,d,a,b,c){const e1=T.sub(b,a),e2=T.sub(c,a),p=cross(d,e2),det=T.dot(e1,p);if(Math.abs(det)<1e-8)return null;const t=T.sub(o,a),u=T.dot(t,p)/det;if(u<0||u>1)return null;const q=cross(t,e1),v=T.dot(d,q)/det;if(v<0||u+v>1)return null;const distance=T.dot(e2,q)/det;return distance>1e-5?distance:null;}
function shellHits(specs,eye,d,mode){let hits=[];for(const x of specs){const planes=O.renderClipPlanes(x.quads,eye),localEye=x.transform.rotation.map(c=>T.dot(c,T.sub(eye,x.transform.offset))),localD=x.transform.rotation.map(c=>T.dot(c,d));for(const triangle of templateTriangles(x.normal,mode)){const distance=hitRay(localEye,localD,...triangle);if(distance&&O.insideClips(T.add(eye,T.scale(d,distance)),planes))hits.push({distance,path:x.path});}}return hits;}
let shellRays=0;
try{
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/clipPlanes\[20\]/);assert.match(B.Effect.ShadersStore.stationFragmentShader,/for\(int i=0;i<20;i\+\+\)/);assert.match(B.Effect.ShadersStore.stationFragmentShader,/smoothstep\(67\.5,72\.0,opticalDistance\)/);
 for(const mode of ['upper','lower']){
  let state=T.initialState();if(mode==='upper')state.p[2]=-1.32;
  for(let root=0;root<4;root++){
   for(const z of [-2.999,0,2.999])for(const direction of [-1,1]){
    const s=T.copyState(state);s.p=T.add(s.p,T.tangentToWorld(s.frame,[0,0,z]));const eye=T.localPoint(s),specs=visible(s,mode,{yaw:direction===1?0:Math.PI});assert.ok(specs.some(x=>x.depth===12));
    for(const dx of [-.009,0,.009]){assert.deepEqual(shellHits(specs,eye,[dx,0,direction],mode),[],'no actual shell/trim/accent triangle caps any of twelve open front/back doors');shellRays++;}
    assert.ok(shellHits(specs,eye,[.8,.4,direction],mode).length>0,`control ray hits real owning shell: ${mode}/${root}/${z}/${direction}`);
    // A slightly off-axis ray must reach the ACTUAL tenth far-door rim first,
    // through every earlier hole. This proves visible geometry, not allocation.
    const tenthDistance=63-direction*eye[2],rimX=mode==='upper'?1.31:1.095,ray=unit([rimX,0,direction*tenthDistance]),hits=shellHits(specs,eye,ray,mode).sort((a,b)=>a.distance-b.distance),first=hits[0];
    assert.ok(first,'tenth doorway has a visible shell/rim witness');assert.equal(first.path.length-1,10,'nearer shells do not occlude the tenth doorway');assert.ok(first.distance<80,'tenth doorway is inside camera far plane');assert.equal(O.opticalDistanceFade(first.distance),0,'tenth doorway is not hidden by new horizon haze');assert.ok(Math.atan(rimX/tenthDistance)<.28/2,'tenth-door witness is also inside F/binocular FOV');

   }state=T.advance(state,[0,0,6]).state;
  }
 }
 console.log(`PASS actual Babylon shell audit: ${shellRays} open-door rays across fourloop roots, both modes, both directions and±seam views, plus visible tenth-door rim witnesses and solid-shell control hits; no terminal cap inserted. CPU triangles/NullEngine only; GPU pixels, appearance and FPS unverified.`);
}finally{renderer.dispose();scene.dispose();engine.dispose();}
