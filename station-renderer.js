import {STATUE_LIGHTING_GLSL} from './statue-lighting.js';
import {createAstronautSuit,SUIT_COLORS} from './astronaut.js';
import {createClassicalStatue,prewarmClassicalStatues,setStatueDetail} from './classical-statues.js';
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
 B.Effect.ShadersStore.stationVertexShader=`precision highp float; attribute vec3 position; attribute vec3 normal; attribute vec2 uv; uniform mat4 world; uniform mat4 worldViewProjection; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec2 vUV; void main(){vWorld=(world*vec4(position,1.0)).xyz;vNormal=normalize(mat3(world)*normal);vLocal=position;vUV=uv;gl_Position=worldViewProjection*vec4(position,1.0);}`;
 B.Effect.ShadersStore.stationFragmentShader=`
#ifdef NORMAL_DETAIL
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec2 vUV; uniform vec3 baseColor; uniform vec3 eye; uniform vec3 lightPosition; uniform float emissive; uniform float alphaValue; uniform float glassSurface; uniform float pattern; uniform float useTexture; uniform float mirror; uniform float matteSurface; uniform float statueSurface; uniform mat4 statueLightFrame; uniform float planeCount; uniform vec4 clipPlanes[20]; uniform sampler2D labelTexture; uniform samplerCube environmentSampler;
#ifdef NORMAL_DETAIL
uniform sampler2D surfaceNormalTexture;
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
 mapped.xy*=1.48;
 return normalize(mat3(T*inv,B*inv,N)*normalize(mapped));
}
float statueMicroCavity(vec3 N){
 vec3 dNx=dFdx(N),dNy=dFdy(N);
 float curv=clamp(length(dNx)+length(dNy),0.0,1.2);
 return 1.0-curv*.16;
}
#endif
${STATUE_LIGHTING_GLSL}
 void main(){if((glassSurface>.5||useTexture>.5)&&dot(vNormal,eye-vWorld)<0.0)discard;for(int i=0;i<20;i++){if(float(i)<planeCount&&dot(clipPlanes[i].xyz,vWorld)+clipPlanes[i].w<0.0)discard;}vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
#ifdef NORMAL_DETAIL
float cavityAO=1.0;
if(surfaceNormalEnabled>.5){N=detailedSurfaceNormal(N);cavityAO=statueMicroCavity(N);}
#endif
vec3 toLight=lightPosition-vWorld;
float lightDist=length(toLight);
vec3 L=toLight/max(lightDist,1e-4);
float atten=1.0/(1.0+.028*lightDist*lightDist);
float diffuse=max(dot(N,L),0.0);
float directional=max(dot(N,normalize(vec3(-.32,.84,-.44))),0.0);
float hemi=.5+.5*N.y;
vec3 ambTint=mix(vec3(.44,.51,.58),vec3(.64,.66,.65),hemi);
vec3 keyLight=vec3(1.06,.99,.90)*(diffuse*.46*atten+directional*.20);
// Analytical 3D room corner & edge ambient occlusion inside [-H, H]^3
vec3 localN=abs(vLocal)/${H.toFixed(1)};
vec3 edgeProx=smoothstep(.64,1.0,localN);
float cornerAO=1.0-.24*(edgeProx.x*edgeProx.y+edgeProx.y*edgeProx.z+edgeProx.z*edgeProx.x);
float wallCrease=1.0-.08*max(edgeProx.x,max(edgeProx.y,edgeProx.z));
vec3 color=baseColor*(ambTint+keyLight)*cornerAO*wallCrease;
if(pattern>.5){
 vec2 cellUV=fract(vUV*${(2*H).toFixed(1)});
 vec2 grid=abs(cellUV-.5);
 float seam=smoothstep(.476,.496,max(grid.x,grid.y));
 float bevel=smoothstep(.445,.476,max(grid.x,grid.y))*(1.0-seam);
 float grain=fract(sin(dot(vLocal.xz,vec2(12.9898,78.233)))*43758.5453);
 float subtlePanel=.965+grain*.028+bevel*.045-seam*.13;
 color*=subtlePanel;
}
if(useTexture>.5)color*=texture2D(labelTexture,vUV).rgb;
color+=baseColor*emissive;
vec3 V=normalize(eye-vWorld);
vec3 halfVec=normalize(L+V);
float spec=pow(max(dot(N,halfVec),0.0),mix(52.0,22.0,matteSurface));
float fresnelRim=pow(1.0-max(dot(N,V),0.0),3.2);
color+=vec3(1.0,.97,.92)*spec*mix(.26,.04,matteSurface)*atten;
color+=vec3(.76,.89,.98)*fresnelRim*mix(.12,.02,matteSurface);
if(statueSurface>.5){
 vec3 albedo=baseColor;
 if(useTexture>.5)albedo*=texture2D(labelTexture,vUV).rgb;
 // Subtle organic Carrara marble veining in stable statue-local coordinates
 float vein=sin(vLocal.y*12.5+sin(vLocal.x*8.0+vLocal.z*6.5)*2.2)*.5+.5;
 float microGrain=fract(sin(dot(vLocal.xz+vLocal.yy,vec2(12.9898,78.233)))*43758.5453);
 albedo*=mix(.93,1.03,smoothstep(.15,.85,vein))*(.985+microGrain*.022);
 vec3 localNrm=normalize(mat3(statueLightFrame)*N);
 color=softStatueColor(albedo,localNrm);
#ifdef NORMAL_DETAIL
 color*=cavityAO;
#endif
 // Satin marble specular highlight + pearlescent silhouette rim light
 vec3 sKeyW=normalize(vec3(-.54,.74,-.40));
 vec3 sViewL=normalize(mat3(statueLightFrame)*V);
 vec3 sHalf=normalize(sKeyW+sViewL);
 float marbleSpec=pow(max(dot(localNrm,sHalf),0.0),30.0)*.16;
 float marbleRim=pow(1.0-max(dot(localNrm,sViewL),0.0),2.9)*.17;
 color+=vec3(1.0,.95,.86)*marbleSpec+vec3(.82,.91,1.0)*marbleRim;
 // Subtle plinth/base ground contact shadow
 float baseAO=mix(.82,1.0,smoothstep(0.0,.28,vLocal.y));
 color*=baseAO;
}
if(mirror>.5){vec3 R=reflect(-V,N);color=textureCube(environmentSampler,R).rgb*.94+vec3(.07);float fresnel=pow(1.0-max(dot(N,V),0.0),5.0);color=mix(color,vec3(.82,.91,.97),fresnel*.3);}
// Subtle filmic highlight rolloff (prevents chalky highlight clipping while preserving vibrant depth)
color=color/(1.0+color*.14)*1.10;
float opticalDistance=length(eye-vWorld);float fog=1.0-exp(-opticalDistance*.0055);float horizon=smoothstep(${OPTICAL_FADE_START.toFixed(1)},${OPTICAL_FADE_END.toFixed(1)},opticalDistance);fog=1.0-(1.0-fog)*(1.0-horizon);color=mix(color,vec3(.58,.64,.66),fog);gl_FragColor=vec4(color,alphaValue);}`;
}
export class StationRenderer{
 constructor(B,scene){this.B=B;this.scene=scene;prewarmClassicalStatues(B,scene);this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;this.templates=new Map();this.statuePalettes=new Map();this.statueNormalTexture=null;this.instances=[];this.poolByCell=new Map();this.mode=null;this.serial=0;this.gestures={left:0,right:0};this.clock=0;this.truthVisible=false;this._eyeVec=new B.Vector3();this._lastEye=null;this._backSrc=new B.Vector3(0,0,-.28);this._backOut=new B.Vector3();installStationShaders(B);this.fallbackCube=new B.RawCubeTexture(scene,Array.from({length:6},(_,i)=>new Uint8Array([45+i*8,65+i*7,80+i*6,255])),1,B.Engine.TEXTUREFORMAT_RGBA,B.Engine.TEXTURETYPE_UNSIGNED_BYTE,false,false,B.Texture.NEAREST_SAMPLINGMODE);this.white=new B.RawTexture(new Uint8Array([255,255,255,255]),1,1,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false,B.Texture.NEAREST_SAMPLINGMODE);}
 // The progression owner supplies the reveal latch; visibility survives pool rebuilds.
 setTruthVisible(visible){visible=!!visible;if(visible===this.truthVisible)return visible;this.truthVisible=visible;for(const x of this.pool||this.instances)if(x.truth)x.truth.root.setEnabled(visible);this.probeNeedsRefresh=true;if(!visible&&this.probe?.renderList){const list=this.probe.renderList;for(let i=list.length-1;i>=0;i--)if(!list[i].isEnabled())list.splice(i,1);}return visible;}
 setTransform(node,t){const B=this.B,r=t.rotation.map(a=>[...a]);let d=r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-r[1][0]*(r[0][1]*r[2][2]-r[0][2]*r[2][1])+r[2][0]*(r[0][1]*r[1][2]-r[0][2]*r[1][1]);node.scaling.set(1,1,d<0?-1:1);if(d<0)r[2]=r[2].map(x=>-x);let m=B.Matrix.FromValues(...r[0],0,...r[1],0,...r[2],0,0,0,0,1);node.rotationQuaternion=B.Quaternion.FromRotationMatrix(m);node.position.set(...t.offset);}
 makeMaterial(instance,kind,texture){const cacheKey=kind+'|'+(texture?.uniqueId??'');instance.materialCache??=new Map();if(instance.materialCache.has(cacheKey))return instance.materialCache.get(cacheKey);const B=this.B,normalDetail=kind==='bronze'&&!!this.scene.getEngine().getCaps().standardDerivatives,alpha=kind==='hall-track'?.55:kind==='hypo-HR1'?.12:/^hypo-S[1-4]$/.test(kind)?.28:kind.startsWith('hypo-')?.55:kind.startsWith('truth-fill-')?TESSERACT_STYLE.fillAlpha:kind.startsWith('truth-person-')?1:kind.startsWith('truth-')?1:kind==='glass'?.035:kind==='holo'?.78:1,m=new B.ShaderMaterial('portal/'+kind+'/'+this.serial++,this.scene,{vertex:'station',fragment:'station'},{attributes:['position','normal','uv'],uniforms:['world','worldViewProjection','baseColor','eye','lightPosition','emissive','alphaValue','glassSurface','pattern','useTexture','mirror','matteSurface','statueSurface','statueLightFrame','planeCount','clipPlanes','surfaceNormalEnabled'],samplers:['labelTexture','environmentSampler','surfaceNormalTexture'],defines:normalDetail?['#define NORMAL_DETAIL']:[],needAlphaBlending:alpha<1});m.backFaceCulling=false;m.disableDepthWrite=alpha<1;let color={'hall-track':'#407c99',bronze:'#ffffff',stone:'#ffffff',shell:'#e5e3d9',dark:'#78848a',blue:'#345c88',green:'#6a805b',trim:'#f5efe3',red:'#f45249',gold:'#e5ba6e',holo:'#6bd9ed',glass:'#54c1d3',mirror:'#e0e7ed',skin:'#e6e9e6',black:'#344853',accent:COLORS[cellId(instance.normal)],light:'#fff6e2',label:'#ffffff',axislabel:'#ffffff'}[kind]||(kind.startsWith('suit-')?SUIT_COLORS[kind.slice(5)]:null)||(kind.startsWith('hypo-')?hypothesisSurfaceColor(kind.slice(5)):null)||(kind.startsWith('axis-')?AXIS_COLORS[kind.slice(5)]:null)||(kind==='truth-fill-neutral'?TESSERACT_STYLE.fillColor:null)||(kind.startsWith('truth-')?(TRUTH_COLORS[kind.replace(/^truth-(fill|outline|person)-/,'')]||'#4174c8'):'#d3e1e2');m.setColor3('baseColor',B.Color3.FromHexString(color));m.setFloat('emissive',kind==='light'?.28:kind.startsWith('truth-')?.06:kind==='holo'?.65:kind==='label'?.35:0);m.setFloat('alphaValue',alpha);m.onBindObservable.add(mesh=>{const opacity=alpha*(mesh?.visibility??1);m.setFloat('alphaValue',opacity);m.getEffect()?.setFloat('alphaValue',opacity);const detail=normalDetail&&this.statueNormalTexture?.isReady()?1:0;m.setFloat('surfaceNormalEnabled',detail);m.getEffect()?.setFloat('surfaceNormalEnabled',detail);if(detail){m.setTexture('surfaceNormalTexture',this.statueNormalTexture);m.getEffect()?.setTexture('surfaceNormalTexture',this.statueNormalTexture);}});m.setFloat('glassSurface',kind==='glass'?1:0);m.setFloat('pattern',kind==='shell'?1:0);m.setFloat('mirror',kind==='mirror'?1:0);m.setMatrix('statueLightFrame',B.Matrix.Identity());m.setFloat('statueSurface',kind==='bronze'||kind==='stone'?1:0);m.setFloat('matteSurface',kind==='bronze'||kind==='stone'||kind.startsWith('suit-')||kind.startsWith('truth-')?1:0);m.setFloat('useTexture',texture?1:0);m.setTexture('labelTexture',texture||this.white);m.setFloat('surfaceNormalEnabled',0);if(normalDetail){this.venusNormalTexture();m.setTexture('surfaceNormalTexture',this.white);}m.setTexture('environmentSampler',this.probe?.cubeTexture||this.fallbackCube);m.setVector3('eye',this._eyeVec);m.setVector3('lightPosition',instance._lightVec||new B.Vector3(...mapPoint(instance.transform,[0,H-1.2,0])));m.setFloat('planeCount',0);m.setArray4('clipPlanes',instance._packedClips||Array(80).fill(0));instance.materials.push(m);instance.materialCache.set(cacheKey,m);return m;}
 // Palette textures and per-instance clip materials are allocated only when the pool/templates are built.
 statuePalette(kind){if(!this.statuePalettes.has(kind))this.statuePalettes.set(kind,createStatuePalette(this.B,this.scene,kind));return this.statuePalettes.get(kind);}
 // One mipmapped detail texture shared across all Venus room copies; never allocated at a doorway.
 // Offline GLB->Blender export flips source glTF V back: all15,634 UVs are (u,1-v), so invertY=true.
 venusNormalTexture(){if(!this.statueNormalTexture){const B=this.B,t=new B.Texture(new URL('./assets/classical-statues/venus-normal.jpg',import.meta.url).href,this.scene,false,true,B.Texture.TRILINEAR_SAMPLINGMODE);t.name='Venus original surface detail';t.gammaSpace=false;t.anisotropicFilteringLevel=4;t.wrapU=B.Texture.WRAP_ADDRESSMODE;t.wrapV=B.Texture.WRAP_ADDRESSMODE;this.statueNormalTexture=t;}return this.statueNormalTexture;}
 template(n,mode){let id=cellId(n),key=id+mode;if(this.templates.has(key))return this.templates.get(key);const B=this.B,scene=this.scene,parts={},add=(kind,m)=>{(parts[kind]??=[]).push(m);return m;},box=(kind,size,pos)=>{let m=B.MeshBuilder.CreateBox('template',{width:size[0],height:size[1],depth:size[2]},scene);m.position.set(...pos);return add(kind,m);};
 for(let v of cellNeighbors(n)){let a=aperture(n,v,mode),{axis,sign,other,bounds}=a;const rect=(kind,ulo,uhi,vlo,vhi,depth=.18,offset=0)=>{if(uhi-ulo<.001||vhi-vlo<.001)return;let size=[0,0,0],pos=[0,0,0];size[axis]=depth;size[other[0]]=uhi-ulo;size[other[1]]=vhi-vlo;pos[axis]=sign*(H+offset);pos[other[0]]=(ulo+uhi)/2;pos[other[1]]=(vlo+vhi)/2;return box(kind,size,pos);};let [[l,r],[b,t]]=bounds;const outline=hatchOutline(n,v,mode);const polyMesh=(kind,inner,outer,offset)=>{let positions=[],indices=[],normals=[],uvs=[];for(let j=0;j<inner.length;j++){for(const uv of [inner[j],outer[j]]){let p=[0,0,0];p[axis]=sign*(H+offset);p[other[0]]=uv[0];p[other[1]]=uv[1];positions.push(...p);let normal=[0,0,0];normal[axis]=-sign;normals.push(...normal);uvs.push((uv[0]+H)/(2*H),(uv[1]+H)/(2*H));}let k=j*2,kn=((j+1)%inner.length)*2;indices.push(k,kn,k+1,k+1,kn,kn+1);}let m=new B.Mesh('round hatch '+kind,scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;data.applyToMesh(m);return add(kind,m);};
 const outer=outline.points.map(p=>{let d=p.map((x,j)=>x-outline.center[j]),ts=d.map((x,j)=>Math.abs(x)<1e-9?Infinity:((x>0?H:-H)-outline.center[j])/x),t=Math.min(...ts);return d.map((x,j)=>outline.center[j]+x*t);});const rim=outline.points.map((p,j)=>{let d=p.map((x,k)=>x-outline.center[k]),len=Math.hypot(...d),lim=Math.hypot(...outer[j].map((x,k)=>x-outline.center[k]));return d.map((x,k)=>outline.center[k]+x/len*Math.min(len+.16,lim));});
 polyMesh('shell',rim,outer,0);polyMesh('trim',outline.points,rim,-.10);let innerBand=outline.points.map(p=>p.map((x,j)=>x+(rim[outline.points.indexOf(p)][j]-x)*.25));polyMesh('accent',outline.points,innerBand,-.12);
 if(mode==='upper'&&!(isLoopCell(n)&&isLoopCell(v))){const center=outline.points.map(()=>outline.center);polyMesh('glass',center,outline.points,0);}
 // Broad warm diffuser panels, not narrow neon strips.
 if(axis!==1&&sign>0)rect('light',-.72,.72,H-.50,H-.30,.025,-.13);

 }
 // Thin surface-painted coordinate arrows: no shafts, cones or floating tags.
 const hint=coordinateHint(n),axisTexture=new B.DynamicTexture('coordinate paint atlas '+id,{width:512,height:192},scene,false),ac=axisTexture.getContext();ac.fillStyle='#e5e3d9';ac.fillRect(0,0,512,192);ac.textAlign='center';ac.textBaseline='middle';ac.font='bold 38px sans-serif';
 for(let row=0;row<3;row++){ac.fillStyle=row<3?hint.axes[row].color:'#344853';if(row<3){ac.fillText(hint.axes[row].label,200,row*64+29);ac.fillRect(300,row*64+29,120,5);ac.beginPath();ac.moveTo(440,row*64+31);ac.lineTo(410,row*64+17);ac.lineTo(410,row*64+45);ac.closePath();ac.fill();}}axisTexture.update(false);
 for(let row=0;row<3;row++){const paint=hint.paint[row],pos=paint.center,u=paint.u,v=paint.v,w=row<3?.92:1.02,h=.24,vertices=[],uv=[],indices=[0,2,1,0,3,2],normals=[];for(const [x,y,tu,tv]of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){vertices.push(...pos.map((q,k)=>q+u[k]*x*w/2+v[k]*y*h/2));normals.push(...paint.normal);uv.push(tu,(row+1-tv)/3);}const m=new B.Mesh('painted coordinate '+row,scene),data=new B.VertexData();data.positions=vertices;data.normals=normals;data.indices=indices;data.uvs=uv;data.applyToMesh(m);add('axislabel',m);}
 // Eight distinct cell identifiers, repeated on the shell rather than near clones.
 let texture=new B.DynamicTexture('cell-label '+id,{width:512,height:128},scene,false),ctx=texture.getContext();ctx.fillStyle='#142934';ctx.fillRect(0,0,512,128);ctx.fillStyle=COLORS[id];ctx.font='bold 98px sans-serif';ctx.textAlign='center';ctx.fillText(id,256,101);texture.update();
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
 createPooledInstance(n,mode){let x={normal:n,transform:{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]},materials:[],meshes:[],_statues:[],_lightVec:new this.B.Vector3(0,H-1.2,0),_packedClips:Array(80).fill(0),_clipEye:null,_clipDirty:true,_planeCount:0,quads:[],path:[],depth:0},node=new this.B.TransformNode('pooled '+cellId(n),this.scene);x.node=node;let t=this.template(n,mode);for(let part of t.meshes){let m=part.mesh.clone('cell '+cellId(n),node);m.setEnabled(true);m.metadata={...part.mesh.metadata};m.material=this.makeMaterial(x,part.kind,part.texture);x.meshes.push(m);if(m.metadata?.statueKind&&m.metadata.category!=='cell-statue')x._statues.push(m);}if(['X-','X+','W-'].includes(cellId(n)))x.meshes.push(...this.createHologram(x));if(cellId(n)==='W+'){x.truth=createColoredTesseract(this.B,this.scene,{parent:node,scale:.55,paletteFactory:kind=>this.statuePalette(kind),materialFactory:spec=>spec.kind==='statue'?this.makeMaterial(x,spec.paletteKind,spec.texture):this.makeMaterial(x,spec.kind.startsWith('traveler-')?(spec.kind==='traveler-accent'?'truth-person-'+spec.cellId:spec.kind==='traveler-suit'?'suit-suit':'suit-joint'):'truth-'+(spec.kind==='selected-fill'?'fill':spec.kind==='outline'?'outline':'edge')+'-'+(spec.cellId||'neutral'))});/* Clockwise quarter-turn viewed from local +Y: placement only, not 4D phase/camera. */x.truth.root.rotation.y=Math.PI/2;x.truth.root.setEnabled(this.truthVisible);x.meshes.push(...x.truth.meshes);}x.meshes.push(...this.createAvatar(x,false));if(cellId(n)==='W+'){let ball=this.B.MeshBuilder.CreateSphere('enterable mirror sphere',{diameter:2.4,segments:32},this.scene);ball.parent=node;ball.position.set(1.55,-.1,0);ball.material=this.makeMaterial(x,'mirror');ball.setEnabled(false);x.bubble=ball;x.meshes.push(ball);}node.setEnabled(false);x.avatar.parent.setEnabled(false);return x;}
 rebuild(state,mode,specs=null){
  if(!this.pool||this.mode!==mode){for(const x of this.pool||[]){x.node.dispose(false);x.avatar?.parent.dispose(false);for(let m of x.materials)m.dispose();}this.pool=[];this.poolByCell=new Map();this.probe?.dispose();this.probe=null;this.mode=mode;for(const id of ['W+','W-','X+','X-','Y+','Y-','Z+','Z-']){const list=[];for(let k=0;k<10;k++){const inst=this.createPooledInstance(normalFor(id),mode);this.pool.push(inst);list.push(inst);}this.poolByCell.set(id,list);}}
  for(const x of this.pool){x.node.setEnabled(false);x.avatar.parent.setEnabled(false);}const used={};this.instances=[];
  for(const spec of specs||buildOpticalInstances(state,mode)){let key=cellId(spec.normal),k=used[key]||0;used[key]=k+1;let x=this.poolByCell.get(key)[k];Object.assign(x,spec);x._clipDirty=true;x.node.setEnabled(true);this.setTransform(x.node,x.transform);x.statueLightFrame??=this.B.Matrix.Identity();x.node.computeWorldMatrix(true).invertToRef(x.statueLightFrame);const lp=mapPoint(x.transform,[0,H-1.2,0]);x._lightVec.set(lp[0],lp[1],lp[2]);for(const material of x.materials){material.setMatrix('statueLightFrame',x.statueLightFrame);material.setVector3('lightPosition',x._lightVec);}let hasAvatar=x.depth===0||x.depth>0&&key===cellId(state.normal);x.avatar.parent.setEnabled(hasAvatar);this.configureLocalAvatar(x.avatar,x.depth===0);this.instances.push(x);}
  this._lastEye=null;this.probeNeedsRefresh ||= this.lastCell!==cellId(state.normal);this.rootState=state;this.lastCell=cellId(state.normal);this.visibleSignature=specs?mode+specs.map(x=>x.path.join("/")).join("|"):null;
 }
 update(state,look,phase,time,gesture,bubbleVisible,locomotion={leftLeg:0,rightLeg:0,crouchScale:1}){const B=this.B,eye=localPoint(state),clipEye=opticalClipEye(eye,state),eyeB=this._eyeVec;eyeB.set(eye[0],eye[1],eye[2]);const eyeMoved=!this._lastEye||Math.abs(eye[0]-this._lastEye[0])>1e-7||Math.abs(eye[1]-this._lastEye[1])>1e-7||Math.abs(eye[2]-this._lastEye[2])>1e-7;if(!this._lastEye)this._lastEye=[0,0,0];this._lastEye[0]=eye[0];this._lastEye[1]=eye[1];this._lastEye[2]=eye[2];this.clock=time;
 for(const x of this.instances){for(const mesh of x._statues){const center=mapPoint(x.transform,mesh.position.asArray()),distance=Math.hypot(center[0]-eye[0],center[1]-eye[1],center[2]-eye[2]),lod=distance<8?'high':distance>10?'low':mesh.metadata.lod;if(lod!==mesh.metadata.lod)setStatueDetail(B,this.scene,mesh,lod);}if(this.truthVisible&&x.truth&&(this.reducedMotion?0:Math.floor(time*30))!==x.truthTick){x.truthTick=this.reducedMotion?0:Math.floor(time*30);x.truth.set4DAngle(-x.truthTick/30*Math.PI/6.72);}if(x.depth===0)x.avatar.parent.setEnabled(!locomotion.hideLocal);const clipChanged=x._clipDirty||!x._clipEye||Math.abs(clipEye[0]-x._clipEye[0])>1e-7||Math.abs(clipEye[1]-x._clipEye[1])>1e-7||Math.abs(clipEye[2]-x._clipEye[2])>1e-7;if(clipChanged){const planes=renderClipPlanes(x.quads,clipEye),packed=x._packedClips;let idx=0;for(let pi=0;pi<planes.length;pi++){const p=planes[pi];packed[idx++]=p[0];packed[idx++]=p[1];packed[idx++]=p[2];packed[idx++]=p[3];}while(idx<80)packed[idx++]=0;x._planeCount=planes.length;if(!x._clipEye)x._clipEye=[0,0,0];x._clipEye[0]=clipEye[0];x._clipEye[1]=clipEye[1];x._clipEye[2]=clipEye[2];x._clipDirty=false;for(let mat of x.materials){mat.setVector3('eye',eyeB);mat.setFloat('planeCount',x._planeCount);mat.setArray4('clipPlanes',packed);}}else if(eyeMoved){for(let mat of x.materials)mat.setVector3('eye',eyeB);}if(x.hologram){let h=x.hologram,a=time*.24*Math.PI/2;if(h.family==='belt'){h.rotatingSide.rotation.y=rotatingSidePose(time*.24).yaw;h.rotatingLeft.rotation.y=rotatingSidePose(time*.24,'left').yaw;h.rooms.forEach((r,j)=>{const pose=beltRoomPose(time*.24,j);r.position.x=pose.x*.47;for(const m of r.fadeParts||[r])m.visibility=pose.fade;});h.traveler.position.set(0,0,0);h.traveler.rotation.y=Math.PI/2;}else if(h.family==='sphere'){const n=[Math.sin(a),0,Math.cos(a)],up=n.map(v=>-v),forward=[Math.cos(a),0,-Math.sin(a)],right=[0,-1,0];h.traveler.position.set(...n.map(v=>v*(1.72/3.5)));h.traveler.rotationQuaternion=B.Quaternion.FromRotationMatrix(B.Matrix.FromValues(...right,0,...up,0,...forward,0,0,0,0,1));}else{const pose=hallPose(time*.24);h.traveler.position.set(pose.position[0]*.67,0,pose.position[2]*.67);h.traveler.rotation.y=Math.atan2(pose.forward[0],pose.forward[2]);}}
 if(x.avatar.parent.isEnabled()){let a=x.avatar,T=x.depth===0?{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]}:rootSelfTransform(state,x);this.setTransform(a.parent,T);a.body.position.set(eye[0],eye[1],eye[2]);a.body.scaling.y=phase==='upper'?(locomotion.crouchScale||1):1;a.legs.left.rotation.x=locomotion.leftLeg||0;a.legs.right.rotation.x=locomotion.rightLeg||0;if(phase!=='upper'&&look.free){if(!a.body.rotationQuaternion)a.body.rotationQuaternion=new B.Quaternion(...look.quaternion);else a.body.rotationQuaternion.set(look.quaternion[0],look.quaternion[1],look.quaternion[2],look.quaternion[3]);}else{a.body.rotationQuaternion=B.Quaternion.RotationYawPitchRoll(look.yaw,phase==='upper'?0:look.pitch,0);}if(x.depth===0){this._backSrc.rotateByQuaternionToRef(a.body.rotationQuaternion,this._backOut);a.body.position.addInPlace(this._backOut);} // Local presentation only: optical eye, collision and remote astronaut stay unchanged.
for(let side of ['left','right']){let elapsed=time-gesture[side],wave=elapsed>=0&&elapsed<1.35?Math.sin(elapsed*Math.PI/1.35):0;a.arms[side].rotation.x=-wave*2.2;a.arms[side].rotation.z=wave*.24*Math.sin(elapsed*18)*(side==='left'?1:-1);}}
 if(x.bubble)x.bubble.setEnabled(bubbleVisible);}
 if(bubbleVisible&&this.lastCell==='W+'&&(!this.probe||this.probeNeedsRefresh)){let root=this.instances[0];if(!this.probe)this.probe=new B.ReflectionProbe('W+ chrome environment',128,this.scene);this.probe.position.set(...mapPoint(root.transform,[1.55,-.1,0]));this.probe.renderList=root.meshes.filter(m=>m.isEnabled()&&m!==root.bubble&&!m.name.includes('astronaut'));this.probe.refreshRate=B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;this.probe.cubeTexture.resetRefreshCounter();this.probeNeedsRefresh=false;for(let x of this.instances)if(x.bubble)x.bubble.material.setTexture('environmentSampler',this.probe.cubeTexture);}
 }
 dispose(){for(let x of this.pool||this.instances){x.node.dispose(false);x.avatar?.parent.dispose(false);x.materials.forEach(m=>m.dispose());}this.poolByCell?.clear();for(let t of this.templates.values()){t.meshes.forEach(p=>p.mesh.dispose());t.texture.dispose();t.axisTexture?.dispose();}this.probe?.dispose();this.fallbackCube.dispose();this.white.dispose();for(const texture of this.statuePalettes.values())texture.dispose();this.statuePalettes.clear();this.statueNormalTexture?.dispose();this.statueNormalTexture=null;}
}
