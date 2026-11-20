import {CREW_PIECES,CREW_SOLE,isSleeve,shoulderFor} from './crew-model.js';
import { hypothesisSurfaceColor } from './hypothesis-colors.js';
import { TESSERACT, MODEL_PROJECTION_DISTANCE, REFERENCE_OMEGA } from './colored-tesseract.js';
import { hallPose } from './model-poses.js';
import { SPHERE_CORRIDOR } from './sphere-corridor.js';
import { OPTICAL_FADE_START, OPTICAL_FADE_END } from './optics.js';

// Group numbers live in UV.x. UV.y stores the belt slot number. All parts of
// each miniature, including the traveler, share a single indexed draw.
const FIXED = 0, BELT_SLOT = 1, RIGHT_ROOM = 2, LEFT_ROOM = 3, WALK_HALL = 4, WALK_SPHERE = 5;
const geometryByScene = new WeakMap();

function shapeData(B, family) {
  const data = new B.VertexData();
  const positions = [], indices = [], colors = [], uvs = [];
  const hues = new Map();
  function tint(color) {
    if (!hues.has(color)) hues.set(color, B.Color3.FromHexString(color).asArray());
    return hues.get(color);
  }
  function vertices(points, color, gain, kind, slot) {
    const base = positions.length / 3, [r,g,b] = tint(color);
    for (const point of points) {
      positions.push(...point);
      colors.push(r*gain, g*gain, b*gain, 1);
      uvs.push(kind, slot);
    }
    return base;
  }
  function face(points, color, gain = 1, kind = FIXED, slot = 0) {
    const base = vertices(points, color, gain, kind, slot);
    indices.push(base, base+1, base+2, base, base+2, base+3);
  }
  // Open room frames leave sight lines to the traveler with opaque geometry.
  // An inset ring per face replaces the translucent front/back wall overlap.
  function box(center, size, color, frame = false, kind = FIXED, slot = 0) {
    for (let axis=0; axis<3; axis++) {
      const u = (axis+1)%3, v = (axis+2)%3;
      for (const sign of [-1,1]) {
        const gain = .66 + .12*axis + .09*sign;
        const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => {
          const p = [...center];
          p[axis] += sign*size[axis]/2;
          p[u] += a*size[u]/2; p[v] += b*size[v]/2;
          return p;
        });
        if (!frame) { face(corners, color, gain, kind, slot); continue; }
        const inner = corners.map(point => {
          const p = [...point];
          p[u] = center[u] + (p[u]-center[u])*.79;
          p[v] = center[v] + (p[v]-center[v])*.79;
          return p;
        });
        const base = vertices([...corners,...inner],color,gain,kind,slot);
        for(let i=0; i<4; i++) {
          const j=(i+1)%4;
          indices.push(base+i,base+j,base+4+j,base+i,base+4+j,base+4+i);
        }
      }
    }
  }
  function annulus(r, halfWidth, y, color) {
    for (let i=0; i<32; i++) {
      const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
      const p=(t,radius)=>[radius*Math.sin(t),y,radius*Math.cos(t)];
      face([p(a,r-halfWidth),p(a,r+halfWidth),p(b,r+halfWidth),p(b,r-halfWidth)],color);
    }
  }
  function traveler(kind, scale, floor) {
    // At this distance a whole helmet is only a few pixels. Keep the large
    // plates from the pressure suit in the exhibit's existing single draw.
    for(const {name,shape,args} of CREW_PIECES) {
      if(shape!=='box')continue;
      const [x,y,z,w,h,d,color]=args;
      if(w*h*d<.003 && !(name==='visor'&&w>.34))continue;
      const [a,b,c]=isSleeve(name)?shoulderFor(name):[0,0,0];
      box([-(x+a)*scale,floor+(y+b-CREW_SOLE)*scale,-(z+c)*scale],
        [w*scale,h*scale,d*scale],'#'+color,false,kind);
    }
  }

  if (family === 'hall') {
    annulus(.67,.25*.67/2.35,-.075,'#44859e');
    for (let i=0;i<4;i++) {
      const [x,,z]=hallPose(i).position;
      box([x*.67,.1,z*.67],[.32,.4,.32],hypothesisSurfaceColor('H'+(i+1)),true);
    }
    box([0,.1,0],[.35,.35,.35],hypothesisSurfaceColor('HC'),true);
    traveler(WALK_HALL,.111,-.075);
  } else if (family === 'belt') {
    box([0,-.12,0],[1.75,.04,.42],'#78848a');
    for (let i=0;i<4;i++) box([0,.1,0],[.47,.4,.38],hypothesisSurfaceColor('T'+(i+1)),true,BELT_SLOT,i);
    box([0,.1,0],[.26,.3,.26],hypothesisSurfaceColor('TR1'),true,RIGHT_ROOM);
    box([0,.1,0],[.26,.3,.26],hypothesisSurfaceColor('TL1'),true,LEFT_ROOM);
    traveler(FIXED,.111,-.075);
  } else if (family === 'sphere') {
    const {innerRadius,outerRadius,halfWidth}=SPHERE_CORRIDOR;
    // Curved low deck with open side windows. Solid equatorial walls would
    // occlude the pilot completely when the near translucent panes become LOD.
    const h=halfWidth/3.5,inner=innerRadius/3.5,outer=outerRadius/3.5;
    const onSphere=(a,r,y)=>[Math.sin(a)*Math.sqrt(r*r-y*y),y,Math.cos(a)*Math.sqrt(r*r-y*y)];
    for(let sector=0;sector<4;sector++){
      const start=sector*Math.PI/2-Math.PI/4, color=hypothesisSurfaceColor('S'+(sector+1));
      for(let i=0;i<8;i++){
        const a=start+i*Math.PI/16,b=a+Math.PI/16;
        face([onSphere(a,inner,-h),onSphere(b,inner,-h),onSphere(b,outer,-h),onSphere(a,outer,-h)],color,.85);
        for(const r of [inner,outer]){
          face([onSphere(a,r,h-.018),onSphere(b,r,h-.018),onSphere(b,r,h),onSphere(a,r,h)],color);
          if(i%4===0) face([onSphere(a,r,-h),onSphere(a+.026,r,-h),onSphere(a+.026,r,h),onSphere(a,r,h)],color,.7);
        }
      }
    }
    // Polar reference and meridians retain the spherical silhouette without a glass overdraw pass.
    for(const axis of [0,2]) for(let i=0;i<24;i++) {
      const a=i*Math.PI/12, b=(i+1)*Math.PI/12;
      const p=(t,s)=>axis===0?[s,.5*Math.sin(t),.5*Math.cos(t)]:[.5*Math.cos(t),.5*Math.sin(t),s];
      face([p(a,-.007),p(a,.007),p(b,.007),p(b,-.007)],'#72a4ab');
    }
    for(const sign of [-1,1]) box([0,sign*.5,0],[.18,.18,.18],hypothesisSurfaceColor(sign>0?'SN':'SS'),true);
    traveler(WALK_SPHERE,.084,0);
  } else if (family === 'truth') {
    // A genuine line list. Shared endpoints and the incidence relation are
    // taken directly from the same tesseract as the near display.
    for(const [x,y,z,w] of TESSERACT.vertices) vertices([[x,y,z]],'#4174c8',1,6,w);
    for(const edge of TESSERACT.edges) indices.push(...edge);
  } else throw new RangeError('Unknown optical exhibit '+family);
  Object.assign(data, {positions,indices,colors,uvs});
  return data;
}

