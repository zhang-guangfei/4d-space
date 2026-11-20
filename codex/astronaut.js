import {CREW_PIECES,CREW_EYE,CREW_SOLE,isSleeve,shoulderFor,visibleAtDistance} from './crew-model.js';
import {Batch} from './chapter2/scene-geometry.mjs';

// Articulation envelopes in the station's established eye-relative frame.
// Gear attached inside each envelope comes from the shared flight suit.
export const SUIT_COLORS=Object.freeze({suit:'#e8ece5',joint:'#7a8b91',visor:'#637d88',panel:'#acbec3',left:'#ee786c',right:'#dfbb73'});
export const SUIT_PARTS=Object.freeze([
 {name:'torso',group:'body',shape:'sphere',size:[.46,.64,.30],position:[0,-.55,-.02],material:'suit'},
 {name:'backpack',group:'body',shape:'sphere',size:[.36,.45,.20],position:[0,-.51,-.29],material:'suit',hideLocal:true},
 {name:'backpack panel',group:'body',shape:'box',size:[.20,.18,.018],position:[0,-.51,-.405],material:'panel',hideLocal:true},
 {name:'helmet',group:'body',shape:'sphere',size:[.40,.39,.38],position:[0,-.095,0],material:'suit',hideLocal:true},
 {name:'visor',group:'body',shape:'sphere',size:[.32,.18,.10],position:[0,-.10,.171],material:'visor',hideLocal:true},
 {name:'neck collar',group:'body',shape:'sphere',size:[.28,.08,.25],position:[0,-.29,0],material:'joint',hideLocal:true},
 {name:'chest controls',group:'body',shape:'box',size:[.22,.16,.025],position:[0,-.48,.151],material:'panel',hideLocal:true},
 ...['left','right'].flatMap((side,i)=>[
  {name:side+' shoulder patch',group:'body',shape:'sphere',size:[.13,.14,.28],position:[i?.29:-.29,-.30,0],material:side},
  {name:side+' leg',group:side+'Leg',shape:'sphere',size:[.19,.64,.21],position:[0,-.33,0],material:'suit'},
  {name:side+' boot',group:side+'Leg',shape:'sphere',size:[.23,.20,.34],position:[0,-.74,.10],material:'joint'},
  {name:side+' sole stripe',group:side+'Leg',shape:'box',size:[.18,.025,.25],position:[0,-.8275,.10],material:side},
  {name:side+' arm',group:side+'Arm',shape:'sphere',size:[.15,.50,.16],position:[0,-.23,.035],material:'suit'},
  {name:side+' cuff',group:side+'Arm',shape:'sphere',size:[.16,.075,.17],position:[0,-.43,.05],material:side},
  {name:side+' glove',group:side+'Arm',shape:'sphere',size:[.17,.17,.18],position:[0,-.50,.05],material:'suit'}
 ])
]);
export const SUIT_JOINTS=Object.freeze({body:[0,0,0],leftLeg:[-.13,-.84,-.03],rightLeg:[.13,-.84,-.03],leftArm:[-.34,-.30,0],rightArm:[.34,-.30,0]});
const crewScale=1.68/(CREW_EYE-CREW_SOLE);
const cpuCache=new WeakMap(), meshCache=new WeakMap(), cpuOnly={};

export function suitBuffers(B,distant=false) {
 let cache=cpuCache.get(B??cpuOnly);
 if(!cache)cpuCache.set(B??cpuOnly,cache=new Map());
 if(cache.has(distant))return cache.get(distant);
 const buffers=new Map();
 for(const part of SUIT_PARTS) {
  const data=new Batch(B);
  for(const piece of CREW_PIECES) {
   if(piece.name===part.name&&(!distant||visibleAtDistance(piece)))data[piece.shape](...piece.args);
  }
  const pivot=SUIT_JOINTS[part.group],offset=isSleeve(part.name)?shoulderFor(part.name):[0,0,0];
  // A half-turn changes facing -Z to +Z, preserving right/left chirality.
  // Subtract both anchors here; the live joint hierarchy adds them back.
  for(let n=0;n<data.positions.length;n+=3) {
   data.positions[n]=-(data.positions[n]+offset[0])*crewScale-pivot[0]-part.position[0];
   data.positions[n+1]=(data.positions[n+1]+offset[1]-CREW_EYE)*crewScale-pivot[1]-part.position[1];
   data.positions[n+2]=-(data.positions[n+2]+offset[2])*crewScale-pivot[2]-part.position[2];
   data.normals[n]*=-1;
   data.normals[n+2]*=-1;
  }
  buffers.set(part.name,data);
 }
 cache.set(distant,buffers);
 return buffers;
}

