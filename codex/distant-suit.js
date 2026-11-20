import { SUIT_COLORS, SUIT_JOINTS, SUIT_PARTS } from './astronaut.js';
import { OPTICAL_FADE_START, OPTICAL_FADE_END } from './optics.js';

// Remote self-images use the same anchors and side markings as the local suit.
// Bake the 21 parts into the five independently articulated rigid groups.
const geometryByScene = new WeakMap();

function suitGeometry(B, scene) {
  let geometry = geometryByScene.get(scene);
  if (geometry && !geometry.body.isDisposed()) return geometry;
  const box = B.VertexData.CreateBox({ size: 1 });
  const rounded = B.VertexData.CreateIcoSphere({ radius: .5, subdivisions: 1, flat: false });
  const detailed = B.VertexData.CreateIcoSphere({ radius: .5, subdivisions: 2, flat: false });
  geometry = {};
  for (const group of Object.keys(SUIT_JOINTS)) {
    const data = new B.VertexData();
    data.positions = [];
    data.normals = [];
    data.colors = [];
    data.indices = [];
    for (const part of SUIT_PARTS.filter(p => p.group === group)) {
      const shape = part.shape === 'box' ? box : ['helmet', 'torso'].includes(part.name) ? detailed : rounded;
      const offset = data.positions.length / 3;
      const color = B.Color3.FromHexString(SUIT_COLORS[part.material]);
      for (const index of shape.indices) data.indices.push(index + offset);
      for (let i = 0; i < shape.positions.length; i += 3) {
        const normals = shape.normals;
        const nx = normals[i] / part.size[0], ny = normals[i+1] / part.size[1], nz = normals[i+2] / part.size[2];
        const length = Math.hypot(nx, ny, nz);
        data.positions.push(part.position[0] + part.size[0]*shape.positions[i],
          part.position[1] + part.size[1]*shape.positions[i+1], part.position[2] + part.size[2]*shape.positions[i+2]);
        data.normals.push(nx/length, ny/length, nz/length);
        data.colors.push(color.r, color.g, color.b, 1);
      }
    }
    geometry[group] = new B.Geometry('optical suit ' + group, scene, data);
  }
  geometryByScene.set(scene, geometry);
  return geometry;
}

function clipMaterial(B, scene) {
  const shaders = B.Effect.ShadersStore;
  if (!shaders.opticalSuitVertexShader) {
    shaders.opticalSuitVertexShader = `precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 lightPosition;
varying vec3 worldPoint;
varying vec3 litColor;
void main() {
  worldPoint = (world * vec4(position, 1.0)).xyz;
  vec3 N = normalize(mat3(world) * normal);
  vec3 L = normalize(lightPosition - worldPoint);
  litColor = color.rgb * (.50 + .47 * max(dot(N,L), 0.0));
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
      uniforms: ['world', 'worldViewProjection', 'lightPosition', 'eye', 'planeCount', 'clipPlanes']
    });
  mat.setVector3('eye', B.Vector3.Zero());
  mat.setVector3('lightPosition', new B.Vector3(0, 1.8, 0));
  mat.setFloat('planeCount', 0);
  mat.setArray4('clipPlanes', new Float32Array(80));
  return mat;
}

/** Compatible with createAstronautSuit's body/arms/legs animation handles. */
export function createDistantSuit(B, scene, { parent, instance }) {
  const geometry = suitGeometry(B, scene);
  const material = clipMaterial(B, scene);
  instance.materials.push(material);
  const groups = {};
  for (const [group, position] of Object.entries(SUIT_JOINTS)) {
    const mesh = new B.Mesh('astronaut distant ' + group, scene);
    mesh.parent = group === 'body' ? parent : groups.body;
    mesh.position.set(...position);
    geometry[group].applyToMesh(mesh);
    mesh.material = material;
    mesh.isPickable = false;
    groups[group] = mesh;
  }
  return {
    body: groups.body, arms: { left: groups.leftArm, right: groups.rightArm },
    legs: { left: groups.leftLeg, right: groups.rightLeg }, parts: Object.values(groups),
  };
}
