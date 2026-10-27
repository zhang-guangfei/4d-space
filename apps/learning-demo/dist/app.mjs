import {AXES,PLANES,vertices,edges,squares,cells,rotate4,project4,slice4} from './geometry.mjs';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),wrap=$('canvasWrap');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const state={angles:[0,0,0,0,0,0],mode:'projection',projection:'perspective',selectedCell:7,showCell:true,showVertices:true,showGrid:true,playing:false,active:3,advanced:false,cameraEnabled:false,speed:Math.PI/30,sliceLevel:0,yaw:-.52,pitch:.3,zoom:1};
let width=0,height=0,dpr=1,dirty=true,lastTime=0,frameCount=0,sliceSignature='',drag=null,toastTimer;
const planeNames=PLANES.map(([a,b])=>AXES[a]+AXES[b]);
for(const i of [3,4,5,0,1,2]){
 const row=document.createElement('div');row.className='rotation-row';
 row.innerHTML=`<label for="rot${i}">${planeNames[i]}</label><input id="rot${i}" type="range" min="-180" max="180" value="0" step="1" aria-label="${planeNames[i]} 平面四维旋转角度"><output id="val${i}" for="rot${i}">0°</output>`;
 $(i<3?'extraControls':'rotationControls').append(row);
 $('rot'+i).addEventListener('input',e=>{pause();state.advanced=true;state.angles[i]=Number(e.target.value)*Math.PI/180;syncAngles();dirty=true;});
}
for(let i=0;i<8;i++){
 const c=cells[i],b=document.createElement('button');b.textContent=AXES[c.axis]+(c.sign>0?' +':' −');b.setAttribute('aria-label',`高亮 ${c.name} 的立方体胞`);b.setAttribute('aria-pressed',String(i===7));b.classList.toggle('selected',i===7);b.addEventListener('click',()=>{state.selectedCell=i;state.showCell=true;$('showCell').checked=true;syncCell();dirty=true});$('cellGrid').append(b);
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3300)}
function normalize(a){return ((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI}
function syncAngles(){state.angles.forEach((a,i)=>{const deg=Math.round(normalize(a)*180/Math.PI);$('rot'+i).value=deg;$('val'+i).textContent=deg+'°'});syncLearning()}
function syncPlay(){$('playPause').setAttribute('aria-pressed',String(state.playing));$('playIcon').textContent=state.playing?'Ⅱ':'▷';$('playText').textContent=state.playing?'立即暂停':'慢速演示'}
function pause(){state.playing=false;syncPlay();syncLearning()}
function syncCell(){const c=cells[state.selectedCell];[...$('cellGrid').children].forEach((b,i)=>{b.classList.toggle('selected',i===state.selectedCell&&state.showCell);b.setAttribute('aria-pressed',String(i===state.selectedCell&&state.showCell))});$('cellLegend').textContent=c.name+' 胞';$('cellHelp').textContent=`旋转前该胞固定 ${c.name}，其余三个坐标自由变化；旋转后仍追踪同一个胞。每个胞有 8 个顶点、12 条棱、6 个面。`;$('sceneLegend').children[1].hidden=!state.showCell;}
function resetCamera(){state.yaw=-.52;state.pitch=.3;state.zoom=1;dirty=true}
function resetAll(){state.advanced=false;$('advanced').open=false;state.cameraEnabled=false;syncCamera();pause();state.advanced=false;$('advanced').open=false;state.angles.fill(0);state.sliceLevel=0;$('sliceLevel').value='0';syncSlice();syncAngles();resetCamera();toast('已恢复初始姿态，四维旋转已暂停')}
function syncSlice(){$('sliceOutput').textContent=`w = ${state.sliceLevel.toFixed(2)}`;dirty=true}
function setMode(mode){pause();state.mode=mode;const slicing=mode==='slice';$('projectionMode').classList.toggle('selected',!slicing);$('projectionMode').setAttribute('aria-pressed',String(!slicing));$('sliceMode').classList.toggle('selected',slicing);$('sliceMode').setAttribute('aria-pressed',String(slicing));$('projectionControls').hidden=slicing;$('cellSection').hidden=slicing;$('sliceControls').hidden=!slicing;$('sceneLegend').hidden=slicing;$('guided').hidden=slicing;$('sceneName').innerHTML=slicing?'三维切片 <span>Cross-section</span>':'超立方体 <span>Tesseract</span>';$('modeFormula').textContent=slicing?'(x, y, z, w) ∩ {w = 常数}':'(x, y, z, w) → (x′, y′, z′)';$('sceneTag').textContent=slicing?'真实三维交集':state.projection==='perspective'?'四维透视投影':'四维正交投影';$('observation').textContent=slicing?'这不是投影。只显示与 w = 常数相交的部分；同一个超立方体，改变姿态与切片位置，就会得到不同形状。':'金色部分是完整的一个立方体胞。投影看起来会变形，但四维空间中的棱长与直角始终不变。';canvas.setAttribute('aria-label',slicing?'旋转后的四维超立方体与 w 等于常数的三维超平面的真实交集。开启观察后可拖动或用方向键改变三维相机，右侧调节切片位置。':'四维超立方体的三维投影。拖动或方向键改变三维相机，滚轮或加减键缩放。右侧控制四维旋转。');dirty=true;}
function setProjection(type){state.projection=type;for(const id of ['perspective','orthographic']){$(id).classList.toggle('selected',id===type);$(id).setAttribute('aria-pressed',String(id===type))}$('projectionHelp').textContent=type==='perspective'?'沿 W 方向的远近影响投影大小。看似一大一小的两个立方体，在四维中同样大。':'忽略 W 坐标，保留旋转后的 X、Y、Z。未旋转时，两组顶点完全重叠，看起来就是一个立方体。';$('sceneTag').textContent=type==='perspective'?'四维透视投影':'四维正交投影';dirty=true;}
$('playPause').addEventListener('click',()=>{if(state.advanced)return;state.cameraEnabled=false;syncCamera();state.playing=!state.playing;syncPlay();syncLearning();dirty=true});$('resetAll').addEventListener('click',resetAll);$('cameraReset').addEventListener('click',()=>{resetCamera();toast('仅恢复三维相机，四维姿态保持不变')});

$('projectionMode').addEventListener('click',()=>setMode('projection'));$('sliceMode').addEventListener('click',()=>{pause();setMode('slice')});
$('perspective').addEventListener('click',()=>setProjection('perspective'));$('orthographic').addEventListener('click',()=>setProjection('orthographic'));
$('showCell').addEventListener('change',e=>{state.showCell=e.target.checked;syncCell();dirty=true});
for(const id of ['showVertices','showGrid'])$(id).addEventListener('change',e=>{state[id]=e.target.checked;dirty=true});
$('sliceLevel').addEventListener('input',e=>{pause();state.sliceLevel=Number(e.target.value);syncSlice()});
$('cubeSlice').addEventListener('click',()=>{pause();state.advanced=false;$('advanced').open=false;state.angles.fill(0);state.sliceLevel=0;$('sliceLevel').value='0';syncAngles();syncSlice();toast('轴对齐：中央切片是立方体。移动 w，观察它何时消失。')});
$('octaSlice').addEventListener('click',()=>{pause();state.advanced=true;$('advanced').open=true;state.angles=[0,0,0,Math.PI/4,Math.asin(1/Math.sqrt(3)),Math.PI/6];state.sliceLevel=0;$('sliceLevel').value='0';syncAngles();syncSlice();toast('对角中央切片：6 个顶点、8 个三角形面，构成正八面体。')});
$('guided').addEventListener('click',()=>{pause();state.advanced=false;$('advanced').open=false;state.angles.fill(0);state.angles[state.active]=Math.PI/2;syncAngles();dirty=true;toast('已在当前所选平面设为 90°。这是四维姿态变化，不是相机移动。')});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('lab').requestFullscreen)await $('lab').requestFullscreen();else toast('当前浏览器不支持全屏，可横屏获得更大视野。')}catch{toast('当前浏览器未允许全屏，可横屏获得更大视野。')}});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)pause()});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!state.cameraEnabled)return;pause();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;state.yaw+=(e.clientX-drag.x)*.008;state.pitch=Math.max(-1.4,Math.min(1.4,state.pitch+(e.clientY-drag.y)*.008));drag.x=e.clientX;drag.y=e.clientY;dirty=true});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>drag=null);
canvas.addEventListener('wheel',e=>{if(!state.cameraEnabled)return;e.preventDefault();state.zoom=Math.min(1.7,Math.max(.55,state.zoom*Math.exp(-e.deltaY*.001)));dirty=true},{passive:false});
canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){pause();return}if(!state.cameraEnabled)return;let handled=true;switch(e.key){case'ArrowLeft':state.yaw-=.08;break;case'ArrowRight':state.yaw+=.08;break;case'ArrowUp':state.pitch=Math.max(-1.4,state.pitch-.08);break;case'ArrowDown':state.pitch=Math.min(1.4,state.pitch+.08);break;case'+':case'=':state.zoom=Math.min(1.7,state.zoom*1.1);break;case'-':state.zoom=Math.max(.55,state.zoom/1.1);break;case' ':pause();break;case'Home':resetCamera();break;default:handled=false}if(handled){e.preventDefault();dirty=true}});
const observer=new ResizeObserver(()=>{const bounds=wrap.getBoundingClientRect();width=bounds.width;height=bounds.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);dirty=true});observer.observe(wrap);
function camera(p){const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);const x=p[0]*cy-p[2]*sy,z0=p[0]*sy+p[2]*cy,y=p[1]*cp-z0*sp,z=p[1]*sp+z0*cp;const perspective=7.5/(7.5-z);const scale=Math.min(width/6.4,height/5.5)*state.zoom;return [width/2+x*scale*perspective,height*.51-y*scale*perspective,z,perspective]}
function line(a,b,color,lineWidth=1,dash=[]){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])}
function polygon(ids,points,color,stroke){ctx.beginPath();ids.forEach((i,k)=>{const p=points[i];k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke()}}
function grid(){if(!state.showGrid)return;for(let k=-5;k<=5;k++){const alpha=k===0?.2:.085;line(camera([-5,-2.05,k]),camera([5,-2.05,k]),`rgba(112,156,179,${alpha})`,.7);line(camera([k,-2.05,-5]),camera([k,-2.05,5]),`rgba(112,156,179,${alpha})`,.7)}const o=camera([-2.6,-2.05,-2.4]);const axes=[{v:[-1.7,-2.05,-2.4],c:'#a6bcc7',l:'X'},{v:[-2.6,-1.15,-2.4],c:'#8eb8ad',l:'Y'},{v:[-2.6,-2.05,-1.5],c:'#7f9fbd',l:'Z'}];ctx.font='9px monospace';for(const axis of axes){const p=camera(axis.v);line(o,p,axis.c,.9);ctx.fillStyle=axis.c;ctx.fillText(axis.l,p[0]+5,p[1]+3)}}
function renderProjection(rotated){const projected=rotated.map(v=>project4(v,state.projection)),screen=projected.map(camera),cell=cells[state.selectedCell];
 if(state.showCell){const sorted=[...cell.faces].sort((a,b)=>a.reduce((s,i)=>s+screen[i][2],0)-b.reduce((s,i)=>s+screen[i][2],0));for(const f of sorted)polygon(f,screen,'rgba(242,196,136,0.055)')}
 const sortedEdges=[...edges].sort((a,b)=>(screen[a[0]][2]+screen[a[1]][2])-(screen[b[0]][2]+screen[b[1]][2]));
 for(const [a,b] of sortedEdges){const selected=state.showCell&&cell.vertices.includes(a)&&cell.vertices.includes(b),depth=(screen[a][2]+screen[b][2])/2;const alpha=Math.max(.3,Math.min(.92,.61+depth*.1));ctx.shadowColor=selected?'#f2c488':'#78e6e0';ctx.shadowBlur=selected?7:3;line(screen[a],screen[b],selected?`rgba(242,196,136,${Math.min(1,alpha+.2)})`:`rgba(124,232,223,${alpha})`,selected?1.85:1.1);ctx.shadowBlur=0;}
 if(state.showVertices){screen.map((p,i)=>({p,i})).sort((a,b)=>a.p[2]-b.p[2]).forEach(({p,i})=>{const selected=state.showCell&&cell.vertices.includes(i);ctx.beginPath();ctx.arc(p[0],p[1],selected?2.7:2.1,0,Math.PI*2);ctx.fillStyle=selected?'#ffe0ad':'#a5f6ee';ctx.fill();})}
 const p=screen[15];ctx.beginPath();ctx.arc(p[0],p[1],6,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText('P',p[0]+10,p[1]-8);
 $('canvasDetail').textContent='16 个顶点 · 32 条棱';
}
function renderSlice(rotated){const section=slice4(rotated,state.sliceLevel),screen=section.vertices.map(camera);const ordered=[...section.faces].sort((a,b)=>a.reduce((s,i)=>s+screen[i][2],0)/a.length-b.reduce((s,i)=>s+screen[i][2],0)/b.length);for(const f of ordered)polygon(f,screen,'rgba(124,232,223,0.07)');
 for(const [a,b] of section.edges){ctx.shadowBlur=5;ctx.shadowColor='#7ce8df';line(screen[a],screen[b],'rgba(145,244,230,.88)',1.6);ctx.shadowBlur=0}
 if(state.showVertices)for(const p of screen){ctx.beginPath();ctx.arc(p[0],p[1],3,0,Math.PI*2);ctx.fillStyle='#c0fff1';ctx.fill()}
 const count=section.vertices.length,signature=[count,section.edges.length,section.faces.length].join(',');
 if(signature!==sliceSignature){sliceSignature=signature;const suffix=count===0?'空切片':section.faces.length>=4?'个面':section.faces.length===1?'个平面区域':'个面';$('sliceStats').textContent=count===0?'当前超平面没有穿过超立方体':`${count} 个顶点 · ${section.edges.length} 条棱 · ${section.faces.length} ${suffix}`;}
 $('canvasDetail').textContent=count?`${count} 个切片顶点 · ${section.edges.length} 条切片棱`:'当前切片为空';
 if(!count){ctx.textAlign='center';ctx.fillStyle='#b0c1cb';ctx.font='16px '+getComputedStyle(document.body).fontFamily;ctx.fillText('这里没有交集',width/2,height*.48);ctx.fillStyle='#7894a5';ctx.font='11px '+getComputedStyle(document.body).fontFamily;ctx.fillText('将 w 移回中间，或改变四维姿态',width/2,height*.48+27);ctx.textAlign='left';}
}
function draw(){if(!width||!height||!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);grid();const rotated=vertices.map(v=>rotate4(v,state.angles));if(state.mode==='slice')renderSlice(rotated);else renderProjection(rotated);dirty=false}
function frame(time){const dt=Math.min((time-(lastTime||time))/1000,.05);lastTime=time;if(!document.hidden&&state.playing){state.angles[state.active]=normalize(state.angles[state.active]+dt*state.speed);dirty=true;if(++frameCount%4===0)syncAngles()}if(!document.hidden&&dirty)draw();requestAnimationFrame(frame)}

function syncLearning(){
 const name=planeNames[state.active],deg=Math.round(normalize(state.angles[state.active])*180/Math.PI),[a,b]=PLANES[state.active];
 $('activePlane').textContent=name;$('angle').value=deg;$('angleValue').textContent=deg+'°';$('angle').disabled=state.advanced;
 $('planeHelp').textContent=state.advanced?'组合姿态：多个平面可同时影响坐标。点选上方平面，归零并回到单平面学习。':`${name} 平面：${AXES[a]}、${AXES[b]} 改变；${AXES.filter((_,i)=>i!==a&&i!==b).join('、')} 不变。`;
 for(const i of [3,4,5]){$('plane'+i).setAttribute('aria-pressed',String(!state.advanced&&i===state.active));$('plane'+i).classList.toggle('selected',!state.advanced&&i===state.active)}
 for(const id of ['stepBack','stepForward','angleReset','playPause'])$(id).disabled=state.advanced;
 $('controlStatus').textContent=`${state.advanced?'高级组合姿态':name+' 平面'} · ${state.playing?'慢速演示中':'已暂停'} · ${state.cameraEnabled?'三维观察已开启':'相机锁定'}`;
 const p=rotate4([1,1,1,1],state.angles);$('vertexReadout').textContent='P（原坐标均为 +1）：'+p.map((x,i)=>`${AXES[i]} ${Math.abs(x)<.005?'0.00':x.toFixed(2)}`).join('  ');
}
function choosePlane(i){pause();state.active=i;state.advanced=false;state.angles.fill(0);$('advanced').open=false;syncAngles();dirty=true}
for(const i of [3,4,5])$('plane'+i).addEventListener('click',()=>choosePlane(i));
function setAngle(degrees){pause();state.angles[state.active]=Math.max(-180,Math.min(180,degrees))*Math.PI/180;syncAngles();dirty=true}
$('angle').addEventListener('input',e=>setAngle(Number(e.target.value)));
$('stepBack').addEventListener('click',()=>setAngle(Number($('angle').value)-5));
$('stepForward').addEventListener('click',()=>setAngle(Number($('angle').value)+5));
$('angleReset').addEventListener('click',()=>setAngle(0));
$('advanced').addEventListener('toggle',()=>{if($('advanced').open){pause();state.advanced=true;syncLearning()}});
function syncCamera(){canvas.style.touchAction=state.cameraEnabled?'none':'pan-y';canvas.style.cursor=state.cameraEnabled?'grab':'default';$('cameraToggle').setAttribute('aria-pressed',String(state.cameraEnabled));$('cameraToggle').textContent=state.cameraEnabled?'锁定视角':'开启观察';$('cameraHint').textContent=state.cameraEnabled?'② 仅移动三维相机 · 拖动 / 方向键 · 滚轮缩放':'② 三维视角已锁定 · 物体不随拖动改变';}
$('cameraToggle').addEventListener('click',()=>{pause();state.cameraEnabled=!state.cameraEnabled;drag=null;syncCamera();syncLearning()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')pause()});

syncCamera();syncPlay();syncAngles();syncCell();syncSlice();requestAnimationFrame(frame);
