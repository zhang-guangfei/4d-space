import {buildVisibleOpticalInstances} from './dist/visible-optics.js';
import {GroundMotion,GroundGait} from './dist/grounded-motion.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as topology from './dist/chapter-topology.js';import * as motion from './dist/chapter-motion.js';import {ChapterProgress} from './dist/chapter-progress.js';import {LookController} from './dist/look.js';import {StationRenderer} from './dist/station-renderer.js';import {createHypothesisLab} from './dist/hypotheses.js';import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(t,f){this.events??={};this.events[t]=f;},removeEventListener(){},setAttribute(){},focus(){},replaceChildren(){},appendChild(){}});let elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',value:'1'});return elements.get(id);}
const htmlIds=new Set([...fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const listeners={},document={getElementById:id=>htmlIds.has(id)?el(id):null,createElement:canvas,removeEventListener(){},addEventListener(t,f){listeners[t]=f;},hidden:false,exitPointerLock(){document.pointerLockElement=null;listeners.pointerlockchange?.();}};
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;let engines=[];B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:1024,renderHeight:768});engines.push(this);}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}};
// NullEngine lacks raw cubemap allocation; shim only this GPU-storage operation.
B.RawCubeTexture=class {constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
// Real Babylon geometry, matrices/material binding and scene.render; not GPU rasterization.
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(){},removeEventListener(){}};Object.assign(sandbox,topology,motion,{buildVisibleOpticalInstances,GroundMotion,GroundGait,ChapterProgress,LookController,StationRenderer,createHypothesisLab,ROOM_MODELS,roomModel});let code=fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,sandbox);const read=x=>vm.runInContext(x,sandbox);if(el('notice').textContent)throw Error(el('notice').textContent);assert.equal(read('renderer.instances.length'),73);assert.equal(read('renderer.instances.filter(x=>x.avatar.parent.isEnabled()).length'),7);console.log('PASS scene constructs',read('scene.meshes.length'),'meshes; 73 clipped instances / 6 full-path self-images.');read('ready=true');const engine=engines[0];engine.getDeltaTime=()=>1e3/60;const frame=(n=1)=>{for(let i=0;i<n;i++)engine.loop();};document.pointerLockElement=el('world');listeners.pointerlockchange();frame();listeners.mousemove({movementX:1000,movementY:0});frame();assert.equal(read('look.yaw'),0);listeners.mousemove({movementX:10,movementY:5});frame();assert.equal(read('camera.rotation.y'),.02);assert.equal(read('camera.rotation.x'),.01);let yaw=read('look.yaw');frame(3);assert.equal(read('camera.rotation.y'),yaw);

