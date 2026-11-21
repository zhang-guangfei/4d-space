import {makePhaseGauge,solidSample} from './scene-phase.mjs';
import {bridgeAligned,target} from './rules.mjs';
import {coatings,sky,yard,midDeck,pageFittings} from './scene-yard.mjs';
import {sliceRadius} from './puzzles.mjs';
import {PILOT_BERTHS} from './anchors.mjs';
import {applyCoating} from './scene-coating.mjs';
import {wing} from './scene-wings.mjs';
import {objects,companion} from './scene-props.mjs';
import {createRenderQuality} from '../render-quality.js';

const REACH=2, RADIUS=.21, EYE=1.68;
const movement=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight']);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

// Equipment footprints are in local XYZ. The player's circular body keeps
// clearance from cases, the pilot and the visible edge of the working deck.
const fit={
  echo:[[-.98,-2.18,.63,.46],[1.7,3.95,.46,.46]],
  vault:[[-.98,-2.18,.63,.46]],
  bridge:[[-.96,-2,.47,.46],[0,5.14,.42,.36]],
  sphere:[[0,4.18,1.38,1.35]],crystal:[[0,4.18,1.38,1.35]],
  cargo:[[0,4.45,2.10,1.98],[-4.9,4.45,.91,4.95],[4.9,4.45,.91,4.95]],
  mirror:[[0,4,1.21,.77]],rings:[[-2,2.95,1.01,.62],[2.8,2.95,1.01,.62]],
  clinic:[[0,3.48,1.18,.77],[-5.05,2.3,.79,7.9],[5.05,2.3,.79,7.9],[2,3.58,.66,.12]],
  home:[[-.98,-2.18,.63,.46],[.98,2.31,.63,.46],[-5.17,8.61,1.01,.48],[5.17,8.61,1.01,.48]]
};
function touches(x,z,cx,cz,rx,rz){
  const dx=Math.max(0,Math.abs(x-cx)-rx),dz=Math.max(0,Math.abs(z-cz)-rz);
  return dx*dx+dz*dz<RADIUS*RADIUS;
}

function navigable(section,state,x,z) {
  if(Math.abs(x)>5.55||z< -9||z>9)return false;
  if(section.id==='vault'&&state.w===0&&Math.abs(z)<.23+RADIUS)return false;
  if(section.id==='bridge'&&z>-.5-RADIUS&&z<2.5+RADIUS) {
    if(!bridgeAligned(state.angle)||Math.abs(x)>1.2-RADIUS)return false;
  }
  for(const footprint of fit[section.id]){
    if(touches(x,z,footprint[0],footprint[1],footprint[2],footprint[3]))return false;
  }
  if(section.id==='vault'&&state.w===0&&touches(x,z,0,5.85,.69,.57))return false;
  const pilot=PILOT_BERTHS[section.id];
  if(pilot&&(section.id!=='echo'||state.w===1)&&touches(x,z,pilot[0],pilot[2],.24,.19))return false;
  return true;
}

