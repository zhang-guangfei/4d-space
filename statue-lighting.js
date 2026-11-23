// Museum-grade 3-point sculptural lighting for classical marble statues (Venus de Milo & David).
// Fixed exhibit-space warm key + cool architectural bounce + subtle warm floor up-fill
// delivers crisp chiaroscuro form without a headlamp following the viewer, while keeping
// rotated backs and overhangs readable. Portal hosts inverse-transform normals to the room frame.
export const STATUE_LIGHTING_GLSL=`
float statueLobe(vec3 N,vec3 direction){
 float wrapped=.5+.5*dot(N,normalize(direction));
 return wrapped*wrapped;
}
vec3 softStatueColor(vec3 albedo,vec3 N){
 vec3 keyDir=normalize(vec3(-.54,.74,-.40));
 vec3 fillDir=normalize(vec3(.68,.20,.70));
 vec3 bounceDir=normalize(vec3(-.18,-.88,.44));
 float keyDiff=max(dot(N,keyDir),0.0);
 float keyWrap=statueLobe(N,vec3(-.54,.74,-.40));
 float fillLobe=statueLobe(N,vec3(.68,.20,.70));
 float bounceLobe=statueLobe(N,vec3(-.18,-.88,.44));
 float illumination=.21+.54*keyWrap+.13*fillLobe+.07*bounceLobe;
 // Warm gallery spotlight vs cool architectural shadow fill for sculptural depth
 vec3 warmKey=vec3(1.07,.98,.87)*(keyDiff*.44+keyWrap*.26);
 vec3 coolFill=vec3(.74,.85,1.02)*(.18+fillLobe*.18);
 vec3 floorBounce=vec3(.96,.88,.76)*(bounceLobe*.08);
 vec3 lit=albedo*(warmKey+coolFill+floorBounce);
 // Subtle warm marble subsurface sheen near terminator
 float sss=pow(max(0.0,1.0-abs(dot(N,keyDir))),2.4)*.055;
 lit+=albedo*vec3(1.08,.94,.80)*sss;
 return mix(albedo*illumination,lit,.88);
}`;
export function createSoftStatueMaterial(B,scene,name,texture){
 B.Effect.ShadersStore.softStatueVertexShader=`precision highp float;
 attribute vec3 position;attribute vec3 normal;attribute vec2 uv;
 uniform mat4 world;uniform mat4 worldViewProjection;
 varying vec3 vNormal;varying vec2 vUV;varying vec3 vLocal;
 void main(){vNormal=normalize(mat3(world)*normal);vUV=uv;vLocal=position;
 gl_Position=worldViewProjection*vec4(position,1.0);}`;
 B.Effect.ShadersStore.softStatueFragmentShader=`precision highp float;
 varying vec3 vNormal;varying vec2 vUV;varying vec3 vLocal;uniform sampler2D labelTexture;
 ${STATUE_LIGHTING_GLSL}
 void main(){vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
 vec3 base=texture2D(labelTexture,vUV).rgb;
 float vein=sin(vLocal.y*11.0+sin(vLocal.x*7.5+vLocal.z*6.5)*2.4)*.5+.5;
 base*=mix(.94,1.02,smoothstep(.15,.85,vein));
 gl_FragColor=vec4(softStatueColor(base,N),1.0);}`;
 const m=new B.ShaderMaterial(name,scene,{vertex:'softStatue',fragment:'softStatue'},
 {attributes:['position','normal','uv'],uniforms:['world','worldViewProjection'],samplers:['labelTexture']});
 m.setTexture('labelTexture',texture);m.backFaceCulling=false;m.disableDepthWrite=false;
 m.metadata={statueSoftLighting:true};return m;
}
