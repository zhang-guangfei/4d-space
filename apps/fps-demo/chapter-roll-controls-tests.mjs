import {buildVisibleOpticalInstances} from './dist/visible-optics.js';
import {GroundMotion,GroundGait} from './dist/grounded-motion.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as topology from './dist/chapter-topology.js';import * as motion from './dist/chapter-motion.js';import {ChapterProgress} from './dist/chapter-progress.js';import {LookController} from './dist/look.js';import {StationRenderer} from './dist/station-renderer.js';import {createHypothesisLab} from './dist/hypotheses.js';import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(t,f){this.events??={};this.events[t]=f;},removeEventListener(){},setAttribute(){},focus(){},replaceChildren(){},appendChild(){}});let elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',value:'1'});return elements.get(id);}
const htmlIds=new Set([...fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const windowListeners={},listeners={},document={getElementById:id=>htmlIds.has(id)?el(id):null,createElement:canvas,removeEventListener(){},addEventListener(t,f){const prev=listeners[t];listeners[t]=(...args)=>{prev?.(...args);f(...args);};},hidden:false,exitPointerLock(){document.pointerLockElement=null;listeners.pointerlockchange?.();}};
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;let engines=[];B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:1024,renderHeight:768});engines.push(this);}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}};
// NullEngine lacks raw cubemap allocation; shim only this GPU-storage operation.
B.RawCubeTexture=class {constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
// Real Babylon geometry, matrices/material binding and scene.render; not GPU rasterization.
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(t,f){const prev=windowListeners[t];windowListeners[t]=(...args)=>{prev?.(...args);f(...args);};},removeEventListener(){}};Object.assign(sandbox,topology,motion,{buildVisibleOpticalInstances,GroundMotion,GroundGait,ChapterProgress,LookController,StationRenderer,createHypothesisLab,ROOM_MODELS,roomModel});let code=fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,sandbox);const read=x=>vm.runInContext(x,sandbox);if(el('notice').textContent)throw Error(el('notice').textContent);assert.equal(read('renderer.instances.length'),73);assert.equal(read('renderer.instances.filter(x=>x.avatar.parent.isEnabled()).length'),7);console.log('PASS scene constructs',read('scene.meshes.length'),'meshes; 73 clipped instances / 6 full-path self-images.');read('ready=true');const engine=engines[0];engine.getDeltaTime=()=>1e3/60;const frame=(n=1)=>{for(let i=0;i<n;i++)engine.loop();};
const near=(a,b,eps=2e-6)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<eps,`${a} != ${b}`));
const basis=()=>read('look.basis()');
const key=(code,extra={})=>{let prevented=false;listeners.keydown({code,repeat:false,target:el('world'),preventDefault(){prevented=true;},...extra});return prevented;};
const release=code=>listeners.keyup({code});
const activate=()=>{document.pointerLockElement=el('world');listeners.pointerlockchange();read('locked=true;ready=true;look.skipNext=false');};
function fresh(){read("clearMovementInput();progress.phase='lower';state=initialState();velocity=[0,0,0];look.reset();look.setFree(true);look.skipNext=false");activate();}
function checkCameraBody(){
 const b=basis(),cam=read('camera'),inverseView=cam.getViewMatrix(true).clone().invert();
 for(const [name,axis] of [['right',B.Axis.X],['up',B.Axis.Y],['forward',B.Axis.Z]])near(B.Vector3.TransformNormal(axis,inverseView).asArray(),b[name]);
 const av=read('renderer.instances.find(x=>x.depth===0).avatar');
 for(const [name,axis] of [['right',B.Axis.X],['up',B.Axis.Y],['forward',B.Axis.Z]])near(axis.rotateByQuaternionToRef(av.body.rotationQuaternion,new B.Vector3()).asArray(),b[name]);
}
// 60 degrees/s at real render-loop dt, relative to the body rather than world Z.
for(const [code,sign] of [['KeyQ',-1],['KeyE',1]]){
 fresh();key(code);frame(90);release(code);near(basis().up,[sign,0,0]);near(basis().forward,[0,0,1]);checkCameraBody();
 const held=basis();frame(3);near(basis().up,held.up);near(basis().forward,held.forward);
 assert.equal(read('labRoom'),null,'E rolls instead of opening a model');near(read('velocity'),[0,0,0]);
}
fresh();key('KeyQ');key('KeyE');frame(9);near(basis().up,[0,1,0]);release('KeyE');frame(3);assert.ok(basis().up[0]<0);release('KeyQ');
// Repeats do not increase speed, and cannot restart a cleared held input.
fresh();key('KeyQ');for(let i=0;i<10;i++)key('KeyQ',{repeat:true});frame(3);near(basis().up,[-Math.sin(Math.PI/60),Math.cos(Math.PI/60),0]);
read('clearMovementInput()');key('KeyQ',{repeat:true});const cleared=basis();frame();near(basis().up,cleared.up);
// Equal elapsed simulation time, different timesteps.
let timed=[];for(const fps of [20,30,60,120]){fresh();engine.getDeltaTime=()=>1000/fps;key('KeyQ');frame(fps/2);release('KeyQ');timed.push(basis());checkCameraBody();}
for(const b of timed)near(b.up,[-.5,Math.sqrt(3)/2,0]);engine.getDeltaTime=()=>1000/60;
// Arbitrary mouse attitude, including inversion: Q/E rotate about CURRENT forward.
fresh();read('look.push(120,-210);look.frame();look.push(-82,155);look.frame();look.frame(3,1)');
const arbitrary=basis();key('KeyE');frame(90);release('KeyE');near(basis().up,arbitrary.right);near(basis().forward,arbitrary.forward);checkCameraBody();
// Up/down jets use the freshly rolled basis. Both Ctrl keys and opposing thrust.
for(const rollTime of [1.5,3])for(const [code,sign] of [['Space',1],['ControlLeft',-1],['ControlRight',-1]]){
 fresh();read(`look.frame(${rollTime},1)`);const up=basis().up;key(code);frame();release(code);const vel=read('velocity'),len=Math.hypot(...vel);assert.ok(len>0);near(vel.map(v=>v/len),up.map(v=>sign*v));checkCameraBody();
}
fresh();key('Space');key('ControlLeft');frame();near(read('velocity'),[0,0,0]);release('Space');release('ControlLeft');
fresh();key('KeyQ');frame();near(read('velocity'),[0,0,0]);release('KeyQ');
// F opens models and Tab is binocular toggle, only during active corridor input.
fresh();assert.equal(key('Tab'),true);assert.equal(read('zoom'),true);key('Tab',{repeat:true});assert.equal(read('zoom'),true);key('Tab');assert.equal(read('zoom'),false);
for(const tagName of ['INPUT','TEXTAREA','SELECT','BUTTON','A']){assert.equal(key('Tab',{target:{tagName}}),false);assert.equal(read('zoom'),false);key('KeyQ',{target:{tagName}});assert.equal(read('keys.size'),0);}
fresh();key('KeyQ');listeners.focusin({target:{tagName:'INPUT'}});assert.equal(read('keys.size'),0);
assert.equal(key('Tab',{ctrlKey:true}),false);assert.equal(key('Tab',{altKey:true}),false);
read("state=initialState();state.p[0]=0;progress.phase='lower';progress.truthRevealed=true");key('KeyQ');key('KeyF');assert.equal(read('labRoom'),'W+');assert.equal(read('keys.size'),0);assert.equal(read('zoom'),false);assert.equal(key('Tab'),false);assert.equal(read('zoom'),false);read('closeLab()');
// Pause and loss of focus clear roll and suspend all corridor commands.
for(const action of [()=>read('pause()'),()=>windowListeners.blur(),()=>{document.hidden=true;listeners.visibilitychange();document.hidden=false;}]){
 fresh();key('KeyQ');frame();action();assert.equal(read('keys.size'),0,String(action));const stopped=basis();frame();near(basis().up,stopped.up);assert.equal(key('Tab'),false);
}
// Restart clears held controls and returns directly to the playable first room.
fresh();key('KeyQ');key('KeyW');frame();el('reset').onclick();
assert.equal(read('keys.size'),0);assert.equal(read('locked'),false);assert.equal(read('keyboardCorridor'),true);
const resetBasis=basis(),resetPoint=read('state.p.slice()');
key('KeyQ',{repeat:true});key('KeyW',{repeat:true});frame();
assert.equal(read('keys.size'),0);near(basis().up,resetBasis.up);near(read('state.p'),resetPoint);
release('KeyQ');release('KeyW');
assert.equal(key('Tab'),true);assert.equal(read('zoom'),true);key('Tab');
fresh();key('KeyQ');frame();document.pointerLockElement=null;listeners.pointerlockchange();assert.equal(read('keys.size'),0);
// Cross all directed seams while rolling: transported frame carries orientation once.
let seams=0;for(const id of topology.CELL_IDS)for(const dest of topology.cellNeighbors(topology.normalFor(id))){
 fresh();const n=topology.normalFor(id),f=topology.canonicalFrame(n);sandbox.crossState={normal:n,frame:f,p:topology.add(topology.scale(n,topology.H),topology.scale(dest,topology.H-.005))};sandbox.crossVelocity=topology.worldToTangent(f,topology.scale(dest,1));
 read('state=crossState;velocity=crossVelocity;look.frame(.7,1)');const old=read('seamCount');key('KeyQ');frame();release('KeyQ');assert.equal(read('seamCount'),old+1);assert.equal(read('id()'),topology.cellId(dest));checkCameraBody();seams++;
}
assert.equal(seams,48);
// Upper chapter has no roll; C still crouches, Space still jumps, F/Tab remap applies.
read('reset()');activate();key('KeyQ');key('KeyE');key('KeyZ');frame();near(basis().up,[0,1,0]);assert.equal(read('look.free'),false);assert.equal(read('camera.rotationQuaternion'),null);assert.equal(read('keys.size'),0);
key('KeyC');frame();assert.ok(read('locomotion.crouchScale')<1);release('KeyC');key('Space');frame();assert.equal(read('ground.airborne'),true);release('Space');
assert.equal(key('Tab'),true);assert.equal(read('zoom'),true);key('Tab');assert.equal(read('zoom'),false);
read('updateHUD()');assert.doesNotMatch(el('hint').textContent,/Q\/E/);fresh();read('updateHUD()');assert.match(el('hint').textContent,/Q\/E/);assert.match(el('hint').textContent,/Tab 望远镜/);assert.doesNotMatch(el('hint').textContent,/或 Q|Z\/C/);
console.log('PASS Q/E local roll + F interaction + Tab binocular: camera/body matrices, 60deg/s, release/repeat/cancel, 20–120Hz, arbitrary inversion, body-relative Space/Ctrl, all 48 seams, focus/modal/blur/reset guards and unchanged upper controls. NullEngine, not GPU/FPS.');
read('renderer.dispose();scene.dispose();engine.dispose()');
