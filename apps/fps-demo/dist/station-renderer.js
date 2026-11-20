import {createDistantExhibit} from './distant-exhibit.js';
import {createDistantSuit} from './distant-suit.js';
import {createDistantShell,isDistantShellPart} from './distant-station.js';
import {STATUE_LIGHTING_GLSL} from './statue-lighting.js';
import {createAstronautSuit,SUIT_COLORS} from './astronaut.js';
import {createClassicalStatue,prewarmClassicalStatues,setStatueDetail,selectStatueLOD} from './classical-statues.js';
import {createStatuePalette} from './statue-palette.js';
import {statuePlacement} from './statue-placement.js';
import {sphereCorridorGeometry,SPHERE_CORRIDOR} from './sphere-corridor.js';
import {hypothesisRoomColor,hypothesisSurfaceColor} from './hypothesis-colors.js';
import {coordinateHint,AXIS_COLORS} from './coordinate-hint.js';
import {createColoredTesseract,TESSERACT_STYLE,CELL_COLORS as TRUTH_COLORS} from './colored-tesseract.js';
import {beltRoomPose,hallPose,rotatingSidePose} from './model-poses.js';
import {hatchOutline} from './hatch.js';
import {H,cellId,cellNeighbors,canonicalFrame,worldToTangent,normalFor,mapPoint,mapVector,localPoint,dot} from './chapter-topology.js';
import {opticalClipEye} from './visible-optics.js';
import {aperture,buildOpticalInstances,renderClipPlanes,rootSelfTransform,isLoopCell,OPTICAL_FADE_START,OPTICAL_FADE_END} from './optics.js';
const COLORS=TRUTH_COLORS;
export function installStationShaders(B){
 B.Effect.ShadersStore.stationVertexShader=`precision highp float;
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 world; uniform mat4 worldViewProjection;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec2 vUV;
#if defined(HULL) || defined(FRAME)
uniform vec3 lightPosition; uniform vec3 eye; uniform vec3 baseColor;
varying vec3 vPlateLight;
#endif
void main(){
 vWorld=(world*vec4(position,1.0)).xyz;
 vNormal=normalize(mat3(world)*normal);
 vLocal=position; vUV=uv;
 #if defined(HULL) || defined(FRAME)
 vec3 L=normalize(lightPosition-vWorld);
 float diffuse=max(dot(vNormal,L),0.0);
 #ifdef HULL
 vPlateLight=vec3(.39,.54,.66)+diffuse*vec3(.55,.45,.30);
 #else
 vec3 V=normalize(eye-vWorld);
 float fresnel=pow(clamp(1.0-abs(dot(vNormal,V)),0.0,1.0),3.0);
 float glint=pow(max(dot(vNormal,normalize(L+V)),0.0),26.0);
 vPlateLight=baseColor*(.48+.54*diffuse)+vec3(.13,.19,.22)*fresnel+vec3(.39,.33,.22)*glint;
 #endif
 #endif
 gl_Position=worldViewProjection*vec4(position,1.0);
}`;
 B.Effect.ShadersStore.stationFragmentShader=`
#ifdef NORMAL_DETAIL
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec2 vUV; uniform vec3 baseColor; uniform vec3 eye; uniform vec3 lightPosition; uniform float emissive; uniform float alphaValue; uniform float glassSurface; uniform float davidSurface; uniform float physicalSign; uniform sampler2D hullTexture; uniform float useTexture; uniform float mirror; uniform float matteSurface; uniform float statueSurface; uniform mat4 statueLightFrame; uniform float planeCount; uniform vec4 clipPlanes[20]; uniform sampler2D labelTexture; uniform samplerCube environmentSampler;
#if defined(HULL) || defined(FRAME)
varying vec3 vPlateLight;
#endif
#ifdef NORMAL_DETAIL
uniform sampler2D surfaceNormalTexture; uniform sampler2D venusCavity;
uniform float surfaceNormalEnabled;
// Derivative cotangent frame follows each projected room transform, including mirrored portal views.
vec3 detailedSurfaceNormal(vec3 N){
 vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld);vec2 duv1=dFdx(vUV),duv2=dFdy(vUV);
 vec3 p2=cross(dp2,N),p1=cross(N,dp1);
 vec3 T=p2*duv1.x+p1*duv2.x,B=p2*duv1.y+p1*duv2.y;
 float length2=max(dot(T,T),dot(B,B));
 if(length2<1e-14)return N;
 float inv=inversesqrt(length2);
 vec3 mapped=texture2D(surfaceNormalTexture,vUV).xyz*2.0-1.0;
 mapped.xy*=1.24;
 return normalize(mat3(T*inv,B*inv,N)*normalize(mapped));
}
#endif
${STATUE_LIGHTING_GLSL}
 void main(){
 for(int i=0;i<20;i++){if(float(i)>=planeCount)break;if(dot(clipPlanes[i].xyz,vWorld)+clipPlanes[i].w<0.0)discard;}
#ifdef HULL
 vec3 color=texture2D(hullTexture,vUV).rgb*vPlateLight;
#elif defined(FRAME)
 vec3 color=vPlateLight;
#else
 if((glassSurface>.5||useTexture>.5)&&dot(vNormal,eye-vWorld)<0.0)discard;
 vec3 N=normalize(vNormal);
// Winding selects the lit side of a two-sided model. Exhibits in reflected
// portal charts use their authored normal field and the direction to the eye.
if(statueSurface>.5){if(dot(N,eye-vWorld)<0.0)N=-N;}
else {if(!gl_FrontFacing)N=-N;}
 #ifdef NORMAL_DETAIL
 if(surfaceNormalEnabled>.5)N=detailedSurfaceNormal(N);
 #endif
 vec3 L=normalize(lightPosition-vWorld);
 vec3 V=normalize(eye-vWorld);
 float diffuse=max(dot(N,L),0.0);
 vec3 color=baseColor*(.48+diffuse*.49);
vec2 sampleUV=vUV;
if(physicalSign>.5 && dot(cross(statueLightFrame[0].xyz,statueLightFrame[1].xyz),statueLightFrame[2].xyz)<0.0)sampleUV.x=1.0-sampleUV.x;
if(useTexture>.5)color*=texture2D(labelTexture,sampleUV).rgb;
color+=baseColor*emissive;
if(statueSurface>.5){
 vec3 albedo=baseColor;
 if(useTexture>.5)albedo*=texture2D(labelTexture,vUV).rgb;
 vec3 exhibitN=normalize(mat3(statueLightFrame)*N);
 color=softStatueColor(albedo,exhibitN);
 float cavity=davidSurface>.5?vUV.x:1.0;
 #ifdef NORMAL_DETAIL
 if(surfaceNormalEnabled>.5)cavity=texture2D(venusCavity,vUV).r;
 #endif
 float veins=sin(dot(vLocal.xz,vec2(8.2,6.5))+vLocal.y*13.0+2.3*sin(dot(vLocal,vec3(6.0,3.4,-4.8))));
 color*=mix(.47,1.0,cavity)*(1.0-.038*smoothstep(.95,1.0,veins));
 float rim=pow(1.0-max(dot(N,V),0.0),3.0)*max(dot(exhibitN,normalize(vec3(-.3,-.5,.8))),0.0);
 color+=rim*vec3(.085,.17,.21)*cavity;
}
if(mirror>.5){vec3 R=reflect(-V,N);color=textureCube(environmentSampler,R).rgb*.94+vec3(.07);float fresnel=pow(1.0-max(dot(N,V),0.0),5.0);color=mix(color,vec3(.82,.91,.97),fresnel*.3);}
#endif
float opticalDistance=length(eye-vWorld);float fog=1.0-exp(-opticalDistance*.006);float horizon=smoothstep(${OPTICAL_FADE_START.toFixed(1)},${OPTICAL_FADE_END.toFixed(1)},opticalDistance);fog=1.0-(1.0-fog)*(1.0-horizon);color=mix(color,vec3(.58,.64,.66),fog);gl_FragColor=vec4(color,alphaValue);}`;
}
export class StationRenderer{
 constructor(B,scene,{visibleOnly=false,software=false}={}){this.software=software;this.visibleOnly=visibleOnly;this.B=B;this.scene=scene;prewarmClassicalStatues(B,scene);this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;this.templates=new Map();this.statuePalettes=new Map();this.statueNormalTexture=null;this.instances=[];this.mode=null;this.serial=0;this.gestures={left:0,right:0};this.clock=0;this.truthVisible=false;installStationShaders(B);this.fallbackCube=new B.RawCubeTexture(scene,Array.from({length:6},(_,i)=>new Uint8Array([45+i*8,65+i*7,80+i*6,255])),1,B.Engine.TEXTUREFORMAT_RGBA,B.Engine.TEXTURETYPE_UNSIGNED_BYTE,false,false,B.Texture.NEAREST_SAMPLINGMODE);this.white=new B.RawTexture(new Uint8Array([255,255,255,255]),1,1,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false,B.Texture.NEAREST_SAMPLINGMODE);}
 // The progression owner supplies the reveal latch; visibility survives pool rebuilds.
 setTruthVisible(visible){visible=!!visible;if(visible===this.truthVisible)return visible;this.truthVisible=visible;for(const x of this.pool||this.instances){if(this.visibleOnly&&cellId(x.normal)==='W+'&&x.node.isEnabled())this.configureExhibit(x);else if(x.truth)x.truth.root.setEnabled(visible);}this.probeNeedsRefresh=true;if(!visible&&this.probe?.renderList){const list=this.probe.renderList;for(let i=list.length-1;i>=0;i--)if(!list[i].isEnabled())list.splice(i,1);}return visible;}
 setTransform(node,t){const B=this.B,r=t.rotation.map(a=>[...a]);let d=r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-r[1][0]*(r[0][1]*r[2][2]-r[0][2]*r[2][1])+r[2][0]*(r[0][1]*r[1][2]-r[0][2]*r[1][1]);node.scaling.set(1,1,d<0?-1:1);if(d<0)r[2]=r[2].map(x=>-x);let m=B.Matrix.FromValues(...r[0],0,...r[1],0,...r[2],0,0,0,0,1);node.rotationQuaternion=B.Quaternion.FromRotationMatrix(m);node.position.set(...t.offset);}
 makeMaterial(instance,kind,texture){const cacheKey=kind+'|'+(texture?.uniqueId??'');instance.materialCache??=new Map();if(instance.materialCache.has(cacheKey))return instance.materialCache.get(cacheKey);const B=this.B,normalDetail=kind==='bronze'&&!!this.scene.getEngine().getCaps().standardDerivatives,alpha=kind==='hall-track'?.55:kind==='hypo-HR1'?.12:/^hypo-S[1-4]$/.test(kind)?.28:kind.startsWith('hypo-')?.55:kind.startsWith('truth-fill-')?TESSERACT_STYLE.fillAlpha:kind.startsWith('truth-person-')?1:kind.startsWith('truth-')?1:kind==='glass'?.035:kind==='holo'?.78:1,m=new B.ShaderMaterial('portal/'+kind+'/'+this.serial++,this.scene,{vertex:'station',fragment:'station'},{attributes:['position','normal','uv'],uniforms:['world','worldViewProjection','baseColor','eye','lightPosition','emissive','alphaValue','glassSurface','useTexture','mirror','matteSurface','statueSurface','statueLightFrame','planeCount','clipPlanes','surfaceNormalEnabled','davidSurface','physicalSign'],samplers:['labelTexture','environmentSampler','surfaceNormalTexture','venusCavity','hullTexture'],defines:normalDetail?['#define NORMAL_DETAIL']:kind==='shell'?['#define HULL']:kind==='trim'?['#define FRAME']:[],needAlphaBlending:alpha<1});m.backFaceCulling=false;m.disableDepthWrite=alpha<1;let color={'hall-track':'#407c99',bronze:'#ffffff',stone:'#ffffff',shell:'#8da5ae',dark:'#78848a',blue:'#345c88',green:'#6a805b',trim:'#8c9fa5',red:'#f45249',gold:'#e5ba6e',holo:'#6bd9ed',glass:'#54c1d3',mirror:'#e0e7ed',skin:'#e6e9e6',black:'#344853',accent:COLORS[cellId(instance.normal)],light:'#ffe3af',label:'#ffffff',axislabel:'#ffffff'}[kind]||(kind.startsWith('suit-')?SUIT_COLORS[kind.slice(5)]:null)||(kind.startsWith('hypo-')?hypothesisSurfaceColor(kind.slice(5)):null)||(kind.startsWith('axis-')?AXIS_COLORS[kind.slice(5)]:null)||(kind==='truth-fill-neutral'?TESSERACT_STYLE.fillColor:null)||(kind.startsWith('truth-')?(TRUTH_COLORS[kind.replace(/^truth-(fill|outline|person)-/,'')]||'#4174c8'):'#d3e1e2');m.setColor3('baseColor',B.Color3.FromHexString(color));m.setFloat('emissive',kind==='light'?.28:kind.startsWith('truth-')?.06:kind==='holo'?.65:kind==='label'?.35:0);m.setFloat('alphaValue',alpha);m.onBindObservable.add(mesh=>{const opacity=alpha*(mesh?.visibility??1);m.setFloat('alphaValue',opacity);m.getEffect()?.setFloat('alphaValue',opacity);const detail=normalDetail&&this.statueNormalTexture?.isReady()?1:0;m.setFloat('surfaceNormalEnabled',detail);m.getEffect()?.setFloat('surfaceNormalEnabled',detail);if(detail){if(this.venusCavity?.isReady()){m.setTexture('venusCavity',this.venusCavity);m.getEffect()?.setTexture('venusCavity',this.venusCavity);}m.setTexture('surfaceNormalTexture',this.statueNormalTexture);m.getEffect()?.setTexture('surfaceNormalTexture',this.statueNormalTexture);}});m.setFloat('glassSurface',kind==='glass'?1:0);
 m.setFloat('physicalSign',kind==='label'?1:0);
 m.setFloat('davidSurface',kind==='stone'?1:0);
 if(kind==='shell'){
  if(!this.hullTexture){
   this.hullTexture=new B.Texture(new URL('./assets/pressure-hull.jpg',import.meta.url).href,this.scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);
   this.hullTexture.anisotropicFilteringLevel=4;
  }
  m.setTexture('hullTexture',this.hullTexture);
 }
m.setFloat('mirror',kind==='mirror'?1:0);m.setMatrix('statueLightFrame',B.Matrix.Identity());m.setFloat('statueSurface',kind==='bronze'||kind==='stone'?1:0);m.setFloat('matteSurface',kind==='bronze'||kind==='stone'||kind.startsWith('suit-')||kind.startsWith('truth-')?1:0);m.setFloat('useTexture',texture?1:0);m.setTexture('labelTexture',texture||this.white);m.setFloat('surfaceNormalEnabled',0);if(normalDetail){this.venusNormalTexture();m.setTexture('surfaceNormalTexture',this.white);
 if(!this.venusCavity)this.venusCavity=new B.Texture(new URL('./assets/classical-statues/venus-ao.jpg',import.meta.url).href,this.scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);
 m.setTexture('venusCavity',this.white);}m.setTexture('environmentSampler',this.probe?.cubeTexture||this.fallbackCube);m.setVector3('eye',new B.Vector3());m.setVector3('lightPosition',new B.Vector3(...mapPoint(instance.transform,[0,H-1.2,0])));m.setFloat('planeCount',0);m.setArray4('clipPlanes',Array(80).fill(0));instance.materials.push(m);instance.materialCache.set(cacheKey,m);return m;}
 // Palette textures and per-instance clip materials are allocated only when the pool/templates are built.
 statuePalette(kind){if(!this.statuePalettes.has(kind))this.statuePalettes.set(kind,createStatuePalette(this.B,this.scene,kind));return this.statuePalettes.get(kind);}
 // One mipmapped detail texture shared across all Venus room copies; never allocated at a doorway.
 // Offline GLB->Blender export flips source glTF V back: all15,634 UVs are (u,1-v), so invertY=true.
 venusNormalTexture(){if(!this.statueNormalTexture){const B=this.B,t=new B.Texture(new URL('./assets/classical-statues/venus-normal.jpg',import.meta.url).href,this.scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);t.name='Venus original surface detail';t.gammaSpace=false;t.anisotropicFilteringLevel=4;t.wrapU=B.Texture.WRAP_ADDRESSMODE;t.wrapV=B.Texture.WRAP_ADDRESSMODE;this.statueNormalTexture=t;}return this.statueNormalTexture;}
 template(n,mode){let id=cellId(n),key=id+mode;if(this.templates.has(key))return this.templates.get(key);const B=this.B,scene=this.scene,parts={},add=(kind,m)=>{(parts[kind]??=[]).push(m);return m;},box=(kind,size,pos)=>{let m=B.MeshBuilder.CreateBox('template',{width:size[0],height:size[1],depth:size[2]},scene);m.position.set(...pos);return add(kind,m);};
 for(let v of cellNeighbors(n)){let a=aperture(n,v,mode),{axis,sign,other,bounds}=a;const rect=(kind,ulo,uhi,vlo,vhi,depth=.18,offset=0)=>{if(uhi-ulo<.001||vhi-vlo<.001)return;let size=[0,0,0],pos=[0,0,0];size[axis]=depth;size[other[0]]=uhi-ulo;size[other[1]]=vhi-vlo;pos[axis]=sign*(H+offset);pos[other[0]]=(ulo+uhi)/2;pos[other[1]]=(vlo+vhi)/2;return box(kind,size,pos);};let [[l,r],[b,t]]=bounds;const outline=hatchOutline(n,v,mode);const polyMesh=(kind,inner,outer,offset)=>{let positions=[],indices=[],normals=[],uvs=[];for(let j=0;j<inner.length;j++){for(const uv of [inner[j],outer[j]]){let p=[0,0,0];p[axis]=sign*(H+offset);p[other[0]]=uv[0];p[other[1]]=uv[1];positions.push(...p);let normal=[0,0,0];normal[axis]=-sign;normals.push(...normal);uvs.push((uv[0]+H)/(2*H),(uv[1]+H)/(2*H));}let k=j*2,kn=((j+1)%inner.length)*2;indices.push(k,kn,k+1,k+1,kn,kn+1);}
 let m=new B.Mesh('round hatch '+kind,scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;data.applyToMesh(m);return add(kind,m);};
 const outer=outline.points.map(p=>{let d=p.map((x,j)=>x-outline.center[j]),ts=d.map((x,j)=>Math.abs(x)<1e-9?Infinity:((x>0?H:-H)-outline.center[j])/x),t=Math.min(...ts);return d.map((x,j)=>outline.center[j]+x*t);});const rim=outline.points.map((p,j)=>{let d=p.map((x,k)=>x-outline.center[k]),len=Math.hypot(...d),lim=Math.hypot(...outer[j].map((x,k)=>x-outline.center[k]));return d.map((x,k)=>outline.center[k]+x/len*Math.min(len+.16,lim));});
 polyMesh('shell',rim,outer,0);const collar=polyMesh('trim',outline.points,rim,-.10);
 const cp=collar.getVerticesData(B.VertexBuffer.PositionKind),cn=collar.getVerticesData(B.VertexBuffer.NormalKind);
 for(let j=0;j<outline.points.length;j++){
  cp[(2*j+1)*3+axis]=sign*(H-.015);
  let u=outline.center[0]-outline.points[j][0],v=outline.center[1]-outline.points[j][1],length=Math.hypot(u,v)||1;
  for(let k=2*j;k<2*j+2;k++){cn[k*3+other[0]]=u/length*.52;cn[k*3+other[1]]=v/length*.52;cn[k*3+axis]=-sign*.85;}
 }
 collar.updateVerticesData(B.VertexBuffer.PositionKind,cp);
 collar.updateVerticesData(B.VertexBuffer.NormalKind,cn);
let innerBand=outline.points.map(p=>p.map((x,j)=>x+(rim[outline.points.indexOf(p)][j]-x)*.25));polyMesh('accent',outline.points,innerBand,-.12);
 if(mode==='upper'&&!(isLoopCell(n)&&isLoopCell(v))){const center=outline.points.map(()=>outline.center);polyMesh('glass',center,outline.points,0);}
 // Broad warm diffuser panels, not narrow neon strips.
 if(axis!==1&&sign>0)rect('light',-.72,.72,H-.50,H-.30,.025,-.13);

 }
 // Thin surface-painted coordinate arrows: no shafts, cones or floating tags.
 const hint=coordinateHint(n),axisTexture=new B.DynamicTexture('coordinate paint atlas '+id,{width:512,height:192},scene,false),ac=axisTexture.getContext();ac.fillStyle='#e5e3d9';ac.fillRect(0,0,512,192);ac.textAlign='center';ac.textBaseline='middle';ac.font='bold 38px sans-serif';
 for(let row=0;row<3;row++){ac.fillStyle=row<3?hint.axes[row].color:'#344853';if(row<3){ac.fillText(hint.axes[row].label,200,row*64+29);ac.fillRect(300,row*64+29,120,5);ac.beginPath();ac.moveTo(440,row*64+31);ac.lineTo(410,row*64+17);ac.lineTo(410,row*64+45);ac.closePath();ac.fill();}}axisTexture.update(false);
 for(let row=0;row<3;row++){const paint=hint.paint[row],pos=paint.center,u=paint.u,v=paint.v,w=row<3?.92:1.02,h=.24,vertices=[],uv=[],indices=[0,2,1,0,3,2],normals=[];for(const [x,y,tu,tv]of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){vertices.push(...pos.map((q,k)=>q+u[k]*x*w/2+v[k]*y*h/2));normals.push(...paint.normal);uv.push(tu,(row+1-tv)/3);}const m=new B.Mesh('painted coordinate '+row,scene),data=new B.VertexData();data.positions=vertices;data.normals=normals;data.indices=indices;data.uvs=uv;data.applyToMesh(m);add('axislabel',m);}
 // Eight distinct cell identifiers, repeated on the shell rather than near clones.
 let texture=new B.DynamicTexture('cell-label '+id,{width:512,height:128},scene,false),ctx=texture.getContext();ctx.fillStyle='#102431';ctx.fillRect(0,0,512,128);ctx.fillStyle=COLORS[id];ctx.fillRect(5,5,10,118);ctx.font='bold 88px sans-serif';ctx.textAlign='center';ctx.fillText(id,254,91);ctx.fillStyle='#9cb5b4';ctx.font='15px monospace';ctx.fillText('CORRIDOR   /   STATION',254,117);texture.update();
 for(let axis=0;axis<3;axis++)for(let sign of [-1,1]){let m=B.MeshBuilder.CreatePlane('room sign '+id,{width:1.8,height:.45},scene),normal=new B.Vector3(),up=axis===1?B.Vector3.Forward():B.Vector3.Up();normal[['x','y','z'][axis]]=-sign;let right=B.Vector3.Cross(normal,up),forward=normal.negate(),matrix=B.Matrix.FromValues(...right.asArray(),0,...up.asArray(),0,...forward.asArray(),0,0,0,0,1);m.rotationQuaternion=B.Quaternion.FromRotationMatrix(matrix);let p=axis===1?[0,0,H-1.15]:[0,H-1.15,0];p[axis]=sign*(H-.14);m.position.set(...p);add('label',m);}
 // One shared mode-aware placement for rendering and collision. Upper statues
 // stay grounded; lower statues float at the exact geometric room center.
 const placement=statuePlacement(n,mode);if(placement){const statue=createClassicalStatue(B,scene,{kind:placement.kind,name:'canonical '+id+' classical statue'});statue.position.set(...placement.origin);statue.rotationQuaternion=B.Quaternion.FromRotationMatrix(B.Matrix.FromValues(...placement.axes[0],0,...placement.axes[1],0,...placement.axes[2],0,0,0,0,1));add(placement.kind,statue);}
 // A small raised station console in every room, model floats above center.
 // No model pedestal: the projection floats and has no collision geometry.
 const meshes=[];for(let [kind,list]of Object.entries(parts)){if(kind==='glass'){for(const pane of list){pane.name='template/'+id+'/glass-pane';pane.setEnabled(false);meshes.push({kind,mesh:pane,texture:null});}continue;}if(kind==='bronze'||kind==='stone'){for(const mesh of list){mesh.name='template/'+id+'/'+kind;mesh.setEnabled(false);meshes.push({kind,mesh,texture:this.statuePalette(kind)});}continue;}let merged=B.Mesh.MergeMeshes(list,true,true,undefined,false,false);merged.name='template/'+id+'/'+kind;merged.setEnabled(false);meshes.push({kind,mesh:merged,texture:kind==='label'?texture:kind==='axislabel'?axisTexture:null});}let result={meshes,texture,axisTexture,coordinateHint:hint};this.templates.set(key,result);return result;}
 createHologram(instance){const B=this.B,node=new B.TransformNode('hologram/'+cellId(instance.normal),this.scene);node.parent=instance.node;node.scaling.setAll(1.5);const mat=this.makeMaterial(instance,'holo'),dark=this.makeMaterial(instance,'dark'),accent=this.makeMaterial(instance,'red');let id=cellId(instance.normal),index=['W+','X+','W-','X-','Y+','Y-','Z+','Z-'].indexOf(id);let parts=[];const box=(name,w,h,d,x,y,z,m)=>{let a=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);a.position.set(x,y,z);a.parent=node;a.material=m;parts.push(a);return a;};
 const roomBox=(localId,size,pos,parent=node)=>{let m=box('hypothesis room '+localId,...size,...pos,this.makeMaterial(instance,'hypo-'+localId));m.parent=parent;m.metadata={hypothesisLocalId:localId};return m;};
 let rotatingSide=null,rotatingLeft=null;let family=id==='X+'?'belt':id==='W-'?'sphere':id==='X-'?'hall':null,rooms=[];if(!family)throw Error('No hypothesis exhibit in '+id);
 if(family==='hall'){for(let i=0;i<4;i++){let p=hallPose(i);rooms.push(roomBox('H'+(i+1),[.32,.4,.32],[p.position[0]*.67,.1,p.position[2]*.67]));}
 const halfWidth=.25*.67/2.35,paths=[-halfWidth,halfWidth].map(w=>Array.from({length:97},(_,i)=>{const pose=hallPose(i/96*4);return new B.Vector3(pose.position[0]*(.67+w),-.075,pose.position[2]*(.67+w));}));
 const track=B.MeshBuilder.CreateRibbon('hall miniature walking ring',{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);track.parent=node;track.material=this.makeMaterial(instance,'hall-track');track.metadata={motionRing:true,centerRadius:.67,halfWidth,floorY:-.075};parts.push(track);
 }
 if(family==='belt'){box('holographic conveyor',1.75,.04,.42,0,-.12,0,dark);for(let i=0;i<4;i++){let r=roomBox('T'+(i+1),[.47,.4,.38],[beltRoomPose(0,i).x*.47,.1,0]);r.fadeParts=[r];rooms.push(r);}rotatingSide=roomBox('TR1',[.26,.3,.26],[0,.1,-.6]);rotatingLeft=roomBox('TL1',[.26,.3,.26],[0,.1,.6]);}
 if(family==='sphere'){let sph=B.MeshBuilder.CreateSphere('spherical hypothesis',{diameter:1.0,segments:12},this.scene);sph.parent=node;sph.material=this.makeMaterial(instance,'glass');parts.push(sph);for(const geometry of sphereCorridorGeometry({innerRadius:SPHERE_CORRIDOR.innerRadius/3.5,outerRadius:SPHERE_CORRIDOR.outerRadius/3.5,halfWidth:SPHERE_CORRIDOR.halfWidth/3.5,segmentsPerSector:16})){const room=new B.Mesh('inner equator room '+geometry.id,this.scene),data=new B.VertexData();data.positions=geometry.positions;data.indices=geometry.indices;data.normals=[];B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.uvs=new Array(data.positions.length/3*2).fill(0);data.applyToMesh(room);room.parent=node;room.material=this.makeMaterial(instance,'hypo-'+geometry.id);room.metadata={hypothesisLocalId:geometry.id,equatorialCorridor:true};parts.push(room);rooms.push(room);}}
 const sideRooms=[];if(family==='sphere'){for(let side of [-1,1]){const pole=roomBox(side>0?'SN':'SS',[.18,.18,.18],[0,side*.5,0]);sideRooms.push(pole);}}else if(family==='belt'){/* side rooms belong to each moving T identity */}else{const centerRoom=roomBox('HC',[.35,.35,.35],[0,.1,0]);sideRooms.push(centerRoom);}
 let traveler=new B.TransformNode('autowalking miniature',this.scene);traveler.parent=node;let torso=box('miniature torso',.08,.15,.06,0,0,0,accent);torso.parent=traveler;let head=B.MeshBuilder.CreateSphere('miniature head',{diameter:.07,segments:6},this.scene);head.parent=traveler;head.position.y=.12;head.material=mat;parts.push(head);if(family==='sphere'){torso.scaling.set(.23/3.5/.08,.34/3.5/.15,.15/3.5/.06);torso.position.y=.2/3.5;head.scaling.setAll(.21/3.5/.07);head.position.y=.47/3.5;}
 instance.hologram={node,traveler,index,family,rooms,parts,rotatingSide,rotatingLeft};return parts;}
 createAvatar(instance,root=false){const parent=new this.B.TransformNode('body transport',this.scene),suit=createAstronautSuit(this.B,this.scene,{parent,material:kind=>this.makeMaterial(instance,'suit-'+kind)});instance.avatar={parent,...suit,root};return suit.parts;}
 configureLocalAvatar(avatar,local){avatar.root=local;for(const m of avatar.parts){m.setEnabled(!(local&&m.metadata?.hideLocal));if(m.name==='torso'){m.scaling.set(local?.50:1,local?.72:1,local?.45:1);m.position.z=local?-.28:-.02;}}}
 // Reject whole props outside a portal cone before sending their triangles to WebGL.
 // Fragment clipping still handles meshes intersecting an edge of the aperture.
 attachClipBounds(slot){
  for(let i=slot.clipMeshCount||0;i<slot.meshes.length;i++){
   const mesh=slot.meshes[i],frustumTest=mesh.isInFrustum;
   mesh.isInFrustum=function(planes){
    if(!frustumTest.call(this,planes))return false;
    const count=slot.clipCount||0;if(!count)return true;
    const sphere=this.getBoundingInfo().boundingSphere,center=sphere.centerWorld;
    const minimum=-sphere.radiusWorld-.001,p=slot.clipBuffer;
    for(let j=0;j<count*4;j+=4)if(p[j]*center.x+p[j+1]*center.y+p[j+2]*center.z+p[j+3]<minimum)return false;
    return true;
   };
  }
  slot.clipMeshCount=slot.meshes.length;
 }
 setShellDetail(slot,spec,zoom){
  if(!slot.distant)return;
  // A side room occupying only a small aperture can share the one-draw hull.
  // A telescope or close view restores the detailed frame, labels and panes.
  const far=spec.depth>=2||(this.software&&!this.nativeQuality&&!zoom&&spec.depth===1&&spec.visibleArea<.36);
  if(slot.farShell===far)return;
  slot.farShell=far;slot.distant.setEnabled(far);
  for(const part of slot.surfaceMeshes)part.setEnabled(!far);
 }
 configureExhibit(slot){
  const id=cellId(slot.normal);
  const family={'W+':'truth','X+':'belt','W-':'sphere','X-':'hall'}[id];
  if(!family)return;
  const allowed=family!=='truth'||this.truthVisible;
  const far=slot.depth>=2;
  if(allowed){
   if(far&&!slot.farExhibit){slot.farExhibit=createDistantExhibit(this.B,this.scene,slot,family);slot.meshes.push(slot.farExhibit);}
   if(!far&&family==='truth'&&!slot.truth)this.attachTruth(slot);
   if(!far&&family!=='truth'&&!slot.hologram)slot.meshes.push(...this.createHologram(slot));
  }
  slot.farExhibit?.setEnabled(allowed&&far);
  slot.hologram?.node.setEnabled(!far);
  slot.truth?.root.setEnabled(allowed&&!far);
 }
 attachTruth(x){x.truth=createColoredTesseract(this.B,this.scene,{parent:x.node,scale:.55,paletteFactory:kind=>this.statuePalette(kind),materialFactory:spec=>spec.kind==='statue'?this.makeMaterial(x,spec.paletteKind,spec.texture):this.makeMaterial(x,spec.kind.startsWith('traveler-')?(spec.kind==='traveler-accent'?'truth-person-'+spec.cellId:spec.kind==='traveler-suit'?'suit-suit':'suit-joint'):'truth-'+(spec.kind==='selected-fill'?'fill':spec.kind==='outline'?'outline':'edge')+'-'+(spec.cellId||'neutral'))});/* Clockwise quarter-turn viewed from local +Y: placement only, not 4D phase/camera. */x.truth.root.rotation.y=Math.PI/2;x.truth.root.setEnabled(this.truthVisible);x.meshes.push(...x.truth.meshes);}
 createPooledInstance(n,mode){let x={normal:n,transform:{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]},materials:[],meshes:[],quads:[],path:[],depth:0},node=new this.B.TransformNode('pooled '+cellId(n),this.scene);x.node=node;let t=this.template(n,mode);x.surfaceMeshes=[];for(let part of t.meshes){let m=part.mesh.clone('cell '+cellId(n),node);m.setEnabled(true);m.metadata={...part.mesh.metadata};m.material=this.makeMaterial(x,part.kind,part.texture);x.meshes.push(m);if(m.metadata?.statueKind)x.exhibitStatue=m;if(isDistantShellPart(part.kind)||part.kind==='glass')x.surfaceMeshes.push(m);}
 if(this.visibleOnly){x.distant=createDistantShell(this.B,this.scene,t,x,COLORS[cellId(n)],this.hullTexture);x.meshes.push(x.distant);}
 if(!this.visibleOnly&&['X-','X+','W-'].includes(cellId(n)))x.meshes.push(...this.createHologram(x));if(!this.visibleOnly&&cellId(n)==='W+')this.attachTruth(x);if(!this.visibleOnly)x.meshes.push(...this.createAvatar(x,false));if(cellId(n)==='W+'){let ball=this.B.MeshBuilder.CreateSphere('enterable mirror sphere',{diameter:2.4,segments:32},this.scene);ball.parent=node;ball.position.set(1.55,-.1,0);ball.material=this.makeMaterial(x,'mirror');ball.setEnabled(false);x.bubble=ball;x.meshes.push(ball);}node.setEnabled(false);x.avatar?.parent.setEnabled(false);return x;}
 rebuild(state,mode,specs=null){
  if(!this.pool||this.mode!==mode){
   for(const x of this.pool||[]){x.node.dispose(false);if(x.localSuit||x.remoteSuit){x.localSuit?.parent.dispose(false);x.remoteSuit?.parent.dispose(false);}else x.avatar?.parent.dispose(false);for(const material of x.materials)material.dispose();}
   this.pool=[];this.instances=[];this.byCell=new Map();this.probe?.dispose();this.probe=null;this.mode=mode;
   for(const id of ['W+','W-','X+','X-','Y+','Y-','Z+','Z-']){
    const slots=[];this.byCell.set(id,slots);
    if(!this.visibleOnly)for(let i=0;i<10;i++){const slot=this.createPooledInstance(normalFor(id),mode);slots.push(slot);this.pool.push(slot);}
   }
  }
  for(const x of this.instances){x.node.setEnabled(false);x.avatar?.parent.setEnabled(false);}
  const used={};this.instances=[];
  specs??=this.selectView?.(state,mode);
  for(const spec of specs||buildOpticalInstances(state,mode)){
   const key=cellId(spec.normal),k=used[key]||0,slots=this.byCell.get(key);used[key]=k+1;
   let x=slots[k];
   if(!x){x=this.createPooledInstance(spec.normal,mode);slots.push(x);this.pool.push(x);}
   Object.assign(x,spec);x.node.setEnabled(true);this.setTransform(x.node,x.transform);
   this.setShellDetail(x,spec,false);
   const hasAvatar=x.depth===0||key===cellId(state.normal);
   if(this.visibleOnly&&hasAvatar){
    const local=x.depth===0,field=local?'localSuit':'remoteSuit';
    if(x.avatar!==x[field])x.avatar?.parent.setEnabled(false);
    if(!x[field]){
     if(local){x.meshes.push(...this.createAvatar(x));x[field]=x.avatar;}
     else{
      const parent=new this.B.TransformNode('remote body transport',this.scene);
      const suit=createDistantSuit(this.B,this.scene,{parent,instance:x});
      x[field]={...suit,parent,root:false};x.meshes.push(...suit.parts);
     }
    }
    x.avatar=x[field];
   }
   if(x.avatar){
    x.avatar.parent.setEnabled(hasAvatar);this.configureLocalAvatar(x.avatar,x.depth===0);
    if(this.visibleOnly&&hasAvatar)this.setTransform(x.avatar.parent,x.depth===0?{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]}:rootSelfTransform(state,x));
   }
   if(this.visibleOnly)this.configureExhibit(x);
   x.statueLightFrame??=this.B.Matrix.Identity();x.node.computeWorldMatrix(true).invertToRef(x.statueLightFrame);
   x.lightPosition??=new this.B.Vector3();x.lightPosition.set(...mapPoint(x.transform,[0,H-1.2,0]));
   for(const mat of x.materials){mat.setMatrix('statueLightFrame',x.statueLightFrame);mat.setVector3('lightPosition',x.lightPosition);}
   if(this.visibleOnly)this.attachClipBounds(x);
   x.clipX=NaN;
   this.instances.push(x);
  }
  this.probeNeedsRefresh ||= this.lastCell!==cellId(state.normal);this.rootState=state;this.lastCell=cellId(state.normal);this.visibleSignature=specs?mode+specs.map(x=>x.key||x.path.join('/')).join('|'):null;
 }
 update(state,look,phase,time,gesture,bubbleVisible,locomotion={leftLeg:0,rightLeg:0,crouchScale:1}){const B=this.B,eye=localPoint(state),clipEye=opticalClipEye(eye,state),eyeB=this.eyeUniform??=new B.Vector3();eyeB.set(...eye);this.clock=time;
 for(const x of this.instances){
  const exhibit=x.exhibitStatue;
  if(this.visibleOnly&&exhibit){
   const frustum=this.scene.frustumPlanes;
   if(frustum?.length&&exhibit.isInFrustum(frustum)){
    const distance=B.Vector3.Distance(eyeB,exhibit.getBoundingInfo().boundingSphere.centerWorld);
    const lod=selectStatueLOD({kind:exhibit.metadata.statueKind,distance,software:this.software,native:this.nativeQuality,zoom:locomotion.hideLocal,previous:exhibit.metadata.lod});
    setStatueDetail(B,this.scene,exhibit,lod);
   }
  }else if(!this.visibleOnly)for(const mesh of x.meshes){if(mesh.metadata?.statueKind&&mesh.metadata.category!=='cell-statue'){const center=mapPoint(x.transform,mesh.position.asArray()),distance=Math.hypot(...center.map((v,k)=>v-eye[k])),lod=distance<8?'high':distance>10?'low':mesh.metadata.lod;setStatueDetail(B,this.scene,mesh,lod);}}if(this.truthVisible&&x.truth&&x.truth.root.isEnabled()&&(this.reducedMotion?0:Math.floor(time*30))!==x.truthTick){x.truthTick=this.reducedMotion?0:Math.floor(time*30);x.truth.set4DAngle(-x.truthTick/30*Math.PI/6.72);}if(x.depth===0)x.avatar.parent.setEnabled(!locomotion.hideLocal);if(x.clipX!==eye[0]||x.clipY!==eye[1]||x.clipZ!==eye[2]||x.clipMaterials!==x.materials.length){
   const planes=renderClipPlanes(x.quads,clipEye),packed=x.clipBuffer??=new Float32Array(80);
   for(let i=0;i<planes.length;i++)packed.set(planes[i],i*4);
   for(const mat of x.materials){mat.setVector3('eye',eyeB);mat.setFloat('planeCount',planes.length);mat.setArray4('clipPlanes',packed);}
   x.clipCount=planes.length;[x.clipX,x.clipY,x.clipZ]=eye;x.clipMaterials=x.materials.length;
  }if(x.farExhibit?.isEnabled())x.farExhibit.material.setFloat('travel',this.reducedMotion?0:time*.24);
  if(x.hologram?.node.isEnabled()){let h=x.hologram,a=time*.24*Math.PI/2;if(h.family==='belt'){h.rotatingSide.rotation.y=rotatingSidePose(time*.24).yaw;h.rotatingLeft.rotation.y=rotatingSidePose(time*.24,'left').yaw;h.rooms.forEach((r,j)=>{const pose=beltRoomPose(time*.24,j);r.position.x=pose.x*.47;for(const m of r.fadeParts||[r])m.visibility=pose.fade;});h.traveler.position.set(0,0,0);h.traveler.rotation.y=Math.PI/2;}else if(h.family==='sphere'){const n=[Math.sin(a),0,Math.cos(a)],up=n.map(v=>-v),forward=[Math.cos(a),0,-Math.sin(a)],right=[0,-1,0];h.traveler.position.set(...n.map(v=>v*(1.72/3.5)));h.traveler.rotationQuaternion=B.Quaternion.FromRotationMatrix(B.Matrix.FromValues(...right,0,...up,0,...forward,0,0,0,0,1));}else{const pose=hallPose(time*.24);h.traveler.position.set(pose.position[0]*.67,0,pose.position[2]*.67);h.traveler.rotation.y=Math.atan2(pose.forward[0],pose.forward[2]);}}
 if(x.avatar?.parent.isEnabled()){let a=x.avatar;if(!this.visibleOnly){const T=x.depth===0?{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]}:rootSelfTransform(state,x);this.setTransform(a.parent,T);}a.body.position.set(...eye);a.body.scaling.y=phase==='upper'?(locomotion.crouchScale||1):1;a.legs.left.rotation.x=locomotion.leftLeg||0;a.legs.right.rotation.x=locomotion.rightLeg||0;a.body.rotationQuaternion??=new B.Quaternion();if(phase!=='upper'&&look.free)a.body.rotationQuaternion.set(...look.quaternion);else B.Quaternion.RotationYawPitchRollToRef(look.yaw,phase==='upper'?0:look.pitch,0,a.body.rotationQuaternion);if(x.depth===0){this.backward??=new B.Vector3(0,0,-.28);this.bodyOffset??=new B.Vector3();this.backward.rotateByQuaternionToRef(a.body.rotationQuaternion,this.bodyOffset);a.body.position.addInPlace(this.bodyOffset);} // Local presentation only: optical eye, collision and remote astronaut stay unchanged.
for(let side of ['left','right']){let elapsed=time-gesture[side],wave=elapsed>=0&&elapsed<1.35?Math.sin(elapsed*Math.PI/1.35):0;a.arms[side].rotation.x=-wave*2.2;a.arms[side].rotation.z=wave*.24*Math.sin(elapsed*18)*(side==='left'?1:-1);}}
 if(x.bubble)x.bubble.setEnabled(bubbleVisible);}
 if(bubbleVisible&&this.lastCell==='W+'&&(!this.probe||this.probeNeedsRefresh)){let root=this.instances[0];if(!this.probe)this.probe=new B.ReflectionProbe('W+ chrome environment',128,this.scene);this.probe.position.set(...mapPoint(root.transform,[1.55,-.1,0]));this.probe.renderList=root.meshes.filter(m=>m.isEnabled()&&m!==root.bubble&&!m.name.includes('astronaut'));this.probe.refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;this.probe.cubeTexture.resetRefreshCounter();this.probeNeedsRefresh=false;for(let x of this.instances)if(x.bubble)x.bubble.material.setTexture('environmentSampler',this.probe.cubeTexture);}
 }
 dispose(){for(let x of this.pool||this.instances){x.node.dispose(false);if(x.localSuit||x.remoteSuit){x.localSuit?.parent.dispose(false);x.remoteSuit?.parent.dispose(false);}else x.avatar?.parent.dispose(false);x.materials.forEach(m=>m.dispose());}for(let t of this.templates.values()){t.meshes.forEach(p=>p.mesh.dispose());t.texture.dispose();t.axisTexture?.dispose();t.distantShell?.dispose();}this.probe?.dispose();this.fallbackCube.dispose();this.white.dispose();for(const texture of this.statuePalettes.values())texture.dispose();this.statuePalettes.clear();this.venusCavity?.dispose();this.hullTexture?.dispose();this.statueNormalTexture?.dispose();this.statueNormalTexture=null;}
}
