import assert from 'node:assert/strict';
import * as T from './chapter-topology.mjs';
const eps=1e-8,near=(a,b,msg)=>{assert.equal(a.length,b.length,msg);a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<eps,`${msg||''}: ${a} != ${b}`));};
const flat=a=>a.flat();
let seams=0;
for(let id of T.CELL_IDS){let n=T.normalFor(id),F=T.canonicalFrame(n);assert.equal(T.cellNeighbors(n).length,6);assert.ok(!T.cellNeighbors(n).some(v=>T.cellId(v)===id||T.cellId(v)===T.cellId(T.scale(n,-1))));
 for(let v of T.cellNeighbors(n)){
  let other=T.cellNeighbors(n).filter(a=>T.axisOf(a)!==T.axisOf(v)&&a[T.axisOf(a)]>0);
  let p=T.add(T.scale(n,T.H),T.add(T.scale(other[0],.7),T.scale(other[1],-.3)));
  let start={normal:n,p,frame:F},delta=T.worldToTangent(F,T.scale(v,T.H+.65));
  let result=T.advance(start,delta);assert.equal(result.crossings.length,1);assert.equal(T.cellId(result.state.normal),T.cellId(v));assert.ok(Math.abs(T.dot(result.state.p,n)-(T.H-.65))<eps);
  let reverse=T.advance(result.state,T.scale(delta,-1));assert.equal(reverse.crossings.length,1);near(reverse.state.p,p,'inverse point');near(flat(reverse.state.frame),flat(F),'inverse frame');assert.equal(T.cellId(reverse.state.normal),id);
  for(let a of F){let b=T.transport(a,n,v);assert.ok(Math.abs(T.dot(b,v))<eps);assert.ok(Math.abs(T.dot(a,a)-T.dot(b,b))<eps);near(T.transport(b,v,n),a,'inverse tangent');}
  let shared=T.add(T.add(T.scale(n,T.H),T.scale(v,T.H)),T.add(T.scale(other[0],1.2),T.scale(other[1],-.6)));
  let C=T.canonicalFrame(v),transform=T.portalTransform(n,v,F,C),childLocal=T.worldToTangent(C,T.sub(shared,T.scale(v,T.H))),expected=T.worldToTangent(F,T.sub(shared,T.scale(n,T.H)));
  near(T.mapPoint(transform,childLocal),expected,'shared face fixed');near(transform.offset,T.worldToTangent(F,T.scale(v,2*T.H)),'neighbor center');
  const back=T.portalTransform(v,n,C,F);const identity=T.composeTransforms(transform,back);near(identity.offset,[0,0,0],'portal inverse center');near(flat(identity.rotation),flat(T.identityTransform().rotation),'portal inverse rotation');
  let blocked=T.advance(start,delta,{canCross:()=>false});assert.equal(blocked.crossings.length,0);assert.ok(Math.abs(T.dot(blocked.state.p,v)-T.H)<eps);assert.equal(T.cellId(blocked.state.normal),id);
  let path=[v,T.scale(n,-1),T.scale(v,-1),n];let loop=T.unfoldPath(n,path,F);near(loop.transform.offset,T.worldToTangent(F,T.scale(v,8*T.H)),'four-cell optical depth');near(flat(loop.transform.rotation),flat(T.identityTransform().rotation),'four-cell optical frame');
  seams++;
 }
}
assert.equal(seams,48);
let s=T.initialState();near(T.worldToTangent(s.frame,T.normalFor('Y+')),[-1,0,0],'Y+ is player left');near(T.worldToTangent(s.frame,T.normalFor('Z+')),[0,1,0],'Z+ is above');let loop=T.advance(s,[0,0,32]);assert.deepEqual(loop.crossings.map(c=>T.cellId(c.to)),['X+','W-','X-','W+']);near(loop.state.p,s.p);near(flat(loop.state.frame),flat(s.frame));
let backward=T.advance(s,[0,0,-32]);assert.deepEqual(backward.crossings.map(c=>T.cellId(c.to)),['X-','W-','X+','W+']);near(backward.state.p,s.p);near(flat(backward.state.frame),flat(s.frame));
// Boundary remainder at oblique headings survives each parallel transport.
let d=[.2,.15,4.3],oblique=T.advance(s,d),whole=T.advance(oblique.state,T.scale(d,-1));near(whole.state.p,s.p);near(flat(whole.state.frame),flat(s.frame));
// Same side-cell statue, not four independent local statues. An asymmetric
// local arrow has successive 90-degree orientations from the XW loop cells.
for(let side of ['Y+','Y-']){
 let views=['W+','X+','W-','X-'].map(n=>T.portalTransform(n,side));
 let vectors=views.map(t=>T.mapVector(t,[0,1,0]));
 for(let i=0;i<4;i++){assert.ok(Math.abs(T.dot(vectors[i],vectors[(i+1)%4]))<eps);near(vectors[(i+2)%4],T.scale(vectors[i],-1));}
 assert.equal(new Set(vectors.map(v=>JSON.stringify(v))).size,4);
}
// Full-path image depth and same-avatar pose: no self in first neighbor.
let forward=T.unfoldPath('W+',['X+','W-','X-','W+']).transform;
near(T.mapPoint(forward,[.5,.7,1]),[.5,.7,33]);
let up=T.unfoldPath('W+',['Z+','W-','Z-','W+']).transform;
let down=T.unfoldPath('W+',['Z-','W-','Z+','W+']).transform;
near(up.offset,[0,32,0]);near(down.offset,[0,-32,0]);
let upFeet=T.mapPoint(up,[0,-1,0]),upHead=T.mapPoint(up,[0,1,0]);assert.ok(Math.abs(upFeet[1])<Math.abs(upHead[1]));
let downFeet=T.mapPoint(down,[0,-1,0]),downHead=T.mapPoint(down,[0,1,0]);assert.ok(Math.abs(downHead[1])<Math.abs(downFeet[1]));
// The graph is not a three-torus: no same-axis opposite neighbor and non-flat
// three-cell holonomy around a cubical edge is present.
let curved=T.advance(s,[0,0,4.1]).state;
let goY=T.worldToTangent(curved.frame,[0,4.1,0,0]);curved=T.advance(curved,goY).state;
let goW=T.worldToTangent(curved.frame,[0,0,0,4.1]);curved=T.advance(curved,goW).state;
assert.notDeepEqual(curved.frame,s.frame);
console.log('PASS: all 48 directed seams, inverse point/frame transport, seam-fixing affine maps, all 48 four-cell optical loops, upper forward/back identities, oblique remainder, side-statue 90° views, 32-unit self-image depth, upper soles/lower head ordering, non-flat holonomy.');
