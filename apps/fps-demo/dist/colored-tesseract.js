/** Original exact hypercube combinatorics; no external geometry/code copied.
 * Coordinates are [X,Y,Z,W]. IDs use station-compatible trailing signs.
 * Projection is 4D perspective to 3D, then the application's 3D camera to screen.
 */
export const AXES=Object.freeze(['X','Y','Z','W']);
export const CELL_IDS=Object.freeze(['W+','W-','X+','X-','Y+','Y-','Z+','Z-']);
export const CELL_COLORS=Object.freeze({'W+':'#ffffff','W-':'#ffd500','X+':'#ed3036','X-':'#ff8b20','Y+':'#2878ef','Y-':'#25be59','Z+':'#a867e8','Z-':'#26dce5'});
export const PROJECTION_LABEL='四维超立方体边界 → 三维透视投影 → 屏幕；彩色内缩线框仅用于区分胞，不是拆开的真实空间。';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const vertices=Array.from({length:16},(_,i)=>AXES.map((_,a)=>(i>>a&1)?1:-1));
const edges=[];for(let i=0;i<16;i++)for(let a=0;a<4;a++){const j=i^(1<<a);if(i<j)edges.push([i,j]);}
const faces=[];for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){const fixed=[0,1,2,3].filter(k=>k!==a&&k!==b);for(let mask=0;mask<4;mask++){let v=0;fixed.forEach((k,j)=>{if(mask>>j&1)v|=1<<k;});faces.push([v,v^(1<<a),v^(1<<a)^(1<<b),v^(1<<b)]);}}
const cells=CELL_IDS.map(id=>{const axis=AXES.indexOf(id[0]),sign=id[1]==='+'?1:-1,vi=vertices.flatMap((v,i)=>v[axis]===sign?[i]:[]),has=new Set(vi);return {id,axis,sign,color:CELL_COLORS[id],vertices:vi,edges:edges.filter(e=>e.every(i=>has.has(i))),faces:faces.filter(f=>f.every(i=>has.has(i))),neighbors:CELL_IDS.filter(other=>other[0]!==id[0]),opposite:id[0]+(sign===1?'-':'+')};});
export const TESSERACT=freeze({vertices,edges,faces,cells});
export function canonicalCell(id){const s=String(id).toUpperCase().replace('−','-');const n=/^[+-][WXYZ]$/.test(s)?s[1]+s[0]:s;if(!CELL_IDS.includes(n))throw new RangeError('Unknown cell '+id);return n;}
export function rotate4(point,plane='XW',angle=0){const [a,b]=String(plane).toUpperCase().split('').map(x=>AXES.indexOf(x));if(a<0||b<0||a===b||String(plane).length!==2||!Number.isFinite(angle))throw new RangeError('Invalid 4D rotation');const p=[...point],c=Math.cos(angle),s=Math.sin(angle);p[a]=c*point[a]-s*point[b];p[b]=s*point[a]+c*point[b];return p;}
export function project4(point,distance=4){if(!Number.isFinite(distance)||distance<=2)throw new RangeError('Projection distance must exceed 4D vertex radius 2');const k=distance/(distance-point[3]);return point.slice(0,3).map(v=>v*k);}
export function modelState(options={}){const selected=canonicalCell(options.selected??'W+'),plane=options.plane??'XW',angle=options.angle??0;rotate4([0,0,0,0],plane,angle);return Object.freeze({selected,plane,angle,distance:options.distance??4});}
/** Pure descriptors. Exact adjacency never comes from projected overlap.
 * inset=0.94 is illustrative only; selected faces and neutral edges remain exact.
 */
export function modelGeometry(options={}){const state=modelState(options),project=p=>project4(rotate4(p,state.plane,state.angle),state.distance),points=vertices.map(project),selected=cells.find(c=>c.id===state.selected);return {state,points,edges:edges.map(e=>e.map(i=>points[i])),cells:cells.map((cell,index)=>{const center=[0,0,0,0];center[cell.axis]=cell.sign;const inset=vertices.map(p=>p.map((v,a)=>center[a]+(v-center[a])*.94));const role=cell.id===state.selected?'selected':cell.id===selected.opposite?'opposite':'neighbor';// External label rails avoid W± center overlap. Leaders indicate projected cell centers.
 const labelPosition=[index%2===0?-2.4:2.4,1.8-Math.floor(index/2)*1.2,0];
 return {id:cell.id,color:cell.color,role,alpha:role==='opposite'?.16:role==='selected'?1:.7,center:project(center),labelPosition,lines:cell.edges.map(e=>e.map(i=>project(inset[i]))),faces:cell.faces.map(f=>f.map(i=>points[i]))};})};}