function shaders(B) {
  const store=B.Effect.ShadersStore;
  if(store.distantExhibitVertexShader) return;
  store.distantExhibitVertexShader=`precision highp float;
attribute vec3 position;
attribute vec4 color;
attribute vec2 uv;
uniform mat4 world,worldViewProjection;
uniform float travel;
varying vec3 roomPosition,lightColor;
varying float coverage;
void main(){
  vec3 p=position;coverage=1.0;
  float angle=travel*1.57079632679;
  float s=sin(angle),c=cos(angle);
  if(uv.x==1.0){
    float centre=mod(uv.y-travel+2.0,4.0)-2.0;
    coverage=smoothstep(0.0,.5,2.0-abs(centre));
    p.x+=centre*.47;
  } else if(uv.x==2.0 || uv.x==3.0){
    float side=uv.x==2.0?-1.0:1.0;
    p.xz=mat2(c,-side*s,side*s,c)*p.xz+vec2(0.0,.6*side);
  } else if(uv.x==4.0){
    vec3 radial=vec3(-s,0.0,c),forward=vec3(-c,0.0,-s);
    p=radial*(.67+p.x)+vec3(0.0,p.y,0.0)+forward*p.z;
  } else if(uv.x==5.0){
    vec3 radial=vec3(s,0.0,c),right=vec3(0.0,-1.0,0.0),forward=vec3(c,0.0,-s);
    p=(1.72/3.5-p.y)*radial+right*p.x+forward*p.z;
  } else if(uv.x==6.0){
    const float distance4=${MODEL_PROJECTION_DISTANCE.toFixed(10)};
    float theta=-floor(travel*125.0)/30.0*${REFERENCE_OMEGA.toFixed(10)};
    float cx=cos(theta),sx=sin(theta);
    float x=p.x*cx-uv.y*sx, w=p.x*sx+uv.y*cx;
    p=vec3(x,p.z,-p.y)*(distance4-1.0)/(distance4-w);
  }
  roomPosition=(world*vec4(p,1.0)).xyz;
  lightColor=color.rgb;
  gl_Position=worldViewProjection*vec4(p,1.0);
}`;
  store.distantExhibitFragmentShader=`precision highp float;
uniform vec4 clipPlanes[20];
uniform float planeCount;
uniform vec3 eye;
varying vec3 roomPosition,lightColor;
varying float coverage;
void main(){
  for(int i=0;i<20;i++){
    if(float(i)>=planeCount) break;
    if(dot(clipPlanes[i],vec4(roomPosition,1.0))<0.0) discard;
  }
  if(coverage<1.0){
    vec2 cell=mod(floor(gl_FragCoord.xy),2.0);
    if(coverage<(.5+cell.x+2.0*cell.y)*.25) discard;
  }
  float d=length(roomPosition-eye);
  float transmission=exp(-d*.006)*(1.0-smoothstep(${OPTICAL_FADE_START.toFixed(2)},${OPTICAL_FADE_END.toFixed(2)},d));
  gl_FragColor=vec4(mix(vec3(.58,.64,.66),lightColor,transmission),1.0);
}`;
}

