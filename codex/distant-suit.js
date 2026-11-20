import { SUIT_JOINTS, SUIT_PARTS, joinSuitParts } from './astronaut.js';
import { OPTICAL_FADE_START, OPTICAL_FADE_END } from './optics.js';

// Remote self-images use the same anchors and side markings as the local suit.
// Bake their fittings into five rigid groups around the original motion pivots.
const geometryByScene = new WeakMap();

function suitGeometry(B, scene, detailed) {
  let levels=geometryByScene.get(scene);
  if(!levels)geometryByScene.set(scene,levels=new Map());
  let geometry=levels.get(detailed);
  if(geometry&&!geometry.body.isDisposed())return geometry;
  geometry={};
  for (const [group,pivot] of Object.entries(SUIT_JOINTS)) {
    const parts=SUIT_PARTS.filter(p=>p.group===group);
    const data=joinSuitParts(B,parts,{pivot,distant:!detailed});
    geometry[group]=new B.Geometry((detailed?'survey suit ':'optical suit ')+group,scene,data);
  }
  levels.set(detailed,geometry);
  return geometry;
}

export function crewMaterial(B,scene,instance) {
  if(instance.crewMaterial)return instance.crewMaterial;
  const shaders = B.Effect.ShadersStore;
  if (!shaders.opticalSuitVertexShader) {
    shaders.opticalSuitVertexShader = `precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 lightPosition, eye;
uniform mat4 statueLightFrame;
varying vec3 worldPoint;
varying vec3 litColor;
void main() {
  worldPoint = (world * vec4(position, 1.0)).xyz;
  vec3 N = normalize(mat3(world) * normal);
  vec3 L = normalize(lightPosition - worldPoint);
  // Warm overhead task lights, a cool return from the room and a restrained
  // coaxial inspection light. All three are evaluated per vertex.
  vec3 roomNormal=mat3(statueLightFrame)*N;
  vec3 V=normalize(eye-worldPoint);
  float overhead=max(dot(N,L),0.0);
  float bounce=max(dot(roomNormal,vec3(-.74,.32,.59)),0.0);
  float inspection=max(dot(N,V),0.0);
  vec3 irradiance=vec3(.28,.33,.39)+vec3(.74,.65,.49)*overhead
    +vec3(.20,.26,.29)*bounce+vec3(.26,.23,.19)*inspection;
  litColor=color.rgb*irradiance;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;
    shaders.opticalSuitFragmentShader = `precision highp float;
varying vec3 worldPoint;
varying vec3 litColor;
uniform vec3 eye;
uniform float planeCount;
uniform vec4 clipPlanes[20];
void main() {
  for (int i = 0; i < 20; i++) {
    if (float(i) >= planeCount) break;
    if (dot(clipPlanes[i], vec4(worldPoint,1.0)) < 0.0) discard;
  }
  float d = length(eye - worldPoint);
  float horizon = smoothstep(${OPTICAL_FADE_START.toFixed(1)}, ${OPTICAL_FADE_END.toFixed(1)}, d);
  gl_FragColor = vec4(mix(vec3(.58,.64,.66), litColor, exp(-.006*d)*(1.0-horizon)), 1.0);
}`;
  }
  const mat = new B.ShaderMaterial('remote suit optical path', scene,
    { vertex: 'opticalSuit', fragment: 'opticalSuit' }, {
      attributes: ['position', 'normal', 'color'],
      uniforms: ['world', 'worldViewProjection', 'lightPosition', 'eye', 'statueLightFrame', 'planeCount', 'clipPlanes']
    });
  mat.setMatrix('statueLightFrame', B.Matrix.Identity());
  mat.setVector3('eye', B.Vector3.Zero());
  mat.setVector3('lightPosition', new B.Vector3(0, 1.8, 0));
  mat.setFloat('planeCount', 0);
  mat.setArray4('clipPlanes', new Float32Array(80));
  instance.materials.push(mat);
  instance.crewMaterial=mat;
  return mat;
}

/** Compatible with createAstronautSuit's body/arms/legs animation handles. */
export function createDistantSuit(B, scene, { parent, instance }) {
  const geometry = suitGeometry(B, scene, false);
  const material = crewMaterial(B, scene, instance);
  const groups = {};
  for (const [group, position] of Object.entries(SUIT_JOINTS)) {
    const mesh = new B.Mesh('astronaut distant ' + group, scene);
    mesh.parent = group === 'body' ? parent : groups.body;
    mesh.position.set(...position);
    geometry[group].applyToMesh(mesh);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata={asset:'optical-crew-suit',detail:'distant'};
    groups[group] = mesh;
  }
  let detailed=false;
  function setDetail(next) {
    if(next===detailed)return;
    const geometry=suitGeometry(B,scene,next);
    for(const [key,mesh] of Object.entries(groups)) {
      geometry[key].applyToMesh(mesh);
      mesh.releaseSubMeshes();
      new B.SubMesh(0,0,mesh.getTotalVertices(),0,mesh.getTotalIndices(),mesh);
      mesh.metadata.detail=next?'full':'distant';
    }
    detailed=next;
  }
  return {
    setDetail,body: groups.body, arms: { left: groups.leftArm, right: groups.rightArm },
    legs: { left: groups.leftLeg, right: groups.rightLeg }, parts: Object.values(groups),
  };
}
