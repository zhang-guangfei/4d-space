import {ASSET_DATA} from './assets/classical-statues/geometry.js';

export const STATUE_ASSETS = Object.fromEntries([['bronze','venus'],['stone','david']].map(([kind,id]) => {
 const asset = ASSET_DATA[id];
 return [kind, {id, name:id==='venus'?'venus-de-milo':'filip-david', bounds:asset.bounds,
  triangles:asset.high.triangles, lodTriangles:asset.low.triangles}];
}));
const sceneCache = new WeakMap(), decoded = new Map(), pending = new Map(), failedAt = new Map();
async function loadData(kind, lod) {
 const id = STATUE_ASSETS[kind].id, spec = ASSET_DATA[id][lod];
 const url = new URL('./assets/classical-statues/' + spec.file, import.meta.url);
 let buffer;
 if (url.protocol === 'file:' && typeof process !== 'undefined') {
  const {readFile} = await import('node:fs/promises');
  const data = await readFile(url);
  buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
 } else {
  const response = await fetch(url);
  if (!response.ok) throw Error('雕像资源未载入 ' + spec.file);
  buffer = await response.arrayBuffer();
 }
 const fields = {};
 for (const [field,[offset,length]] of Object.entries(spec.fields)) {
  const ArrayType = field === 'indices' ? Uint32Array : Float32Array;
  fields[field] = new ArrayType(buffer,offset,length);
 }
 decoded.set(kind+lod,fields);
}
await Promise.all(Object.entries(STATUE_ASSETS).flatMap(([kind,asset]) => {
 const lods = typeof window==='undefined' ? ['low','mid','high'].filter(lod=>ASSET_DATA[asset.id][lod]) : ['low'];
 return lods.map(lod=>loadData(kind,lod));
}));

// Hysteresis avoids repeated GPU geometry swaps while hovering near a boundary.
export function selectStatueLOD({kind,distance,software=false,native=false,zoom=false,previous='low'}) {
 const inspection = native || zoom;
 const near = inspection ? 9 : software ? (kind==='stone'?2.8:5) : 6;
 if (distance < near*(previous==='high'?1.18:1)) return 'high';
 if (kind==='stone' && distance < (inspection?15:8)*(previous==='mid'?1.2:1)) return 'mid';
 return 'low';
}

export function statueData(kind,lod='low') {
 const data = decoded.get(kind+lod);
 if (!data) throw Error('Statue buffers unavailable: '+kind+' '+lod);
 return data;
}
function geometryFor(B,scene,kind,lod){let cache=sceneCache.get(scene);if(!cache){cache=new Map();sceneCache.set(scene,cache);}const key=kind+lod;let geometry=cache.get(key);if(!geometry||geometry.isDisposed()){const vd=new B.VertexData();Object.assign(vd,statueData(kind,lod));geometry=new B.Geometry('shared-classical-'+key,scene,vd,false);cache.set(key,geometry);}return geometry;}
export function prewarmClassicalStatues(B,scene){for(const kind of ['bronze','stone'])for(const lod of ['high','low'])if(decoded.has(kind+lod))geometryFor(B,scene,kind,lod);}
export function setStatueDetail(B,scene,mesh,lod){const kind=mesh.metadata?.statueKind;if(!kind)return;
 const key = kind+lod;
 if (!decoded.has(key)) {
  if (!pending.has(key) && (!failedAt.has(key) || Date.now() - failedAt.get(key) > 30000)) {
   pending.set(key,loadData(kind,lod).catch(() => failedAt.set(key,Date.now())).finally(() => pending.delete(key)));
  }
  return;
 }
 const geometry=geometryFor(B,scene,kind,lod);if(mesh.geometry!==geometry){geometry.applyToMesh(mesh);
 // Geometry swaps do not resize a clone's existing SubMesh draw range.
 // Rebuild the single-material draw range for BOTH near and far buffers.
 mesh.releaseSubMeshes();new B.SubMesh(0,0,mesh.getTotalVertices(),0,mesh.getTotalIndices(),mesh);
 mesh.metadata={...mesh.metadata,lod};}}
export function createClassicalStatue(B,scene,{kind='bronze',lod='low',name='classical-statue',material=null}={}){const asset=STATUE_ASSETS[kind];if(!asset)throw Error('Unknown classical statue '+kind);const mesh=new B.Mesh(name,scene);geometryFor(B,scene,kind,lod).applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;mesh.metadata={asset:asset.name,statueKind:kind,lod,bounds:asset.bounds};return mesh;}
