import assert from 'node:assert/strict';
import { PLANES, vertices, edges, squares, cells, rotate4, project4, slice4 } from '../dist/geometry.mjs';

const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual-expected) < epsilon, `${actual} != ${expected}`);
const norm = p => Math.hypot(...p);
const distance = (a,b) => norm(a.map((x,i)=>x-b[i]));
const transformed = angles => vertices.map(v=>rotate4(v,angles));
function unrotate(v,angles){
  const p=[...v];
  for(let i=PLANES.length-1;i>=0;i--){
    const [a,b]=PLANES[i],c=Math.cos(angles[i]),s=Math.sin(angles[i]),x=p[a],y=p[b];
    p[a]=x*c+y*s;p[b]=-x*s+y*c;
  }
  return p;
}
const count = s => [s.vertices.length,s.edges.length,s.faces.length];
const key = ([a,b]) => a<b?`${a},${b}`:`${b},${a}`;

function checkSolid(slice) {
  const [v,e,f] = count(slice);
  assert.ok(v>=4 && e>=6 && f>=4, `Invalid solid counts ${[v,e,f]}`);
  assert.equal(v-e+f,2,`Euler mismatch ${[v,e,f]}`);
  const edgeSet=new Set(slice.edges.map(key));
  assert.equal(edgeSet.size,e,'Duplicate edges');
  const incidence=new Map(slice.edges.map(edge=>[key(edge),0]));
  for(const face of slice.faces){
    assert.ok(face.length>=3,'Degenerate polygon');
    assert.equal(new Set(face).size,face.length,'Repeated face vertex');
    for(let i=0;i<face.length;i++){
      const k=key([face[i],face[(i+1)%face.length]]);
      assert.ok(edgeSet.has(k),`Face boundary ${k} missing from slice edges`);
      incidence.set(k,incidence.get(k)+1);
    }
  }
  for(const [k,n] of incidence)assert.equal(n,2,`Edge ${k} belongs to ${n} faces`);
}

assert.deepEqual([vertices.length,edges.length,squares.length,cells.length],[16,32,24,8]);
assert.equal(new Set(vertices.map(v=>v.join(','))).size,16);
for(const [a,b] of edges){assert.equal(vertices[a].filter((x,i)=>x!==vertices[b][i]).length,1);near(distance(vertices[a],vertices[b]),2);}
for(const f of squares){assert.equal(f.length,4);for(let i=0;i<4;i++)assert.ok(edges.some(e=>key(e)===key([f[i],f[(i+1)%4]])));}
for(const c of cells)assert.deepEqual([c.vertices.length,c.edges.length,c.faces.length],[8,12,6]);

const identity=transformed([0,0,0,0,0,0]);
for(const level of [-1,-.8,0,.8,1]){
  const s=slice4(identity,level);assert.deepEqual(count(s),[8,12,6]);checkSolid(s);
  assert.deepEqual(new Set(s.vertices.map(v=>v.join(','))),new Set(vertices.slice(0,8).map(v=>v.slice(0,3).join(','))));
}
for(const level of [-1.01,1.01])assert.deepEqual(count(slice4(identity,level)),[0,0,0]);

const twoAxis=transformed([0,0,0,Math.PI/4,0,0]);
for(const level of [-.5,0,.5]){const s=slice4(twoAxis,level);assert.deepEqual(count(s),[8,12,6]);checkSolid(s);}
for(const sign of [-1,1])assert.deepEqual(count(slice4(twoAxis,sign*Math.SQRT2)),[4,4,1]);
const threeAxis=transformed([0,0,0,Math.PI/4,Math.asin(1/Math.sqrt(3)),0]);
for(const sign of [-1,1])assert.deepEqual(count(slice4(threeAxis,sign*Math.sqrt(3))),[2,1,0]);
const diagonal=transformed([0,0,0,Math.PI/4,Math.asin(1/Math.sqrt(3)),Math.PI/6]);
const octahedron=slice4(diagonal,0);assert.deepEqual(count(octahedron),[6,12,8]);checkSolid(octahedron);
for(const edge of octahedron.edges)near(distance(...edge.map(i=>octahedron.vertices[i])),Math.sqrt(8));
for(const sign of [-1,1])assert.deepEqual(count(slice4(diagonal,sign*2)),[1,0,0]);
for(const level of [-.5,.5]){const s=slice4(diagonal,level);assert.deepEqual(count(s),[12,18,8]);checkSolid(s);}

// Deterministic random test cases are repeatable across platforms.
let seed=0x741256;
function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
for(let test=0;test<400;test++){
  const angles=Array.from({length:6},()=>random()*2*Math.PI);
  const rotated=transformed(angles);
  for(const v of rotated)near(norm(v),2);
  for(const [a,b] of edges)near(distance(rotated[a],rotated[b]),2);
  const maxW=Math.max(...rotated.map(v=>v[3]));
  const minW=Math.min(...rotated.map(v=>v[3]));
  for(const level of [0,minW+(maxW-minW)*(.01+.98*random()),rotated[test%16][3]]){
    const s=slice4(rotated,level);
    if(level>minW+1e-7&&level<maxW-1e-7)checkSolid(s);
    for(const p of s.vertices){
      assert.ok(p.every(Number.isFinite));
      const original=unrotate([...p,level],angles);
      assert.ok(original.every(x=>Math.abs(x)<=1+1e-7),'Slice vertex lies outside the original 4-cube');
      assert.ok(original.filter(x=>Math.abs(Math.abs(x)-1)<1e-7).length>=3,'Slice vertex is not on an original 4-cube edge');
    }
    for(const [a,b] of s.edges)assert.ok(distance(s.vertices[a],s.vertices[b])>1e-8,'Zero-length edge');
  }
  assert.deepEqual(count(slice4(rotated,maxW+1e-5)),[0,0,0]);
  assert.deepEqual(count(slice4(rotated,minW-1e-5)),[0,0,0]);
  assert.deepEqual(count(slice4(rotated,maxW)),[1,0,0]);
  assert.deepEqual(count(slice4(rotated,minW)),[1,0,0]);
  for(const v of rotated)assert.ok(project4(v).every(Number.isFinite));
}
console.log('Geometry tests passed: topology counts, rotation invariants, 400 random rotations, 1,200 slice levels, facet incidence, exact boundary degeneracies.');
