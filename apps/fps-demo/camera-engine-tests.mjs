// Real vendored Babylon camera regression. NullEngine validates camera math,
// not GPU rasterization, browser pointer lock, or physical mouse input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const noop=()=>{};
const sandbox={
  exports:{},module:{},console,setTimeout,clearTimeout,performance,
  window:{addEventListener:noop,removeEventListener:noop},
  document:{addEventListener:noop,removeEventListener:noop},navigator:{}
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./dist/vendor/babylon.js',import.meta.url),'utf8'),sandbox);
const B=sandbox.exports;
const engine=new B.NullEngine();
const scene=new B.Scene(engine);
const camera=new B.UniversalCamera('regression-camera',new B.Vector3(0,1.68,0),scene);
camera.inputs.clear();
assert.equal(Object.keys(camera.inputs.attached).length,0,'No competing built-in inputs');
assert.ok(!camera.rotationQuaternion,'Euler camera should not have an active quaternion');
let maxMutation=0,maxDirectionError=0,maxSeamDelta=0;
try {
  for(let i=0;i<5000;i++){
    camera.rotation.y+=.01;
    const expected=camera.rotation.y;
    scene.render();
    maxMutation=Math.max(maxMutation,Math.abs(camera.rotation.y-expected));
    assert.equal(camera.rotation.y,expected,'Rendering must not change controller yaw');
  }
  for(const yaw of [-Math.PI-.001,-Math.PI+.001,Math.PI-.001,Math.PI+.001,2*Math.PI-.001,2*Math.PI+.001,10000]){
    camera.rotation.set(.3,yaw,0);
    camera.position.z=41.99;
    scene.render();
    const before=camera.getDirection(B.Axis.Z);
    const expected=new B.Vector3(Math.sin(yaw)*Math.cos(.3),-Math.sin(.3),Math.cos(yaw)*Math.cos(.3));
    const error=B.Vector3.Distance(before,expected);
    maxDirectionError=Math.max(maxDirectionError,error);
    assert.ok(error<1e-6,`Direction must remain correct around angle boundaries: ${yaw}`);
    camera.position.z=-5.99;
    scene.render();
    const after=camera.getDirection(B.Axis.Z);
    const delta=B.Vector3.Distance(before,after);
    maxSeamDelta=Math.max(maxSeamDelta,delta);
    assert.equal(delta,0,'Forward wrap must preserve camera direction');
    camera.position.z=41.99;
    scene.render();
    assert.equal(B.Vector3.Distance(after,camera.getDirection(B.Axis.Z)),0,'Reverse wrap must preserve direction');
  }
  console.log(`PASS Babylon ${B.Engine.Version}: 5000 render cycles; yaw mutation=${maxMutation}; angle-boundary direction error=${maxDirectionError}; forward/reverse seam direction delta=${maxSeamDelta}`);
  console.log('Scope: real Babylon NullEngine camera math only; no WebGL or physical mouse verification.');
} finally {
  scene.dispose();
  engine.dispose();
}
