import assert from 'node:assert/strict';
import {GroundMotion,GroundGait,AVATAR_HEIGHT,GRAVITY,STANDING_EYE,CROUCH_EYE,FLOOR_Z,CEILING_Z,CROWN_ABOVE_EYE,JUMP_SPEED} from './dist/grounded-motion.js';
import * as T from './chapter-topology.mjs';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
near(JUMP_SPEED,Math.sqrt(2*GRAVITY*1.75));
const flightTime=2*JUMP_SPEED/GRAVITY;
for(let fps of [30,60,144]){
 let gm=new GroundMotion(),jumps=0,lands=0;
 for(let i=0;i<Math.ceil(flightTime*fps)+20;i++){let r=gm.step(1/fps,i===0,false);jumps+=Number(r.jumped);lands+=Number(r.landed);assert.ok(r.eyeZ+CROWN_ABOVE_EYE<=CEILING_Z+1e-8);assert.ok(r.footLift>=-1e-8);}
 near(gm.peakFootLift,AVATAR_HEIGHT);near(gm.footLift,0);near(gm.verticalVelocity,0);assert.equal(gm.airborne,false);assert.equal(jumps,1);assert.equal(lands,1);
 // Held Space across several landings must never auto-bounce.
 gm.reset();jumps=0;for(let i=0;i<fps*8;i++)jumps+=Number(gm.step(1/fps,true,false).jumped);assert.equal(jumps,1);assert.equal(gm.airborne,false);
 gm.step(1/fps,false);assert.equal(gm.step(1/fps,true).jumped,true);
}
// Analytic apex exists even when no sampled frame lands exactly on its time.
let gm=new GroundMotion();gm.step(JUMP_SPEED/GRAVITY,true);near(gm.footLift,1.75);near(gm.verticalVelocity,0);assert.equal(gm.airborne,true);
// Exact ballistic result is independent of timestep partitioning.
let whole=new GroundMotion();whole.step(.7,true);let split=new GroundMotion();for(let i=0;i<70;i++)split.step(.01,i===0);near(whole.footLift,split.footLift);near(whole.verticalVelocity,split.verticalVelocity);
// A single long frame resolves the entire jump and landing cleanly.
let long=new GroundMotion();let longResult=long.step(10,true);assert.equal(longResult.jumped,true);assert.equal(longResult.landed,true);near(long.peakFootLift,1.75);near(long.footLift,0);
// Ceiling contact cancels only upward velocity, then falls during remainder.
let ceiling=new GroundMotion().reset({footLift:CEILING_Z-CROWN_ABOVE_EYE-STANDING_EYE-FLOOR_Z-.02,verticalVelocity:3});ceiling.step(.1,false);assert.ok(ceiling.eyeZ+CROWN_ABOVE_EYE<=CEILING_Z+1e-8);assert.ok(ceiling.verticalVelocity<0);let before=ceiling.footLift;ceiling.step(.05,false);assert.ok(ceiling.footLift<before);
let crouch=new GroundMotion();near(crouch.step(0,false,true).eyeZ,FLOOR_Z+CROUCH_EYE);near(crouch.step(0,false,false).eyeZ,FLOOR_Z+STANDING_EYE);crouch.step(.1,true,true);near(crouch.eyeZ,FLOOR_Z+crouch.footLift+STANDING_EYE);
// XW seam transport does not touch global Z or vertical momentum.
let airborne=new GroundMotion();airborne.step(.2,true);let state=T.initialState();state.p[2]=airborne.eyeZ;let vBefore=airborne.verticalVelocity;let crossed=T.advance(state,[0,0,T.H+1]).state;near(crossed.p[2],state.p[2]);near(airborne.verticalVelocity,vBefore);assert.deepEqual(crossed.frame[1],[0,0,1,0]);
let gait=new GroundGait();gait.step(1,.1,3,false);let phase=gait.phase,left=gait.leftLeg;let idle=gait.step(0,.1,3,false);near(gait.phase,phase);near(idle.leftLeg,left*Math.exp(-1.2));
let ga=new GroundGait(),gb=new GroundGait();ga.step(1,.1,3);gb.step(1,.1,3);ga.step(0,.5,0);for(let i=0;i<50;i++)gb.step(0,.01,0);near(ga.leftLeg,gb.leftLeg);
assert.deepEqual(gait.step(20,.1,3,true),{leftLeg:-.28,rightLeg:.28});assert.deepEqual(gait.step(20,.1,3,true,true),{leftLeg:0,rightLeg:0});
// Wall-pushing with no actual distance adds no gait phase, even at nonzero intent.
let wall=new GroundGait();for(let i=0;i<120;i++)wall.step(0,1/60,3,false);near(wall.phase,0);near(wall.leftLeg,0);
console.log('PASS: exact 1.75m FEET apex at 30/60/144Hz, ballistic partition invariance, landing/ceiling events, held-jump guard, grounded crouch, XW seam vertical invariance, distance-driven gait, no wall-push steps, idle exponential ease, static airborne/zeroG pose.');
