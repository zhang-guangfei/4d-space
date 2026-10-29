/** Shipped solver + real application handlers; deterministic CPU/DOM fixture,
 * not a physical-browser/WebGL test. Collision uses production modules. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GroundMotion,GroundGait,GRAVITY,JUMP_SPEED,AVATAR_HEIGHT,FLOOR_Z,CEILING_Z,STANDING_EYE,CROWN_ABOVE_EYE} from './dist/grounded-motion.js';
import * as topology from './dist/chapter-topology.js';
import * as motion from './dist/chapter-motion.js';
import {ChapterProgress} from './dist/chapter-progress.js';
import {LookController} from './dist/look.js';
import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const maxLift=CEILING_Z-CROWN_ABOVE_EYE-STANDING_EYE-FLOOR_Z;
for(const fps of [20,30,60,144,240]){
 const g=new GroundMotion();let jumps=0;
 for(let i=0;i<fps*8;i++){const r=g.step(1/fps,i===0,false,true);jumps+=Number(r.jumped);assert.ok(r.footLift<=AVATAR_HEIGHT+1e-8);}
 assert.equal(jumps,1);assert.equal(g.hovering,true);near(g.footLift,AVATAR_HEIGHT);near(g.verticalVelocity,0);
 const y=g.eyeZ;g.step(1/fps,false,false,false);assert.ok(g.eyeZ<y);assert.equal(g.hovering,false);
 for(let i=0;i<fps*3;i++)g.step(1/fps,false,false,false);
 assert.equal(g.airborne,false);near(g.footLift,0);near(g.verticalVelocity,0);
 // A brief held launch then release is exactly the original ballistic jump.
 const held=new GroundMotion(),ballistic=new GroundMotion();
 for(let i=0;i<fps*3;i++){held.step(1/fps,i===0,false,i<3);ballistic.step(1/fps,i===0);near(held.footLift,ballistic.footLift);near(held.verticalVelocity,ballistic.verticalVelocity);}
 near(held.peakFootLift,AVATAR_HEIGHT);
}
const one=new GroundMotion(),split=new GroundMotion();one.step(9,true,false,true);for(let i=0;i<900;i++)split.step(.01,i===0,false,true);near(one.footLift,split.footLift);near(one.verticalVelocity,0);assert.equal(one.hovering,true);
// Midair re-press never adds another jump, arrests descent or rearms hover.
const repressed=new GroundMotion();repressed.step(.1,true,false,true);repressed.releaseJumpControl();repressed.step(.9,false,false,false);const oldV=repressed.verticalVelocity;assert.ok(oldV<0);const again=repressed.step(.1,true,false,true);assert.equal(again.jumped,false);assert.equal(again.jetpackArmed,false);assert.ok(again.verticalVelocity<oldV);
for(let i=0;i<100;i++)repressed.step(.05,true,false,true);near(repressed.footLift,0);assert.equal(repressed.airborne,false);assert.equal(repressed.step(.05,true,false,true).jumped,false);repressed.releaseJumpControl();assert.equal(repressed.step(.05,true,false,true).jumped,true);
// Forced low overhead contact clamps once; sustained hold never oscillates.
const ceiling=new GroundMotion();ceiling.step(0,true,false,true);ceiling.footLift=maxLift-.02;ceiling.verticalVelocity=3;
for(let i=0;i<600;i++){ceiling.step(1/60,false,false,true);assert.ok(ceiling.eyeZ+CROWN_ABOVE_EYE<=CEILING_Z+1e-8);if(i>2){near(ceiling.footLift,maxLift);near(ceiling.verticalVelocity,0);assert.equal(ceiling.hovering,true);}}
ceiling.releaseJumpControl();ceiling.step(.1);assert.ok(ceiling.footLift<maxLift&&ceiling.verticalVelocity<0);
// Disarming a paused ascent preserves its velocity/height, but cannot auto-hover.
const paused=new GroundMotion();paused.step(.2,true,false,true);const saved=[paused.footLift,paused.verticalVelocity];paused.releaseJumpControl();near(paused.footLift,saved[0]);near(paused.verticalVelocity,saved[1]);paused.step(2,false,false,true);assert.equal(paused.airborne,false);assert.equal(paused.hovering,false);

// Lightweight renderer fixture keeps real input, GroundMotion, topology,
// collision, progress and suit-flight code. Rendering itself is tested elsewhere.
const events={},windowEvents={},elements=new Map();
function element(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{textContent:'',value:'0',disabled:false,style:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,v){if(v)classes.add(c);else classes.delete(c);}},addEventListener(){},focus(){},replaceChildren(){},appendChild(){},requestPointerLock(){document.pointerLockElement=this;events.pointerlockchange();}});}return elements.get(id);}
const document={hidden:false,pointerLockElement:null,getElementById:element,createElement:()=>element('new'),addEventListener(t,f){events[t]=f;},exitPointerLock(){this.pointerLockElement=null;events.pointerlockchange?.();}};
let engine;
class Vector3{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});}asArray(){return [this.x,this.y,this.z];}}
const B={Vector3,Quaternion:class{set(x,y,z,w){Object.assign(this,{x,y,z,w});}},Color4:class{},Engine:class{constructor(){engine=this;this.delta=1000/60;}setHardwareScalingLevel(){}runRenderLoop(f){this.loop=f;}getDeltaTime(){return this.delta;}getFps(){return 1000/this.delta;}getRenderWidth(){return 1024;}getRenderHeight(){return 768;}},Scene:class{constructor(){this.meshes=[];this.materials=[];}executeWhenReady(f){f();}render(){}},UniversalCamera:class{constructor(_,position){this.position=position;this.rotation=new Vector3();this.upVector=new Vector3(0,1,0);this.inputs={clear(){}};}}};
class StationRenderer{rebuild(){}setTruthVisible(){}update(){}dispose(){}}
function createHypothesisLab(){return {models:{'colored-tesseract':{colored:{geometry:{cells:[]}}}},selectRoom(){},setAnimationTravel(){},setTravel(){},resize(){},resetView(){},setColoredCell(){},setColoredPlane(){},getColoredState(){return {selected:'W+',plane:'XW',angle:0};},dispose(){}};}
const sandbox={console,setTimeout,clearTimeout,performance,document,window:{BABYLON:B,devicePixelRatio:1,addEventListener(t,f){windowEvents[t]=f;},matchMedia:()=>({matches:false})},requestAnimationFrame:f=>f(),StationRenderer,createHypothesisLab,buildVisibleOpticalInstances:()=>[],GroundMotion,GroundGait,ChapterProgress,LookController,ROOM_MODELS,roomModel,...topology,...motion};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,''),sandbox);
const read=s=>vm.runInContext(s,sandbox),down=(code,repeat=false)=>events.keydown({code,repeat,preventDefault(){}}),up=code=>events.keyup({code}),frames=(count=1)=>{for(let i=0;i<count;i++)engine.loop();};
assert.equal(element('notice').textContent,'');
function relock(){document.pointerLockElement=element('world');events.pointerlockchange();}
function fresh(){read('lab?.dispose();lab=null;labRoom=null;state=initialState();state.p[2]=upperEyeZ();ground.reset();gait.reset();look.reset();velocity=[0,0,0];clearMovementInput();progress=new ChapterProgress();controlCancelled=false;ready=true');relock();engine.delta=1000/60;}
for(const fps of [20,30,60,144]){
 fresh();engine.delta=1000/fps;down('Space');frames(fps*5);near(read('ground.footLift'),1.75);assert.equal(read('ground.hovering'),true);near(read('camera.fov'),1.16);near(read('camera.rotation.y'),0);near(read('camera.rotation.x'),0);
 const before=read('state.p[2]');for(let i=0;i<fps;i++){down('Space',true);frames();near(read('state.p[2]'),before);}
 up('Space');frames();assert.ok(read('state.p[2]')<before);frames(fps*2);assert.equal(read('ground.airborne'),false);
}
// WASD/sprint retain their ordinary planar speed while hovering, no camera bob.
fresh();down('Space');frames(90);const hoverEye=read('state.p[2]');down('KeyD');down('ShiftRight');frames(20);near(read('Math.hypot(velocity[0],velocity[2])'),4.59);near(read('state.p[2]'),hoverEye);near(read('camera.position.y'),hoverEye);up('KeyD');up('ShiftRight');
// Full apex is genuinely too tall for the compact hatch: do not ghost through.
fresh();down('Space');frames(90);read('state.p[0]=H-.25');down('KeyW');frames(60);assert.equal(read('id()'),'W+');assert.ok(read('positionClear(state,state.p,"upper")'));near(read('state.p[0]'),topology.H-motion.PLAYER_RADIUS,2e-8);up('KeyW');
// Jump within a door's radius band: lintel contact creates a safe lower hover,
// which remains stable through a real XW seam and with sprint held.
fresh();read('state.p[0]=H-.05');down('Space');frames(90);assert.equal(read('ground.hovering'),true);const lowEye=read('state.p[2]');assert.ok(lowEye<hoverEye);down('KeyW');down('ShiftLeft');frames(6);assert.equal(read('id()'),'X+');near(read('state.p[2]'),lowEye);near(read('look.yaw'),0);assert.ok(read('positionClear(state,state.p,"upper")'));up('KeyW');up('ShiftLeft');frames(90);near(read('state.p[2]'),lowEye);up('Space');frames(90);assert.equal(read('ground.airborne'),false);
// Repeated release/re-press on the same airborne arc cannot add impulses, and
// the next genuinely grounded launch still works.
fresh();down('Space');frames(6);up('Space');frames(54);const descending=read('ground.verticalVelocity');for(let i=0;i<3;i++){down('Space');frames();up('Space');}assert.ok(read('ground.verticalVelocity')<descending);assert.equal(read('ground.jetpackArmed'),false);frames(120);down('Space');frames(90);assert.equal(read('ground.hovering'),true);
for(const interrupt of ['escape','blur','hidden','lock-loss','lab','reset']){
 fresh();down('Space');frames(90);const before=read('ground.footLift');assert.equal(read('ground.hovering'),true);
 if(interrupt==='escape')down('Escape');
 if(interrupt==='blur')windowEvents.blur();
 if(interrupt==='hidden'){document.hidden=true;events.visibilitychange();document.hidden=false;}
 if(interrupt==='lock-loss'){document.pointerLockElement=null;events.pointerlockchange();}
 if(interrupt==='lab'){read('openLab("X+");closeLab()');}
 if(interrupt==='reset')read('reset()');
 assert.equal(read('keys.size'),0,interrupt);assert.equal(read('ground.jetpackArmed'),false,interrupt);assert.equal(read('ground.hovering'),false,interrupt);
 frames(5);if(interrupt!=='reset')near(read('ground.footLift'),before);
 relock();down('Space',true);assert.equal(read('keys.has("Space")'),false,'repeat cannot restart jet after '+interrupt);frames(90);assert.equal(read('ground.airborne'),false,interrupt);near(read('ground.footLift'),0);up('Space');down('Space');frames(90);assert.equal(read('ground.hovering'),true,'fresh launch still works after '+interrupt);
}
// Actual normal phase unlock clears hover and applies production recovery.
fresh();down('Space');frames(90);read('for(const base of ["central-hall","treadmill","sphere"])progress.inspectModel(base);openLab("W+")');await read('lower()');assert.equal(read('progress.phase'),'lower');assert.equal(read('ground.hovering'),false);assert.equal(read('ground.jetpackArmed'),false);assert.equal(read('keys.size'),0);assert.ok(read('positionClear(state,state.p,"lower")'));relock();down('Space',true);assert.equal(read('keys.has("Space")'),false);
// Lower Space remains view/body-up thrust; release stops acceleration, not
// velocity, and never adds gravity. Validate pitched transported coordinates.
for(const fps of [20,60,144]){
 fresh();read('progress.phase="lower";state=initialState();look.yaw=.3;look.pitch=.4');engine.delta=1000/fps;down('Space');frames(Math.round(fps/4));const v=Array.from(read('velocity')),p=Array.from(read('state.p'));assert.ok(Math.hypot(...v)>0);const expectedUp=motion.viewBasis(.3,.4).up;v.forEach((value,i)=>near(value/Math.hypot(...v),expectedUp[i]));up('Space');frames();const coast=Array.from(read('velocity'));coast.forEach((value,i)=>near(value,v[i]*Math.exp(-.35/fps)));assert.ok(Math.hypot(...coast)>0);assert.notDeepEqual(Array.from(read('state.p')),p);assert.equal(read('ground.jetpackArmed'),false);near(read('camera.fov'),1.16);
}
// Escape returns from a model even when browser refuses pointer re-lock.
// Actual chapter loop accepts WASD; non-canvas mouse motion stays excluded.
for(const mode of ['upper','lower']){
 fresh();if(mode==='lower')read('progress.phase="lower";state=initialState()');
 read('openLab("X+")');const original=element('world').requestPointerLock;
 element('world').requestPointerLock=()=>{throw Object.assign(new Error('Escape is not pointer-lock activation'),{name:'NotAllowedError'});};
 down('Escape');assert.equal(read('labRoom'),null);assert.equal(read('locked'),false);assert.equal(read('keyboardCorridor'),true);
 const before=Array.from(read('state.p'));down('KeyW');frames(12);up('KeyW');assert.notDeepEqual(Array.from(read('state.p')),before,'real '+mode+' controller moves while keyboard fallback active');
 const yaw=read('look.yaw');events.mousemove({target:element('pause'),movementX:30,movementY:20});frames();near(read('look.yaw'),yaw);
 down('Escape',true);assert.equal(read('keyboardCorridor'),true);
 element('world').requestPointerLock=original;events.mousedown({target:element('world'),button:0});assert.equal(read('locked'),true);assert.equal(read('keyboardCorridor'),false);
 down('Escape');assert.equal(read('locked'),false);assert.equal(read('keyboardCorridor'),false);
}
console.log('PASS actual upper/lower Esc model return: denied pointer capture keeps real WASD motion, ignores UI mouse motion, repeat guard, canvas click reacquires, second Esc pauses.');
read('pause()');
console.log('PASS hover: exact 1.75m apex held8s at20/30/60/144/240Hz; ballistic tap/release, no midair rearm/autobounce, ceiling clamp, real controller repeat/release, WASD/sprint/noFOV-bob, solid high lintel + low-hover seam, Esc/blur/hidden/lock/lab/reset/phase disarm, lower pitched thrust and inertial release. CPU/DOM only; no GPU/input-device claim.');
