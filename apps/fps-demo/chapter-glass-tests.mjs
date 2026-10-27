// Bounded CPU visibility/mesh audit. Does not establish GPU alpha-sort or frame-time quality.
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import * as T from './dist/chapter-topology.js';
import * as O from './dist/optics.js';
import {hatchOutline} from './dist/hatch.js';
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
const path=['W+','X+','W-','Y+'],oldPath=path.slice(1),target=pre.find(x=>x.path.join()===path.join()),next=post.find(x=>x.path.join()===oldPath.join());
assert.ok(target&&next,'second-forward side backing exists on both sides of crossing');
let example;
// Search actual shell beyond the side pane, not rectangular bounding-box leakage.
for(let h=-1;h<=1&&!example;h+=.5){before.p[1]=-h;after.p[1]=-h;const eye=T.localPoint(before);
 for(let x=-3.8;x<=3.8&&!example;x+=.2)for(let y=-3.8;y<=3.8&&!example;y+=.2)for(let axis=0;axis<3&&!example;axis++)for(let sign of [-1,1]){
  const local=[0,0,0],other=[0,1,2].filter(k=>k!==axis);local[axis]=sign*T.H;local[other[0]]=x;local[other[1]]=y;
  const face=T.cellNeighbors(target.normal).find(v=>{const a=O.aperture(target.normal,v,'upper');return a.axis===axis&&a.sign===sign;}),outline=hatchOutline(target.normal,face,'upper');
  if(polygon(outline.other.map(k=>local[k]),outline.points))continue;
  const p=T.mapPoint(target.transform,local);if(visibleThroughRoundedPath(pre,path,eye,p)&&O.insideClips(p,O.clipPlanes(target.quads,eye))){example={local,p,eye};break;}
 }
}
assert.ok(example,'at least one physical backing-shell sample is visible through rounded forward and side openings');
const p2=T.mapPoint(next.transform,example.local),eye2=T.localPoint(after),r1=T.sub(example.p,example.eye),r2=T.sub(p2,eye2);
assert.ok(Math.hypot(...T.sub(r1,r2))<.00021,'same backing shell has continuous camera-relative position');
assert.ok(visibleThroughRoundedPath(post,oldPath,eye2,p2));
assert.ok(O.insideClips(p2,O.clipPlanes(next.quads,eye2)));
// Zoom can be aimed toward this surface; use one fixed look basis across seam.
const forward=T.scale(r1,1/Math.hypot(...r1)),right=[forward[2],0,-forward[0]],rightN=T.scale(right,1/Math.hypot(...right));
for(const fov of [.28,1.16]){const project=r=>T.dot(r,rightN)/(T.dot(r,forward)*Math.tan(fov/2));assert.ok(Math.abs(project(r2)-project(r1))<.001,`continuous projection at FOV ${fov}`);}
// Old branch policy excludes precisely this target while admitting it after seam.
assert.equal(target.depth,3);assert.equal(next.depth,2);
console.log('PASS rounded-path backing-shell continuity, pre/post seam and FOV .28/1.16:',JSON.stringify(example));
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:128});
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('./dist/vendor/babylon.js',import.meta.url),'utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene);
try{
 const template=renderer.template(T.normalFor('W+'),'upper'),panes=template.meshes.filter(x=>x.kind==='glass'&&x.mesh.getTotalVertices()>30);assert.equal(panes.length,4,'four individual side window meshes, not one room-centered transparent mesh');
 for(const {mesh} of panes){const p=mesh.getVerticesData(B.VertexBuffer.PositionKind),n=mesh.getVerticesData(B.VertexBuffer.NormalKind),axis=[0,1,2].find(k=>Math.abs(n[k])>.9);assert.notEqual(axis,undefined);for(let i=0;i<p.length;i+=3){assert.ok(Math.abs(Math.abs(p[i+axis])-T.H)<1e-6,'window on exact shared seam');assert.ok(p[i+axis]*n[i+axis]<0,'window normal points inward');}const point=p.slice(0,3),normal=n.slice(0,3);for(let eps of [-1e-4,1e-4]){const eye=point.map((x,k)=>x+eps*normal[k]);const a=T.dot(normal,T.sub(eye,point))>=0,b=T.dot(T.scale(normal,-1),T.sub(eye,point))>=0;assert.equal(+a + +b,1,'exactly one side survives inward-normal glass discard');}}
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/sin\(dot\(vLocal\.xz/,'grain uses stable cell-local coordinates, not recentered world position');
 assert.match(B.Effect.ShadersStore.stationFragmentShader,/glassSurface>.5&&dot\(vNormal,eye-vWorld\)<0.0/);
 console.log('PASS Babylon NullEngine: separate panes, exact boundary, inward normals, single-side visibility at ±epsilon. No GPU rasterization claim.');
}finally{renderer.dispose();scene.dispose();engine.dispose();}
