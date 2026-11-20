// Direct and bounce light are evaluated at vertices. The packed floor pass uses
// one offline soft-shadow texture for the fixed window ribs, independent of resolution.
const vertexSource=`
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 eyePos;
uniform vec3 bayTint;
varying vec2 tileUV;
varying vec3 localPoint;
varying vec3 coating;
varying vec3 fillLight;
varying vec3 sunLight;
varying float spec;
void main(){
 vec4 point=world*vec4(position,1.0);
 vec3 n=normalize(mat3(world)*normal);
 vec3 key=normalize(vec3(-.65,1.0,-.4));
 vec3 cold=normalize(vec3(.64,.12,.74));
 vec3 viewdir=normalize(eyePos-point.xyz);
 float direct=max(dot(n,key),0.);
 float rear=max(dot(n,cold),0.);
 float up=n.y*.5+.5;
 float sole=smoothstep(-.2,.82,point.y);
 float edge=pow(1.-abs(dot(n,viewdir)),3.);
 fillLight=(vec3(.16,.25,.33)+vec3(.24,.29,.31)*up+vec3(.10,.31,.42)*rear+bayTint*.19)*(.83+.17*sole);
 sunLight=direct*vec3(.99,.77,.52);
 coating=color.rgb;
 spec=pow(max(dot(n,normalize(key+viewdir)),0.),28.)*.18+edge*.025;
 tileUV=uv;localPoint=point.xyz;
 gl_Position=worldViewProjection*vec4(position,1.);
}`;
const fragmentSource=`
precision mediump float;
varying vec2 tileUV;
varying vec3 localPoint;
varying vec3 coating;
varying vec3 fillLight;
varying vec3 sunLight;
varying float spec;
uniform sampler2D steelAtlas;
uniform sampler2D sunChart;
uniform vec4 footA;
uniform vec4 footB;
float ambientFoot(vec4 f){
 vec2 delta=(localPoint.xz-f.xy)*f.zw;
 float t=max(0.,1.-dot(delta,delta));return t*t;
}
void main(){
 vec3 grain=texture2D(steelAtlas,tileUV).rgb;
 float lowDeck=(1.-smoothstep(.14,.46,abs(localPoint.y)))*step(abs(localPoint.x),7.)*step(abs(localPoint.z),10.5);
 vec2 dockUV=vec2((localPoint.x+7.1)/14.2,(localPoint.z+10.5)/21.);
 float incident=texture2D(sunChart,clamp(dockUV,.002,.998)).r;
 float skyVisibility=mix(1.,.12+.88*incident,lowDeck);
 float contact=lowDeck*max(ambientFoot(footA),ambientFoot(footB));
 vec3 light=(fillLight*(1.-.66*contact)+sunLight*skyVisibility*(1.-contact));
 gl_FragColor=vec4(coating*grain*light+spec*skyVisibility*vec3(.78,.84,.85),1.);
}`;

