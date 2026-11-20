/** Actual application handlers in a deterministic DOM/permission fixture; no browser/GPU claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LookController} from './dist/look.js';
import {GroundMotion} from './dist/grounded-motion.js';
import {ChapterProgress} from './dist/chapter-progress.js';
import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const source=fs.readFileSync('dist/chapter.js','utf8');
const pick=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};
const elements=new Map(),events={},timers=new Map();let nextTimer=1,inClick=false,calls=0,disposals=0,mode='success',pending=[],menuShows=0;
function el(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{textContent:'',value:'',disabled:false,classList:{add(c){classes.add(c);},remove(c){classes.delete(c);if(id==='menu'&&c==='hidden')menuShows++;},toggle(c,on){if(on===undefined)on=!classes.has(c);if(on)classes.add(c);else this.remove(c);},contains:c=>classes.has(c)},focus(){},setAttribute(){},replaceChildren(){},appendChild(){}});}return elements.get(id);}
const document={hidden:false,pointerLockElement:null,getElementById:el,createElement:()=>el('button'),addEventListener(t,f){events[t]=f;},exitPointerLock(){this.pointerLockElement=null;events.pointerlockchange?.();}};
const canvas=el('world');canvas.events={};canvas.addEventListener=(t,f)=>canvas.events[t]=f;
canvas.requestPointerLock=options=>{calls++;assert.ok(inClick,'requestPointerLock must run inside original click activation');if(mode==='throw')throw Object.assign(new Error('denied'),{name:'NotAllowedError'});if(mode==='deny')return Promise.reject(Object.assign(new Error('denied'),{name:'NotAllowedError'}));if(mode==='raw-fallback'&&options)throw Object.assign(new Error('unsupported'),{name:'NotSupportedError'});if(mode==='pending')return new Promise((resolve,reject)=>pending.push({resolve,reject}));if(mode==='legacy'||mode==='silent')return undefined;document.pointerLockElement=canvas;events.pointerlockchange();return Promise.resolve();};
const fakeLab=()=>({selectRoom(){},setAnimationTravel(){},resize(){},resetView(){},setColoredCell(){},setColoredPlane(){},dispose(){disposals++;}});
const sandbox={console,Promise,LookController,GroundMotion,ChapterProgress,ROOM_MODELS,roomModel,document,window:{addEventListener(t,f){events['window:'+t]=f;},matchMedia:()=>({matches:false})},B:{},createHypothesisLab:fakeLab,setTimeout(f,ms){assert.equal(ms,2500);const id=nextTimer++;timers.set(id,f);return id;},clearTimeout(id){timers.delete(id);}};vm.createContext(sandbox);
vm.runInContext(`const $=id=>document.getElementById(id),canvas=$('world');let ready=true,labRoom=null,lab=null,locked=false,keyboardCorridor=false,escapeReturnPending=false,keys=new Set(),jumpQueued=false,velocity=[0,0,0],controlRequest=0,controlPending=false,controlCancelled=false,controlTimer=null,time=0,lockTime=0,zoom=false,autoplay=true,labTravel=0,sensitivity=1;const look=new LookController(),progress=new ChapterProgress(),ground=new GroundMotion();for(const base of ['central-hall','treadmill','sphere'])progress.inspectModel(base);function id(){return 'W+';}function setZoom(v){zoom=v;}function refreshLabStatus(){}function updateHUD(){}function updateTruthReadout(){}`,sandbox);
vm.runInContext(pick('function phase()','function id()'),sandbox);
vm.runInContext(pick('function isTruthRoom(','function updateHUD()'),sandbox);
vm.runInContext(pick('function clearMovementInput()','function setZoom('),sandbox);
vm.runInContext(pick('function clearControlTimer()','function reset()'),sandbox);
vm.runInContext(pick("$('start').onclick=resumeCorridor;","document.addEventListener('mousedown'"),sandbox);
vm.runInContext(pick("document.addEventListener('keydown'","document.addEventListener('keyup'"),sandbox);
vm.runInContext(pick("document.addEventListener('keyup'","window.addEventListener('blur'"),sandbox);
vm.runInContext(pick("document.addEventListener('mousedown'","document.addEventListener('keydown'"),sandbox);
vm.runInContext(pick("window.addEventListener('blur'","$('pause').onclick"),sandbox);
const returnHandler=source.match(/\$\('closeLab'\)\.onclick=\(\)=>closeLab\(\{resume:true\}\);/);assert.ok(returnHandler,'Return button explicitly opts into resume');vm.runInContext(returnHandler[0],sandbox);
const escape=(repeat=false)=>{inClick=true;try{events.keydown({code:'Escape',repeat,preventDefault(){}});}finally{inClick=false;}};
const read=s=>vm.runInContext(s,sandbox),click=id=>{inClick=true;try{return el(id).onclick();}finally{inClick=false;}},flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();},hidden=id=>el(id).classList.contains('hidden');
function open(room='W+'){read(`openLab('${room}')`);assert.equal(read('labRoom'),room);assert.ok(!hidden('console'));assert.ok(hidden('menu'));}
const mouse=(target=canvas,dx=12,dy=6)=>events.mousemove({target,movementX:dx,movementY:dy});
function paused(){assert.equal(read('locked'),false);assert.ok(!hidden('menu'),'visible retry/pause menu');assert.equal(read('keys.size'),0);assert.equal(read('jumpQueued'),false);}
try{
 for(let cycle=0;cycle<3;cycle++)for(const room of ['W+','X+','W-','X-']){open(room);read("keys.add('KeyW');jumpQueued=true;velocity=[1,2,3]");const before=calls;menuShows=0;click('closeLab');assert.equal(calls,before+1);assert.equal(read('labRoom'),null);assert.equal(read('lab'),null);assert.equal(read('locked'),true);assert.ok(hidden('console')&&hidden('menu'));assert.equal(menuShows,0,'no intermediate continue overlay');assert.equal(read('keys.size'),0);assert.equal(read('jumpQueued'),false);assert.deepEqual(Array.from(read('velocity')),[0,0,0]);assert.equal(timers.size,0);}
 assert.equal(disposals,12);
 // Esc in a model returns directly, whereas corridor Esc still pauses.
 open();let before=calls;menuShows=0;escape();assert.equal(read('locked'),true);assert.equal(read('labRoom'),null);assert.ok(hidden('console')&&hidden('menu'));assert.equal(menuShows,0);assert.equal(calls,before+1);escape(true);assert.equal(read('locked'),true,'held Esc cannot immediately pause again');escape();paused();assert.equal(calls,before+1);
 // Some browsers prohibit re-locking from Escape. Keep corridor visible and
 // keyboard movement enabled, without pretending pointer lock was acquired.
 for(const failure of ['deny','throw','legacy','silent']){
  open();mode=failure;menuShows=0;escape();await flush();if(failure==='legacy')events.pointerlockerror();if(failure==='silent')for(const callback of [...timers.values()])callback();
  assert.equal(read('locked'),false);assert.equal(read('keyboardCorridor'),true);assert.ok(hidden('console')&&hidden('menu'));assert.equal(menuShows,0);
  events.keydown({code:'KeyW',repeat:false,preventDefault(){}});assert.equal(read("keys.has('KeyW')"),true,'WASD usable in unlocked corridor');
  const yaw=read('look.yaw');mouse();mouse();read('look.frame()');assert.ok(read('look.yaw')>yaw,'unlocked Esc return must actually rotate view');
  const held=read('look.yaw');mouse(el('pause'));read('look.frame()');assert.equal(read('look.yaw'),held,'UI motion cannot rotate view');
  canvas.events.mouseleave();mouse(canvas,400,400);read('look.frame()');assert.equal(read('look.yaw'),held,'re-entry packet discarded');
  escape(true);assert.ok(hidden('menu'),'held Escape does not reopen overlay');escape();paused();assert.equal(read('keyboardCorridor'),false);
 }
 // Native Escape may release a just-acquired lock after the model handler.
 open();mode='success';escape();document.pointerLockElement=null;events.pointerlockchange();assert.ok(hidden('menu'));assert.equal(read('keyboardCorridor'),true);events.keyup({code:'Escape'});
 // A later mouse activation may acquire asynchronously. It must leave the
 // fallback mode, so subsequent native lock loss resumes ordinary pause UI.
 mode='pending';inClick=true;read('resumeCorridor({keyboardFallback:true})');inClick=false;
 const reacquire=pending.shift();document.pointerLockElement=canvas;events.pointerlockchange();reacquire.resolve();await flush();assert.equal(read('locked'),true);assert.equal(read('keyboardCorridor'),false);document.pointerLockElement=null;events.pointerlockchange();paused();
 // Fallback re-capture uses the actual canvas click handler; async failure
 // leaves mouse look usable, and blur cancels both movement and look.
 open();mode='deny';escape();await flush();events.keyup({code:'Escape'});
 mode='pending';inClick=true;events.mousedown({target:canvas,button:0});inClick=false;
 const clickCapture=pending.shift();mouse();mouse();read('look.frame()');
 document.pointerLockElement=canvas;events.pointerlockchange();clickCapture.resolve();await flush();assert.equal(read('keyboardCorridor'),false);
 open();mode='deny';escape();await flush();events['window:blur']();paused();let pausedYaw=read('look.yaw');mouse();mouse();read('look.frame()');assert.equal(read('look.yaw'),pausedYaw);
 open();mode='deny';escape();await flush();document.hidden=true;events.visibilitychange();paused();mouse();mouse();read('look.frame()');assert.equal(read('look.yaw'),pausedYaw,'hidden document cannot rotate');document.hidden=false;
 mode='success';click('start');
 // Delayed unlock from opening a lab must not flash the menu during return.
 open();mode='pending';menuShows=0;click('closeLab');document.pointerLockElement=null;events.pointerlockchange();assert.ok(hidden('menu'));assert.equal(menuShows,0);document.pointerLockElement=canvas;events.pointerlockchange();pending.shift().resolve();await flush();assert.equal(read('locked'),true);assert.ok(hidden('menu'));assert.equal(timers.size,0);
 // Promise rejection and synchronous permission errors are recoverable.
 for(const failure of ['deny','throw']){open();mode=failure;click('closeLab');await flush();paused();assert.match(el('notice').textContent,/未能锁定鼠标，请再次点击/);assert.equal(timers.size,0);}
 // Older non-Promise APIs report via pointerlockerror; a silent API times out visibly.
 for(const failure of ['legacy','silent']){open();mode=failure;click('closeLab');assert.ok(hidden('menu'));if(failure==='legacy')events.pointerlockerror();else for(const callback of [...timers.values()])callback();paused();assert.equal(timers.size,0);}
 // Cancellation rejects late acquisition; retry starts a fresh request.
 open();mode='pending';click('closeLab');const canceled=pending.shift();escape();paused();document.pointerLockElement=canvas;events.pointerlockchange();assert.equal(document.pointerLockElement,null);paused();canceled.reject(new Error('canceled'));await flush();paused();mode='success';click('start');assert.equal(read('locked'),true);
 // A stale rejection after reopening another lab cannot expose the pause overlay.
 open();mode='pending';click('closeLab');const stale=pending.shift();open('W-');stale.reject(new Error('stale'));await flush();assert.equal(read('labRoom'),'W-');assert.ok(hidden('menu'));assert.ok(!hidden('console'));mode='success';click('closeLab');assert.equal(read('locked'),true);
 // A stale rejection after a newer successful return cannot interrupt movement.
 open();mode='pending';click('closeLab');const old=pending.shift();escape();mode='success';click('start');old.reject(new Error('old'));await flush();assert.equal(read('locked'),true);assert.ok(hidden('menu'));
 // Preserve raw-input fallback without leaving click activation for sync unsupported errors.
 open();mode='raw-fallback';before=calls;click('closeLab');assert.equal(calls,before+2);assert.equal(read('locked'),true);assert.ok(hidden('menu'));
 // Chromium reports the unsupported raw option via BOTH a rejection and an
 // event. The event from the first request can arrive while the retry is pending.
 open();
 const originalLock=canvas.requestPointerLock;
 let rawReject,plainResolve,plainCalls=0;
 canvas.requestPointerLock=options=>options?
  new Promise((resolve,reject)=>{rawReject=reject;}):
  new Promise(resolve=>{plainCalls++;plainResolve=resolve;});
 click('closeLab');rawReject(Object.assign(new Error('raw unsupported'),{name:'NotSupportedError'}));
 await flush();assert.equal(plainCalls,1);events.pointerlockerror();
 assert.ok(hidden('menu'));assert.equal(read('controlPending'),true);
 document.pointerLockElement=canvas;events.pointerlockchange();plainResolve();await flush();
 assert.equal(read('locked'),true);assert.ok(hidden('menu'));
 canvas.requestPointerLock=originalLock;
 assert.equal(timers.size,0);
 console.log('PASS direct-return lifecycle:12 repeated model returns, synchronous click lock, no pause-overlay flash, cleared keys/jump/drift, Esc direct return + canvas mouse-look/WASD fallback/UI exclusion/re-entry guard/repeat guard/blur/hidden, corridor Esc pause, delayed unlock, denied/legacy/silent failures, canceled late acquisition, stale rejection isolation, raw-input fallback. Deterministic DOM/permission fixture; not physical browser/GPU verification.');
}finally{read('pause();lab?.dispose()');}
