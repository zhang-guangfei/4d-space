import assert from 'node:assert/strict';
import * as T from './chapter-topology.mjs';
import * as M from './chapter-motion.mjs';
const eps=1e-8,near=(a,b,e=eps)=>a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<e,`${a} != ${b}`));
for(let yaw of [-8,-Math.PI,0,Math.PI/2,Math.PI,8])for(let pitch of [-1.2,0,1.2]){let b=M.viewBasis(yaw,pitch),vs=Object.values(b);for(let i=0;i<3;i++){assert.ok(Math.abs(T.dot(vs[i],vs[i])-1)<eps);for(let j=i+1;j<3;j++)assert.ok(Math.abs(T.dot(vs[i],vs[j]))<eps);}}
near(M.viewBasis(0,0).forward,[0,0,1]);near(M.viewBasis(Math.PI/2,0).forward,[1,0,0]);assert.ok(M.viewBasis(0,.5).forward[1]<0);
let v=[.3,-.1,.4],a=[.2,.4,-.1],whole=M.integrateVelocity(v,a,.8),parts={velocity:v,displacement:[0,0,0]};for(let i=0;i<80;i++){let r=M.integrateVelocity(parts.velocity,a,.01);parts.velocity=r.velocity;parts.displacement=T.add(parts.displacement,r.displacement);}near(parts.velocity,whole.velocity);near(parts.displacement,whole.displacement);
// Turning one's head doesn't rotate momentum when no thrust is applied.
let coast1=M.integrateThrust([1,2,3],[0,0,0],0,0,.1),coast2=M.integrateThrust([1,2,3],[0,0,0],2,-1,.1);near(coast1.velocity,coast2.velocity);near(coast1.displacement,coast2.displacement);
let up=M.integrateThrust([0,0,0],[0,1,0],.6,.7,.1);near(up.acceleration,T.scale(M.viewBasis(.6,.7).up,3));let diagonal=M.integrateThrust([0,0,0],[1,1,1],0,0,.1);assert.ok(Math.abs(Math.hypot(...diagonal.acceleration)-3)<eps);
let capped=M.integrateVelocity([0,0,0],[0,0,3],10);assert.ok(Math.hypot(...capped.velocity)<=4.5+eps);assert.ok(Math.hypot(...capped.displacement)<=45+eps);let capSplit={velocity:[0,0,0],displacement:[0,0,0]};for(let i=0;i<100;i++){let r=M.integrateVelocity(capSplit.velocity,[0,0,3],.1);capSplit.velocity=r.velocity;capSplit.displacement=T.add(capSplit.displacement,r.displacement);}near(capped.velocity,capSplit.velocity);near(capped.displacement,capSplit.displacement,1e-7);
near([M.upperEyeZ(false),M.upperEyeZ(true)],[-2.32,-2.85]);
let lowerSeams=0;
for(let id of T.CELL_IDS){let n=T.normalFor(id),frame=T.canonicalFrame(n),state={normal:n,frame,p:T.scale(n,T.H)};for(let face of T.cellNeighbors(n)){let delta=T.worldToTangent(frame,T.scale(face,4.4)),velocity=T.worldToTangent(frame,T.scale(face,2)),move=M.advanceWithCollision(state,velocity,delta,'lower');assert.equal(move.crossings.length,1);assert.equal(T.cellId(move.state.normal),T.cellId(face));near(move.velocity,velocity);lowerSeams++;}}
assert.equal(lowerSeams,48);
let start=T.initialState();start.p[2]=M.upperEyeZ();let forward=M.advanceWithCollision(start,[0,0,3],[0,0,32],'upper');assert.deepEqual(forward.crossings.map(c=>T.cellId(c.to)),['X+','W-','X-','W+']);near(forward.state.p,start.p);near(forward.velocity,[0,0,3]);
let side=M.advanceWithCollision(start,[2,0,1],[8,0,1],'upper');assert.equal(side.crossings.length,0);assert.ok(Math.abs(side.state.p[1])<=3.80000001);assert.equal(side.velocity[0],0);assert.equal(side.velocity[2],1);assert.ok(Math.abs(side.state.p[0]-1)<eps);
let above=M.advanceWithCollision(T.initialState(),[0,2,0],[0,10,0],'upper');assert.equal(above.crossings.length,0);assert.ok(above.state.p[2]<=3.80000001);
let below=M.advanceWithCollision(T.initialState(),[0,-2,0],[0,-10,0],'upper');assert.equal(below.crossings.length,0);assert.ok(below.state.p[2]>=-3.80000001);
// Off-center door approaches hit solid wall, including very long timesteps.
let jamb=T.initialState();jamb.p[1]=2.7;let hit=M.advanceWithCollision(jamb,[0,0,3],[0,0,30],'lower');assert.equal(hit.crossings.length,0);assert.ok(hit.state.p[0]<=3.80000001);assert.equal(hit.velocity[2],0);
// Sideways motion in a seam's radius band hits jamb, not through the wall.
let band=T.initialState();band.p[0]=3.9;band.p[1]=2.5;let bandHit=M.advanceWithCollision(band,[-2,0,0],[-1,0,0],'lower');assert.ok(bandHit.state.p[1]<=2.60000001);assert.equal(bandHit.velocity[0],0);
// Open geometry is still traversable near (but safely inside) its edge.
let nearEdge=T.initialState();nearEdge.p[1]=2.59;assert.equal(M.advanceWithCollision(nearEdge,[0,0,2],[0,0,5],'lower').crossings.length,1);
// Glass blocks Y+ in upper but opens as an actual neighbor seam in lower.
let same=T.initialState();assert.equal(M.advanceWithCollision(same,[-2,0,0],[-5,0,0],'upper').crossings.length,0);assert.equal(T.cellId(M.advanceWithCollision(same,[-2,0,0],[-5,0,0],'lower').state.normal),'Y+');
console.log('PASS motion: view-relative orthonormal thrust, inertial yaw independence, exact unsaturated dt integration, stable speed cap, 48 lower seams, upper loop/floor/crouch bounds, glass blocking/opening, jamb radius and long-step collision, outward-only velocity cancellation/sliding.');