export function createWorld(canvas,{onNear=()=>{},onInteract=()=>{},onPosition=()=>{},onResolution=()=>{},qualityMode='auto'}={}) {
  const B=globalThis.BABYLON;
  const engine=new B.Engine(canvas,false,{audioEngine:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance',adaptToDeviceRatio:false});
  const software=/swiftshader|llvmpipe|software rasterizer/i.test(engine.getGlInfo().renderer);
  const resolution=createRenderQuality({software});
  const scene=new B.Scene(engine);
  scene.setRenderingOrder(0,(a,b)=>Number(a.getMesh().name==='far interference field')-Number(b.getMesh().name==='far interference field'));
  scene.clearColor=new B.Color4(.028,.066,.092,1);
  scene.skipPointerMovePicking=true;scene.skipPointerDownPicking=true;scene.skipPointerUpPicking=true;
  const camera=new B.FreeCamera('helmet camera',new B.Vector3(0,EYE,-6),scene);
  camera.minZ=.057;camera.maxZ=165;camera.fov=.93;
  camera.inputs.clear();scene.activeCamera=camera;
  const materials=coatings(scene);
  const horizon=sky(scene,materials.space);yard(scene,materials);
  const central=midDeck(scene,materials), gauge=makePhaseGauge(scene,materials);
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const keys=new Set(), frameTimes=new Float32Array(180);
  let solid=null,displayW=0,fromW=0,sweepStart=-1;
  let room=null,section=null,state=null,fittings=null,equipment=null,pilot=null,focus=null;
  let near=false,active=false,drag=null,touchWalk=null,touchX=0,touchY=0;
  let mouseLocked=false, firstRelative=true;
  let yaw=0,pitch=.065,clock=0,last=0,elapsed=0,frames=0,frameIndex=0;
  let sampleAfter=0;
  let lastPositionUpdate=0;
  let latestBuild=0,peakBuild=0,totalBuild=0;
  const eye=camera.position;
  function nearUpdate(force=false) {
    if(!focus)return;
    const next=Math.hypot(eye.x-focus.x,eye.z-focus.z)<=REACH;
    if(force||next!==near){near=next;onNear(near,focus.label);}
  }
  function resize(){
    if(canvas.clientWidth<1||canvas.clientHeight<1)return;
    const scale=resolution.scale(canvas.clientWidth,canvas.clientHeight,window.devicePixelRatio,qualityMode);
    if(engine.getHardwareScalingLevel()!==scale)engine.setHardwareScalingLevel(scale);
    else engine.resize();
    sampleAfter=performance.now()+600;
    if(!active)onResolution(engine.getRenderWidth(),engine.getRenderHeight(),medianFrame());
  }
  const observer=new ResizeObserver(resize);
  observer.observe(canvas.parentElement||canvas);
  resize();
  function resetPose(){
    eye.set(0,EYE,-6); yaw=0;pitch=.065;
    camera.rotation.set(pitch,yaw,0);
  }
  function remove(object){if(object)object.dispose(false);}
  function resetPilot(){
    remove(pilot?.root);
    pilot=companion(scene,materials,section,state);
  }
  function drawPhase(now){
    const running=sweepStart>=0, t=running?clamp((now-sweepStart)/280,0,1):1;
    const eased=t*t*(3-2*t);
    displayW=reduceMotion.matches?state.w:fromW+(state.w-fromW)*eased;
    if(solid){
      const radius=sliceRadius(section.id,displayW);
      solid.setEnabled(radius>0);
      if(radius>0)solid.scaling.setAll(radius);
    }
    // A zero-thickness pilot stationed at W2 appears only when that sample is reached.
    if(section.id==='echo'&&pilot)pilot.root.setEnabled(Math.abs(displayW-1)<1e-5);
    if(running&&t<1){
      gauge.setEnabled(true);
      gauge.position.x=reduceMotion.matches?eye.x+1.12:(eased*2-1)*5.48*Math.sign(state.w-fromW);
    } else {
      gauge.setEnabled(false);sweepStart=-1;
    }
  }
  function update(next,rebuild=false){
    if(!section)return;
    const previous=state, start=performance.now();state=next;
    const changedW=rebuild||previous?.w!==next.w;
    const changedObjects=changedW||previous?.angle!==next.angle||previous?.step!==next.step||previous?.board!==next.board;
    if(changedW){
      applyCoating(materials.hull,section,state.w);
      fromW=rebuild?state.w:displayW;
      sweepStart=rebuild?-1:start;
      remove(fittings);fittings=pageFittings(scene,materials,state.w,section);
    }
    if(changedObjects){
      remove(equipment);equipment=objects(scene,materials,section,state);
      if(rebuild||(section.id==='echo'&&changedW))resetPilot();
      if(changedW)drawPhase(start);
      focus=target(state);nearUpdate(true);
      latestBuild=performance.now()-start;peakBuild=Math.max(latestBuild,peakBuild);totalBuild+=latestBuild;
    }
  }
  function setSection(nextSection,nextState) {
    section=nextSection;clear();resetPose();
    remove(room);room=wing(scene,materials,section.id);
    remove(solid);solid=solidSample(scene,materials,section.id);
    horizon.rotation.y=({vault:.34,bridge:-.28,sphere:.65,crystal:-.48,cargo:1.17,mirror:-1.27,rings:.83,clinic:1.64,home:.04}[section.id]||0);
    central.setEnabled(section.id!=='bridge');
    update(nextState,true);onPosition(eye,yaw);
    // Buffer uploads and first-draw compilation do not describe steady-state cost.
    sampleAfter=performance.now()+900;
  }
  function canOccupy(next){return !!section && navigable(section,next,eye.x,eye.z);}
  function restorePose(pose) {
    if(!pose||!section||![pose.x,pose.z,pose.yaw,pose.pitch].every(Number.isFinite))return false;
    if(!navigable(section,state,pose.x,pose.z)) return false;
    eye.set(pose.x,EYE,pose.z);yaw=pose.yaw%(2*Math.PI);pitch=clamp(pose.pitch,-1.34,1.34);
    camera.rotation.set(pitch,yaw,0);nearUpdate(true);onPosition(eye,yaw);return true;
  }
  function setActive(value) {
    active=Boolean(value);clear();
    if(!active){
      if(document.pointerLockElement===canvas)document.exitPointerLock();
      onResolution(engine.getRenderWidth(),engine.getRenderHeight(),medianFrame());
    }else sampleAfter=performance.now()+600;
    last=0;
  }
  function press(e) {
    if(!active||e.ctrlKey||e.metaKey||e.altKey||e.target?.matches?.('select,input,textarea,[contenteditable=true]'))return;
    if(movement.has(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyF'&&!e.repeat){e.preventDefault();onInteract();}
  }
  const release=e=>keys.delete(e.code);
  function clearPointers(){
    for(const pointer of [drag,touchWalk]){
      if(pointer&&canvas.hasPointerCapture(pointer.id))canvas.releasePointerCapture(pointer.id);
    }
    drag=null;touchWalk=null;touchX=touchY=0;firstRelative=true;
  }
  function clear(){keys.clear();clearPointers();}
  function syncLock(){
    const locked=document.pointerLockElement===canvas;
    if(locked===mouseLocked)return;
    // Pointer lock pins client coordinates. A drag anchor cannot cross this boundary.
    clearPointers();
    mouseLocked=locked;
  }
  function down(e){
    if(!active)return;
    syncLock();
    canvas.focus({preventScroll:true});
    if(mouseLocked)return;
    if(e.pointerType==='touch'&&e.offsetX<canvas.clientWidth*.43){
      if(touchWalk)return;
      touchWalk={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;
    }
    if(drag)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    canvas.setPointerCapture(e.pointerId);
  }
  async function setMouseMode(locked){
    clearPointers();
    if(!locked){
      if(document.pointerLockElement===canvas)document.exitPointerLock();
      return false;
    }
    if(!active||!canvas.requestPointerLock)return false;
    try{await canvas.requestPointerLock();return document.pointerLockElement===canvas;}
    catch{return false;}
  }
  function turn(dx,dy){
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
    yaw+=dx*.00235;pitch=clamp(pitch+dy*.00235,-1.34,1.34);
  }
  function relativeTurn(packet){
    const {movementX:dx,movementY:dy}=packet;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||(dx===0&&dy===0))return;
    // The first relative packet may include the browser repositioning its pointer.
    const limit=firstRelative?32:512;
    firstRelative=false;
    if(Math.hypot(dx,dy)<=limit)turn(dx,dy);
  }
  function motion(e){
    if(!active||document.hidden)return;
    syncLock();
    if(mouseLocked){
      if(e.pointerType!=='mouse'||!document.hasFocus())return;
      // A fast flick may arrive as one large event containing several real samples.
      const samples=e.getCoalescedEvents?.();
      if(samples?.length>1 && samples.some(sample=>sample.movementX||sample.movementY)){
        for(const packet of samples)relativeTurn(packet);
      }else relativeTurn(e);
      return;
    }
    if(touchWalk?.id===e.pointerId){
      touchX=clamp((e.clientX-touchWalk.x)/65,-1,1);touchY=clamp((touchWalk.y-e.clientY)/65,-1,1);return;
    }
    if(drag?.id!==e.pointerId)return;
    if(!canvas.hasPointerCapture(e.pointerId)||(e.pointerType==='mouse'&&!e.buttons)){
      drag=null;return;
    }
    turn(e.clientX-drag.x,e.clientY-drag.y);
    drag.x=e.clientX;drag.y=e.clientY;
  }
  function up(e){
    if(drag?.id===e.pointerId)drag=null;
    if(touchWalk?.id===e.pointerId){touchWalk=null;touchX=touchY=0;}
  }
  function lostCapture(e){
    if(!canvas.hasPointerCapture(e.pointerId))up(e);
  }
  window.addEventListener('keydown',press);window.addEventListener('keyup',release);window.addEventListener('blur',clear);
  document.addEventListener('pointerlockchange',syncLock);
  canvas.addEventListener('lostpointercapture',lostCapture);
  canvas.addEventListener('pointerdown',down);window.addEventListener('pointermove',motion);
  window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  function move(dt) {
    yaw+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*1.62;
    pitch=clamp(pitch+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*dt*1.27,-1.34,1.34);
    let side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touchX;
    let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touchY;
    const magnitude=Math.hypot(side,forward);
    if(magnitude>0) {
      const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3.4)*dt;
      const scale=speed/Math.max(1,magnitude);side*=scale;forward*=scale;
      const s=Math.sin(yaw),c=Math.cos(yaw);
      const nx=eye.x+side*c+forward*s,nz=eye.z-side*s+forward*c;
      if(navigable(section,state,nx,eye.z))eye.x=nx;
      if(navigable(section,state,eye.x,nz))eye.z=nz;
      nearUpdate();
    }
    if(clock-lastPositionUpdate>=120){onPosition(eye,yaw);lastPositionUpdate=clock;}
    eye.y=EYE;
    camera.rotation.set(pitch,yaw,0);
  }
  function medianFrame(){
    const times=frameTimes.slice(0,Math.min(frameIndex,frameTimes.length)).sort();
    return times.length?times[Math.floor(times.length/2)]:0;
  }
  function tick(){
    if(!section||document.hidden){last=0;return;}
    const now=performance.now();
    const ms=last?now-last:16.66;last=now;
    // Pause menus keep the view, but render a live scene at a reduced cadence.
    if(!active&&now-clock<125)return;
    clock=now;
    const dt=Math.min(.1,ms/1000);
    if(active){
      elapsed+=dt;frames++;
      if(now>=sampleAfter){
        frameTimes[frameIndex++%frameTimes.length]=ms;
        if(qualityMode==='auto'&&resolution.sample(ms))resize();
      }
      move(dt);
    }
    if(sweepStart>=0)drawPhase(now);
    if(pilot){
      pilot.chest.position.y=.011*Math.sin(elapsed*2.3);
      pilot.arms[0].rotation.x= -.08+.052*Math.sin(elapsed*1.84);
      pilot.arms[1].rotation.x=(near?-.68:-.13)+.065*Math.sin(elapsed*2.1);
    }
    scene.render();
  }
  engine.runRenderLoop(tick);
  return {
    setSection,update,setActive,setMouseMode,canOccupy,restorePose,resize,
    setQuality(mode){qualityMode=mode;frameIndex=0;frameTimes.fill(0);resize();},
    whenReady(){
      // Include upload, shader compilation and first presentation in cold-start
      // readiness, so a click hands control straight to an already drawn world.
      return new Promise(resolve=>scene.executeWhenReady(()=>{
        scene.render();
        requestAnimationFrame(()=>requestAnimationFrame(resolve));
      }));
    },
    getPosition:()=>({x:eye.x,y:eye.y,z:eye.z}),
    getPose:()=>({x:eye.x,z:eye.z,yaw,pitch}),
    getMeasurements(){
      const times=[...frameTimes].filter(n=>n>0).sort((a,b)=>a-b);
      const percentile=q=>times.length?times[Math.min(times.length-1,Math.floor(times.length*q))]:0;
      return {frames,frameMedianMs:percentile(.5),frameP95Ms:percentile(.95),fps:engine.getFps(),
        meshes:scene.getActiveMeshes().length,triangles:scene.getActiveIndices()/3,
        width:engine.getRenderWidth(),height:engine.getRenderHeight(),lastBuildMs:latestBuild,
        peakBuildMs:peakBuild,totalBuildMs:totalBuild,quality:engine.getHardwareScalingLevel(),qualityMode};
    },
    dispose(){
      setActive(false);engine.stopRenderLoop(tick);observer.disconnect();
      window.removeEventListener('keydown',press);window.removeEventListener('keyup',release);window.removeEventListener('blur',clear);
      document.removeEventListener('pointerlockchange',syncLock);canvas.removeEventListener('lostpointercapture',lostCapture);
      canvas.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',motion);
      window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);
      scene.dispose();engine.dispose();
    }
  };
}
