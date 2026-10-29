/** Real Babylon mesh/material/queue audit. NullEngine does not verify GPU pixels. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createColoredTesseract,TESSERACT,TESSERACT_STYLE,CELL_IDS,CELL_COLORS} from './dist/colored-tesseract.js';
import {StationRenderer} from './dist/station-renderer.js';import {normalFor} from './dist/chapter-topology.js';
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:128});
const sandbox={console,setTimeout,clearTimeout,performance,exports:{},module:{exports:{}},window:{addEventListener(){},removeEventListener(){}},navigator:{},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine),camera=new B.FreeCamera('glass QA',new B.Vector3(3,2,-6),scene);camera.setTarget(B.Vector3.Zero());new B.HemisphericLight('fill',new B.Vector3(.5,1,-.3),scene);
const model=createColoredTesseract(B,scene),faces=model.meshes.filter(m=>m.metadata.category==='shared-face'),counts=()=>[scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length],baseline=counts();
assert.equal(faces.length,24);assert.equal(new Set(TESSERACT.faces.map(f=>[...f].sort((a,b)=>a-b).join(','))).size,24);
for(const cell of TESSERACT.cells)assert.equal(faces.filter(m=>m.metadata.cellIds.includes(cell.id)).length,6,'every cell has all six shared squares');
let checks=0;
for(const plane of ['XY','XZ','XW','YZ','YW','ZW'])for(const angle of [0,-.13,-Math.PI/4,-Math.PI/2,-Math.PI,-2*Math.PI]){
 model.setRotationPlane(plane);model.set4DAngle(angle);const id=CELL_IDS[checks++%8];model.setSelectedCell(id);
 for(const side of [-1,1]){
  camera.position.set(3*side,2*side,-6*side);camera.setTarget(B.Vector3.Zero());scene.render();
  const group=scene._renderingManager._renderingGroups[0],queue=group._transparentSubMeshes.data.slice(0,group._transparentSubMeshes.length);
  assert.equal(queue.length,24,'all actual panes queued, from both camera sides');assert.equal(new Set(queue.map(sm=>sm.getMesh())).size,24);
  assert.equal(group._opaqueSubMeshes.length,6,'rods, statues and observer remain opaque in the SAME depth group');
  for(const m of faces){
   assert.equal(m.visibility,1);assert.equal(m.material.alpha,TESSERACT_STYLE.fillAlpha);assert.ok(m.material.alpha>=.08&&m.material.alpha<=.12);
   assert.equal(m.material.backFaceCulling,false);assert.equal(m.material.twoSidedLighting,true);assert.equal(m.material.disableDepthWrite,true);assert.notEqual(m.material.disableDepthTest,true);assert.equal(m.material.needAlphaBlendingForMesh(m),true);
   assert.equal(m.getTotalVertices(),4);assert.equal(m.subMeshes[0].indexCount,6);assert.equal(m.subMeshes[0].verticesCount,4);assert.equal(m.alphaIndex,Number.MAX_VALUE);
   const selected=m.metadata.cellIds.includes(id);assert.equal(m.material.diffuseColor.toHexString().toLowerCase(),selected?CELL_COLORS[id]:TESSERACT_STYLE.fillColor);
  }
  // Standard Babylon transparent ordering, no fixed alphaIndex/always-on-top override.
  const sorted=[...queue].sort(B.RenderingGroup.defaultTransparentSortCompare);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i-1]._distanceToCamera>=sorted[i]._distanceToCamera);
 }
 assert.deepEqual(counts(),baseline,'no per-frame or per-selection allocations');
}
model.dispose();
// Host shader path uses the exact same alpha/color policy and keeps portal clipping.
B.RawCubeTexture=class{constructor(scene,faces,size){const t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene),instance=renderer.createPooledInstance(normalFor('W+'),'upper'),host=instance.truth,hostCounts=counts();
for(const id of CELL_IDS){host.setSelectedCell(id);for(const m of host.meshes.filter(m=>m.metadata.category==='shared-face')){assert.equal(m.visibility,1);assert.equal(m.material._floats.alphaValue,TESSERACT_STYLE.fillAlpha);assert.equal(m.material.backFaceCulling,false);assert.equal(m.material.disableDepthWrite,true);assert.equal(m.material._floats.glassSurface,0,'no inward-only station window discard applied to model panes');assert.equal(m.material._floats.useTexture,0);assert.equal(m.material._vectors4Arrays.clipPlanes.length,80);assert.ok(m.material.needAlphaBlending());}assert.deepEqual(counts(),hostCounts);}
assert.match(B.Effect.ShadersStore.stationFragmentShader,/if\(!gl_FrontFacing\)N=-N/,'portal shader already lights both sides');
renderer.dispose();scene.dispose();engine.dispose();
console.log(`PASS ${checks*2} actual Babylon orientation/camera audits:24 unique panes,6 per cell,full draws,two-sided lighting,consistent10% alpha,normal transparent queues/depth flags;host clip/material parity;stable resources. Center sorting remains approximate for intersecting transparent polygons;not a GPU image claim.`);
