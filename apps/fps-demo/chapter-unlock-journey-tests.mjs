/** Full production application journey with real Babylon NullEngine, synthetic input, no manual slider or loop prerequisite. */
import {SPHERE_CORRIDOR,SPHERE_CORRIDOR_BORDER} from './dist/sphere-corridor.js';
import assertHTML from 'node:assert/strict';
import {hypothesisRoomColor,hypothesisSurfaceColor} from './dist/hypothesis-colors.js';
import {buildVisibleOpticalInstances} from './dist/visible-optics.js';
import {GroundMotion,GroundGait} from './dist/grounded-motion.js';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as topology from './dist/chapter-topology.js';import * as motion from './dist/chapter-motion.js';import {ChapterProgress} from './dist/chapter-progress.js';import {LookController} from './dist/look.js';import {StationRenderer} from './dist/station-renderer.js';import {createHypothesisLab} from './dist/hypotheses.js';import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(t,f){this.events??={};this.events[t]=f;},removeEventListener(){},setAttribute(){},focus(){},requestPointerLock(){document.pointerLockElement=this;listeners.pointerlockchange?.();},children:[],replaceChildren(){this.children=[];},appendChild(b){this.children.push(b);}});let elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{classes:new Set(),toggle(c,b){if(b===undefined)b=!this.classes.has(c);if(b)this.classes.add(c);else this.classes.delete(c);},add(c){this.classes.add(c);},remove(c){this.classes.delete(c);},contains(c){return this.classes.has(c);}},textContent:'',value:'1'});return elements.get(id);}
assertHTML.equal(fs.readFileSync('dist/index.html','utf8'),fs.readFileSync('dist/chapter.html','utf8'),'canonical/root HTML must stay equal');
const htmlIds=new Set([...fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const listeners={},document={getElementById:id=>htmlIds.has(id)?el(id):null,createElement:canvas,removeEventListener(){},addEventListener(t,f){listeners[t]=f;},hidden:false,exitPointerLock(){document.pointerLockElement=null;listeners.pointerlockchange?.();}};
const sandbox={console,requestAnimationFrame:f=>setTimeout(f,0),setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;let engines=[];B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:1024,renderHeight:768});engines.push(this);}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}createRawTexture(...args){const texture=super.createRawTexture(...args);texture.isReady=true;return texture;}updateDynamicTexture(texture,...args){super.updateDynamicTexture(texture,...args);texture.isReady=true;}};
// NullEngine has no GPU upload completion: the engine fixture marks raw/dynamic texture uploads ready.
// It also lacks raw cubemap allocation; shim that GPU-storage operation. Scene-ready and game callbacks stay real.
B.RawCubeTexture=class {constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
// Real Babylon geometry, matrices/material binding and scene.render; not GPU rasterization.
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(){},removeEventListener(){}};Object.assign(sandbox,topology,motion,{buildVisibleOpticalInstances,GroundMotion,GroundGait,ChapterProgress,LookController,StationRenderer,createHypothesisLab,ROOM_MODELS,roomModel});let code=fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,sandbox);const read=x=>vm.runInContext(x,sandbox);
const engine=engines[0]; engine.getDeltaTime=()=>50;
const frame=(n=1)=>{for(let i=0;i<n;i++)engine.loop();};
const key=(code)=>listeners.keydown({code,repeat:false,preventDefault(){}});
const release=(code)=>listeners.keyup({code});
const click=(id)=>{const e=el(id);if(e.disabled)return false;e.onclick();return true;};
const hidden=id=>el(id).classList.contains('hidden');


