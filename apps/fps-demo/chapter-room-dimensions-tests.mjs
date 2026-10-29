// Independent six-metre integration guard. CPU geometry only; no GPU claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from './dist/chapter-topology.js';
import * as D from './dist/room-dimensions.js';
import * as M from './dist/chapter-motion.js';
import * as G from './dist/grounded-motion.js';
import {StationRenderer} from './dist/station-renderer.js';
import {hatchProfile,ROUND_RADIUS} from './dist/hatch.js';
import {buildVisibleOpticalInstances} from './dist/visible-optics.js';
import {coordinateHint} from './dist/coordinate-hint.js';
import {ChapterProgress} from './dist/chapter-progress.js';
const near=(a,b,label='')=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-6,`${label}: ${a} != ${b}`));};
assert.equal(T.H,3);assert.equal(D.ROOM_SIZE,6);assert.equal(G.FLOOR_Z,-3);assert.equal(G.CEILING_Z,3);
assert.equal(G.AVATAR_HEIGHT,1.75);assert.equal(G.GRAVITY,4.905);assert.equal(G.STANDING_EYE,1.68);
assert.equal(new ChapterProgress().halfSize,3);
const ground=new G.GroundMotion();near([ground.eyeZ,M.upperEyeZ()],[-1.32,-1.32]);ground.step(G.JUMP_SPEED/G.GRAVITY,true);near([ground.footLift],[1.75]);assert.ok(ground.eyeZ+G.CROWN_ABOVE_EYE<3);
let spawn=T.initialState();spawn.p[0]=-2.3;spawn.p[2]=M.upperEyeZ();assert.ok(M.positionClear(spawn,spawn.p,'upper'));assert.ok(spawn.p[2]-G.STANDING_EYE>=-3-1e-9);
for(const sign of [-1,1]){const loop=M.advanceWithCollision(spawn,[0,0,sign],[0,0,sign*24],'upper');assert.equal(loop.crossings.length,4);near(loop.state.p,spawn.p);near(loop.state.frame.flat(),spawn.frame.flat());}
let seams=0;
for(const id of T.CELL_IDS){const n=T.normalFor(id),frame=T.canonicalFrame(n),start={normal:n,frame,p:T.scale(n,3)};
 for(const v of T.cellNeighbors(n)){const delta=T.worldToTangent(frame,T.scale(v,6)),r=T.advance(start,delta);assert.equal(r.crossings.length,1);assert.equal(T.cellId(r.state.normal),T.cellId(v));near(r.state.p,T.scale(v,3));const back=T.advance(r.state,T.scale(delta,-1));near(back.state.p,start.p);near(back.state.frame.flat(),frame.flat());const p=T.portalTransform(n,v),inv=T.composeTransforms(p,T.portalTransform(v,n));near(inv.offset,[0,0,0]);near(inv.rotation.flat(),T.identityTransform().rotation.flat());const loop=T.unfoldPath(n,[v,T.scale(n,-1),T.scale(v,-1),n],frame);near([Math.hypot(...loop.transform.offset)],[24]);seams++;}
 const hint=coordinateHint(n);for(const paint of hint.paint){const world=T.tangentToWorld(hint.frame,paint.center),entry=T.worldToTangent(hint.entry,world);assert.ok(entry[0]>0&&entry[1]<0&&entry[2]>0,'fixed default right-front-bottom corner');assert.ok(paint.center.every(x=>Math.abs(x)<3));}
}
assert.equal(seams,48);
let route=T.initialState();for(const id of ['X+','Y+','Z+','W-','Y-','X-','Z-']){
 // A physical dogleg around the centered Y± sculptures, not a point route
 // through their bodies. First turn in the entrance band, then line up exit.
 const n=T.normalFor(id),target=[...route.p];target[T.axisOf(n)]=n[T.axisOf(n)]*2.5;
 let delta=T.worldToTangent(route.frame,T.sub(target,route.p)),r=M.advanceWithCollision(route,delta,delta,'lower');assert.equal(r.crossings.length,0);near(r.state.p,target);route=r.state;
 const aligned=T.add(T.scale(route.normal,3),T.scale(n,2.5));delta=T.worldToTangent(route.frame,T.sub(aligned,route.p));r=M.advanceWithCollision(route,delta,delta,'lower');assert.equal(r.crossings.length,0);near(r.state.p,aligned);route=r.state;
 delta=T.worldToTangent(route.frame,T.scale(n,.9));r=M.advanceWithCollision(route,delta,delta,'lower');assert.equal(r.crossings.length,1);assert.equal(T.cellId(r.state.normal),id);assert.ok(M.positionClear(r.state,r.state.p,'lower'));route=r.state;
}
for(const [eye,path] of [[[-2.8,0,-2.8],'W+/X+/Y-/W-'],[[-2.8,0,-1.8],'W+/X+/Y-/W-/X-']]){assert.ok(eye.every(x=>Math.abs(x)<3));const s=T.initialState();s.p=T.add(s.p,T.tangentToWorld(s.frame,eye));assert.ok(buildVisibleOpticalInstances(s,'lower').some(x=>x.key===path));}
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:256});
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene);let checkedVertices=0,windowRays=0;
try{
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/vUV\*6\.0/,'six grid bays on normalized wall UVs, one metre each');
 for(const mode of ['upper','lower'])for(const id of T.CELL_IDS){const template=renderer.template(T.normalFor(id),mode);for(const {mesh,kind} of template.meshes){mesh.computeWorldMatrix(true);const data=mesh.getVerticesData('position');for(let i=0;i<data.length;i+=3){const v=B.Vector3.TransformCoordinates(new B.Vector3(...data.slice(i,i+3)),mesh.getWorldMatrix()).asArray();assert.ok(v.every(x=>Number.isFinite(x)&&Math.abs(x)<=3+1e-5),`${mode} ${id} ${kind} outside room: ${v}`);checkedVertices++;}}}
 let state=T.initialState();for(let i=0;i<4;i++){state.p=T.add(T.scale(state.normal,3),T.scale([0,0,1,0],M.upperEyeZ()));renderer.rebuild(state,'upper');const eye=T.localPoint(state);
 for(const id of ['Y+','Y-']){const n=T.normalFor(id),instance=renderer.instances.find(x=>x.path.length===2&&T.cellId(x.normal)===id),mesh=instance.meshes.find(m=>/\/(bronze|stone)\//.test(m.material.name));instance.node.computeWorldMatrix(true);mesh.computeWorldMatrix(true);const a=hatchProfile(state.normal,n,'upper'),out=T.worldToTangent(state.frame,n);
 for(const point of [[0,1.5,.25],[0,1.2,.1],[.2,1,.15],[-.2,1,.15]]){const target=B.Vector3.TransformCoordinates(new B.Vector3(...point),mesh.getWorldMatrix()).asArray(),d=T.sub(target,eye),t=(3-T.dot(out,eye))/T.dot(out,d),world=T.add(T.scale(state.normal,3),T.tangentToWorld(state.frame,T.add(eye,T.scale(d,t)))),q=T.worldToTangent(a.frame,T.sub(world,T.scale(state.normal,3)));assert.ok(Math.hypot(...a.other.map((k,j)=>q[k]-a.center[j]))<ROUND_RADIUS,'standing eye to head/torso crosses real circle');windowRays++;}}
 state=T.advance(state,[0,0,6]).state;}
 // Sample all in-room exhibit animations without shrinking the assets.
 for(let tick=0;tick<=16;tick++){const state=T.initialState();state.p[2]=M.upperEyeZ();renderer.rebuild(state,'upper');renderer.update(state,{yaw:0,pitch:0},'upper',tick/4/.24,{left:-10,right:-10},false);
  for(const instance of renderer.instances){const meshes=[...(instance.hologram?.parts||[]),...(instance.truth?.meshes||[])];instance.node.computeWorldMatrix(true);const inverse=B.Matrix.Invert(instance.node.getWorldMatrix());for(const mesh of meshes){mesh.computeWorldMatrix(true);const data=mesh.getVerticesData('position');for(let i=0;i<data.length;i+=3){const world=B.Vector3.TransformCoordinates(new B.Vector3(...data.slice(i,i+3)),mesh.getWorldMatrix()),local=B.Vector3.TransformCoordinates(world,inverse).asArray();assert.ok(local.every(x=>Number.isFinite(x)&&Math.abs(x)<=3+1e-4),`animated exhibit outside room: ${mesh.name} ${local}`);}}}
 }
 const bubble=renderer.pool.find(x=>x.bubble).bubble;bubble.computeWorldMatrix(true);near([bubble.getBoundingInfo().boundingBox.maximum.x-bubble.getBoundingInfo().boundingBox.minimum.x],[2.4]);assert.ok(Math.abs(bubble.position.x)+1.2<=3);
 console.log(`PASS six-metre room:48 topology seams/inverses,48 24m optical loops,upper24m walk,8-cell route,unchanged1.75m/g4.905,valid spawn,valid-eye turning paths,${checkedVertices} static template vertices in bounds,${windowRays} standing window rays,six1m shader bays,17 sampled exhibit poses within bounds. CPU/NullEngine only.`);
}finally{renderer.dispose();scene.dispose();engine.dispose();}