// Bake attached gear about a single pivot. A portal image needs five rigid
// draws; the instrument figures share two to four draws at much smaller scales.
export function joinSuitParts(B,parts,{pivot=[0,0,0],scale=1,distant=true}={}) {
 const data=B?new B.VertexData():{};
 data.positions=[];data.normals=[];data.colors=[];data.indices=[];
 const buffers=suitBuffers(B,distant);
 for(const part of parts) {
  const source=buffers.get(part.name),joint=SUIT_JOINTS[part.group],start=data.positions.length/3;
  for(let i=0;i<source.positions.length;i+=3)for(let k=0;k<3;k++){
   data.positions.push((source.positions[i+k]+part.position[k]+joint[k]-pivot[k])*scale);
  }
  data.normals.push(...source.normals);
  data.colors.push(...source.colors);
  for(const index of source.indices)data.indices.push(start+index);
 }
 return data;
}

export function createAstronautSuit(B,scene,{material,parent=null}={}) {
 const body=new B.TransformNode('astronaut',scene);
 body.parent=parent;body.metadata={asset:'station-crew-suit',anchor:'eyes'};
 const groups={body},parts=[];
 for(const [key,pos]of Object.entries(SUIT_JOINTS)) {
  if(key==='body')continue;
  const node=new B.TransformNode(key+' joint',scene);
  node.parent=body;node.position.set(...pos);groups[key]=node;
 }
 let geometry=meshCache.get(scene);
 if(!geometry)meshCache.set(scene,geometry=new Map());
 const buffers=suitBuffers(B);
 for(const part of SUIT_PARTS) {
  let shared=geometry.get(part.name);
  if(!shared||shared.isDisposed()){
   const data=new B.VertexData(),source=buffers.get(part.name);
   for(const key of ['positions','normals','colors','indices','uvs'])data[key]=source[key];
   shared=new B.Geometry('crew '+part.name,scene,data);
   geometry.set(part.name,shared);
  }
  const mesh=new B.Mesh(part.name,scene);
  shared.applyToMesh(mesh);
  mesh.position.set(...part.position);mesh.parent=groups[part.group];mesh.material=material(part.material);
  mesh.isPickable=false;
  mesh.metadata={asset:'station-crew-suit',suitPart:part.name,hideLocal:!!part.hideLocal};
  parts.push(mesh);
 }
 return {body,parts,arms:{left:groups.leftArm,right:groups.rightArm},legs:{left:groups.leftLeg,right:groups.rightLeg}};
}

export function suitBucket(part) {
 return ['left','right'].includes(part.material)?'accent':part.material==='suit'?'suit':'detail';
}

// Three opaque, closed batches in the eye frame, also usable without Babylon.
export function miniatureSuitGeometry(B) {
 return Object.fromEntries(['suit','detail','accent'].map(bucket=>[
  bucket,joinSuitParts(B,SUIT_PARTS.filter(part=>suitBucket(part)===bucket))
 ]));
}

const markerCache=new WeakMap();
// Preserve the two rigid pieces in room miniatures and the articulated
// helmet/visor attachment in the four-piece expanded hypotheses.
export function createCrewMarker(B,scene,{name,parent,material,expanded=false}) {
 const group=new B.TransformNode(name,scene);
 group.parent=parent;
 const keys=expanded?['torso','helmet','visor','boots']:['torso','helmet'];
 const pivot=[0,-1.68,0];
 const scale=expanded?.30:.115;
 const bucket=part=>{
  if(part.name==='visor')return expanded?'visor':'helmet';
  if(part.name==='helmet'||part.name==='neck collar')return 'helmet';
  if(expanded&&part.name.includes('boot'))return 'boots';
  return 'torso';
 };
 let cache=markerCache.get(scene);
 if(!cache)markerCache.set(scene,cache=new Map());
 for(const key of keys) {
  const id=String(expanded)+'/'+key;
  let geometry=cache.get(id);
  if(!geometry||geometry.isDisposed()){
   const data=joinSuitParts(B,SUIT_PARTS.filter(part=>bucket(part)===key),{scale,pivot});
   geometry=new B.Geometry('crew marker '+id,scene,data);
   cache.set(id,geometry);
  }
  const mesh=new B.Mesh(name+' '+key,scene);geometry.applyToMesh(mesh);
  mesh.material=material;mesh.parent=group;mesh.isPickable=false;
  if(key==='helmet')group.head=mesh;
 }
 return group;
}
