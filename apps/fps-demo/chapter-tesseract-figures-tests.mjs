/** Actual projected cast regression, independent approved-video coordinate oracle. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {MODEL_FIGURES,createColoredTesseract} from './dist/colored-tesseract.js';
import {statueData,STATUE_ASSETS} from './dist/classical-statues.js';
import {createStatuePalette} from './dist/statue-palette.js';
const near=(a,b,t=2e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`),d=3.0543863938108604,s=d-1;
const floor=(x,a)=>{const c=Math.cos(a),sn=Math.sin(a),ys=[];for(const [A,B] of [[-sn,c],[c,sn]])if(Math.abs(B)>1e-10)ys.push((B*s-A*x)/(-Math.sign(B)-B*d));return Math.min(...ys);};
const oracle=(p,b,sign,a)=>{const x=(p[0]-(b.min[0]+b.max[0])/2)*.325*sign,y=(p[1]-b.min[1])*.325-1,w=(p[2]-(b.min[2]+b.max[2])/2)*.325*sign,c=Math.cos(a),sn=Math.sin(a),xx=c*x-sn*w,ww=sn*x+c*w,k=s/(d-ww);return [xx*k,y*k,-sign*k];};
assert.deepEqual(MODEL_FIGURES.filter(f=>f.kind==='statue').map(f=>[f.cellId,f.paletteKind]),[['Y+','bronze'],['Y-','stone']]);
const sandbox={console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},navigator:{},exports:{},module:{exports:{}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine),camera=new B.FreeCamera('qa',new B.Vector3(0,2,-10),scene);camera.setTarget(B.Vector3.Zero());
const count=()=>[scene.meshes.length,scene.materials.length,scene.textures.length,scene.geometries.length];const model=createColoredTesseract(B,scene),baseline=count();
const humans=model.meshes.filter(m=>m.metadata.category==='cell-traveler'),statues=model.meshes.filter(m=>m.metadata.category==='cell-statue');assert.equal(humans.length,3);assert.equal(statues.length,2);assert.equal(new Set(humans.map(m=>m.metadata.figureId)).size,1);assert.ok(humans.every(m=>m.metadata.representation==='central-display-observer'));
const samples=[];
for(let phase=0;phase<=32;phase++){
 const angle=-phase*Math.PI/16;model.set4DAngle(angle);assert.deepEqual(count(),baseline);
 for(const m of statues){const kind=m.metadata.paletteKind,source=statueData(kind,'low'),bounds={min:[0,1,2].map(k=>Math.min(...Array.from(source.positions).filter((_,i)=>i%3===k))),max:[0,1,2].map(k=>Math.max(...Array.from(source.positions).filter((_,i)=>i%3===k)))},sign=kind==='bronze'?1:-1,p=m.getVerticesData('position'),n=m.getVerticesData('normal');assert.equal(p.length,source.positions.length);assert.equal(m.getTotalIndices(),source.indices.length);assert.equal(m.subMeshes[0].indexCount,source.indices.length);assert.equal(m.subMeshes[0].verticesCount,p.length/3);assert.equal(m.material.disableDepthWrite,false);assert.equal(m.material.alpha,1);assert.equal(m.renderingGroupId,0);
 for(let i=0;i<p.length;i+=3){const expected=oracle(source.positions.slice(i,i+3),bounds,sign,angle);for(let k=0;k<3;k++)near(p[i+k],expected[k]);near(Math.hypot(n[i],n[i+1],n[i+2]),1,1e-4);}
 // Independent finite-difference tangent normals on sampled source vertices.
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((v,x,k)=>v+x*b[k],0);
 for(let i=0;i<p.length;i+=303){const v=Array.from(source.positions.slice(i,i+3)),nn=Array.from(source.normals.slice(i,i+3)),q=oracle(v,bounds,sign,angle),cols=[0,1,2].map(k=>{const t=v.slice();t[k]+=1e-6;return oracle(t,bounds,sign,angle).map((x,j)=>(x-q[j])/1e-6);}),co=[cross(cols[1],cols[2]),cross(cols[2],cols[0]),cross(cols[0],cols[1])],det=dot(cols[0],co[0]),raw=[0,1,2].map(k=>(co[0][k]*nn[0]+co[1][k]*nn[1]+co[2][k]*nn[2])*Math.sign(det)),len=Math.hypot(...raw);if(len>1e-12)raw.forEach((v,k)=>near(n[i+k],v/len,2e-5));}
 // Source minimum foot vertex is exactly on game Z=-1 before common projection.
 let index=1;for(let i=4;i<source.positions.length;i+=3)if(source.positions[i]<source.positions[index])index=i;near((source.positions[index]-bounds.min[1])*.325-1,-1);
 }
 let clearance=Infinity;for(const m of humans){const p=m.getVerticesData('position');for(let i=0;i<p.length;i+=3)clearance=Math.min(clearance,p[i+1]-floor(p[i],angle));assert.equal(m.material.disableDepthWrite,false);assert.equal(m.material.alpha,1);assert.equal(m.renderingGroupId,0);assert.equal(m.subMeshes[0].indexCount,m.getTotalIndices());}near(clearance,0);samples.push(Array.from(humans[0].getVerticesData('position')));
}
assert.notDeepEqual(samples[0],samples[1],'actual human geometry walks rather than static pose');samples[0].forEach((v,i)=>near(v,samples.at(-1)[i],1e-5));
for(let k=0;k<4;k++){const a=-(Math.PI/4+k*Math.PI/2);model.set4DAngle(a-1e-7);const before=humans.map(m=>Array.from(m.getVerticesData('position')));model.set4DAngle(a+1e-7);humans.forEach((m,j)=>m.getVerticesData('position').forEach((v,i)=>near(v,before[j][i],2e-6)));}
scene.render();model.dispose();assert.equal(scene.meshes.length,0);
const borrowed=Object.fromEntries(['bronze','stone'].map(k=>[k,createStatuePalette(B,scene,k)])),materials=[];const custom=createColoredTesseract(B,scene,{paletteFactory:k=>borrowed[k],materialFactory:spec=>{const m=new B.StandardMaterial('host',scene);m.diffuseTexture=spec.texture;materials.push(m);return m;}});const nmat=scene.materials.length;custom.dispose();assert.equal(scene.materials.length,nmat);assert.ok(Object.values(borrowed).every(t=>scene.textures.includes(t)));materials.forEach(m=>m.dispose());Object.values(borrowed).forEach(t=>t.dispose());scene.dispose();engine.dispose();
console.log('PASS two correct room-bound projected imported statues, every vertex matches independent projection, sole on local floor; one central walking observer grounded continuously, no always-on-top pass; full submesh draw ranges; no resource growth and host ownership. NullEngine, not GPU pixels.');
