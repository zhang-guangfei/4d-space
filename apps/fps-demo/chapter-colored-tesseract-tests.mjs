import {normalFor,cellNeighbors,cellId} from './dist/chapter-topology.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {TESSERACT as t,MODEL_PROJECTION_DISTANCE,CELL_IDS,CELL_COLORS,rotate4,project4,modelGeometry,createColoredTesseract} from './dist/colored-tesseract.js';
assert.deepEqual([t.vertices.length,t.edges.length,t.faces.length,t.cells.length],[16,32,24,8]);
assert.equal(new Set(Object.values(CELL_COLORS)).size,8);
for(const c of t.cells){assert.deepEqual([...c.neighbors].sort(),cellNeighbors(normalFor(c.id)).map(cellId).sort(),'model neighbors exactly match game atlas');assert.deepEqual([c.vertices.length,c.edges.length,c.faces.length,c.neighbors.length],[8,12,6,6]);assert.equal(c.neighbors.includes(c.opposite),false);for(const other of t.cells){const shared=c.faces.filter(f=>other.faces.includes(f)).length;assert.equal(shared,c===other?6:c.opposite===other.id?0:1);}for(const v of c.vertices)assert.equal(t.vertices[v][c.axis],c.sign);}
for(const e of t.edges)assert.equal(t.vertices[e[0]].filter((x,a)=>x!==t.vertices[e[1]][a]).length,1);
for(const plane of ['XY','XZ','XW','YZ','YW','ZW'])for(let a=-7;a<7;a+=.13)for(const v of t.vertices){const r=rotate4(v,plane,a);assert.ok(Math.abs(r.reduce((s,x)=>s+x*x,0)-4)<1e-12);assert.ok(project4(r).every(Number.isFinite));const back=rotate4(r,plane,-a);assert.ok(back.every((x,i)=>Math.abs(x-v[i])<1e-12));}
const frozen=JSON.stringify(t);for(const selected of CELL_IDS){const g=modelGeometry({selected,angle:.4});assert.equal(g.cells.filter(c=>c.role==='selected').length,1);assert.equal(g.cells.filter(c=>c.role==='neighbor').length,6);assert.equal(g.cells.filter(c=>c.role==='opposite').length,1);for(const c of g.cells)assert.equal(c.color,CELL_COLORS[c.id]);}assert.equal(JSON.stringify(t),frozen);
const sandbox={console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},navigator:{},exports:{},module:{exports:{}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('./dist/vendor/babylon.js',import.meta.url),'utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine),camera=new B.FreeCamera('test',new B.Vector3(0,3,-10),scene);camera.setTarget(B.Vector3.Zero());
const model=createColoredTesseract(B,scene),meshIDs=model.meshes.map(m=>m.uniqueId),count=()=>[scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length],baseline=count();
assert.equal(model.meshes.length,30);assert.equal(model.meshes.filter(m=>m.metadata.category==='shared-face').length,24);assert.equal(model.meshes.filter(m=>m.metadata.category==='exact-edge').length,1);assert.equal(model.meshes.filter(m=>m.metadata.category==='cell-outline').length,0);
const rod=model.meshes.find(m=>m.metadata.category==='exact-edge');
const near=(a,b,tol=2e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
let checks=0;
for(const plane of ['XY','XZ','XW','YZ','YW','ZW'])for(const angle of [0,-.13,-Math.PI/4,-Math.PI/2,-Math.PI,-2*Math.PI]){
 model.setRotationPlane(plane);model.set4DAngle(angle);model.setSelectedCell(CELL_IDS[checks++%8]);
 assert.deepEqual(model.meshes.map(m=>m.uniqueId),meshIDs);assert.deepEqual(count(),baseline,'no scene resource allocation on frame/selection/plane update');
 for(const m of model.meshes){for(const k of ['position','normal'])assert.ok(m.getVerticesData(k).every(Number.isFinite));assert.equal(m.subMeshes.length,1);const sm=m.subMeshes[0];assert.equal(sm.indexStart,0);assert.equal(sm.indexCount,m.getTotalIndices(),'actual GPU index range covers full mesh');assert.equal(sm.verticesCount,m.getTotalVertices());assert.equal(m.renderingGroupId,0,'same depth group; no overlay actor');assert.equal(m.material.disableDepthWrite,m.metadata.category==='shared-face');if(m.metadata.category!=='shared-face'){assert.equal(m.material.alpha,1);assert.equal(m.visibility,1);}}
 const g=modelGeometry({plane,angle}),positions=rod.getVerticesData('position'),normals=rod.getVerticesData('normal'),nv=positions.length/3/32,sides=(nv-2)/2;
 assert.ok(Number.isInteger(sides)&&sides>=12);assert.equal(rod.getTotalIndices(),32*sides*12);
 t.edges.forEach(([ia,ib],e)=>{const a=g.points[ia],b=g.points[ib];for(const [end,p] of [[0,a],[1,b]])for(let j=0;j<sides;j++){const i=(e*nv+end*sides+j)*3,delta=[0,1,2].map(k=>positions[i+k]-p[k]);near(Math.hypot(...delta),.035);near(Math.hypot(...normals.slice(i,i+3)),1);}});
}
const faces=model.meshes.filter(m=>m.metadata.category==='shared-face');assert.equal(new Set(faces.map(m=>[...m.metadata.cellIds].sort().join(':'))).size,24,'no duplicate shared faces');for(const m of faces)assert.equal(m.metadata.cellIds.length,2);
for(const id of CELL_IDS){model.setSelectedCell(id);const owned=faces.filter(m=>m.metadata.cellIds.includes(id));assert.equal(owned.length,6);for(const m of owned)assert.equal(m.material.diffuseColor.toHexString().toLowerCase(),CELL_COLORS[id]);assert.deepEqual(count(),baseline);}
const state=model.state;model.setViewRotation(.1,.2,.3);assert.equal(model.state,state);scene.render();model.dispose();model.dispose();assert.equal(scene.meshes.length,0);scene.dispose();engine.dispose();
console.log('PASS exact topology and game adjacency; 30 stable actual Babylon meshes:32 single uniform radius rods,24 unique shared faces,1 player+2 statues; full GPU submesh ranges; depth flags; all6planes finite; stable resources/disposal. No GPU-pixel claim.');
