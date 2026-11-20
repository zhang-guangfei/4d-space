import {createRenderQuality,readRenderQualityMode,saveRenderQualityMode} from './render-quality.js';
import {installPortalScissors} from './portal-scissors.js';
import {doorCompass} from './door-compass.js';
import {createRouteMapView} from './route-map-view.js';
import {buildVisibleOpticalInstances} from './visible-optics.js';
import {GroundMotion,GroundGait} from './grounded-motion.js';
import {initialState,cellId,CELL_IDS,localPoint,canonicalFrame,worldToTangent,dot,H,cellNeighbors,normalFor} from './chapter-topology.js';
import {ChapterProgress} from './chapter-progress.js';
import {integrateSuitThrust,groundSpeed,advanceWithCollision,recoverCollision,upperEyeZ,viewBasis} from './chapter-motion.js';
import {LookController} from './look.js';
import {StationRenderer} from './station-renderer.js';
import {createHypothesisLab} from './hypotheses.js';
import {ROOM_MODELS,roomModel} from './model-content.js';
const B=window.BABYLON,$=id=>document.getElementById(id),canvas=$('world'),look=new LookController();
let engine,scene,camera,renderer,lab,ready=false,locked=false,keyboardCorridor=false,escapeReturnPending=false,labRoom=null,state=initialState(),progress=new ChapterProgress(),velocity=[0,0,0],keys=new Set(),time=0,sensitivity=1,gesture={left:-10,right:-10},ground=new GroundMotion(),gait=new GroundGait(),locomotion={leftLeg:0,rightLeg:0,crouchScale:1},jumpQueued=false,zoom=false,lastSeamMS=0,seamCount=0,lockTime=0,lastHUD=-1,autoplay=true,labTravel=0,debug=false,controlRequest=0,controlPending=false,controlCancelled=false,controlTimer=null;
state.p[2]=upperEyeZ(false);state.p[0]=-2.3;
const visitedRooms = new Set(['W+']);
const doorSlots = ['front','back','left','right','up','down'];
const mapPanel = $('routeMap');
const routeMap = mapPanel?.querySelector ? createRouteMapView(mapPanel) : null;
let compassSignature = '';
function syncCompass(p) {
 const compass=$('compass');
 if(!compass?.dataset)return;
 routeMap?.update(p);
 visitedRooms.add(id());
 const entries=doorCompass(state,viewBasis(look),p.phase);
 const signature=[p.phase,p.inspected.length,p.routeActive,p.routeComplete,visitedRooms.size,id(),...entries.map(d=>d.target+Math.min(p.counts[d.target],3))].join('|');
 if(signature===compassSignature)return;
 compassSignature=signature;
 entries.forEach((entry,i)=>{
  const slot=doorSlots[i], row=$('door-'+slot);
  row.dataset.open=String(entry.open);
  $('loc-'+slot).textContent=entry.target;
  $('condition-'+slot).textContent=!entry.open?'观测窗':
   p.phase==='upper'?(visitedRooms.has(entry.target)?'已通行':'通行'):'通行 '+Math.min(p.counts[entry.target],3)+'/3';
 });
 $('explored').textContent=p.phase==='upper'?'已踏入 '+visitedRooms.size+' 间':'已踏入 '+visitedRooms.size+' / 8 间';

}
function phase(){return progress.phase==='upper'?'upper':'lower';}
function id(){return cellId(state.normal);}
function isTruthRoom(room){return ROOM_MODELS[room]?.base==='colored-tesseract';}
function requiredModelRooms(){return Object.keys(ROOM_MODELS).filter(room=>!isTruthRoom(room));}
function truthAvailable(room){return !isTruthRoom(room)||progress.truthRevealed&&id()==='W+'&&progress.currentCell==='W+';}
// T leaves the corridor instruments interactive while the suit holds position.
let hudPointer=false;
let pointerFallback=false, enterWhenReady=true, resumeFreeLook=false;
const fieldBeats={
 arrival:['失散的两人','你们一同跌入异星文明留下的回声场。岑遥松开你的手，门后却多出一个人的背影。'],
 trace:['被记住的石像','玻璃后那尊雕像的断臂，和岑遥地球图册上的一模一样。她的图册还在你的航服里。'],
 last:['交叠的回声','维纳斯和大卫都从那本图册里来。这里似乎记住了你们认得的东西，却把它们放在彼此矛盾的位置。'],
 answer:['原点的折痕','三幅浮影重合时，来处亮起了第四种形状。建造者把相邻的关系刻进了它。'],
 survey:['失重的六个方向','脚下的重量消失了。岑遥的暗号时近时远，你的记录仪要在每间房深处取三次回声。'],
 ready:['一条不断的线','八处回声已经齐全。岑遥说：“把声音连起来。回到同一个地方，我就分不清哪声是你了。”'],
 route:['把她的声音连起来','你的记录仪正把脚步接成一条线。每响起一个新的房号，岑遥就离话筒更近一点。'],
 failed:['重叠的回声','相同的声音盖住了前一声。你仍然记得去过的地方，回到起点便能再试一次。'],
 home:['一只手的距离','岑遥的暗号只从 W+ 传来。原来那面空墙前，多了一颗映出回廊的银球。'],
 beyond:['边界之外','回声把你送到她留下的最后一个位置。']
};
function fieldBeat(p){
 if(p.phase==='ended')return fieldBeats.beyond;
 if(p.phase==='upper')return p.truthRevealed?fieldBeats.answer:p.inspected.length===2?fieldBeats.last:p.inspected.length===1?fieldBeats.trace:fieldBeats.arrival;
 if(p.routeComplete)return fieldBeats.home;
 if(p.routeActive)return fieldBeats.route;
 if(p.routeFailure)return fieldBeats.failed;
 return p.surveyComplete?fieldBeats.ready:fieldBeats.survey;
}
function setHUDText(element,value){
 const el=$(element);
 if(el.textContent!==value)el.textContent=value;
}
function updateHUD(){
 const p=progress.snapshot(),upper=p.phase==='upper',room=id();
 setHUDText('cell',room);
 const [stage,background]=fieldBeat(p);
 setHUDText('fieldStage',stage);
 setHUDText('fieldBackground',background);
 const phaseName=upper?'玻璃回廊':p.phase==='ended'?'边界之外':'六向回声';
 setHUDText('phaseTitle',`第一章 · 外壳上的迷宫　/　${phaseName}${debug||p.debugUsed?' · 测试模式':''}`);
 setHUDText('anchor',state.frame.map((v,i)=>`${['右','上','前'][i]} ${cellId(v)}`).join('  '));
 let objective;
 if(upper) {
  objective=p.truthRevealed?(room==='W+'?'查看新浮影，解开六向门。':'返回 W+ 查看新浮影。'):'沿通行的门，查验三种空间假说。';
 }else if(p.routeComplete) {
  objective='路线完成。W+ 出现了一枚镜面球，回去查看。';
 }else if(p.routeActive) {
  objective='路线挑战：连续走过八间不同的房间。';
 }else if(p.routeFailure) {
  objective=`你再次进入了 ${p.routeFailure.cell}。本次路线结束；回到 W+ 可以重试。已有记录保留。`;
 }else {
  objective=p.surveyComplete?'路线挑战已开放。回到 W+，尝试不重复地走过八间房。':'每间房间进入 3 次，记下八处回声。';
 }
 const cue=upper?(p.truthRevealed?'靠近 W+ 的新浮影，按 F 查看。':room==='W+'?'按 V 挥手，看看那个背影会怎样回应。':'靠近房间里的浮影，按 F 查看。'):
  p.routeComplete?'穿过 W+ 的银色镜面。':p.routeActive?'走到廊室里才登记。H 可查看走法。':
  p.surveyComplete?(room==='W+'?'按 R 从此处起步。':'找到通往 W+ 的门。'):'罗盘数字记录每间房的到访次数。';
 setHUDText('missionCue',cue);
 setHUDText('objective',objective);
 const routeLabel=p.routeComplete?'路线完成 ✓':p.routeActive?'本次路线':'路线待启动';
 setHUDText('route',upper||!(p.routeActive||p.routeFailure||p.routeComplete)?'':`${routeLabel} ${p.routeTrail.length}/8\n${p.routeTrail.join(' → ')}`);
 const records=requiredModelRooms().map(c=>roomModel(c).title+(progress.hasModel(roomModel(c).base)?' ✓':' ·')).join('  ');
 setHUDText('modelsProgress',upper?`假说记录 ${p.inspected.length}/3\n${records}`:
  `调查记录 ${Object.values(p.counts).reduce((sum,n)=>sum+Math.min(3,n),0)}/24`);
 let hint=upper?'WASD 行走 · Shift 跑步 · 按住 Space 跳起悬浮，松开下落 · Tab 望远镜 · F 模型 · 左/右键挥手':
  'W/S 视线喷气 · A/D 侧喷 · Shift 加速 · Space / Ctrl 身体上下 · Q/E 左右侧滚 · Tab 望远镜 · F 模型';
 setHUDText('movementHelp',upper?'WASD 行走 · 按住 Shift 跑步 · 按住 Space 跳起并悬浮，松开关闭喷气背包 · C 蹲下':
  'W/S 视线喷气 · A/D 侧喷 · 按住 Shift 加速 · 按住 Space 上喷 · Ctrl 下喷；松开停止喷气、继续漂移。按住 Q 头向左手侧滚，E 向右手侧滚，松开停止。身体跟随视角，可连续翻转；喷气方向随身体转动。');
 if(hudPointer)hint='指针已释放 · T 返回环视';
 else if(locked)hint+=' · T 释放鼠标';
 else if(keyboardCorridor&&!locked)hint='WASD 移动 · 方向键环视 · T 捕获鼠标 · Esc 设置';
 if(!ROOM_MODELS[room]||!truthAvailable(room))hint=hint.replace(' · F 模型','');
 setHUDText('hint',hint);
 renderer?.setTruthVisible?.(progress.truthRevealed);
 if(renderer)syncCompass(p);
 if(labRoom)refreshLabStatus();
}
function refreshLabStatus(){const isTruth=isTruthRoom(labRoom),atTruth=id()==='W+'&&progress.currentCell==='W+';$('inspectionStatus').textContent=isTruth?(progress.phase==='upper'?'浮影已重合。可以解开六向门，追踪回声。':'模型已查看。'):progress.hasModel(roomModel(labRoom||'X-').base)?'观察记录已保存。':'打开模型即可留下观察记录。';const showDoor=progress.phase==='upper'&&isTruth&&atTruth&&progress.truthRevealed;$('unlock').classList.toggle('hidden',!showDoor);$('unlock').disabled=!(showDoor&&progress.canUnlock);$('unlock').textContent='解开六向门';$('unlockHint').textContent=progress.phase!=='upper'?'':progress.truthRevealed?(atTruth?'查看新浮影，解开六向门。':'返回 W+ 查看新浮影。'):'沿通行的门，查验三种空间假说。';$('beginRoute').classList.toggle('hidden',progress.phase!=='lower'||progress.routeComplete);$('beginRoute').disabled=progress.routeActive||!progress.surveyComplete||id()!=='W+';$('beginRoute').textContent=progress.routeActive?'路线正在进行':progress.routeFailure?'从 W+ 重新开始路线':'从 W+ 开始不重复八胞路线';$('routeHelp').textContent=progress.phase==='lower'?'每间房间进入 3 次后，可从 W+ 开始路线挑战。走到房间深处才算抵达；再次进入走过的房间，本次路线就会结束。已有记录保留，可回 W+ 重试。':'';}
function clearMovementInput(){keys.clear();jumpQueued=false;ground.releaseJumpControl();}
function setZoom(value){zoom=!!value;if(camera)camera.fov=zoom?.28:1.16;$('binocular').classList.toggle('hidden',!zoom);}
function clearControlTimer(){if(controlTimer!==null)clearTimeout(controlTimer);controlTimer=null;}
let promisedLockRequest=null;
function cancelControlRequest(){controlCancelled=controlCancelled||controlPending;controlPending=false;controlRequest++;clearControlTimer();}
function pause(show=true){if(show)enterWhenReady=false;hudPointer=false;cancelControlRequest();keyboardCorridor=false;escapeReturnPending=false;locked=false;clearMovementInput();setZoom(false);look.transition();document.exitPointerLock?.();if(show&&!labRoom&&progress.phase!=='ended')$('menu').classList.remove('hidden');}
function controlFailure(){if(document.pointerLockElement===canvas)return;cancelControlRequest();locked=false;clearMovementInput();velocity=[0,0,0];if(!labRoom&&progress.phase!=='ended'){if(keyboardCorridor||hudPointer){$('menu').classList.add('hidden');updateHUD();}else{$('menu').classList.remove('hidden');$('start').textContent='继续探索';$('notice').textContent='未能锁定鼠标，请再次点击。若仍无反应，请检查浏览器的鼠标锁定权限。';}}}
function resumeCorridor(options={}){
 const {keyboardFallback=options.type==='click',escapeReturn=false}=options;
 if(!ready||labRoom||progress.phase==='ended')return;
 hudPointer=false;pointerFallback=keyboardFallback;keyboardCorridor=keyboardFallback;escapeReturnPending=escapeReturn;const request=++controlRequest;controlPending=true;controlCancelled=false;clearControlTimer();clearMovementInput();velocity=[0,0,0];look.transition();setZoom(false);$('notice').textContent='';$('menu').classList.add('hidden');
 const failed=()=>{if(request===controlRequest)controlFailure();};
 // A missing event/rejected permission must never leave an invisible pause trap.
 controlTimer=setTimeout(()=>{if(request===controlRequest&&document.pointerLockElement!==canvas)controlFailure();},2500);
 try{
  canvas.focus();
  // This first request runs synchronously inside the original click activation.
  let result;try{result=canvas.requestPointerLock({unadjustedMovement:true});}catch(e){if(e.name==='NotSupportedError')result=canvas.requestPointerLock();else throw e;}
  promisedLockRequest=result&&typeof result.then==='function'?request:null;
  Promise.resolve(result).catch(e=>{if(request!==controlRequest)return;if(e.name==='NotSupportedError')return canvas.requestPointerLock();throw e;}).catch(failed);
 }catch(e){failed();}
}
function closeLab({resume=false,keyboardFallback=false,escapeReturn=false}={}){
 if(!labRoom)return;
 labRoom=null;
 const closingLab=lab;
 lab=null;
 clearMovementInput();velocity=[0,0,0];
 $('console').classList.add('hidden');$('menu').classList.toggle('hidden',resume);
 $('start').textContent='继续探索';
 // Release the instrument's input handlers before the corridor owns the pointer.
 try{closingLab?.dispose();}
 finally{
  if(resume){
   if(resumeFreeLook)walkIntoField();
   else resumeCorridor({keyboardFallback,escapeReturn});
  }
 }
}
function openLab(room=id()){if(!ROOM_MODELS[room]||!ready||progress.phase==='ended'||!truthAvailable(room))return;if(!labRoom)resumeFreeLook=keyboardCorridor&&!locked&&!pointerFallback;const selected=roomModel(room);if(isTruthRoom(room))progress.viewTruth(room);else progress.inspectModel(selected.base);pause(false);labRoom=room;autoplay=!(isTruthRoom(room)&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);labTravel=0;$('modelPlay').textContent=autoplay?'暂停演示':'继续演示';$('menu').classList.add('hidden');$('console').classList.remove('hidden');const c=roomModel(room);$('modelRoom').textContent=`${room} / 回声场浮影`;$('modelTitle').textContent=c.title;$('modelExplanation').textContent=c.explanation;$('modelPrediction').textContent=c.prediction;$('modelLimitation').textContent=c.limitation;$('modelExperiment').textContent=c.experiment;$('modelColorNote').textContent=c.base==='central-hall'?'白、红、黄、橙标记沿途房间；蓝色标记左侧的中央大厅。颜色相同，未必就能确定是同一处。':'白、红、黄、橙标记沿途房间；蓝色在左，绿色在右。颜色相同，未必就能确定是同一处。';$('travel').value='0';$('travelValue').textContent='0.00';if(!lab)lab=createHypothesisLab(B,$('labCanvas'),cell=>{progress.inspectModel(cell);updateHUD();});lab.selectRoom(room);lab.setAnimationTravel(0);lab.resize();$('truthTools').classList.toggle('hidden',!isTruthRoom(room));$('travelLabel').textContent=isTruthRoom(room)?'旋转进度（每格 −90°）':'演示位置';if(isTruthRoom(room)){lab.resetView?.();lab.setColoredCell('W+');lab.setColoredPlane('XW');$('truthCell').value='W+';$('truthPlane').value='XW';updateTruthReadout();}$('modelIndex').replaceChildren();for(let cell of [...requiredModelRooms(),...(progress.truthRevealed&&id()==='W+'?['W+']:[])]){let button=document.createElement('button');button.textContent=roomModel(cell).title+(isTruthRoom(cell)?'':progress.hasModel(roomModel(cell).base)?' ✓':'');button.disabled=false;button.onclick=()=>openLab(cell);$('modelIndex').appendChild(button);}updateHUD();refreshLabStatus();}
// The first frame and every phase transition accept walking and arrow-key
// look without asking the browser for a pointer lock. Capture stays opt-in.
function walkIntoField(){
 enterWhenReady=false;
 hudPointer=false;pointerFallback=false;keyboardCorridor=true;escapeReturnPending=false;
 clearMovementInput();look.transition();$('menu').classList.add('hidden');
 if(!document.hidden)canvas.focus?.({preventScroll:true});
 updateHUD();
}
function fieldReady(){
 ready=true;canvas.setAttribute?.('data-ready','true');$('start').disabled=false;
 $('start').textContent='继续探索';
 if(!enterWhenReady)$('menu').classList.remove('hidden');
 else if(!document.hidden)walkIntoField();
}
function suspendWhenAway(){
 if(!enterWhenReady||locked||keyboardCorridor||labRoom)pause();
}
function onFieldVisibility(){
 if(document.hidden)suspendWhenAway();
 else if(ready&&enterWhenReady)walkIntoField();
}
function reset(){visitedRooms.clear();compassSignature='';pause(false);lab?.dispose();lab=null;labRoom=null;state=initialState();state.p[2]=upperEyeZ(false);state.p[0]=-2.3;progress=new ChapterProgress();velocity=[0,0,0];ground.reset();gait.reset();jumpQueued=false;setZoom(false);look.reset();gesture={left:-10,right:-10};debug=false;$('console').classList.add('hidden');$('ending').classList.add('hidden');$('menu').classList.remove('hidden');renderer.rebuild(state,'upper');walkIntoField();}
async function lower(){if(!isTruthRoom(labRoom)||!truthAvailable(labRoom)||!progress.unlockLower(id(),time))return;velocity=[0,0,0];state=recoverCollision(state,velocity,'lower').state;closeLab();ready=false;enterWhenReady=true;canvas.setAttribute?.('data-ready','false');$('start').disabled=true;$('menu').classList.add('hidden');$('notice').textContent='';updateHUD();await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));renderer.rebuild(state,'lower');scene.executeWhenReady(fieldReady);}

