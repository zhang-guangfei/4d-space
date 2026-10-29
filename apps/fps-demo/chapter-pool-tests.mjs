import {buildVisibleOpticalInstances} from './dist/visible-optics.js';
import {GroundMotion,GroundGait} from './dist/grounded-motion.js';import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as topology from './dist/chapter-topology.js';import * as motion from './dist/chapter-motion.js';import {ChapterProgress} from './dist/chapter-progress.js';import {LookController} from './dist/look.js';import {StationRenderer} from './dist/station-renderer.js';import {createHypothesisLab} from './dist/hypotheses.js';import {ROOM_MODELS,roomModel} from './dist/model-content.js';
const ctx=new Proxy({measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(512*512*4)}),createImageData:()=>({data:new Uint8ClampedArray(512*512*4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
const canvas=()=>({width:512,height:512,getContext:()=>ctx,addEventListener(t,f){this.events??={};this.events[t]=f;},removeEventListener(){},setAttribute(){},focus(){},replaceChildren(){},appendChild(){}});let elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{...canvas(),style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',value:'1'});return elements.get(id);}
const htmlIds=new Set([...fs.readFileSync('dist/index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]));const listeners={},document={getElementById:id=>htmlIds.has(id)?el(id):null,createElement:canvas,removeEventListener(){},addEventListener(t,f){listeners[t]=f;},hidden:false,exitPointerLock(){document.pointerLockElement=null;listeners.pointerlockchange?.();}};
const sandbox={console,setTimeout,clearTimeout,performance,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,document,navigator:{},OffscreenCanvas:class{constructor(w,h){Object.assign(this,canvas(),{width:w,height:h})}},module:{exports:{}},exports:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports;let engines=[];B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:1024,renderHeight:768});engines.push(this);}runRenderLoop(cb){this.loop=cb;}setHardwareScalingLevel(){}};
// NullEngine lacks raw cubemap allocation; shim only this GPU-storage operation.
B.RawCubeTexture=class {constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
// Real Babylon geometry, matrices/material binding and scene.render; not GPU rasterization.
sandbox.window={BABYLON:B,devicePixelRatio:1,addEventListener(){},removeEventListener(){}};Object.assign(sandbox,topology,motion,{buildVisibleOpticalInstances,GroundMotion,GroundGait,ChapterProgress,LookController,StationRenderer,createHypothesisLab,ROOM_MODELS,roomModel});let code=fs.readFileSync('dist/chapter.js','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(code,sandbox);const read=x=>vm.runInContext(x,sandbox);if(el('notice').textContent)throw Error(el('notice').textContent);assert.equal(read('renderer.instances.length'),73);console.log('PASS scene constructs',read('scene.meshes.length'),'meshes; 73 clipped instances / 6 full-path self-images.');

// CPU lifecycle checks, not GPU FPS. Instrument direct scene registration: observables can be deferred.
read('globalThis.counts={mesh:0,material:0,texture:0};for(const [method,key]of [["addMesh","mesh"],["addMaterial","material"],["addTexture","texture"]]){const old=scene[method];scene[method]=function(...args){counts[key]++;return old.apply(this,args);}}');
let checks=0;
try {
for(const mode of ['upper','lower']) {
 read(`renderer.rebuild(state,'${mode}');globalThis.savedPool=renderer.pool.slice();globalThis.savedCounts=[scene.meshes.length,scene.materials.length,scene.textures.length];globalThis.savedSerial=renderer.serial;globalThis.counts={mesh:0,material:0,texture:0}`);
 assert.equal(read('renderer.pool.length'),80);
 assert.equal(read('renderer.pool.filter(x=>x.hologram).length'),30,'all ten pooled copies of each exhibit exist');
 assert.ok(read('renderer.pool.filter(x=>x.hologram).every(x=>x.hologram.parts.every(m=>!/thinker|technician/.test(m.metadata?.asset||""))&&x.hologram.node.getChildMeshes().every(m=>!/thinker|statue/i.test(m.name)))'),'all optical miniature copies are statue-free');
 assert.ok(read('renderer.pool.filter(x=>x.hologram).every(x=>x.hologram.traveler.getChildMeshes().length===2)'),'miniature people keep torso and head');
 assert.ok(read('renderer.pool.every(x=>!x.meshes.some(m=>m.metadata?.corridorBorder||m.name==="equator room border"))'),'sphere hologram equatorial outlines removed, colored sectors retained');
 assert.ok(read('renderer.pool.every(x=>x.meshes.filter(m=>m.metadata?.statueKind&&m.metadata.category!=="cell-statue").length===(["Y+","Y-"].includes(cellId(x.normal))?1:0))'),'only actual Y± rooms keep their approved standing statue');

 for(let repeat=0;repeat<4;repeat++)for(const id of topology.CELL_IDS){
 read(`state={normal:normalFor('${id}'),frame:canonicalFrame(normalFor('${id}')),p:scale(normalFor('${id}'),H)};renderer.rebuild(state,'${mode}');renderer.update(state,look,'${mode}',time,gesture,false)`);
 assert.equal(read('renderer.instances.length'),73);
 assert.equal(read('new Set(renderer.instances).size'),73);
 assert.equal(read('renderer.pool.filter(x=>x.node.isEnabled()).length'),73);
 assert.equal(read('renderer.pool.filter(x=>x.avatar.parent.isEnabled()).length'),7);
 assert.equal(read('renderer.instances.filter(x=>x.avatar.root).length'),1);
 assert.ok(read('renderer.instances.filter(x=>x.depth===4).every(x=>x.avatar.parent.isEnabled() && x.avatar.parts.find(m=>m.name==="helmet").isEnabled())'));
 assert.ok(read('!renderer.instances[0].avatar.parts.find(m=>m.name==="helmet").isEnabled()'));
 assert.ok(read('renderer.pool.every((x,i)=>x===savedPool[i]) && renderer.serial===savedSerial'));
 assert.ok(read('[scene.meshes.length,scene.materials.length,scene.textures.length].every((x,i)=>x===savedCounts[i])'));
 assert.ok(read('Object.values(counts).every(x=>x===0)'));checks++;
 }
}
read('state=initialState();renderer.rebuild(state,"lower");renderer.update(state,look,"lower",time,gesture,true);globalThis.savedProbe=renderer.probe');assert.ok(read('renderer.probe'));
for(const id of ['X+','W-','X-','W+']){read(`state={normal:normalFor('${id}'),frame:canonicalFrame(normalFor('${id}')),p:scale(normalFor('${id}'),H)};renderer.rebuild(state,'lower');renderer.update(state,look,'lower',time,gesture,true)`);assert.ok(read('renderer.probe===savedProbe'));}
console.log(`PASS ${checks} reassignments across all8 roots/both modes: zero mesh/material/texture creation, stable80-slot pool,30 statue-free miniatures with people and20 retained Y± statue clones,73active slots/7active avatars; remote helmets restored; retained mirror probe. CPU lifecycle only, NOT GPU/FPS.`);
} finally {// Runtime frustum selection across turning views also reuses the same fixed pool.
read('state=initialState();state.p[2]=upperEyeZ(false);renderer.rebuild(state,"upper");globalThis.dynamicPool=renderer.pool.slice();globalThis.dynamicCounts=[scene.meshes.length,scene.materials.length,scene.textures.length]');
for(let i=0;i<40;i++){read(`look.yaw=${i*.3};look.pitch=${Math.sin(i)*1.2};var specs=buildVisibleOpticalInstances(state,"upper",look,{fov:${i%2?.28:1.16},aspect:4/3});renderer.rebuild(state,"upper",specs);renderer.update(state,look,"upper",time,gesture,false)`);assert.ok(read('renderer.instances.length>=1&&renderer.instances.length<=80'));assert.ok(read('renderer.pool.every((p,i)=>p===dynamicPool[i])'));assert.equal(read('JSON.stringify([scene.meshes.length,scene.materials.length,scene.textures.length])'),read('JSON.stringify(dynamicCounts)'));}
console.log('PASS40 dynamic yaw/pitch/zoom visibility reassignments: fixed80 pool/no scene resource growth.');
// New long corridor selections must reuse that same80-slot pool across seams and F.
let longViews=0;
for(const mode of ['upper','lower']){
 read(`state=initialState();if('${mode}'==='upper')state.p[2]=upperEyeZ(false);renderer.rebuild(state,'${mode}');globalThis.longPool=renderer.pool.slice();globalThis.longSerial=renderer.serial;globalThis.longCounts=[scene.meshes.length,scene.materials.length,scene.textures.length];globalThis.counts={mesh:0,material:0,texture:0}`);
 for(let seam=0;seam<8;seam++)for(const direction of [-1,1])for(const fov of [1.16,.28]){
  read(`look.yaw=${direction===1?0:Math.PI};look.pitch=0;var longSpecs=buildVisibleOpticalInstances(state,'${mode}',look,{fov:${fov},aspect:4/3});renderer.rebuild(state,'${mode}',longSpecs);renderer.update(state,look,'${mode}',time,gesture,false,{hideLocal:${fov===.28}})`);
  assert.ok(read('renderer.instances.some(x=>x.depth===12&&x.straight)'),'twelve straight shells (ten clear) rendered in both directions/zoom');
  assert.ok(read('renderer.instances.filter(x=>!x.straight).every(x=>x.depth<=4)'));
  assert.ok(read('renderer.pool.every((x,i)=>x===longPool[i])&&renderer.serial===longSerial'));
  assert.ok(read('[scene.meshes.length,scene.materials.length,scene.textures.length].every((x,i)=>x===longCounts[i])&&Object.values(counts).every(x=>x===0)'));
  assert.ok(read('renderer.instances.every(x=>x.materials.every(m=>m._floats.planeCount<=20&&m._vectors4Arrays.clipPlanes.length===80))'),'uniform uploads never exceed original20-plane shader budget');
  longViews++;
  if(direction===1&&fov===.28)read('state=advance(state,[0,0,6]).state');
 }
}
console.log(`PASS ${longViews} straight12/clear10 forward/back/F selections across both-mode seams: fixed80 pool, no mesh/material/texture creation, clip shader remains20 planes.`);

read('renderer.dispose();scene.dispose();engine.dispose()');}
