import {insideHatch} from './dist/hatch.js';
import {H,dot,add,sub,scale,axisOf,normalFor,cellId,copyState,tangentToWorld,advance} from './chapter-topology.mjs';
export const PLAYER_RADIUS=.2;
export const DOOR_HALF=2.8;
export const STANDING_EYE=1.68;
export const CROUCH_EYE=1.15;
export const upperEyeZ=(crouched=false)=>-H+(crouched?CROUCH_EYE:STANDING_EYE);
/** Babylon pitch convention: positive pitch looks down. Vectors are in the
 * transported frame, not ambient 4D. Changing yaw never rotates old velocity. */
export function viewBasis(yaw,pitch){const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);return {right:[cy,0,-sy],up:[sy*sp,cp,cy*sp],forward:[sy*cp,-sp,cy*cp]};}
const magnitude=v=>Math.hypot(...v);
const cap=(v,max)=>{const n=magnitude(v);return n>max?scale(v,max/n):[...v];};
function freeStep(v,a,dt,lambda){
 if(lambda<1e-10)return {velocity:add(v,scale(a,dt)),displacement:add(scale(v,dt),scale(a,dt*dt/2))};
 const e=Math.exp(-lambda*dt),one=-Math.expm1(-lambda*dt);
 return {velocity:add(scale(v,e),scale(a,one/lambda)),displacement:add(scale(v,one/lambda),scale(a,dt/lambda-one/(lambda*lambda)))};
}
/** Exact constant-thrust exponential integration while speed cap is inactive.
 * At a cap contact, find the exact contact time, then integrate the bounded
 * velocity with small <=1/240s steps. Only the active speed-constraint regime
 * is numerical; ordinary variable-dt flight remains analytic and dt-stable.
 */
export function integrateVelocity(velocity,acceleration,dt,{lambda=.35,maxSpeed=4.5}={}){
 if(!Number.isFinite(dt)||dt<0)throw Error('dt must be finite and nonnegative');
 if(!velocity.every(Number.isFinite)||!acceleration.every(Number.isFinite))throw Error('Nonfinite motion vector');
 if(lambda<0||maxSpeed<=0)throw Error('Invalid flight parameters');
 let v=cap(velocity,maxSpeed),full=freeStep(v,acceleration,dt,lambda);
 if(magnitude(full.velocity)<=maxSpeed+1e-10)return full;
 // Norm of the exponential path is convex in e; if endpoints are inside,
 // the whole path is inside. Otherwise first crossing is found by bisection.
 let lo=0,hi=dt;for(let i=0;i<45;i++){let mid=(lo+hi)/2;if(magnitude(freeStep(v,acceleration,mid,lambda).velocity)>maxSpeed)hi=mid;else lo=mid;}
 let contact=freeStep(v,acceleration,lo,lambda),displacement=contact.displacement;v=cap(contact.velocity,maxSpeed);
 let left=dt-lo,n=Math.max(1,Math.ceil(left*240)),h=left/n;
 for(let i=0;i<n;i++){let next=cap(freeStep(v,acceleration,h,lambda).velocity,maxSpeed);displacement=add(displacement,scale(add(v,next),h/2));v=next;}
 return {velocity:v,displacement};
}
/** input3 = [strafe, view-up, view-forward], each in [-1,1]. Normalize combined
 * thrust so diagonals aren't faster. Existing velocity remains in the same
 * transported frame even when the player looks elsewhere. */
export function integrateThrust(velocity,input3,yaw,pitch,dt,{acceleration=3,lambda=.35,maxSpeed=4.5}={}){
 const b=viewBasis(yaw,pitch),input=cap(input3,1),a=scale(add(add(scale(b.right,input[0]),scale(b.up,input[1])),scale(b.forward,input[2])),acceleration);
 return {...integrateVelocity(velocity,a,dt,{lambda,maxSpeed}),acceleration:a};
}
/** Open aperture evaluated at a point on/near the shared face. The radius
 * shrinks its edge bounds conservatively, preventing sphere/jamb penetration.
 * Upper: only X/W loop doors; Y +/- and Z +/- are solid glass. Lower: all six.
 */
export function seamAperture(n,v,p,mode='lower',radius=PLAYER_RADIUS){
 return insideHatch(n,v,p,mode,radius);
}
/** Conservative player sphere against all wall/glass planes and aperture
 * jambs. Points crossing an open seam are allowed for the topology integrator.
 */
export function positionClear(state,p,mode='lower',radius=PLAYER_RADIUS){
 const n=normalFor(state.normal),a=axisOf(n);
 for(let i=0;i<4;i++){if(i===a)continue;if(Math.abs(p[i])>H-radius+1e-9){let v=[0,0,0,0];v[i]=Math.sign(p[i]);if(!seamAperture(n,v,p,mode,radius))return false;}}
 return true;
}
/** Substepped axis-sliding sweep. Because frames are transported signed axes,
 * resolving a component is a world-plane normal contact, not a yaw-relative
 * velocity reset. Apertures are checked both when approaching a wall and when
 * sliding sideways in its radius band. No boundary-jitter visit policy here.
 */
export function advanceWithCollision(state,velocity,displacement,mode='lower',{radius=PLAYER_RADIUS,maxStep=.06}={}){
 if(maxStep<=0||radius<0)throw Error('Invalid collision parameters');
 let current=copyState(state),v=[...velocity],crossings=[],collisions=[],steps=Math.max(1,Math.ceil(magnitude(displacement)/maxStep)),cancelled=new Set();
 for(let step=0;step<steps;step++)for(let component=0;component<3;component++){
  const amount=displacement[component]/steps;if(cancelled.has(component)||Math.abs(amount)<1e-12)continue;
  const delta=[0,0,0];delta[component]=amount;const world=tangentToWorld(current.frame,delta),candidate=add(current.p,world);
  let fraction=1;
  if(!positionClear(current,candidate,mode,radius)){
   let lo=0,hi=1;for(let j=0;j<30;j++){const mid=(lo+hi)/2;if(positionClear(current,add(current.p,scale(world,mid)),mode,radius))lo=mid;else hi=mid;}fraction=lo;
   if(v[component]*amount>0)v[component]=0;cancelled.add(component);
   collisions.push({cell:cellId(current.normal),component,attempted:amount,accepted:amount*fraction});
  }
  if(fraction>1e-10){const result=advance(current,scale(delta,fraction),{canCross:seam=>seamAperture(seam.from,seam.to,seam.p,mode,radius)});current=result.state;crossings.push(...result.crossings);}
 }
 return {state:current,velocity:v,crossings,collisions};
}
