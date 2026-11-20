import {makePhaseGauge,solidSample} from './scene-phase.mjs';
import {bridgeAligned,target} from './rules.mjs';
import {coatings,sky,yard,midDeck,pageFittings} from './scene-yard.mjs';
import {sliceRadius} from './puzzles.mjs';
import {PILOT_BERTHS} from './anchors.mjs';
import {applyCoating} from './scene-coating.mjs';
import {wing} from './scene-wings.mjs';
import {objects,companion} from './scene-props.mjs';

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

export function createWorld(canvas,{onNear=()=>{},onInteract=()=>{},onPosition=()=>{}}={}) {
  const B=globalThis.BABYLON;
  const engine=new B.Engine(canvas,false,{audioEngine:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance',adaptToDeviceRatio:false});
  const software=/swiftshader|llvmpipe|software rasterizer/i.test(engine.getGlInfo().renderer);
  const scene=new B.Scene(engine);
  scene.setRenderingOrder(0,(a,b)=>Number(a.getMesh().name==='ringed ice giant')-Number(b.getMesh().name==='ringed ice giant'));
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
  let yaw=0,pitch=.065,clock=0,last=0,elapsed=0,frames=0,frameIndex=0,quality=1,slowTime=0;
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
    const base=Math.max(1,canvas.clientWidth/(software?496:1130),canvas.clientHeight/(software?340:790));
    engine.setHardwareScalingLevel(base*quality);
    engine.resize();
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
      applyCoating(materials.hull,section,eye,state.w);
      fromW=rebuild?state.w:displayW;
      sweepStart=rebuild?-1:start;
      remove(fittings);fittings=pageFittings(scene,materials,state.w,state.index);
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
    section=nextSection;keys.clear();resetPose();
    remove(room);room=wing(scene,materials,section.id);
    remove(solid);solid=solidSample(scene,materials,section.id);
    horizon.rotation.y=({crystal:-.22,cargo:.43,mirror:-.72,rings:.92,clinic:1.41,home:1.65}[section.id]||0);
    central.setEnabled(section.id!=='bridge');
    update(nextState,true);onPosition(eye);
  }
  function canOccupy(next){return !!section && navigable(section,next,eye.x,eye.z);}
  function restorePose(pose) {
    if(!pose||!section||![pose.x,pose.z,pose.yaw,pose.pitch].every(Number.isFinite))return false;
    if(!navigable(section,state,pose.x,pose.z)) return false;
    eye.set(pose.x,EYE,pose.z);yaw=pose.yaw%(2*Math.PI);pitch=clamp(pose.pitch,-1.34,1.34);
    camera.rotation.set(pitch,yaw,0);nearUpdate(true);onPosition(eye);return true;
  }
  function setActive(value) {
    active=Boolean(value);keys.clear();drag=null;touchWalk=null;touchX=touchY=0;
    if(!active&&document.pointerLockElement===canvas)document.exitPointerLock();
    last=0;
  }
  function press(e) {
    if(!active||e.ctrlKey||e.metaKey||e.altKey||e.target?.matches?.('select,input,textarea,[contenteditable=true]'))return;
    if(movement.has(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyF'&&!e.repeat){e.preventDefault();onInteract();}
  }
  const release=e=>keys.delete(e.code);
  function clear(){keys.clear();drag=null;touchWalk=null;touchX=touchY=0;}
  function down(e){
    if(!active)return;
    canvas.focus({preventScroll:true});
    if(e.pointerType==='touch'&&e.offsetX<canvas.clientWidth*.43){
      touchWalk={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;
    }
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);
  }
  async function setMouseMode(locked){
    if(!locked){
      if(document.pointerLockElement===canvas)document.exitPointerLock();
      return false;
    }
    if(!active||!canvas.requestPointerLock)return false;
    try{await canvas.requestPointerLock();return document.pointerLockElement===canvas;}
    catch{return false;}
  }
  function motion(e){
    if(!active)return;
    if(touchWalk?.id===e.pointerId){
      touchX=clamp((e.clientX-touchWalk.x)/65,-1,1);touchY=clamp((touchWalk.y-e.clientY)/65,-1,1);return;
    }
    const locked=document.pointerLockElement===canvas;
    if(!locked&&drag?.id!==e.pointerId)return;
    const dx=locked?e.movementX:e.clientX-drag.x, dy=locked?e.movementY:e.clientY-drag.y;
    yaw+=dx*.00235;pitch=clamp(pitch+dy*.00235,-1.34,1.34);
    if(drag){drag.x=e.clientX;drag.y=e.clientY;}
  }
  function up(e){
    if(drag?.id===e.pointerId)drag=null;
    if(touchWalk?.id===e.pointerId){touchWalk=null;touchX=touchY=0;}
  }
  window.addEventListener('keydown',press);window.addEventListener('keyup',release);window.addEventListener('blur',clear);
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
      if(clock-lastPositionUpdate>=120){onPosition(eye);lastPositionUpdate=clock;}
    }
    eye.y=EYE;
    camera.rotation.set(pitch,yaw,0);
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
      elapsed+=dt;frames++;frameTimes[frameIndex++%frameTimes.length]=ms;
      if(ms>36)slowTime+=Math.min(ms/1000,.24);else slowTime=Math.max(0,slowTime-dt*2);
      const qualityLimit=software?1.27:1.75;
      if(slowTime>(software?.55:1.0)&&quality<qualityLimit){quality=Math.min(qualityLimit,quality+.12);resize();slowTime=0;}
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
        peakBuildMs:peakBuild,totalBuildMs:totalBuild,quality};
    },
    dispose(){
      setActive(false);engine.stopRenderLoop(tick);observer.disconnect();
      window.removeEventListener('keydown',press);window.removeEventListener('keyup',release);window.removeEventListener('blur',clear);
      canvas.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',motion);
      window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);
      scene.dispose();engine.dispose();
    }
  };
}