// SwiftShader spends most of its frame in vertex lighting and texture filtering.
// Evaluate its fixed key / skylight once when uploading each rigid component.
const bakedVertex=`
precision highp float;
attribute vec3 position;
attribute vec4 color;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec4 coat;
varying vec2 atlasUV;
varying vec2 deck;
void main(){
 coat=color;atlasUV=uv;deck=position.xz;
 gl_Position=worldViewProjection*vec4(position,1.);
}`;
const bakedFragment=`
precision mediump float;
varying vec4 coat;
varying vec2 atlasUV;
varying vec2 deck;
uniform sampler2D steelAtlas;
uniform sampler2D sunChart;
uniform vec4 footA;
uniform vec4 footB;
float foot(vec4 a){vec2 d=(deck-a.xy)*a.zw;float q=max(0.,1.-dot(d,d));return q*q;}
void main(){
 vec3 ink=coat.rgb*texture2D(steelAtlas,atlasUV).rgb;
 if(coat.a>.5){
   float shadow=texture2D(sunChart,vec2((deck.x+7.1)/14.2,(deck.y+10.5)/21.)).r;
   ink*=mix(vec3(.42,.53,.61),vec3(1.),shadow)*(1.-.68*max(foot(footA),foot(footB)));
 }
 gl_FragColor=vec4(ink,1.);
}`;
export function bakePaint(positions,normals,colors) {
 for(let i=0,j=0;i<positions.length;i+=3,j+=4){
   const nx=normals[i],ny=normals[i+1],nz=normals[i+2],y=positions[i+1];
   const sun=Math.max(0,-.52*nx+.80*ny-.32*nz),rear=Math.max(0,.65*nx+.12*ny+.75*nz),up=.5+.5*ny;
   const sheen=Math.pow(Math.max(0,-.32*nx+.55*ny-.77*nz),26)*.12;
   colors[j]=colors[j]*(.19+.24*up+.10*rear+.99*sun)+sheen;
   colors[j+1]=colors[j+1]*(.31+.29*up+.31*rear+.77*sun)+sheen;
   colors[j+2]=colors[j+2]*(.416+.31*up+.42*rear+.52*sun)+sheen;
   colors[j+3]=y>=-.32&&y<=.14&&Math.abs(positions[i])<7&&Math.abs(positions[i+2])<10.5&&ny>.9?1:0;
 }
}

export function enamel(scene,texture){
 const B=BABYLON;
 const baked=/swiftshader|llvmpipe|software rasterizer/i.test(scene.getEngine().getGlInfo().renderer);
 const material=new B.ShaderMaterial('anodized hull and baked gantry occlusion',scene,baked?{vertexSource:bakedVertex,fragmentSource:bakedFragment}:{vertexSource,fragmentSource},{
   attributes:['position','normal','color','uv'],
   uniforms:['world','worldViewProjection','eyePos','bayTint','footA','footB'],
   samplers:['steelAtlas','sunChart']
 });
 const atlas=texture('hull.webp');atlas.anisotropicFilteringLevel=baked?1:2;
 material.metadata={bakePaint:baked?bakePaint:null};
 const daylight=texture('sunfall.webp');daylight.wrapU=daylight.wrapV=B.Texture.CLAMP_ADDRESSMODE;
 material.setTexture('steelAtlas',atlas);material.setTexture('sunChart',daylight);
 material.setVector3('eyePos',scene.activeCamera.position);
 material.setVector3('bayTint',new B.Vector3(.17,.34,.46));
 material.setVector4('footA',new B.Vector4(0,1.9,.7,.67));
 material.setVector4('footB',new B.Vector4(0,5,.7,.63));
 return material;
}

const FOOTPRINTS={
 echo:[[-.98,-2.10,1.02,1.19],[1.0,-1.33,2,2.5]],vault:[[-.98,-2.18,1.02,1.19],[0,5.85,.8,.8]],
 bridge:[[-.96,-2.0,1.7,1.7],[.42,5.05,1.0,1.19]],sphere:[[0,4.18,.40,.40],[0,2.19,1.7,1.7]],
 crystal:[[0,4.18,.40,.40],[0,2.19,1.7,1.7]],cargo:[[0,4.45,.35,.35],[0,2.04,1.6,1.6]],
 mirror:[[0,4,.58,.68],[1.4,3.57,1.5,1.6]],rings:[[-2,2.95,.7,.82],[2.8,2.95,.7,.82]],
 clinic:[[0,3.48,.66,.78],[2.0,3.58,1.,1.]],home:[[-.98,-2.15,1.,1.1],[.98,2.4,.75,.84]]
};
const TINTS={clinic:[.25,.66,.48],rings:[.67,.33,.12],mirror:[.58,.37,.53],home:[.60,.32,.16]};
export function applyCoating(material,section,position,w=0){
 const B=BABYLON, f=FOOTPRINTS[section.id];
 material.setVector3('eyePos',position);
 material.setVector3('bayTint',new B.Vector3(...(TINTS[section.id]||[.17,.34,.46])));
 material.setVector4('footA',new B.Vector4(...f[0]));material.setVector4('footB',new B.Vector4(...(section.id==='echo'&&w!==1?[90,90,1,1]:f[1])));
}
