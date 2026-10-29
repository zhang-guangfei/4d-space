import assert from 'node:assert/strict';
import * as T from './dist/chapter-topology.js';
import {rotatingSidePose} from './dist/model-poses.js';

const near=(a,b,label)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-9,`${label}: ${a} != ${b}`));
const modelAxes=([right,up,forward])=>[forward,up,-right];
// Babylon yaw maps +X to [cos(yaw),0,-sin(yaw)]. The local
// side-cell canonical basis maps initially to model [+Y,+X,+Z].
// Compare only room centers: this does not assert continuous atlas equivalence.
for(const [side,cell] of [['left','Y+'],['right','Y-']]){
  for(let step=-8;step<=8;step++){
    const state=T.advance(T.initialState(),[0,0,2*T.H*step]).state;
    const transform=T.portalTransform(state.normal,cell,state.frame);
    const pose=rotatingSidePose(step,side),c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
    near(modelAxes(T.mapVector(transform,[0,1,0])),pose.axis,`${side} primary axis step ${step}`);
    near(pose.axis,[c,0,-s],`${side} yaw/axis step ${step}`);
    near(modelAxes(T.mapVector(transform,[0,0,1])),[s,0,c],`${side} second axis step ${step}`);
    near(modelAxes(T.mapVector(transform,[1,0,0])),[0,1,0],`${side} up step ${step}`);
  }
  for(const phase of [-3.25,-.01,0,.25,1.5,3.99]){
    near(rotatingSidePose(phase,side).axis,rotatingSidePose(phase+4,side).axis,`${side} four-step closure`);
    const a=rotatingSidePose(phase,side),b=rotatingSidePose(phase+1e-6,side);
    assert.ok(Math.abs(b.yaw-a.yaw)<2e-6,`${side} continuous unwrapped yaw`);
  }
}
console.log('PASS: left/right rotating-room marker axes match actual atlas at forward/backward room centers; up, yaw signs, four-step closure, and smooth phase verified.');
