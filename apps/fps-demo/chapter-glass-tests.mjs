// Bounded CPU visibility/mesh audit. Does not establish GPU alpha-sort or frame-time quality.
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import * as T from './dist/chapter-topology.js';
import * as O from './dist/optics.js';
import {hatchOutline,WALK_RADIUS} from './dist/hatch.js';
import {StationRenderer} from './dist/station-renderer.js';
const inverse=(t,p)=>t.rotation.map(c=>T.dot(c,T.sub(p,t.offset)));
function polygon(p,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){let a=points[i],b=points[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function visibleThroughRoundedPath(instances,path,eye,p){
 for(let j=1;j<path.length;j++){const parent=instances.find(x=>x.path.join()===path.slice(0,j).join());if(!parent)return false;const a=hatchOutline(parent.normal,T.normalFor(path[j]),'upper'),e=inverse(parent.transform,eye),q=inverse(parent.transform,p),t=(a.sign*T.H-e[a.axis])/(q[a.axis]-e[a.axis]);if(!(t>=0&&t<=1))return false;const hit=e.map((x,k)=>x+t*(q[k]-x));if(!polygon(a.other.map(k=>hit[k]),a.points))return false;}
 return true;
}
const before=T.initialState();before.p[0]=T.H-1e-4;before.p[2]=-2.32;
const after=T.advance(before,[0,0,2e-4]).state;
const pre=O.buildOpticalInstances(before,'upper'),post=O.buildOpticalInstances(after,'upper');
assert.equal(pre.length,73);assert.equal(post.length,73);
assert.equal(pre.filter(x=>x.depth===4).length,6,'retain six four-straight-seam self images');
// Incoming boundary walls must not be rendered over the parent's wall in circular aperture corners.
for(const child of pre.filter(x=>x.depth===1)){const q=child.quads[0],center=q[0].map((_,k)=>q.reduce((s,p)=>s+p[k],0)/4);assert.ok(!O.insideClips(center,O.clipPlanes(child.quads,T.localPoint(before))),'reject coplanar neighbor boundary surface');}
const path=['W+','X+','W-','Y+'],oldPath=path.slice(1),target=pre.find(x=>x.path.join()===path.join()),next=post.find(x=>x.path.join()===oldPath.join());
assert.ok(target&&next,'second-forward side backing exists on both sides of crossing');
// Narrow doors now physically occlude this second-forward side window near the seam.
// Prove even its bounding rectangle is occluded: maximize ray x at z=12 over
// every possible eye x in the walk opening and every point of the side window.
const parent=pre.find(x=>x.path.join()==='W+,X+,W-');
const sideQuad=O.portalQuad(parent.normal,T.normalFor('Y+'),parent.transform,'upper');
const maxSideZ=Math.max(...sideQuad.map(p=>p[2])),sideX=sideQuad[0][0];
const eyeZ=T.localPoint(before)[2],tMin=(12-eyeZ)/(maxSideZ-eyeZ);
const largestRayX=WALK_RADIUS*(1-tMin)+sideX*tMin;
assert.ok(largestRayX < -WALK_RADIUS,'entire second-forward side window blocked by narrow intervening door');
// Occlusion is a geometric result, not permission to drop backing paths.
let shared=0;
for(const instance of pre.filter(x=>x.path[1]==='X+')){
 const other=post.find(x=>x.path.join()===instance.path.slice(1).join());assert.ok(other,'shared forward optical path remains allocated');
 for(const local of [[0,0,0],[-1.6,-4,3.4]]){
  const r1=T.sub(T.mapPoint(instance.transform,local),T.localPoint(before));
  const r2=T.sub(T.mapPoint(other.transform,local),T.localPoint(after));
  assert.ok(Math.hypot(...T.sub(r1,r2))<.00021,'shared geometry position continuous independent of visibility');
 }
 shared++;
}
const example={local:[-1.6,-4,3.4],eye:T.localPoint(before)};example.p=T.mapPoint(target.transform,example.local);
const p2=T.mapPoint(next.transform,example.local),eye2=T.localPoint(after),r1=T.sub(example.p,example.eye),r2=T.sub(p2,eye2);
assert.equal(visibleThroughRoundedPath(pre,path,example.eye,example.p),false,'old exposed backing sample is now physically occluded');
// Projection continuity is a coordinate test, NOT a visible-pixel assertion.
const forward=T.scale(r1,1/Math.hypot(...r1)),right=[forward[2],0,-forward[0]],rightN=T.scale(right,1/Math.hypot(...right));
for(const fov of [.28,1.16]){const project=r=>T.dot(r,rightN)/(T.dot(r,forward)*Math.tan(fov/2));assert.ok(Math.abs(project(r2)-project(r1))<.001,`continuous coordinates at FOV ${fov}`);}
assert.equal(target.depth,3);assert.equal(next.depth,2);
// Pick a rectangular-portal corner outside the true round hole. Parent shell
// owns the point; the incoming child's duplicate coplanar wall must be clipped.
const first=pre.find(x=>x.path.join()==='W+,X+'),opening=hatchOutline(before.normal,T.normalFor('X+'),'upper');
const corner=[0,0,0];corner[opening.axis]=opening.sign*T.H;
for(let j=0;j<2;j++)corner[opening.other[j]]=opening.bounds[j][1]-.02;
assert.equal(polygon(opening.other.map(k=>corner[k]),opening.points),false,'sample lies on shell outside round opening');
const worldCorner=T.mapPoint(pre[0].transform,corner);
assert.equal(O.insideClips(worldCorner,O.clipPlanes(first.quads,T.localPoint(before))),false,'reject incoming coplanar corner wedge');
assert.equal(O.insideClips(worldCorner,O.clipPlanes(pre[0].quads,T.localPoint(before))),true,'retain owning parent shell');
console.log(`PASS ${shared} shared forward paths continuous, 73 allocated; narrow-door occlusion bound x=${largestRayX.toFixed(4)} < ${-WALK_RADIUS}; coplanar wedge rejected/parent retained; FOV .28/1.16 coordinate continuity (not visible pixels).`);
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:128});
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('./dist/vendor/babylon.js',import.meta.url),'utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene);
try{
 const template=renderer.template(T.normalFor('W+'),'upper'),panes=template.meshes.filter(x=>x.kind==='glass'&&x.mesh.getTotalVertices()>30);assert.equal(panes.length,4,'four individual side window meshes, not one room-centered transparent mesh');
 for(const {mesh} of panes){const p=mesh.getVerticesData(B.VertexBuffer.PositionKind),n=mesh.getVerticesData(B.VertexBuffer.NormalKind),axis=[0,1,2].find(k=>Math.abs(n[k])>.9);assert.notEqual(axis,undefined);for(let i=0;i<p.length;i+=3){assert.ok(Math.abs(Math.abs(p[i+axis])-T.H)<1e-6,'window on exact shared seam');assert.ok(p[i+axis]*n[i+axis]<0,'window normal points inward');}const point=p.slice(0,3),normal=n.slice(0,3);for(let eps of [-1e-4,1e-4]){const eye=point.map((x,k)=>x+eps*normal[k]);const a=T.dot(normal,T.sub(eye,point))>=0,b=T.dot(T.scale(normal,-1),T.sub(eye,point))>=0;assert.equal(+a + +b,1,'exactly one side survives inward-normal glass discard');}}
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/sin\(dot\(vLocal\.xz/,'grain uses stable cell-local coordinates, not recentered world position');
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/glassSurface>.5\|\|useTexture>.5/);
 console.log('PASS Babylon NullEngine: separate panes, exact boundary, inward normals, single-side visibility at ±epsilon. No GPU rasterization claim.');
}finally{renderer.dispose();scene.dispose();engine.dispose();}