function finish(){if(!progress.enterBubble(id()))return;pause(false);velocity=[0,0,0];$('menu').classList.add('hidden');$('ending').classList.remove('hidden');updateHUD();}
try{
 const visibleOnly=canvas.dataset?.residency==='visible';
 engine=new B.Engine(canvas,false,{stencil:false,preserveDrawingBuffer:false,audioEngine:false,powerPreference:'high-performance'});
 const glInfo=engine.getGlInfo?.()||{};
 const software=/swiftshader|llvmpipe|software raster/i.test(glInfo.renderer||'');
 const quality=visibleOnly?createRenderQuality({software}):null;
 const resolution=$('resolution');
 if(visibleOnly)resolution.value=readRenderQualityMode();
 function sizeViewport(){
  if(!visibleOnly){
   engine.setHardwareScalingLevel(1/Math.min(Math.max(window.devicePixelRatio||1,1),1.5));
  }else{
   engine.setHardwareScalingLevel(quality.scale(canvas.clientWidth,canvas.clientHeight,window.devicePixelRatio,resolution.value));
  }
  if(renderer)renderer.nativeQuality=resolution.value!=='auto';
  engine.resize?.();
 }
 resolution.onchange=()=>{if(visibleOnly)saveRenderQualityMode(resolution.value);sizeViewport();};
 sizeViewport();scene=new B.Scene(engine);scene.clearColor=new B.Color4(.58,.64,.66,1);camera=new B.UniversalCamera('astronaut eyes',new B.Vector3(...localPoint(state)),scene);camera.inputs.clear();camera.fov=1.16;camera.minZ=.045;camera.maxZ=80;renderer=new StationRenderer(B,scene,{visibleOnly,software});
 renderer.nativeQuality=resolution.value!=='auto';
 const selectView=(chart,mode)=>buildVisibleOpticalInstances(chart,mode,look,{fov:camera.fov,aspect:engine.getRenderWidth()/engine.getRenderHeight()});
 if(visibleOnly)renderer.selectView=selectView;
 renderer.rebuild(state,'upper');
 const prepareScissors=visibleOnly?installPortalScissors(engine,scene):null;
 const lastView=new Float64Array(18).fill(NaN);
 const view=new Float64Array(18);
 let latestPreview=-Infinity,playingFps=0;
 window.addEventListener('resize',sizeViewport);
 scene.executeWhenReady(fieldReady);
 engine.runRenderLoop(()=>{
 const frameMs=engine.getDeltaTime();
 if(ready&&(locked||keyboardCorridor)&&quality&&resolution.value==='auto'&&quality.sample(frameMs))sizeViewport();
 let dt=Math.min(frameMs/1000,.05);time+=dt;let changed=false;look.setFree(phase()==='lower');
 if((locked||keyboardCorridor)&&ready&&progress.phase!=='ended'){
  look.pendingX+=1.55*dt*(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')));
  look.pendingY+=1.25*dt*(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')));
  look.frame(dt,Number(keys.has('KeyQ'))-Number(keys.has('KeyE')));look.applyCamera(B,camera);const up=phase()==='upper',sprinting=keys.has('ShiftLeft')||keys.has('ShiftRight');
  let beforeP=[...state.p];let strafe=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),rise=Number(keys.has('Space'))-Number(keys.has('ControlLeft')||keys.has('ControlRight')),displacement;
  if(up){let len=Math.hypot(strafe,forward)||1;strafe/=len;forward/=len;let speed=groundSpeed(keys.has('KeyC'),sprinting);let fall=ground.step(dt,jumpQueued,keys.has('KeyC'),keys.has('Space'));jumpQueued=false;velocity=[(Math.cos(look.yaw)*strafe+Math.sin(look.yaw)*forward)*speed,fall.verticalVelocity,(-Math.sin(look.yaw)*strafe+Math.cos(look.yaw)*forward)*speed];displacement=[velocity[0]*dt,fall.eyeZ-state.p[2],velocity[2]*dt];}
  else{let integrated=integrateSuitThrust(velocity,[strafe,rise,forward],look,0,dt,sprinting);velocity=integrated.velocity;displacement=integrated.displacement;}
  let moved=advanceWithCollision(state,velocity,displacement,up?'upper':'lower');state=moved.state;velocity=moved.velocity;if(up&&Math.abs(state.p[2]-ground.eyeZ)>1e-7){ground.eyeZ=state.p[2];ground.footLift=Math.max(0,ground.eyeZ+H-1.68);ground.verticalVelocity=velocity[1];ground.airborne=ground.footLift>1e-8||ground.verticalVelocity>0;}let actualDistance=Math.hypot(...state.p.map((v,i)=>i===2?0:v-beforeP[i]));locomotion={...gait.step(actualDistance,dt,actualDistance/Math.max(dt,.001),up&&ground.airborne,!up),crouchScale:up&&keys.has('KeyC')&&!ground.airborne?1.15/1.68:1};
  for(let seam of moved.crossings){progress.onCross(cellId(seam.to),time);changed=true;}
  if(changed){let cpuStart=performance.now();renderer.rebuild(state,phase());lastSeamMS=performance.now()-cpuStart;seamCount+=moved.crossings.length;}
  let q=localPoint(state),depth=Math.min(...q.map(v=>H-Math.abs(v)));if(progress.updateInterior(id(),depth,time))changed=true;
  if(progress.bubbleVisible(id())){let cf=canonicalFrame(state.normal),p=worldToTangent(cf,state.p);if(Math.hypot(p[0]-1.55,p[1]+.1,p[2])<1.15)finish();}
 }
 const now=performance.now();
 const drawWorld=!visibleOnly||(!labRoom&&(locked||keyboardCorridor||now-latestPreview>210));
 if(drawWorld){
 latestPreview=now;
 look.applyCamera(B,camera);camera.position.set(...localPoint(state));
 view.set(state.p,0);view.set(state.normal,4);view.set(look.quaternion,8);
 view[12]=look.yaw;view[13]=look.pitch;view[14]=camera.fov;view[15]=engine.getRenderWidth();view[16]=engine.getRenderHeight();view[17]=phase()==='lower'?1:0;
 if(!renderer.visibleSignature||view.some((value,i)=>value!==lastView[i])){
  const visible=selectView(state,phase()),signature=phase()+visible.map(x=>x.key).join('|');
  if(signature!==renderer.visibleSignature)renderer.rebuild(state,phase(),visible);
  if(software&&visibleOnly)for(let i=0;i<visible.length;i++)renderer.setShellDetail(renderer.instances[i],visible[i],zoom);
  prepareScissors?.(renderer.instances,visible);
  lastView.set(view);
 }
 renderer.setTruthVisible(progress.truthRevealed);renderer.update(state,look,phase(),time,gesture,progress.routeComplete&&progress.phase==='lower',{...locomotion,hideLocal:zoom});
 scene.render();
 }
 if(lab&&autoplay){labTravel=(labTravel+dt*(isTruthRoom(labRoom)?1/3.36:.24))%4;let travel=labTravel;lab.setAnimationTravel(travel);$('travel').value=String(travel);$('travelValue').textContent=travel.toFixed(2);}
 if(changed||time-lastHUD>.2){lastHUD=time;updateHUD();if(locked||keyboardCorridor)playingFps=Math.round(engine.getFps());$('stats').textContent=`${Math.round(engine.getFps())} FPS · ${locked?(zoom?'望远镜':'鼠标锁定'):hudPointer?'自由指针 · T 返回':keyboardCorridor?'自由探索':'暂停'}`;$('perfdiag').textContent=`3D 画面 ${engine.getRenderWidth()} × ${engine.getRenderHeight()} · ${playingFps?playingFps+' FPS（游玩）':'等待游玩采样'} · 跨门 CPU ${lastSeamMS.toFixed(2)}ms（${seamCount} 次）；网格 ${scene.meshes.length} / 材质 ${scene.materials.length}。数据仅在本机显示。`;$('lookdiag').textContent=`视角输入：最大包 ${Math.round(look.maxPacket)} px；异常包 ${look.filtered}；速度 ${Math.hypot(...velocity).toFixed(1)} m/s`;}
 });
}catch(e){$('menu').classList.remove('hidden');$('notice').textContent='无法启动实时 3D：'+e.message;$('start').textContent='此浏览器需要可用的 WebGL';console.error(e);}
$('start').onclick=resumeCorridor;
document.addEventListener('pointerlockchange',()=>{const acquired=document.pointerLockElement===canvas;if(acquired&&(controlCancelled||hudPointer||labRoom||document.hidden||progress.phase==='ended')){locked=false;document.exitPointerLock?.();return;}locked=acquired;if(locked){if(!escapeReturnPending)keyboardCorridor=false;controlPending=false;controlCancelled=false;clearControlTimer();}clearMovementInput();look.transition();if(!locked)setZoom(false);lockTime=time;$('menu').classList.toggle('hidden',locked||hudPointer||keyboardCorridor||controlPending||!!labRoom||progress.phase==='ended');$('start').textContent='继续探索';});document.addEventListener('pointerlockerror',()=>{
 // The raw-input promise may reject and dispatch this event while its regular
 // pointer-lock retry is in flight. Only legacy void APIs need the event.
 if(controlPending&&promisedLockRequest!==controlRequest)controlFailure();
});document.addEventListener('mousemove',e=>{
 // Escape can revoke pointer lock after closing the model. In that explicit
 // corridor mode, ordinary canvas mouse motion must still control the view.
 // Never call it locked, and never turn while over UI, outside, or paused.
 if(!locked&&(!keyboardCorridor||!pointerFallback||e.target!==canvas||labRoom||document.hidden)){look.transition();return;}
 look.push(e.movementX,e.movementY,sensitivity*(zoom?Math.tan(.28/2)/Math.tan(1.16/2):1));
});
canvas.addEventListener('mouseleave',()=>{if(!locked)look.transition();});
document.addEventListener('mousedown',e=>{if((hudPointer||keyboardCorridor)&&!locked&&e.target===canvas){resumeCorridor({keyboardFallback:true});if(locked)keyboardCorridor=false;return;}if(!locked||time-lockTime<.2)return;if(e.button===0)gesture.left=time;if(e.button===2)gesture.right=time;});canvas.addEventListener('contextmenu',e=>{if(locked)e.preventDefault();});
function isGameUI(target){return ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(target?.tagName)||target?.isContentEditable;}
document.addEventListener('focusin',e=>{if(isGameUI(e.target)){clearMovementInput();look.transition();}});
document.addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault?.();if(e.repeat)return;if(labRoom)closeLab({resume:true,keyboardFallback:true,escapeReturn:true});else pause();return;}
 if((e.code==='KeyT'||e.code==='KeyH')&&!e.altKey&&!e.metaKey&&!e.ctrlKey&&!labRoom&&!document.hidden&&(locked||document.pointerLockElement===canvas||keyboardCorridor||hudPointer)){
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
  if(e.code==='KeyH'){
   if(!e.repeat&&!e.shiftKey&&routeMap?.toggleHint())e.preventDefault();
   return;
  }
  e.preventDefault();if(e.repeat)return;
  if(!locked&&document.pointerLockElement!==canvas)resumeCorridor({keyboardFallback:true});
  else{
   cancelControlRequest();hudPointer=true;keyboardCorridor=false;locked=false;
   clearMovementInput();velocity=[0,0,0];setZoom(false);look.transition();document.exitPointerLock?.();
   updateHUD();
  }
  return;
 }
 if(!locked&&!keyboardCorridor)return;
 if(labRoom||document.hidden||isGameUI(e.target)){clearMovementInput();return;}
 // Leave browser/OS shortcuts alone, including Ctrl+Tab; only plain game Tab
 // is captured. Ctrl itself remains the lower chapter's downward jet.
 if(e.altKey||e.metaKey||(e.ctrlKey&&e.code==='Tab'))return;
 if(e.code==='KeyR'&&!e.repeat&&!e.ctrlKey&&!e.shiftKey&&ready&&progress.surveyComplete&&!progress.routeActive&&progress.startRoute(id(),time)){
  e.preventDefault();updateHUD();return;
 }
 if(e.code==='KeyV'&&!e.repeat&&!e.ctrlKey){e.preventDefault();gesture.left=time;return;}
 if(e.code==='Tab'){e.preventDefault();if(!e.repeat)setZoom(!zoom);return;}
 const rollKey=phase()==='lower'&&['KeyQ','KeyE'].includes(e.code);
 const moveKey=['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','ControlLeft','ControlRight','ShiftLeft','ShiftRight'].includes(e.code)||rollKey||(e.code==='KeyC'&&phase()==='upper');
 if(moveKey){
  e.preventDefault();
  if(e.repeat&&!keys.has(e.code))return;
  if(e.code==='Space'&&phase()==='upper'&&!e.repeat&&!keys.has('Space'))jumpQueued=true;
  keys.add(e.code);
  return;
 }
 if(e.code==='KeyF'&&!e.repeat&&Math.hypot(...localPoint(state))<4.8){e.preventDefault();openLab();}
});document.addEventListener('keyup',e=>{if(e.code==='Escape'){escapeReturnPending=false;if(locked)keyboardCorridor=false;}keys.delete(e.code);if(e.code==='Space')ground.releaseJumpControl();});window.addEventListener('blur',suspendWhenAway);document.addEventListener('visibilitychange',onFieldVisibility);$('pause').onclick=()=>pause();$('closeLab').onclick=()=>closeLab({resume:true});$('travel').oninput=e=>{autoplay=false;$('modelPlay').textContent='继续演示';labTravel=+e.target.value;lab?.setTravel(labTravel);$('travelValue').textContent=(+e.target.value).toFixed(2);};$('unlock').onclick=lower;$('beginRoute').onclick=()=>{if(progress.startRoute(id(),time)){refreshLabStatus();updateHUD();}};$('sensitivity').oninput=e=>{sensitivity=+e.target.value;$('sensvalue').textContent=sensitivity.toFixed(1)+'×';};$('reset').onclick=()=>{if(ready)reset();};
$('debugLower').onclick=()=>{if(!ready)return;clearMovementInput();debug=true;ground.reset();gait.reset();state=initialState();state.p[2]=upperEyeZ(false);progress.currentCell='W+';progress.loopComplete=true;for(let c of ['central-hall','treadmill','sphere'])progress.inspectModel(c);progress.viewTruth('W+');progress.unlockLower('W+',time);velocity=[0,0,0];look.reset();renderer.rebuild(state,'lower');updateHUD();$('notice').textContent='测试模式：已跳过当前阶段。';};$('debugEnd').onclick=()=>{if(!ready)return;clearMovementInput();if(progress.phase==='upper')$('debugLower').onclick();debug=true;progress.debugCompleteRoute();progress.debugInspectAll();state=initialState();state.p[0]=-2.6;progress.currentCell='W+';velocity=[0,0,0];look.reset();renderer.rebuild(state,'lower');updateHUD();$('notice').textContent='测试模式：W+ 镜面球已出现。';};$('returnExplore').onclick=()=>{clearMovementInput();progress.phase='lower';progress.completed=false;state=initialState();state.p[0]=-2.6;progress.currentCell='W+';velocity=[0,0,0];look.reset();renderer.rebuild(state,'lower');$('ending').classList.add('hidden');walkIntoField();};window.addEventListener('resize',()=>{engine?.resize();lab?.resize();});updateHUD();

