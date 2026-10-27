import {GroundMotion,GroundGait} from './dist/grounded-motion.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as topology from './dist/chapter-topology.js';import * as motion from './dist/chapter-motion.js';import {ChapterProgress} from './dist/chapter-progress.js';import {LookController} from './dist/look.js';import {StationRenderer} from './dist/station-renderer.js';import {createHypothesisLab} from './dist/hypotheses.js';import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(t,f){this.events??={};this.events[t]=f;},removeEventListener(){},setAttribute(){},focus(){},replaceChildren(){},appendChild(){}});let elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',value:'1'});return elements.get(id);}
const listeners={},document={getElementById:el,createElement:canvas,removeEventListener(){},addEventListener(t,f){listeners[t]=f;},hidden:false,exitPointerLock(){document.pointerLockElement=null;listeners.pointerlockchange?.();}};
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;let engines=[];B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:1024,renderHeight:768});engines.push(this);}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}};
// NullEngine lacks raw cubemap allocation; shim only this GPU-storage operation.
B.RawCubeTexture=class {constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
// Real Babylon geometry, matrices/material binding and scene.render; not GPU rasterization.
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(){},removeEventListener(){}};Object.assign(sandbox,topology,motion,{GroundMotion,GroundGait,ChapterProgress,LookController,StationRenderer,createHypothesisLab,ROOM_MODELS,roomModel});let code=fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,sandbox);const read=x=>vm.runInContext(x,sandbox);if(el('notice').textContent)throw Error(el('notice').textContent);assert.equal(read('renderer.instances.length'),49);assert.equal(read('renderer.instances.filter(x=>x.avatar.parent.isEnabled()).length'),7);console.log('PASS scene constructs',read('scene.meshes.length'),'meshes; 49 clipped instances / 6 full-path self-images.');read('ready=true');const engine=engines[0];engine.getDeltaTime=()=>1e3/60;const frame=(n=1)=>{for(let i=0;i<n;i++)engine.loop();};document.pointerLockElement=el('world');listeners.pointerlockchange();frame();listeners.mousemove({movementX:1000,movementY:0});frame();assert.equal(read('look.yaw'),0);listeners.mousemove({movementX:10,movementY:5});frame();assert.equal(read('camera.rotation.y'),.02);assert.equal(read('camera.rotation.x'),.01);let yaw=read('look.yaw');frame(3);assert.equal(read('camera.rotation.y'),yaw);

// Geometry-only screen occupancy estimate; no GPU rasterization, wall occlusion or pixel AA.
const cases=[];
for(const phase of ['upper','lower'])for(const pitch of [45,70,89])cases.push({phase,pitch,pose:'idle'});
for(const pose of ['left-wave','right-wave','both-wave','jump','crouch'])cases.push({phase:'upper',pitch:89,pose});
const bodyResults=[];
for(const test of cases){
 const {phase,pitch,pose}=test,gesture={left:pose==='left-wave'||pose==='both-wave'?0:-100,right:pose==='right-wave'||pose==='both-wave'?0:-100},locomotion={leftLeg:pose==='jump'?-.28:0,rightLeg:pose==='jump'?.28:0,crouchScale:pose==='crouch'?1.15/1.68:1};
 read(`look.yaw=0;look.pitch=${pitch}*Math.PI/180;camera.rotation.set(look.pitch,0,0);renderer.update(state,look,'${phase}',.675,${JSON.stringify(gesture)},false,${JSON.stringify(locomotion)});camera.getViewMatrix(true);camera.getProjectionMatrix(true);scene.updateTransformMatrix(true);`);
 const avatar=read('renderer.instances[0].avatar'),meshes=avatar.parts.filter(m=>m.isEnabled());meshes.forEach(m=>m.computeWorldMatrix(true));
 for(const part of avatar.parts.filter(m=>['helmet','visor','backpack'].includes(m.name)))assert.equal(part.isEnabled(),false,'no local near-camera head/visor/backpack');
 const cam=read('camera'),sc=read('scene');let hits=0,torsoHits=0;
 for(let y=0;y<36;y++)for(let x=0;x<48;x++){const ray=sc.createPickingRay((x+.5)*1024/48,(y+.5)*768/36,B.Matrix.Identity(),cam);let hit=false,torso=false;for(const m of meshes){if(ray.intersectsMesh(m,false).hit){hit=true;if(m.name==='torso')torso=true;}}if(hit)hits++;if(torso)torsoHits++;}
 const result={...test,bodyScreenPercent:+(100*hits/1728).toFixed(1),torsoScreenPercent:+(100*torsoHits/1728).toFixed(1)};bodyResults.push(result);console.log(JSON.stringify(result));
}
assert.ok(bodyResults.every(r=>r.bodyScreenPercent<50),'sampled idle/wave/jump/crouch poses keep body below half the viewport');
const upright=bodyResults.filter(r=>r.phase==='upper'&&r.pose==='idle');assert.ok(upright.every(r=>r.torsoScreenPercent<25),'torso remains below one-quarter even at extreme down-view');
console.log('PASS local-body geometry audit: hidden helmet/visor/backpack; torso bounded. Full-body occupancy rows are measurements, not a claimed universal <50% guarantee.');
console.log('Scope: real Babylon mesh ray tests at 48x36 samples; not GPU or screenshot verification.');
read('renderer.dispose();scene.dispose();engine.dispose()');
