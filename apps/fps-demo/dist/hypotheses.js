import {roomModel} from './model-content.js';
/** Three manipulable Euclidean hypotheses, not explanations of the actual atlas. */
export const HYPOTHESIS_IDS=['central-hall','treadmill','sphere'];
export const HYPOTHESIS_DESCRIPTIONS={
 'central-hall':'中央大厅假说：四个房间围绕同一个大厅，观察者绕中心走一圈；位姿和距离随轨道变化。比较它能否同时解释上下左右的窗口。',
 treadmill:'跑步机假说：观察者停在原地，房间沿传送带移动并回收。注意房间在远端重新进入，而不是观察者穿过真正的胞边界。',
 sphere:'普通二维球面假说：观察者沿大圆行走，法向和切向随位置转动。它能产生闭合路径，但这个普通球面模型并未实现八个立方房间的邻接关系；这不否定真正边界的 S³ 拓扑。'
};
export function buildHypothesisScene(B,scene,onInspect=()=>{}){
 const groups={},models={},disposables=[];
 const mat=(name,color,alpha=1)=>{const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.emissiveColor=m.diffuseColor.scale(.28);m.specularColor=new B.Color3(.4,.5,.55);m.alpha=alpha;disposables.push(m);return m;};
 const cyan=mat('lab cyan','#56dbdb'),amber=mat('lab amber','#f7b75e'),dark=mat('lab graphite','#263e50'),white=mat('lab white','#e4f4ef'),glass=mat('lab transparent blue','#407c99',.22),red=mat('lab red axis','#ed6f6f'),green=mat('lab green axis','#82dd97'),blue=mat('lab blue axis','#68a7ff');
 const box=(name,size,pos,material,parent)=>{const m=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);m.position.set(...pos);m.material=material;m.parent=parent;return m;};
 const line=(name,points,color,parent)=>{const m=B.MeshBuilder.CreateLines(name,{points:points.map(p=>new B.Vector3(...p))},scene);m.color=B.Color3.FromHexString(color);m.parent=parent;return m;};
 function traveler(parent,name){const g=new B.TransformNode(name,scene);g.parent=parent;box(name+' torso',[.23,.34,.15],[0,.2,0],amber,g);const head=B.MeshBuilder.CreateSphere(name+' helmet',{diameter:.21,segments:12},scene);head.position.y=.47;head.material=white;head.parent=g;box(name+' red tool',[.08,.08,.3],[.21,.25,.1],red,g);box(name+' boots',[.30,.07,.2],[0,.025,0],dark,g);box(name+' heading arrow',[.055,.055,.65],[0,.07,.35],cyan,g);box(name+' right axis',[.62,.025,.025],[.31,.02,0],red,g);box(name+' up axis',[.025,.62,.025],[0,.31,0],green,g);return g;}
 function group(id){const g=new B.TransformNode('hypothesis '+id,scene);groups[id]=g;box(id+' pedestal',[7,.18,7],[0,-.45,0],dark,g);for(let i=-3;i<=3;i++){line('grid',[[-3,-.35,i],[3,-.35,i]],'#345f74',g);line('grid',[[i,-.35,-3],[i,-.35,3]],'#345f74',g);}return g;}
 // Central hall: real square rooms surround a fixed central landmark; observer orbits.
 {
 const root=group('central-hall');box('central hall',[1.7,1.6,1.7],[0,.45,0],glass,root);const statue=B.MeshBuilder.CreatePolyhedron('hall central statue',{type:1,size:.44},scene);statue.position.y=.8;statue.material=cyan;statue.parent=root;box('hall asymmetric fin',[.75,.16,.12],[.35,.95,.05],red,root);
 const roomNodes=[];for(let k=0;k<4;k++){const a=k*Math.PI/2,x=Math.sin(a)*2.35,z=Math.cos(a)*2.35;const room=box('orbit room '+k,[1.25,.85,1.25],[x,.10,z],glass,root);room.rotation.y=a;const marker=box('room marker '+k,[.22,.1,.22],[x,.58,z],k%2?amber:cyan,root);roomNodes.push({room,marker});}
 const points=[];for(let i=0;i<=96;i++){let a=i/96*Math.PI*2;points.push([Math.sin(a)*2.35,.62,Math.cos(a)*2.35]);}const orbitPath=line('orbit path',points,'#58d8d4',root);
 const player=traveler(root,'orbit traveler');const sight=line('observer sight',[[0,.9,0],[0,.9,2.35]],'#f7b75e',root);sight.setEnabled(false);
 models['central-hall']={root,player,sight,update(t,variant='orbit-horizontal'){const a=t*Math.PI/2;const vertical=variant==='orbit-vertical';orbitPath.rotation.x=vertical?Math.PI/2:0;orbitPath.position.set(0,vertical?.8:0,vertical?-.62:0);roomNodes.forEach(({room,marker},k)=>{const angle=k*Math.PI/2,x=Math.sin(angle)*2.35,z=Math.cos(angle)*2.35;room.position.set(x,vertical?.8+z:.10,vertical?0:z);marker.position.set(x,vertical?1.28+z:.58,vertical?0:z);});player.rotationQuaternion=null;player.rotation.set(0,0,0);sight.setEnabled(variant==='statue-observer');if(variant==='orbit-vertical'){player.position.set(Math.sin(a)*2.35,.8+Math.cos(a)*2.35,0);player.rotation.z=-a;player.rotation.y=Math.PI/2;}else{player.position.set(Math.sin(a)*2.35,.64,Math.cos(a)*2.35);player.rotation.y=a+(variant==='statue-observer'?Math.PI:Math.PI/2);sight.rotation.y=a;}}};
 }
 // Treadmill: objects translate while observer is fixed; recycling is intentionally visible.
 {
 const root=group('treadmill');box('belt',[6.7,.15,1.5],[0,-.23,0],dark,root);for(let x=-3;x<=3;x+=.35)box('belt transverse stripe',[.04,.02,1.5],[x,-.14,0],cyan,root);
 const rooms=[];for(let k=0;k<4;k++){const r=new B.TransformNode('belt room '+k,scene);r.parent=root;box('moving room shell',[1.25,1.25,1.25],[0,.52,0],glass,r);box('moving room asymmetric marker',[.2,.2,.2],[.35,1.25,.25],k%2?amber:cyan,r);rooms.push(r);}const player=traveler(root,'stationary traveler');player.position.set(0,.1,1.8);player.rotation.y=Math.PI;line('belt direction',[[-3,1.7,0],[3,1.7,0]],'#f7b75e',root);
 const echo=traveler(root,'belt carried imitation');echo.position.set(0,.1,0);echo.setEnabled(false);
 models.treadmill={root,player,rooms,echo,update(t,variant='belt-forward'){const reversed=variant==='belt-reverse-echo';rooms.forEach((r,k)=>{r.position.x=((k*1.6+(reversed?1:-1)*t*1.6+3.2)%6.4+6.4)%6.4-3.2;});echo.setEnabled(reversed);echo.position.x=rooms[1].position.x;}};
 }
 // A genuine 2D spherical surface embedded in 3D; local frame follows the great circle.
 {
 const root=group('sphere');const globe=B.MeshBuilder.CreateSphere('ordinary 2 sphere',{diameter:3.5,segments:32},scene);globe.position.y=1.45;globe.material=glass;globe.parent=root;
 for(let axis=0;axis<3;axis++){const points=[];for(let i=0;i<=96;i++){let a=i/96*Math.PI*2,p=[Math.cos(a)*1.77,Math.sin(a)*1.77,0];if(axis===1)p=[p[0],0,p[1]];if(axis===2)p=[0,p[0],p[1]];p[1]+=1.45;points.push(p);}line('sphere great circle '+axis,points,axis===1?'#f7b75e':'#47768b',root);}
 const player=traveler(root,'sphere traveler');const normal=box('sphere radial normal',[.035,.7,.035],[0,0,0],green,root);
 const triangle=[new B.Vector3(0,1,0),new B.Vector3(1,0,0),new B.Vector3(0,0,1),new B.Vector3(0,1,0)];
 const corners=[[1,1,1],[1,1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1],[1,1,1]].map(p=>new B.Vector3(...p).normalize());
 const arc=(a,b,f)=>{const angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(a,b)))),axis=B.Vector3.Cross(a,b).normalize();return B.Quaternion.RotationAxis(axis,angle*f);};
 const rotate=(v,q)=>v.applyRotationQuaternion(q);
 const pathPoints=points=>{const out=[];for(let k=0;k<points.length-1;k++)for(let j=0;j<=24;j++){const n=rotate(points[k],arc(points[k],points[k+1],j/24));out.push([n.x*1.79,1.45+n.y*1.79,n.z*1.79]);}return out;};
 const triangleLine=line('spherical triangle path',pathPoints(triangle),'#ffba61',root),tileLine=line('eight marker route',pathPoints(corners),'#ffba61',root);const tiles=[];for(let k=0;k<8;k++){const n=corners[k],tile=box('separate spherical room marker '+k,[.38,.38,.38],[n.x*1.95,1.45+n.y*1.95,n.z*1.95],k%2?amber:cyan,root);tiles.push(tile);}
 function transportedPath(points,t){const total=(points.length-1)*t/4;let n=points[0].clone();let forward=B.Vector3.Cross(new B.Vector3(0,0,1),n).normalize();if(forward.lengthSquared()<.01)forward=new B.Vector3(1,0,0);for(let k=0;k<points.length-1;k++){const f=Math.min(1,Math.max(0,total-k));if(f<=0)break;const q=arc(points[k],points[k+1],f);n=rotate(points[k],q);forward=rotate(forward,q);}return {n,forward};}
 models.sphere={root,player,normal,triangleLine,tileLine,tiles,update(t,variant='great-circle'){const tri=variant==='spherical-triangle',eight=variant==='eight-tiles';triangleLine.setEnabled(tri);tileLine.setEnabled(eight);tiles.forEach(tile=>tile.setEnabled(eight));const a=t*Math.PI/2;let n=new B.Vector3(Math.sin(a),0,Math.cos(a)),forward=new B.Vector3(Math.cos(a),0,-Math.sin(a));if(tri||eight)({n,forward}=transportedPath(tri?triangle:corners,t));const right=B.Vector3.Cross(n,forward);const matrix=B.Matrix.Identity();B.Matrix.FromXYZAxesToRef(right,n,forward,matrix);player.rotationQuaternion=B.Quaternion.FromRotationMatrix(matrix);player.position.set(n.x*1.8,1.45+n.y*1.8,n.z*1.8);normal.position.set(n.x*2.14,1.45+n.y*2.14,n.z*2.14);normal.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(new B.Vector3(0,1,0),n,new B.Quaternion());}};
 }
 let selected='central-hall',selectedRoom=null,variant='orbit-horizontal',travel=0;
 function refresh(){for(const key of HYPOTHESIS_IDS){groups[key].setEnabled(key===selected);models[key].update(travel,key===selected?variant:undefined);}}
 function select(id){if(!HYPOTHESIS_IDS.includes(id))throw Error('Unknown hypothesis '+id);selected=id;selectedRoom=null;variant=id==='central-hall'?'orbit-horizontal':id==='treadmill'?'belt-forward':'great-circle';refresh();return HYPOTHESIS_DESCRIPTIONS[id];}
 function selectRoom(id){const content=roomModel(id);selected=content.base;selectedRoom=content.id;variant=content.variant;refresh();return content;}
 function setTravel(value,{inspect=true}={}){travel=Math.max(0,Math.min(4,Number(value)||0));refresh();if(inspect)onInspect(selectedRoom||selected);return travel;}
 function setAnimationTravel(value){return setTravel(value,{inspect:false});}
 setTravel(0,{inspect:false});select(selected);
 return {groups,models,select,selectRoom,setTravel,setAnimationTravel,get selected(){return selected;},get selectedRoom(){return selectedRoom;},get travel(){return travel;},getDescription:()=>selectedRoom?roomModel(selectedRoom).explanation:HYPOTHESIS_DESCRIPTIONS[selected],dispose(){Object.values(groups).forEach(g=>g.dispose(false,true));disposables.forEach(m=>m.dispose());}};
}
export function createHypothesisLab(B,canvas,onInspect=()=>{}){
 const engine=new B.Engine(canvas,true,{stencil:true});engine.setHardwareScalingLevel(Math.max(1,(globalThis.devicePixelRatio||1)/1.5));
 const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.025,.055,.08,1);const camera=new B.ArcRotateCamera('hypothesis orbit',-Math.PI/2,1.05,10,new B.Vector3(0,.65,0),scene);camera.lowerRadiusLimit=4;camera.upperRadiusLimit=15;camera.lowerBetaLimit=.15;camera.upperBetaLimit=1.55;camera.wheelPrecision=40;camera.attachControl(canvas,true);camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
 const ambient=new B.HemisphericLight('lab fill',new B.Vector3(.5,1,-.3),scene);ambient.intensity=.9;const sun=new B.DirectionalLight('lab key',new B.Vector3(-.5,-1,.3),scene);sun.intensity=.8;
 const lab=buildHypothesisScene(B,scene,onInspect);engine.runRenderLoop(()=>scene.render());let disposed=false;
 return {...lab,scene,engine,select:lab.select,selectRoom:lab.selectRoom,setTravel:lab.setTravel,setAnimationTravel:lab.setAnimationTravel,resize(){if(!disposed)engine.resize();},dispose(){if(disposed)return;disposed=true;camera.detachControl();lab.dispose();scene.dispose();engine.dispose();}};
}
