import { OPTICAL_FADE_START, OPTICAL_FADE_END } from './optics.js';
import { H } from './room-dimensions.js';

// These opaque, stationary surfaces share a single draw in a distant optical copy.
// The almost-clear panes can be omitted at that distance. People, artworks and
// moving models stay independent so their existence still follows the room state.
const surfaces = new Set(['shell', 'trim', 'accent', 'light', 'label', 'axislabel']);
export const isDistantShellPart = kind => surfaces.has(kind);

function installShaders(B) {
  const shaders = B.Effect.ShadersStore;
  if (shaders.distantStationVertexShader) return;
  shaders.distantStationVertexShader = `precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 color;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 eye;
varying vec4 surface;
varying vec2 texcoord;
varying vec3 roomPosition;
varying float facing;

void main() {
  vec4 p = world * vec4(position, 1.0);
  surface = color;
  texcoord = uv;
  roomPosition = p.xyz;
  facing = dot(mat3(world) * normal, eye - p.xyz);
  // A reflected portal chart also reflects the writing. Counter-flip the
  // printed name on its real front face, just as the near shell does.
  if (color.a > 1.5 && color.a < 2.5 &&
      dot(cross(world[0].xyz, world[1].xyz), world[2].xyz) < 0.0) {
    texcoord.x = 1.0 - texcoord.x;
  }
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;
  shaders.distantStationFragmentShader = `precision highp float;
varying vec4 surface;
varying vec2 texcoord;
varying vec3 roomPosition;
varying float facing;
uniform sampler2D hullTexture;
uniform sampler2D labelTexture;
uniform sampler2D axisTexture;
uniform vec3 eye;
uniform float planeCount;
uniform vec4 clipPlanes[20];

void main() {
  for (int i = 0; i < 20; i++) {
    if (float(i) >= planeCount) break;
    if (dot(clipPlanes[i], vec4(roomPosition, 1.0)) < 0.0) discard;
  }
  vec3 rgb = surface.rgb;
  if (surface.a > 1.5) {
    if (facing < 0.0) discard;
    if (surface.a < 2.5) rgb *= texture2D(labelTexture, texcoord).rgb;
    else rgb *= texture2D(axisTexture, texcoord).rgb;
  } else if (surface.a > 0.5) {
    rgb *= texture2D(hullTexture, texcoord).rgb;
  }
  float distanceToEye = length(eye - roomPosition);
  float horizon = smoothstep(${OPTICAL_FADE_START.toFixed(1)}, ${OPTICAL_FADE_END.toFixed(1)}, distanceToEye);
  float transmission = exp(-distanceToEye * 0.006) * (1.0 - horizon);
  gl_FragColor = vec4(mix(vec3(0.58, 0.64, 0.66), rgb, transmission), 1.0);
}`;
}


// One hatch contour supplies the three concentric strips (wall, bevel and lip).
// Choose the same source vertices for all three so there are no LOD cracks.
// Measure error in metres on the glass opening *and* on the outer wall boundary.
function chordError(points, index, start, end) {
  const px = points[index] - points[start], py = points[index+1] - points[start+1], pz = points[index+2] - points[start+2];
  const dx = points[end] - points[start], dy = points[end+1] - points[start+1], dz = points[end+2] - points[start+2];
  const length = dx*dx + dy*dy + dz*dz;
  const t = length ? Math.max(0, Math.min(1, (px*dx + py*dy + pz*dz) / length)) : 0;
  return (px-t*dx)**2 + (py-t*dy)**2 + (pz-t*dz)**2;
}

function reducedContours(template, B) {
  const meshOf = kind => template.meshes.find(part => part.kind === kind).mesh;
  const shell = meshOf('shell');
  const wall = shell.getVerticesData(B.VertexBuffer.PositionKind);
  const opening = meshOf('accent').getVerticesData(B.VertexBuffer.PositionKind);
  const indices = shell.getIndices(), contours = [];
  // Each quad is [inner,nextInner,outer, outer,nextInner,nextOuter].
  // The closing quad points back to the first station of its own door.
  for (let q = 0; q < indices.length; q += 6) {
    if (indices[q + 1] > indices[q]) continue;
    const first = indices[q + 1], total = 1 + (indices[q] - first) / 2;
    const retained = [0, Math.floor(total / 2), total];
    while (retained.length <= 20) {
      let maxError = 0, insertAt = 0, candidate = 0;
      for (let k = 1; k < retained.length; k++) {
        const from = retained[k - 1], to = retained[k];
        const start = 3 * (first + 2 * from), end = 3 * (first + 2 * (to % total));
        for (let i = from + 1; i < to; i++) {
          const pos = 3 * (first + 2 * i);
          // Outer corners and the flat walk threshold produce the largest
          // deviation first; a regular circle spends its budget on smooth bends.
          const error = Math.max(chordError(opening, pos, start, end),
            chordError(wall, pos+3, start+3, end+3));
          if (error > maxError) { maxError = error; candidate = i; insertAt = k; }
        }
      }
      if (maxError < .012**2) break;
      retained.splice(insertAt, 0, candidate);
    }
    retained.pop(); // the closing vertex is the same as the first one
    contours.push(retained.map(i => first + i*2));
  }
  return contours;
}

function selectRings(piece, contours) {
  const result = { positions: [], normals: [], uvs: [], indices: [] };
  for (const contour of contours) {
    const base = result.positions.length / 3;
    for (const [i, index] of contour.entries()) {
      for (const v of [index, index + 1]) {
        result.positions.push(...piece.positions.slice(v*3, v*3 + 3));
        result.normals.push(...piece.normals.slice(v*3, v*3 + 3));
        result.uvs.push(piece.uvs[v*2], piece.uvs[v*2 + 1]);
      }
      const inner = base + i*2, next = base + ((i+1) % contour.length)*2;
      result.indices.push(inner, next, inner+1, inner+1, next, next+1);
    }
  }
  return result;
}

// Each group owns complete triangles. Its box includes the diffuser and painted
// signs as well as the recessed door frame. A plane can reject the group only
// when even the corner farthest inside the optical cone is outside.
function partitionFaces(data) {
  const groups = Array.from({length: 6}, () => ({
    indices: [], lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity]
  }));
  const {positions, indices} = data;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]*3, b = indices[t+1]*3, c = indices[t+2]*3;
    let face = 0, greatest = -1;
    for (let k = 0; k < 3; k++) {
      const center = positions[a+k] + positions[b+k] + positions[c+k];
      if (Math.abs(center) > greatest) {
        greatest = Math.abs(center);
        face = k*2 + Number(center > 0);
      }
    }
    const group = groups[face];
    for (let v = t; v < t+3; v++) {
      const index = indices[v];
      group.indices.push(index);
      for (let k = 0; k < 3; k++) {
        const p = positions[index*3+k];
        group.lo[k] = Math.min(group.lo[k], p);
        group.hi[k] = Math.max(group.hi[k], p);
      }
    }
  }
  return groups;
}

const templateFaces = new WeakMap();
const instanceFaces = new WeakMap();

export function selectDistantFaces(mesh, transform, planes) {
  const state = instanceFaces.get(mesh);
  const shell = state.shell;
  const {rotation, offset} = transform;
  let mask = 63;
  for (const p of planes) {
    // Evaluate the world-space plane against canonical room coordinates.
    const x = p[0]*rotation[0][0] + p[1]*rotation[0][1] + p[2]*rotation[0][2];
    const y = p[0]*rotation[1][0] + p[1]*rotation[1][1] + p[2]*rotation[1][2];
    const z = p[0]*rotation[2][0] + p[1]*rotation[2][1] + p[2]*rotation[2][2];
    const d = p[3] + p[0]*offset[0] + p[1]*offset[1] + p[2]*offset[2];
    for (let i = 0; i < 6; i++) {
      if (!(mask & (1 << i))) continue;
      const {lo,hi} = shell.groups[i];
      const furthest = x*(x<0?lo[0]:hi[0]) + y*(y<0?lo[1]:hi[1]) + z*(z<0?lo[2]:hi[2]) + d;
      if (furthest < -.0005) mask &= ~(1 << i);
    }
  }
  if (state.mask === mask) return;
  state.mask = mask;
  mesh.isVisible = mask !== 0;
  if (!mask) return;
  let geometry = shell.variants.get(mask);
  if (!geometry || geometry.isDisposed()) {
    const full = shell.variants.get(63);
    geometry = new shell.B.Geometry(full.id + '/faces/' + mask, mesh.getScene());
    for (const kind of full.getVerticesDataKinds()) {
      // Own a distinct view/reference on the shared GPU allocation. Disposing
      // the last optical instance of a variant cannot invalidate the full hull.
      const source = full.getVertexBuffer(kind);
      const view = new shell.B.VertexBuffer(mesh.getEngine(), source.getWrapperBuffer(), kind, {
        size: source.getSize(), stride: source.byteStride, offset: source.byteOffset,
        type: source.type, normalized: source.normalized, useBytes: true, takeBufferOwnership: true
      });
      geometry.setVerticesBuffer(view, full.getTotalVertices());
    }
    const indices = [];
    for (let i = 0; i < 6; i++) if (mask & (1 << i)) indices.push(...shell.groups[i].indices);
    geometry.setIndices(indices, full.getTotalVertices());
    shell.variants.set(mask, geometry);
  }
  if (geometry !== mesh.geometry) {
    // Babylon preserves any previous submesh which fits the new geometry.
    // A wider portal must draw the newly exposed indices as well.
    mesh.releaseSubMeshes();
    geometry.applyToMesh(mesh);
  }
}

function bakeShell(B, scene, template, name, cellColor) {
  const contours = reducedContours(template, B);
  const colors = {
    shell: [1, 1, 1], trim: [.55, .63, .65], accent: B.Color3.FromHexString(cellColor).asArray(),
    light: [1, .88, .66], label: [1, 1, 1], axislabel: [1, 1, 1]
  };
  // Alpha carries a material index; the whole draw is opaque and depth writing.
  const textureKind = { shell: 1, label: 2, axislabel: 3 };
  const combined = new B.VertexData();
  combined.positions = [];
  combined.normals = [];
  combined.uvs = [];
  combined.indices = [];
  combined.colors = [];
  for (const { kind, mesh } of template.meshes) {
    if (!isDistantShellPart(kind)) continue;
    let piece = B.VertexData.ExtractFromMesh(mesh, true, true);
    piece.transform(mesh.computeWorldMatrix(true));
    if (kind === 'shell' || kind === 'trim' || kind === 'accent') piece = selectRings(piece, contours);
    const offset = combined.positions.length / 3;
    for (const index of piece.indices) combined.indices.push(offset + index);
    combined.positions.push(...piece.positions);
    combined.normals.push(...piece.normals);
    combined.uvs.push(...piece.uvs);
    const tint = colors[kind];
    const mode = textureKind[kind] || 0;
    for (let i = 0; i < piece.positions.length; i += 3) {
      // The fixture is fixed to the room. Reuse its light solution for every
      // view of the same cell, even after the optical chart has rotated.
      const x = -piece.positions[i], y = H - 1.2 - piece.positions[i + 1], z = -piece.positions[i + 2];
      const diffuse = Math.max(0, (x * piece.normals[i] + y * piece.normals[i + 1] + z * piece.normals[i + 2]) / (Math.hypot(x, y, z) || 1));
      if (kind === 'shell') {
        combined.colors.push(.39 + .55 * diffuse, .54 + .45 * diffuse, .66 + .30 * diffuse, mode);
      } else {
        const gain = kind === 'light' ? 1.1 : kind === 'label' ? .95 : .51 + .45 * diffuse;
        combined.colors.push(tint[0] * gain, tint[1] * gain, tint[2] * gain, mode);
      }
    }
  }
  const source = new B.Mesh('distant shell template ' + name, scene);
  combined.applyToMesh(source);
  const variants = new Map([[63, source.geometry]]);
  templateFaces.set(source, {B, groups: partitionFaces(combined), variants});
  source.onDisposeObservable.add(() => {
    for (const [mask, geometry] of variants) if (mask !== 63) geometry.dispose();
    variants.clear();
  });
  source.setEnabled(false);
  source.isPickable = false;
  return source;
}

/** Call after constructing a cell's regular template. The template owns the
 * shared source geometry; the optical instance owns the clone and clip material.
 * Toggle the returned mesh and the regular shell pieces as mutually exclusive LODs.
 */
export function createDistantShell(B, scene, template, instance, cellColor, hullTexture) {
  installShaders(B);
  const name = template.texture.name;
  template.distantShell ??= bakeShell(B, scene, template, name, cellColor);
  const mesh = template.distantShell.clone('distant ' + name, instance.node);
  instanceFaces.set(mesh, {shell: templateFaces.get(template.distantShell), mask: 63});
  const material = new B.ShaderMaterial('optical shell ' + name, scene,
    { vertex: 'distantStation', fragment: 'distantStation' },
    { attributes: ['position', 'normal', 'uv', 'color'],
      uniforms: ['world', 'worldViewProjection', 'eye', 'planeCount', 'clipPlanes'],
      samplers: ['hullTexture', 'labelTexture', 'axisTexture'] });
  material.backFaceCulling = false;
  material.setTexture('hullTexture', hullTexture);
  material.setTexture('labelTexture', template.texture);
  material.setTexture('axisTexture', template.axisTexture);
  material.setVector3('eye', B.Vector3.Zero());
  material.setFloat('planeCount', 0);
  material.setArray4('clipPlanes', new Float32Array(80));
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  instance.materials.push(material);
  return mesh;
}
