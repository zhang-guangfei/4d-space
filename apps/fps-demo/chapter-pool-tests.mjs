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

// Test the actual index buffers, independently of how the renderer bounds each wall.
// Every omitted triangle must lie strictly outside at least one shader clip plane.
const {createDistantShell, selectDistantFaces} = await import('./dist/distant-station.js');
const {renderClipPlanes} = await import('./dist/optics.js');
const faceEngine = new B.NullEngine(), faceScene = new B.Scene(faceEngine);
const station = new StationRenderer(B, faceScene);
let rejectedTriangles = 0;
for (const mode of ['upper', 'lower']) {
 const shells = new Map();
 for (const [x,y,z,yaw,pitch] of [[0,-1.32,-2.3,0,0], [.33,-1.32,2.77,0,.25], [-2,1.4,-1.2,.78,-.34]]) {
  const eye = [x,y,z], state = topology.initialState();
  state.p = topology.add(topology.scale(state.normal,topology.H),topology.tangentToWorld(state.frame,eye));
  for (const spec of buildVisibleOpticalInstances(state,mode,{yaw,pitch},{aspect:16/9})) {
   if (!spec.depth) continue;
   const id = topology.cellId(spec.normal);
   if (!shells.has(id)) {
    const template = station.template(spec.normal,mode);
    const owner = {materials:[], node:new B.TransformNode('shell test',faceScene)};
    const mesh = createDistantShell(B,faceScene,template,owner,'#ffffff',station.white);
    const [sx,sy,ox,oy]=template.fieldFrame;
    assert.equal(Math.sign(sx),id[1]==='+'?1:-1,'opposite cells reverse the mineral growth direction');
    const uv=mesh.getVerticesData('uv'), tint=mesh.getVerticesData('color');
    const tileX = 'XZ'.includes(id[0]) ? .5 : 0;
    const tileY = 'XW'.includes(id[0]) ? .5 : 0;
    assert.ok(Math.abs(ox+sx/2-tileX-.25)<1e-5 && Math.abs(oy+sy/2-tileY-.25)<1e-5);
    for(let v=0;v<tint.length/4;v++){
     if(tint[4*v+3]!==1)continue;
     assert.ok(uv[2*v]>tileX && uv[2*v]<tileX+.5 && uv[2*v+1]>tileY && uv[2*v+1]<tileY+.5,
      'a distant optical copy uses the near room’s mineral tile');
    }
    const relief=template.meshes.find(p=>p.kind==='light').mesh;
    assert.ok(relief.isVerticesDataPresent('color') && relief.getTotalVertices()>100,
     'six walls share one faceted, vertex-painted relief batch');
    assert.equal(template.distantReliefIndices.length,6*2*5*3,'a distant relief draws five facets per side');
    assert.ok(template.distantReliefIndices.length < relief.getTotalIndices()/2);
    shells.set(id,{mesh, full:mesh.getIndices(), positions:mesh.getVerticesData('position')});
   }
   const {mesh,full,positions} = shells.get(id);
   const planes = renderClipPlanes(spec.quads,eye);
   selectDistantFaces(mesh,spec.transform,planes);
   const visible = new Set(), indices = mesh.isVisible ? mesh.getIndices() : [];
   if (mesh.isVisible) assert.equal(mesh.subMeshes[0].indexCount,indices.length);
   for (let i=0; i<indices.length; i+=3) visible.add(indices.slice(i,i+3).join(','));
   for (let i=0; i<full.length; i+=3) {
    const triangle = full.slice(i,i+3);
    if (visible.has(triangle.join(','))) continue;
    const vertices = Array.from(triangle,index=>topology.mapPoint(spec.transform,positions.slice(index*3,index*3+3)));
    assert.ok(planes.some(p=>vertices.every(v=>topology.dot(p.slice(0,3),v)+p[3]<-1e-6)));
    rejectedTriangles++;
   }
   selectDistantFaces(mesh,spec.transform,[]);
   assert.equal(mesh.isVisible,true);
   assert.equal(mesh.subMeshes[0].indexCount,full.length,'a growing index buffer restores the actual draw range');
   assert.equal(mesh.getIndices(),full,'restoring the full mask reuses the original buffer');
  }
 }
}
assert.ok(rejectedTriangles>1000);
console.log('PASS distant hull visibility:',rejectedTriangles,'omitted triangles have independent outside-plane witnesses.');
faceEngine.dispose();
