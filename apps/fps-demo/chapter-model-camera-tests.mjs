/** Reference-camera regression: real Babylon projection/controls, no GPU rasterization. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHypothesisLab} from './dist/hypotheses.js';
import {REFERENCE_CAMERA,referenceScreen,projectGameToRef} from './dist/tesseract-reference.js';
import {TESSERACT} from './dist/colored-tesseract.js';
import {roomModel} from './dist/model-content.js';
const sandbox={exports:{},module:{exports:{}},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);
const B=sandbox.exports;
B.Engine=class extends B.NullEngine{constructor(){super({renderWidth:634,renderHeight:360});}setHardwareScalingLevel(){}runRenderLoop(callback){this.testRender=callback;}};
const canvas={addEventListener(){},removeEventListener(){},focus(){},setAttribute(){}};
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const snapshot=c=>[c.alpha,c.beta,c.radius,...c.target.asArray()];
const base=[-Math.PI/2,1.05,11,0,1.4,0],treadmill=[3.18,1.15,11,0,1.4,0];
const viewEquals=(c,p)=>snapshot(c).forEach((v,i)=>near(v,p[i]));
let lab=createHypothesisLab(B,canvas),camera=lab.scene.activeCamera;
try{
 viewEquals(camera,base);lab.selectRoom('X+');viewEquals(camera,treadmill);
 assert.ok(camera.inputs.attached.pointers,'orbit pointer controls remain attached');assert.ok(camera.inputs.attached.mousewheel,'wheel zoom remains attached');assert.equal(camera.inputs.attached.keyboard,undefined);
 // Reference screenshot is 634×360, inset (38,121), phase 2.92. These
 // world-space far top corners and side room centers are identifiable pixels.
 lab.setAnimationTravel(2.92);lab.scene.render();
 const project=p=>B.Vector3.Project(new B.Vector3(...p),B.Matrix.Identity(),lab.scene.getTransformMatrix(),{x:38,y:121,width:634,height:360});
 for(const [point,pixel]of [[[3.792,1.7175,.9375],[339,263]],[[3.792,1.7175,-.9375],[377,264]]]){const p=project(point);near(p.x,pixel[0],1);near(p.y,pixel[1],1);}
 const model=lab.models.treadmill;model.rotatingLeft.computeWorldMatrix(true);model.rotatingRight.computeWorldMatrix(true);
 const left=project(model.rotatingLeft.absolutePosition.asArray()),right=project(model.rotatingRight.absolutePosition.asArray());
 assert.ok(left.x<355&&right.x>355,'blue left / green right from the reference');near(left.x,302,1);near(right.x,408,1);near(left.y,315,1);near(right.y,317,1);
 // A user orbit, zoom or pan must survive animation/scrubbing; no per-frame preset.
 camera.alpha+=.3;camera.beta-=.2;camera.radius=9;camera.setTarget(new B.Vector3(.2,1,.1));const dragged=snapshot(camera);
 for(const t of [0,.3,1,2.92,3.99]){lab.setAnimationTravel(t);lab.scene.render();viewEquals(camera,dragged);}
 lab.setTravel(1.1);viewEquals(camera,dragged);
 camera.inertialAlphaOffset=.1;camera.inertialBetaOffset=.1;camera.inertialRadiusOffset=.1;camera.inertialPanningX=.1;camera.inertialPanningY=.1;
 lab.resetView();viewEquals(camera,treadmill);for(const key of ['inertialAlphaOffset','inertialBetaOffset','inertialRadiusOffset','inertialPanningX','inertialPanningY'])near(camera[key],0);
 // Exercise the actual modelReset callback, not a second implementation.
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
 const source=fs.readFileSync('dist/chapter.js','utf8'),controls=source.slice(source.indexOf("$('modelPlay').onclick"),source.indexOf('\n\nfunction updateTruthReadout'));
 const handlerContext={$,lab,labRoom:'X+',labTravel:2.7,autoplay:true,roomModel,isTruthRoom:()=>false};
 vm.runInNewContext(controls,handlerContext);camera.alpha=.7;camera.beta=.8;camera.radius=8;$('modelReset').onclick();viewEquals(camera,treadmill);near(lab.travel,0);assert.equal(handlerContext.autoplay,false);
 // Leaving the special camera returns the other models to their existing default.
 lab.selectRoom('X-');viewEquals(camera,base);lab.selectRoom('W-');viewEquals(camera,base);lab.selectRoom('W+');lab.resetView();near(camera.fov,REFERENCE_CAMERA.verticalFov);lab.scene.render();const actual=lab.models['colored-tesseract'].colored;for(const phase of [0,.31,1,2.75,4]){lab.setTravel(phase);lab.scene.render();for(let i=0;i<16;i++){const point=actual.geometry.points[i].map((v,k)=>v*1.5+(k===1?.6:0)),screen=B.Vector3.Project(new B.Vector3(...point),B.Matrix.Identity(),lab.scene.getTransformMatrix(),{x:0,y:0,width:634,height:360}),ref=referenceScreen(projectGameToRef(TESSERACT.vertices[i],-phase*Math.PI/2));near(screen.x,(ref[0]-128)/256*360+317,1e-3);near(screen.y,ref[1]/256*360,1e-3);}}
 assert.equal(lab.getColoredState().plane,'XW');lab.setAnimationTravel(1);near(lab.getColoredState().angle,-Math.PI/2);
 lab.select('treadmill');viewEquals(camera,treadmill);camera.alpha=.5;lab.selectRoom('X+');viewEquals(camera,treadmill);
 lab.dispose();lab=createHypothesisLab(B,canvas);camera=lab.scene.activeCamera;lab.selectRoom('X+');viewEquals(camera,treadmill);
 console.log('PASS treadmill reference camera on open/reopen/reset; projected screenshot landmarks; free orbit/zoom/pan preserved during animation; three original model defaults unchanged; fourth fittedcamera pixeloracle80samples, negative XW rotation. Babylon NullEngine only; no GPU/physical-input claim.');
}finally{lab.dispose();}