export function createDistantExhibit(B,scene,instance,family) {
  shaders(B);
  let cache=geometryByScene.get(scene);
  if(!cache){cache=new Map();geometryByScene.set(scene,cache);}
  let geometry=cache.get(family);
  if(!geometry || geometry.isDisposed()){
    geometry=new B.Geometry('distant '+family+' geometry',scene,shapeData(B,family));
    cache.set(family,geometry);
  }
  const mesh=new B.Mesh('distant hologram '+family,scene);
  geometry.applyToMesh(mesh);
  // The GPU moves small parts outside their authored rest bounds. This
  // conservative local box covers the entire sweep, including wrapping carts.
  mesh.setBoundingInfo(new B.BoundingInfo(new B.Vector3(-1.25,-.65,-.92),new B.Vector3(1.25,.70,.92)));
  mesh.parent=instance.node;
  if(family==='truth'){
    mesh.setBoundingInfo(new B.BoundingInfo(new B.Vector3(-2,-2,-2),new B.Vector3(2,2,2)));
    mesh.scaling.setAll(.55);
    mesh.rotation.y=Math.PI/2;
  } else mesh.scaling.setAll(1.5);
  mesh.isPickable=false;
  const material=new B.ShaderMaterial('hologram LOD '+family,scene,'distantExhibit',{
    attributes:['position','color','uv'],
    uniforms:['world','worldViewProjection','travel','eye','planeCount','clipPlanes']
  });
  material.backFaceCulling=false;
  if(family==='truth') material.fillMode=B.Material.LineListDrawMode;
  material.setFloat('travel',0);
  material.setFloat('planeCount',0);
  material.setArray4('clipPlanes',new Float32Array(80));
  material.setVector3('eye',B.Vector3.Zero());
  instance.materials.push(material);
  mesh.material=material;mesh.setEnabled(false);
  return mesh;
}
