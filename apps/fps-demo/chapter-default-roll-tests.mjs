/** Independent geometry oracle from approved inverse-fit parameters, not renderer helpers. */
import assert from 'node:assert/strict';
import {TESSERACT,MODEL_PROJECTION_DISTANCE,modelGeometry,rotate4} from './dist/colored-tesseract.js';
const d=3.0543863938108604,s=d-1;
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const oracle=(v,a)=>{const c=Math.cos(a),n=Math.sin(a),x=c*v[0]-n*v[3],w=n*v[0]+c*v[3],k=s/(d-w);return [x*k,v[2]*k,-v[1]*k];};
near(MODEL_PROJECTION_DISTANCE,d);
const expected=[['W+','X+','W-','X-'],['X-','W+','X+','W-'],['W-','X-','W+','X+'],['X+','W-','X-','W+']];
for(let phase=0;phase<=4;phase+=1/32){const a=-phase*Math.PI/2,g=modelGeometry({angle:a});g.points.forEach((p,i)=>p.forEach((v,k)=>near(v,oracle(TESSERACT.vertices[i],a)[k])));}
for(let phase=0;phase<4;phase++){const g=modelGeometry({angle:-phase*Math.PI/2});expected[phase].forEach((id,j)=>{const p=TESSERACT.cells.find(c=>c.id===id).vertices.map(i=>g.points[i]),lo=Math.min(...p.map(v=>v[0])),hi=Math.max(...p.map(v=>v[0]));const inner=s/(d+1),ranges=[[-1,1],[inner,1],[-inner,inner],[-1,-inner]];near(lo,ranges[j][0]);near(hi,ranges[j][1]);});}
// True game identities: Y is reference depth, Z is display vertical.
const start=modelGeometry();near(start.cells.find(c=>c.id==='Y+').center[2],-s/d);near(start.cells.find(c=>c.id==='Z+').center[1],s/d);
for(const plane of ['XY','XZ','XW','YZ','YW','ZW'])for(const a of [-Math.PI,-.7,0,.7,Math.PI]){const g=modelGeometry({plane,angle:a});g.points.forEach((p,i)=>{const r=rotate4(TESSERACT.vertices[i],plane,a),k=s/(d-r[3]),q=[r[0]*k,r[2]*k,-r[1]*k];p.forEach((v,j)=>near(v,q[j]));});}
const end=modelGeometry({angle:-2*Math.PI});start.points.forEach((p,i)=>p.forEach((v,k)=>near(v,end.points[i][k])));
console.log('PASS approved fitted projection, negative XW outer→right→inner→left identities, full-cycle closure, game Y/depth and Z/up mapping, all six rotation planes.');
