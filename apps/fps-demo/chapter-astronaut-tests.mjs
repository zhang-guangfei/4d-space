import {companion} from './dist/chapter2/scene-props.mjs';
import {CREW_EYE,CREW_SOLE} from './dist/crew-model.js';
import {createDistantSuit} from './dist/distant-suit.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {SUIT_PARTS,SUIT_COLORS,createAstronautSuit,miniatureSuitGeometry} from './dist/astronaut.js';
import {CELL_IDS,CELL_COLORS,MODEL_PROJECTION_DISTANCE,projectionDisplayScale,TESSERACT_STYLE,modelGeometry,createColoredTesseract,rotate4,project4} from './dist/colored-tesseract.js';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} ≠ ${y}`);
const torso=SUIT_PARTS.find(p=>p.name==='torso'),pack=SUIT_PARTS.find(p=>p.name==='backpack'),panel=SUIT_PARTS.find(p=>p.name==='backpack panel');
assert.equal(pack.material,'suit');assert.equal(pack.shape,'sphere');assert.ok(torso.position[2]-torso.size[2]/2-(pack.position[2]+pack.size[2]/2)>.019,'backpack front separated from torso rear by2cm');assert.ok(pack.position[2]-pack.size[2]/2-(panel.position[2]+panel.size[2]/2)>.005,'backpack panel has no coincident shell plane');
for(const side of ['left','right']){const sole=SUIT_PARTS.find(p=>p.name===side+' sole stripe');near(-.84+sole.position[1]-sole.size[1]/2,-1.68);}
assert.equal(new Set(SUIT_PARTS.map(p=>p.name)).size,SUIT_PARTS.length);assert.ok(SUIT_PARTS.every(p=>p.position.every(Number.isFinite)&&p.size.every(x=>x>0)));
assert.ok(TESSERACT_STYLE.outlineRadius<.012/2&&TESSERACT_STYLE.emissive<.1);assert.ok(modelGeometry().cells.every(c=>c.alpha<=.56));assert.equal(new Set(Object.values(CELL_COLORS)).size,8);
const sandbox={console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},navigator:{},exports:{},module:{exports:{}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine),camera=new B.FreeCamera('test',new B.Vector3(0,3,-10),scene);camera.setTarget(B.Vector3.Zero());
const materials=Object.fromEntries(Object.entries(SUIT_COLORS).map(([key,color])=>{const m=new B.StandardMaterial('suit '+key,scene);m.diffuseColor=B.Color3.FromHexString(color);return [key,m];}));const suit=createAstronautSuit(B,scene,{material:key=>materials[key]});assert.equal(suit.parts.length,21);assert.equal(suit.parts.find(m=>m.name==='backpack').material,materials.suit);for(const m of suit.parts){assert.ok(m.getVerticesData('position').every(Number.isFinite));assert.equal(m.material.alpha,1);assert.equal(m.material.disableDepthWrite,false);}
// Compare the actual two assembled rigs after converting the station's
// eye-relative +Z frame back to the pilot's deck-relative -Z frame.
globalThis.BABYLON=B;
const pilot=companion(scene,{hull:materials.suit,light:materials.panel},{id:'echo',companion:true},{w:1});
pilot.root.position.set(0,0,0);pilot.root.rotation.set(0,0,0);
function samples(meshes,station) {
 const samples=[];
 const scale=1.68/(CREW_EYE-CREW_SOLE);
 for(const mesh of meshes) {
  const matrix=mesh.computeWorldMatrix(true);
  const vertices=mesh.getVerticesData('position'), colors=mesh.getVerticesData('color');
  for(let i=0;i<vertices.length;i+=3) {
   const point=B.Vector3.TransformCoordinates(B.Vector3.FromArray(vertices,i),matrix);
   const xyz=station?[-point.x/scale,point.y/scale+CREW_EYE,-point.z/scale]:point.asArray();
   const rgb=Array.from(colors.slice(i/3*4,i/3*4+3),v=>Math.round(v*255));
   samples.push(xyz.map(v=>Math.round((v+.000002)*1e5)).concat(rgb).join(','));
  }
 }
 return samples.sort();
}
const authored=samples(pilot.root.getChildMeshes(),false);
assert.ok(authored.length>1500,'helmet, glove and jacket fittings present');
assert.deepEqual(samples(suit.parts,true),authored,'both cast members wear the same fitted, vertex-painted model');
assert.equal(companion(scene,null,{id:'echo',companion:true},{w:0}),null,'absent when her W slice is out of reach');
const instance={materials:[]},remote=createDistantSuit(B,scene,{parent:null,instance});
const physical=new Set(authored), distant=samples(remote.parts,true);
assert.ok(distant.length<authored.length&&distant.every(point=>physical.has(point)),'distant optical meshes contain a subset of the same physical fittings');
assert.equal(remote.parts.length,5);
const remoteIDs=remote.parts.map(m=>m.uniqueId);
const lodGeometry=new Map([[false,remote.parts.map(m=>m.geometry.uniqueId)]]);
for(const full of [true,false,true]) {
 remote.setDetail(full);
 assert.deepEqual(samples(remote.parts,true),full?authored:distant);
 assert.deepEqual(remote.parts.map(m=>m.uniqueId),remoteIDs);
 const geometryIDs=remote.parts.map(m=>m.geometry.uniqueId);
 if(lodGeometry.has(full))assert.deepEqual(geometryIDs,lodGeometry.get(full),'repeated zoom shares resident buffers');
 else lodGeometry.set(full,geometryIDs);
 assert.ok(remote.parts.every(m=>m.subMeshes.length===1&&m.subMeshes[0].indexCount===m.getTotalIndices()));
}
assert.equal(new Set(remote.parts.map(m=>m.material)).size,1);
for(const bucket of Object.values(miniatureSuitGeometry()))assert.ok(bucket.indices.length&&bucket.colors.length===bucket.positions.length/3*4);
remote.body.dispose(false);instance.materials.forEach(material=>material.dispose());
pilot.root.dispose(false);
suit.body.dispose(false);Object.values(materials).forEach(m=>m.dispose());
const model=createColoredTesseract(B,scene),ids=model.meshes.map(m=>m.uniqueId),counts=[scene.meshes.length,scene.materials.length,scene.textures.length];
const pieces=model.meshes.filter(m=>m.metadata?.category==='cell-traveler');assert.equal(pieces.length,3);assert.ok(pieces.every(m=>m.metadata.representation==='central-display-observer'&&m.getTotalVertices()>10&&m.getTotalIndices()>30&&m.material.disableDepthWrite===false));
for(const plane of ['XY','XZ','XW','YZ','YW','ZW']){model.setRotationPlane(plane);for(const angle of [0,.01,Math.asin(1/MODEL_PROJECTION_DISTANCE),Math.PI/2-.000001,Math.PI/2,Math.PI/2+.000001,Math.PI,2*Math.PI]){model.set4DAngle(angle);assert.deepEqual(model.meshes.map(m=>m.uniqueId),ids);assert.deepEqual([scene.meshes.length,scene.materials.length,scene.textures.length],counts);for(const m of model.meshes){assert.ok(m.getVerticesData('position').every(Number.isFinite));assert.ok(m.getVerticesData('normal').every(Number.isFinite));}}}
scene.render();model.dispose();assert.equal(scene.meshes.length,0);scene.dispose();engine.dispose();
console.log(`PASS matching voxel rigs and vertex paint across both chapters, decimated five-draw optical self-images, separated pack; 1 grounded central full3D person/3 batches and 2 Y± standing statues; softer edges; immutable8colors; stable resources/finite singularities/disposal. CPU/NullEngine only; no WebGL flicker claim.`);
