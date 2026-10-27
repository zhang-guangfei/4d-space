import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';import * as physics from './dist/physics.js';import {LookController} from './dist/look.js';
const context2d=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>context2d,addEventListener(){},removeEventListener(){},setAttribute(){},focus(){}});
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{toggle(){}},textContent:'',value:'1'});return elements.get(id)};
const listeners={};const document={getElementById:el,createElement:canvas,addEventListener(t,f){listeners[t]=f;},hidden:false};
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);let B=sandbox.exports;
let scene,engine;B.Engine=class extends B.NullEngine {constructor(){super({renderWidth:1024,renderHeight:768});engine=this;}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}};
let OriginalScene=B.Scene;B.Scene=class extends OriginalScene{constructor(...args){super(...args);scene=this;}};
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(){}};Object.assign(sandbox,physics,{LookController});
vm.runInContext(fs.readFileSync('dist/game.js','utf8').replace("import {advance,cell} from './physics.js';",'').replace("import {LookController} from './look.js';",''),sandbox);
if(el('notice').textContent)throw Error(el('notice').textContent);if(!scene||scene.meshes.length<300)throw Error('Scene incomplete');console.log('PASS full scene construction',scene.meshes.length,'meshes',scene.lights.length,'lights',scene.materials.length,'materials; NullEngine only, not WebGL.');
// NullEngine fixture has no asynchronous texture readiness; test handlers after construction.
vm.runInContext('ready=true',sandbox);engine.getDeltaTime=()=>1000/60;
const read=expression=>vm.runInContext(expression,sandbox);
document.pointerLockElement=el('world');listeners.pointerlockchange();
listeners.mousemove({movementX:500,movementY:0});engine.loop();assert.equal(read('camera.rotation.y'),0);
listeners.mousemove({movementX:10,movementY:-5});engine.loop();assert.equal(read('camera.rotation.y'),.02);assert.equal(read('camera.rotation.x'),-.01);
let angle=read('camera.rotation.y');for(let i=0;i<5;i++)engine.loop();assert.equal(read('camera.rotation.y'),angle);
el('reset').onclick();listeners.mousemove({movementX:0,movementY:0});
listeners.keydown({code:'KeyW',preventDefault(){}});for(let i=0;i<901;i++)engine.loop();listeners.keyup({code:'KeyW'});assert.equal(read('lastCell'),0);assert.equal(read('seams'),4);assert.equal(read('completed'),true);assert.equal(read('camera.rotation.y'),0);
listeners.keydown({code:'KeyS',preventDefault(){}});for(let i=0;i<901;i++)engine.loop();listeners.keyup({code:'KeyS'});assert.equal(read('lastCell'),0);assert.equal(read('seams'),8);
listeners.keydown({code:'KeyD',preventDefault(){}});for(let i=0;i<120;i++)engine.loop();listeners.keyup({code:'KeyD'});assert.ok(read('camera.position.x')<=4.761);
listeners.keydown({code:'KeyW',preventDefault(){}});document.pointerLockElement=null;listeners.pointerlockchange();let z=read('camera.position.z');engine.loop();assert.equal(read('camera.position.z'),z);assert.equal(read('keys.size'),0);
document.pointerLockElement=el('world');listeners.pointerlockchange();engine.loop();assert.equal(read('camera.position.z'),z);el('reset').onclick();assert.equal(read('seams'),0);assert.equal(read('camera.rotation.y'),0);
console.log('PASS integrated synthetic input: mouse update once, rest stability, forward/back 4-seam loops, sidewall collision, lock-loss key clear, relock, reset. NOT a physical-browser playtest.');scene.dispose();