$('modelPlay').onclick=()=>{if(!lab)return;autoplay=!autoplay;$('modelPlay').textContent=autoplay?'暂停演示':'继续演示';};$('modelReset').onclick=()=>{if(!lab)return;labTravel=0;autoplay=false;if(roomModel(labRoom).base==='treadmill')lab.resetView?.();if(isTruthRoom(labRoom)){lab.setColoredPlane('XW');lab.setColoredCell('W+');lab.resetView?.();$('truthPlane').value='XW';$('truthCell').value='W+';updateTruthReadout();}lab.setAnimationTravel(0);$('travel').value='0';$('travelValue').textContent='0.00';$('modelPlay').textContent='继续演示';};

function updateTruthReadout(){if(!lab||!isTruthRoom(labRoom))return;const s=lab.getColoredState();$('truthLegend').replaceChildren();for(const c of lab.models['colored-tesseract'].colored.geometry.cells){const b=document.createElement('button');b.textContent=(c.id===s.selected?'● ':'')+c.id;b.setAttribute('style',`border-left:8px solid ${c.color};margin:3px;padding:5px 9px`);b.onclick=()=>{$('truthCell').value=c.id;lab.setColoredCell(c.id);updateTruthReadout();};$('truthLegend').appendChild(b);}$('truthNeighbors').textContent=`模型中，${s.selected} 的六个邻胞：${cellNeighbors(normalFor(s.selected)).map(cellId).join('、')}；同轴反号胞不相邻。旋转平面：${s.plane}。${s.plane==='XW'?'中央人物是步行参照。':'实验模式：人物随 W− 房间投影。'}`;}
$('truthCell').onchange=e=>{lab?.setColoredCell(e.target.value);updateTruthReadout();};$('truthPlane').onchange=e=>{lab?.setColoredPlane(e.target.value);updateTruthReadout();};