// Exercise the actual chapter render loop, pointer events, and renderer.
const near=(a,b,eps=2e-6)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<eps,`${a} != ${b}`));
const basis=()=>read('look.basis()');
const turn=(dx,dy)=>{listeners.mousemove({movementX:dx,movementY:dy});frame();};
read('look.yaw=.42;look.pitch=-.7;look.applyCamera(B,camera)');
const beforeLower=motion.viewBasis(.42,-.7);read("progress.phase='lower';velocity=[0,0,0];state=initialState()");frame();
for(const axis of ['right','up','forward'])near(basis()[axis],beforeLower[axis]);
assert.equal(read('look.free'),true);assert.ok(read('camera.rotationQuaternion'));
function checkCameraBody(){
 const b=basis(),cam=read('camera'),inverseView=cam.getViewMatrix(true).clone().invert();
 for(const [key,axis] of [['right',B.Axis.X],['up',B.Axis.Y],['forward',B.Axis.Z]])near(B.Vector3.TransformNormal(axis,inverseView).asArray(),b[key]);
 for(const [key,axis] of [['right',B.Axis.X],['up',B.Axis.Y],['forward',B.Axis.Z]])near(cam.getDirection(axis).asArray(),b[key]);
 const av=read('renderer.instances.find(x=>x.depth===0).avatar');av.body.computeWorldMatrix(true);
 for(const [key,axis] of [['right',B.Axis.X],['up',B.Axis.Y],['forward',B.Axis.Z]])near(axis.rotateByQuaternionToRef(av.body.rotationQuaternion,new B.Vector3()).asArray(),b[key]);
 near(cam.getDirection(B.Axis.Z).asArray(),motion.viewBasis(read('look')).forward);
 const pos=av.body.position.subtract(cam.position);assert.ok(Math.abs(B.Vector3.Dot(pos,new B.Vector3(...b.forward))+.28)<2e-6);
 const clip=read("buildVisibleOpticalInstances(state,'lower',look,{fov:camera.fov,aspect:4/3})");assert.ok(clip.length>1,'inverted view still sees neighboring rooms');
}
checkCameraBody();
read('look.reset();look.setFree(true);look.skipNext=false');
for(let i=0;i<16;i++)turn(0,Math.PI/16/.002);
near(basis().forward,[0,0,-1]);near(basis().up,[0,-1,0]);checkCameraBody();
for(let i=0;i<16;i++)turn(0,Math.PI/16/.002);
near(basis().forward,[0,0,1]);near(basis().up,[0,1,0]);checkCameraBody();
// Deliberately turn through a pole, then yaw relative to inverted body.
for(let i=0;i<8;i++)turn(0,Math.PI/16/.002);checkCameraBody();
for(let i=0;i<8;i++)turn(Math.PI/16/.002,0);checkCameraBody();
const held=read('JSON.stringify(look.quaternion)');frame(10);assert.equal(read('JSON.stringify(look.quaternion)'),held,'no automatic upright correction');
// Resume, lab and binocular transitions clear queued input, not attitude.
read('look.push(12,8);look.transition()');frame();assert.equal(read('JSON.stringify(look.quaternion)'),held);
read('setZoom(true)');frame();checkCameraBody();read('setZoom(false)');
for(let i=0;i<4000;i++){const l=read('look');l.push(Math.sin(i*.7)*11,Math.cos(i*.41)*13);l.frame();const b=l.basis();for(const v of Object.values(b))assert.ok(Math.abs(Math.hypot(...v)-1)<1e-12);for(const [a,c] of [['up','right'],['right','forward'],['up','forward']])assert.ok(Math.abs(topology.dot(b[a],b[c]))<1e-12);}
frame();checkCameraBody();
const l=read('look'),b=l.basis();
for(const [input,key] of [[[1,0,0],'right'],[[0,1,0],'up'],[[0,0,1],'forward']]){const thrust=motion.integrateSuitThrust([0,0,0],input,l,0,.02);near(thrust.acceleration,b[key].map(v=>v*3));}
const coastA=motion.integrateSuitThrust([1,2,3],[0,0,0],l,0,.1),coastB=motion.integrateSuitThrust([1,2,3],[0,0,0],0,0,.1);near(coastA.velocity,coastB.velocity);
// Every directed seam transports attitude with the same frame as velocity.
let seams=0;
for(const id of topology.CELL_IDS){const n=topology.normalFor(id),f=topology.canonicalFrame(n);for(const dest of topology.cellNeighbors(n)){
 const s={normal:n,frame:f,p:topology.add(topology.scale(n,topology.H),topology.scale(dest,topology.H-.5))},delta=topology.worldToTangent(f,topology.scale(dest,.9));
 const moved=motion.advanceWithCollision(s,[...delta],delta,'lower');assert.equal(moved.crossings.length,1);
 for(const axis of Object.values(b)){const a=topology.tangentToWorld(s.frame,axis),next=topology.tangentToWorld(moved.state.frame,axis);const expected=a.map((v,i)=>v-topology.dot(a,dest)*(dest[i]+n[i]));near(next,expected);}
 seams++;
}}
assert.equal(seams,48);
// Actual first-person body, transformed self-images, and camera share orientation.
read('renderer.rebuild(state,"lower")');read("renderer.update(state,look,'lower',time,gesture,false,locomotion)");
for(const x of read('renderer.instances').filter(x=>x.avatar.parent.isEnabled()))near(x.avatar.body.rotationQuaternion.asArray(),l.quaternion);
// Resets/debug entry and the unchanged upper chapter.
read('reset()');frame();assert.equal(read('look.free'),false);assert.equal(read('camera.rotationQuaternion'),null);assert.equal(read('camera.rotation.x'),0);
read('locked=true;look.skipNext=false');for(let i=0;i<20;i++)turn(0,-100);assert.ok(read('look.pitch')>-Math.PI/2);assert.ok(read('look.pitch')<-1.56);assert.equal(read('camera.rotationQuaternion'),null);
read("$('debugLower').onclick()");frame();assert.equal(read('look.free'),true);near(basis().forward,[0,0,1]);
console.log('PASS lower free-attitude: pole crossings/full flips, local yaw, camera/body/optics identity, 4000 mixed rotations, six-axis thrust, momentum independence, 48 seam transports, pause/zoom/reset/debug, unchanged upper clamp. NullEngine mathematics, not GPU/FPS.');
read('renderer.dispose();scene.dispose();engine.dispose()');