/** Rendering helper for inspector OR miniature. Host may override ALL material types
 * via materialFactory({kind,color,alpha,id,role}, scene) for portal clipping.
 * Custom materials remain host-owned. No canvas, game state or camera is touched.
 */
export function createColoredTesseract(B,scene,options={}){
 const root=new B.TransformNode('colored tesseract',scene),owned=[],meshes=[],materials=new Map();root.parent=options.parent??null;root.scaling.setAll(options.scale??1);root.metadata={model:'colored-tesseract',noPedestal:true,projection:PROJECTION_LABEL};let state=modelState(options),disposed=false;
 const material=(key,spec)=>{let m=materials.get(key);if(!m){m=options.materialFactory?.(spec,scene);if(!m){m=new B.StandardMaterial('tesseract '+key,scene);m.backFaceCulling=false;m.disableDepthWrite=true;owned.push(m);}materials.set(key,m);}if(owned.includes(m)){m.diffuseColor=B.Color3.FromHexString(spec.color);m.emissiveColor=m.diffuseColor.scale(.65);m.alpha=spec.alpha;}return m;};
 const batches=new Map();let selectedMesh=null;
 // Prewarm every selected-fill material: a cell click allocates no materials.
 for(const id of CELL_IDS)material('fill '+id,{kind:'selected-fill',category:'selected-volume',cellId:id,color:CELL_COLORS[id],alpha:.10});
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a);return n>1e-12?a.map(x=>x/n):[1,0,0];};
 function edgeBatch(key,segments,radius,spec){const positions=[],normals=[],indices=[];
 for(const [a,b] of segments){const d=unit(b.map((v,i)=>v-a[i])),u=unit(cross(d,Math.abs(d[1])<.9?[0,1,0]:[1,0,0])),v=cross(d,u),start=positions.length/3;
 const radial=[u,v,u.map(x=>-x),v.map(x=>-x)];for(const p of [a,b])for(const n of radial){positions.push(...p.map((x,i)=>x+n[i]*radius));normals.push(...n);}for(let j=0;j<4;j++){const k=(j+1)%4;indices.push(start+j,start+k,start+j+4,start+k,start+k+4,start+j+4);}}
 let mesh=batches.get(key);if(!mesh){mesh=new B.Mesh(key,scene);const data=new B.VertexData();data.positions=positions;data.normals=normals;data.indices=indices;data.uvs=Array(positions.length/3*2).fill(0);data.applyToMesh(mesh,true);mesh.parent=root;batches.set(key,mesh);meshes.push(mesh);}else{mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);mesh.refreshBoundingInfo();}mesh.material=material(spec.kind+' '+(spec.cellId??''),{...spec,alpha:1});mesh.visibility=spec.alpha;mesh.metadata={...spec,model:'colored-tesseract',displayInset:spec.kind==='outline'};}
 function refresh(){const g=modelGeometry(state);
 edgeBatch('exact edges',g.edges,.006,{kind:'edge',category:'exact-edge',cellId:null,color:'#718797',alpha:.35});
 for(const c of g.cells)edgeBatch(c.id+' inset edges',c.lines,.012,{kind:'outline',category:'cell-outline',cellId:c.id,color:c.color,alpha:c.alpha,role:c.role});
 const c=g.cells.find(c=>c.role==='selected'),positions=[],indices=[];c.faces.forEach(face=>{const start=positions.length/3;face.forEach(p=>positions.push(...p));indices.push(start,start+1,start+2,start,start+2,start+3);});const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);
 if(!selectedMesh){selectedMesh=new B.Mesh('selected cubic volume',scene);const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=Array(48).fill(0);data.applyToMesh(selectedMesh,true);selectedMesh.parent=root;meshes.push(selectedMesh);}else{selectedMesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);selectedMesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);selectedMesh.refreshBoundingInfo();}
 selectedMesh.material=material('fill '+c.id,{kind:'selected-fill',category:'selected-volume',cellId:c.id,color:c.color,alpha:.10});selectedMesh.metadata={kind:'selected-fill',category:'selected-volume',cellId:c.id,faces:6};return g;}
 refresh();return {root,meshes,parts:meshes,get state(){return state;},get geometry(){return modelGeometry(state);},setSelectedCell(id){state=modelState({...state,selected:id});refresh();return state;},setRotationPlane(plane){state=modelState({...state,plane});refresh();return state;},set4DAngle(angle){state=modelState({...state,angle});refresh();return state;},setViewRotation(x,y,z){root.rotation.set(x,y,z);},dispose(){if(disposed)return;disposed=true;root.dispose(false);owned.forEach(m=>m.dispose());meshes.length=0;owned.length=0;}};
}
