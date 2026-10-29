/** Integration checks exercise actual shipped geometry, transforms, clips and physics.
 * NullEngine is not a GPU/FPS test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import * as T from './dist/chapter-topology.js';
import {StationRenderer} from './dist/station-renderer.js';
import {statuePlacement,statueBlocked,STATUE_BOUNDS} from './dist/statue-placement.js';
import {STATUE_ASSETS,createClassicalStatue,setStatueDetail} from './dist/classical-statues.js';
import {STATUE_VARIANTS,statuePaletteBytes} from './dist/statue-palette.js';
import {renderClipPlanes} from './dist/optics.js';
import {buildHypothesisScene} from './dist/hypotheses.js';
const near=(a,b,tol=2e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
// GPU draws subMeshes, not all indices returned to CPU ray tests. Every cached
// LOD switch must rebuild the exact draw range, not retain the old low range.
const fullDraw=m=>{assert.equal(m.subMeshes.length,1);const s=m.subMeshes[0];assert.equal(s.verticesStart,0);assert.equal(s.verticesCount,m.getTotalVertices());assert.equal(s.indexStart,0);assert.equal(s.indexCount,m.getTotalIndices(),'actual GPU submesh must draw entire active LOD');assert.equal(s.getMesh(),m);};
assert.ok(T.worldToTangent(T.initialState().frame,T.normalFor('Y+'))[0]<0,'Venus is left at initial entry');
assert.ok(T.worldToTangent(T.initialState().frame,T.normalFor('Y-'))[0]>0,'David is right at initial entry');
assert.notEqual(STATUE_ASSETS.bronze.name,STATUE_ASSETS.stone.name);
for(const kind of ['bronze','stone']){
 const a=STATUE_ASSETS[kind];assert.deepEqual(STATUE_BOUNDS[kind],a.bounds);
 assert.ok(a.bounds.min.every(Number.isFinite)&&a.bounds.max.every(Number.isFinite));
 near(a.bounds.max[1]-a.bounds.min[1],2,.002);
 assert.ok(a.lodTriangles>1000&&a.lodTriangles<a.triangles);
 assert.equal(statuePaletteBytes(kind).length,4);
}
assert.equal(STATUE_ASSETS.bronze.triangles,24058,'actual approved Venus');
assert.equal(STATUE_ASSETS.stone.triangles,152556,'actual approved David');
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:256});
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);new B.FreeCamera('test camera',new B.Vector3(0,0,0),scene);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const names=new Set(Object.values(STATUE_ASSETS).map(a=>a.name)),isStatue=m=>names.has(m.metadata?.asset)&&m.metadata.category!=='cell-statue';
const geometries=new Map();let rayChecks=0,doorChecks=0;
try{
 // Both detail levels preserve approved silhouette bounds and valid geometry.
 for(const kind of ['bronze','stone'])for(const lod of ['low','high']){
  const m=createClassicalStatue(B,scene,{kind,lod,name:'probe '+kind+lod}),asset=STATUE_ASSETS[kind];
  const positions=m.getVerticesData('position'),normals=m.getVerticesData('normal'),indices=m.getIndices();
  assert.equal(indices.length/3,lod==='high'?asset.triangles:asset.lodTriangles);fullDraw(m);
  assert.ok(positions.every(Number.isFinite)&&normals.every(Number.isFinite));
  assert.ok(indices.every(i=>i>=0&&i<positions.length/3));
  for(let k=0;k<3;k++){near(m.getBoundingInfo().boundingBox.minimum.asArray()[k],asset.bounds.min[k],.02);near(m.getBoundingInfo().boundingBox.maximum.asArray()[k],asset.bounds.max[k],.02);}
  geometries.set(kind+lod,m.geometry);m.dispose();
 }
 const renderer=new StationRenderer(B,scene);let s=T.initialState();const views={'Y+':[],'Y-':[]};
 // Swap each cached detail level repeatedly. Clones retain independent metadata,
 // share immutable geometry, and never allocate during a viewing-distance change.
 for(const kind of ['bronze','stone']){
  const a=createClassicalStatue(B,scene,{kind,lod:'low'}),b=a.clone('LOD clone');b.metadata={...a.metadata};
  const baseGeometry=a.geometry;setStatueDetail(B,scene,b,'high');const highGeometry=b.geometry;
  assert.equal(a.geometry,baseGeometry);assert.notEqual(highGeometry,baseGeometry);assert.equal(a.metadata.lod,'low');
  const counts=[scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length];
  for(let i=0;i<24;i++){const lod=i%2?'low':'high';setStatueDetail(B,scene,b,lod);fullDraw(a);fullDraw(b);assert.equal(b.geometry,lod==='low'?baseGeometry:highGeometry);assert.equal(b.getTotalIndices()/3,lod==='low'?STATUE_ASSETS[kind].lodTriangles:STATUE_ASSETS[kind].triangles);assert.deepEqual([scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length],counts);}
  a.dispose();b.dispose();
 }

 for(let step=0;step<4;step++){
  s.p=T.add(T.scale(s.normal,T.H),T.scale(T.normalFor('Z+'),-T.H+1.68));renderer.rebuild(s,'upper');
  const eye=T.localPoint(s),eyeB=new B.Vector3(...eye);
  for(const id of ['Y+','Y-']){
   const kind=id==='Y+'?'bronze':'stone',placement=statuePlacement(id),asset=STATUE_ASSETS[kind];
   assert.equal(placement.kind,kind);assert.deepEqual(placement.bounds,asset.bounds);
   assert.deepEqual(T.tangentToWorld(placement.frame,placement.axes[1]),[0,0,1,0]);assert.deepEqual(T.tangentToWorld(placement.frame,placement.axes[2]),[1,0,0,0]);
   const x=renderer.instances.find(x=>x.path.length===2&&T.cellId(x.normal)===id),mesh=x.meshes.find(isStatue);assert.ok(mesh);
   assert.equal(x.meshes.filter(isStatue).length,1);assert.equal(mesh.metadata.statueKind,kind);
   const mat=mesh.material,texture=mat._textures.labelTexture;
   assert.equal(mat._floats.useTexture,1);assert.equal(mat._floats.matteSurface,1);assert.equal(mat._floats.emissive,0);assert.equal(mat.disableDepthWrite,false);
   assert.equal(texture.metadata.statueVariant,STATUE_VARIANTS[kind]);assert.equal(texture.getSize().width,1);assert.equal(texture.getSize().height,1);
   x.node.computeWorldMatrix(true);mesh.computeWorldMatrix(true);
   const clip=renderClipPlanes(x.quads,eye);let hits=0;
   // Scan torso-height ray targets, not a single old technician face landmark.
   for(const y of [1.05,1.25,1.45,1.65])for(const localX of [-.12,0,.12]){
    const target=B.Vector3.TransformCoordinates(new B.Vector3(localX,y,0),mesh.getWorldMatrix()),d=target.subtract(eyeB);
    const ray=new B.Ray(eyeB,d.normalizeToNew(),d.length()+2),hit=ray.intersectsMesh(mesh,false);
    if(hit.hit){assert.ok(clip.every(c=>T.dot(c.slice(0,3),hit.pickedPoint.asArray())+c[3]>=-1e-5),'real surface survives portal clipping');hits++;}
   }
   assert.ok(hits>0,`${T.cellId(s.normal)} to ${id} real statue is ray visible`);rayChecks+=hits;
   const localEye=B.Vector3.TransformCoordinates(eyeB,B.Matrix.Invert(mesh.getWorldMatrix())),horizontal=new B.Vector3(localEye.x,0,localEye.z).normalize();views[id].push(horizontal.asArray());
  }
  s=T.advance(s,[0,0,2*T.H]).state;
 }
 for(const directions of Object.values(views))for(let i=0;i<4;i++){near(T.dot(directions[i],directions[(i+1)%4]),0);near(T.dot(directions[i],directions[(i+2)%4]),-1);}
 for(const mode of ['upper','lower']){
  renderer.rebuild(s,mode);renderer.update(s,{yaw:0,pitch:0},mode,0,{left:-10,right:-10},false);
  const baseline=[scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length];
  const eye=T.localPoint(s);let nearCount=0,farCount=0;
  for(const x of renderer.instances)for(const m of x.meshes.filter(isStatue)){
   x.node.computeWorldMatrix(true);m.computeWorldMatrix(true);
   const distance=Math.hypot(...m.getAbsolutePosition().asArray().map((v,k)=>v-eye[k]));
   fullDraw(m);if(distance<8){assert.equal(m.metadata.lod,'high');nearCount++;}if(distance>10){assert.equal(m.metadata.lod,'low');farCount++;}
  }
  assert.ok(nearCount>0&&farCount>0,'both near high and far low statues rendered in same atlas');

  for(const cell of ['Y+','Y-']){
   const p=statuePlacement(cell,mode),mesh=renderer.template(T.normalFor(cell),mode).meshes.find(x=>x.kind===p.kind).mesh;mesh.computeWorldMatrix(true);
   const center=mesh.getBoundingInfo().boundingBox.centerWorld.asArray();
   if(mode==='lower')center.forEach(v=>near(v,0,.02));
   for(const face of T.cellNeighbors(cell))for(const depth of [0,.2,.5,1])if(mode==='lower'){
    assert.ok(!statueBlocked(cell,T.add(T.scale(T.normalFor(cell),T.H),T.scale(face,T.H-depth)),.2,mode),'all six portal arrival bands remain clear');doorChecks++;
   }
   const bounds=p.bounds;for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
    const local=p.origin.map((v,k)=>v+p.axes[0][k]*x+p.axes[1][k]*y+p.axes[2][k]*z);assert.ok(local.every(v=>Math.abs(v)<=T.H+1e-5),'statue stays inside room');
   }
  }
  assert.equal(renderer.pool.filter(x=>['Y+','Y-'].includes(T.cellId(x.normal))).flatMap(x=>x.meshes.filter(isStatue)).length,20);
  for(const x of renderer.pool.filter(x=>x.truth)){
   const mini=x.truth.meshes.filter(m=>m.metadata?.category==='cell-statue');assert.equal(mini.length,2);
   for(const m of mini){assert.equal(m.metadata.lod,'low');assert.equal(m.getTotalIndices()/3,STATUE_ASSETS[m.metadata.statueKind].lodTriangles);assert.ok(x.materials.includes(m.material),'miniatures retain portal clipping materials');}
  }
  for(let i=0;i<24;i++){
   renderer.rebuild(s,mode);renderer.update(s,{yaw:i*.1,pitch:0},mode,i*.1,{left:-10,right:-10},false);s=T.advance(s,[0,0,2*T.H]).state;
   assert.deepEqual([scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length],baseline,'no resource growth crossing repeated seams');
   for(const x of renderer.pool)for(const m of x.meshes.filter(isStatue)){fullDraw(m);assert.ok(['low','high'].includes(m.metadata.lod));}
  }
 }
 scene.render();renderer.dispose();assert.equal(scene.meshes.filter(isStatue).length,0);
 const lab=buildHypothesisScene(B,scene);
 for(const id of ['central-hall','treadmill','sphere'])assert.ok(!lab.groups[id].getChildMeshes().some(m=>names.has(m.metadata?.asset)||/thinker|technician|statue/i.test(m.name)),'basic hypotheses remain statue-free');
 const mini=lab.groups['colored-tesseract'].getChildMeshes().filter(m=>m.metadata?.category==='cell-statue');assert.equal(mini.length,2);assert.deepEqual(Array.from(mini,m=>m.metadata.cellId).sort(),['Y+','Y-']);lab.dispose();
 console.log(`PASS actual Venus/David geometry + stable cached LOD; ${rayChecks} torso ray hits / four orthogonal views; ${doorChecks} lower portal bands; centered per-asset bounds/colliders; 20 room statues + two-per-fourth-model only; stable repeated seams. NullEngine only, not GPU/FPS.`);
}finally{scene.dispose();engine.dispose();}