const titles=()=>el('modelIndex').children.map(b=>b.textContent.replace(' ✓',''));
const pressModel=base=>{const title=Object.values(ROOM_MODELS).find(x=>x.base===base).title;const button=el('modelIndex').children.find(b=>b.textContent.replace(' ✓','')===title);assert.ok(button,'model tab exists: '+base);button.onclick();};
const assertTruthVisibility=expected=>{assert.equal(read('renderer.truthVisible'),expected);assert.ok(read('renderer.pool.filter(x=>x.truth).every(x=>x.truth.root.isEnabled(false)==='+expected+')'));};
const travelTo=(target,keyCode)=>{key(keyCode);let i=0;while(read('id()')!==target&&i++<160)frame();release(keyCode);assert.equal(read('id()'),target,'walk to '+target);while(read('Math.hypot(...localPoint(state))')>=4.8&&i++<200){key(keyCode);frame();release(keyCode);}assert.ok(i<200);};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const waitReady=async()=>{const deadline=Date.now()+10000;while(!read('ready')&&Date.now()<deadline){frame();await new Promise(r=>setTimeout(r,25));}assert.equal(read('ready'),true,'scene ready callback resumes the game');};
try{
 await waitReady();
 for(let cycle=0;cycle<2;cycle++){
  assert.equal(read('progress.inspected.size'),0);assert.equal(read('progress.truthRevealed'),false);assert.equal(read('progress.truthViewed'),false);assertTruthVisibility(false);
  assert.equal(read('id()'),'W+');assert.doesNotMatch(el('hint').textContent,/F 模型/);click('start');key('KeyF');
  assert.equal(read('labRoom'),null,'initial W+ cannot inspect hidden fourth model');assert.equal(read('progress.inspected.size'),0);assert.equal(read('locked'),true);
  travelTo('X+','KeyW');key('KeyF');
  assert.equal(read('labRoom'),'X+');assert.equal(read('progress.inspected.size'),1,'opening records the first model immediately');assert.equal(read('locked'),false);assert.ok(hidden('unlock'));assert.equal(el('unlock').disabled,true);assert.equal(titles().length,3);assert.ok(hidden('truthTools'));assertTruthVisibility(false);
  pressModel('treadmill');assert.equal(read('progress.inspected.size'),1,'reopening same model does not count again');
  pressModel('sphere');assert.equal(read('progress.inspected.size'),2);assert.equal(read('progress.truthRevealed'),false);assert.ok(hidden('unlock'));assertTruthVisibility(false);
  pressModel('central-hall');assert.equal(read('labRoom'),'X-');assert.equal(read('progress.inspected.size'),3);assert.equal(read('progress.truthRevealed'),true);assert.equal(read('progress.truthViewed'),false);assert.equal(read('progress.loopComplete'),false);assert.equal(read('progress.canUnlock'),false);assertTruthVisibility(true);
  assert.equal(el('objective').textContent,'返回 W+ 查看新模型。');assert.equal(el('unlockHint').textContent,'返回 W+ 查看新模型。');assert.equal(titles().length,3,'new model is not remotely accessible');assert.ok(!titles().includes(roomModel('W+').title));assert.ok(hidden('unlock'));assert.equal(el('unlock').disabled,true);assert.match(el('modelsProgress').textContent,/假说记录 3\/3/);
  read("openLab('W+')");assert.equal(read('labRoom'),'X-','direct stale/remote request also rejected');assert.equal(read('progress.truthViewed'),false);
  assert.equal(read("progress.viewTruth('W+')"),false);assert.equal(read("progress.unlockLower('W+',time)"),false);
  // A rejected physical pointer lock must leave a visible retry, retaining all reads.
  const world=el('world'),original=world.requestPointerLock;
  if(cycle===0){world.requestPointerLock=()=>Promise.reject(Object.assign(new Error('fixture permission denial'),{name:'NotAllowedError'}));click('closeLab');await flush();assert.ok(!hidden('menu')&&hidden('console'));assert.equal(read('locked'),false);assert.equal(read('labRoom'),null);assert.match(el('notice').textContent,/未能锁定鼠标/);assert.equal(read('progress.inspected.size'),3);assertTruthVisibility(true);world.requestPointerLock=original;click('start');}
  else click('closeLab');
  assert.equal(read('locked'),true);travelTo('W+','KeyS');
  assert.equal(read('progress.loopComplete'),false,'backtracking avoids the old loop predicate');assert.equal(read('progress.truthViewed'),false);assert.equal(read('progress.canUnlock'),false);assert.match(el('hint').textContent,/F 模型/);
  key('KeyF');assert.equal(read('labRoom'),'W+');assert.equal(el('modelTitle').textContent,roomModel('W+').title);assert.ok(!hidden('truthTools'));assert.equal(read('progress.truthViewed'),true);assert.equal(read('progress.canUnlock'),true);assert.ok(!hidden('unlock'));assert.equal(el('unlock').disabled,false);assert.equal(el('unlock').textContent,'打开舱门');assert.equal(titles().length,4);
  // A basic model never shows or executes the unlock action, even after truth was viewed.
  pressModel('sphere');assert.ok(hidden('unlock'));assert.equal(el('unlock').disabled,true);await el('unlock').onclick();assert.equal(read('progress.phase'),'upper');
  pressModel('colored-tesseract');assert.ok(!hidden('unlock'));assert.equal(el('unlock').disabled,false);assert.equal(read('progress.loopComplete'),false);
  if(cycle===1){read('state.p[0]=H-.05');assert.ok(read('positionClear(state,state.p,"upper")'));assert.ok(!read('positionClear(state,state.p,"lower")'),'old grounded aperture becomes a solid lower wall band');}
  assert.ok(click('unlock'));assert.equal(read('progress.phase'),'lower');assert.ok(read('positionClear(state,state.p,"lower")'),'phase transition resolves overlap before scene preparation/resume');
  await waitReady();assert.ok(hidden('console')&&!hidden('menu'));assert.equal(read('progress.counts["W+"]'),1);assert.equal(read('Object.values(progress.counts).reduce((a,b)=>a+b,0)'),1,'upper visits do not count in lower survey');assert.equal(read('progress.routeComplete'),false);assertTruthVisibility(true);assert.ok(read('renderer.mode==="lower"'));assert.equal(el('start').disabled,false);
  if(cycle===0){assert.ok(click('reset'));assert.equal(read('progress.phase'),'upper');assert.equal(read('progress.truthRevealed'),false);assert.equal(read('progress.truthViewed'),false);assert.equal(read('progress.inspected.size'),0);assertTruthVisibility(false);}
 }
 console.log('PASS production unlock journey twice: initial hidden W+; distinct three immediate reads; no slider input/no completed loop; pooled reveal and return prompt; blocked remote fourth/tab; physical W+ viewing; fourth-only enabled 打开舱门; lower fresh survey; pointer denial/retry; reset/repeat. Babylon NullEngine + synthetic DOM/input, not GPU or physical browser QA.');
}finally{read('pause();lab?.dispose();renderer.dispose();scene.dispose();engine.dispose()');}
