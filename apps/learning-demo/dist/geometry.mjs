export const PLANES = [[0,1],[0,2],[1,2],[0,3],[1,3],[2,3]];
export const AXES = ['X','Y','Z','W'];
export const vertices = Array.from({length:16}, (_,i)=>Array.from({length:4},(_,d)=>i&(1<<d)?1:-1));
export const edges = [];
for(let i=0;i<16;i++) for(let d=0;d<4;d++){let j=i^(1<<d);if(i<j)edges.push([i,j]);}
export const squares = [];
for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
 const fixed=[0,1,2,3].filter(d=>d!==a&&d!==b);
 for(let mask=0;mask<4;mask++){
  let base=0;fixed.forEach((d,k)=>{if(mask&(1<<k))base|=1<<d});
  squares.push([base,base|(1<<a),base|(1<<a)|(1<<b),base|(1<<b)]);
 }
}
export const cells = AXES.flatMap((axis,d)=>[-1,1].map(sign=>({name:`${axis} = ${sign>0?'+1':'−1'}`,axis:d,sign,vertices:vertices.map((v,i)=>v[d]===sign?i:-1).filter(i=>i>=0)})));
for(const c of cells){c.edges=edges.filter(e=>e.every(i=>c.vertices.includes(i)));c.faces=squares.filter(f=>f.every(i=>c.vertices.includes(i)));}
export function rotate4(v, angles){const p=[...v];PLANES.forEach(([a,b],i)=>{const c=Math.cos(angles[i]||0),s=Math.sin(angles[i]||0),x=p[a],y=p[b];p[a]=x*c-y*s;p[b]=x*s+y*c;});return p;}
export function project4(v, mode='perspective',distance=3.4){const s=mode==='perspective'?distance/(distance-v[3]):1;return v.slice(0,3).map(x=>x*s);}
export function length(v){return Math.hypot(...v)}
export function dot(a,b){return a.reduce((s,x,i)=>s+x*b[i],0)}
export function sub(a,b){return a.map((x,i)=>x-b[i])}
export function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
const EPS=1e-8;
export function slice4(rotated, level=0){
 const points=[],lines=new Map(),pointKey=p=>p.map(x=>Math.round(x*1e8)).join(','),pointMap=new Map();
 function addPoint(p){const key=pointKey(p);if(pointMap.has(key))return pointMap.get(key);const i=points.length;points.push(p.slice(0,3));pointMap.set(key,i);return i;}
 function intersect(a,b){const da=a[3]-level,db=b[3]-level,out=[];if(Math.abs(da)<EPS)out.push(addPoint(a));if(Math.abs(db)<EPS)out.push(addPoint(b));if(da*db<0&&Math.abs(da)>EPS&&Math.abs(db)>EPS){const t=-da/(db-da);out.push(addPoint(a.map((x,i)=>x+t*(b[i]-x))));}return [...new Set(out)];}
 const edgePoints=edges.map(([a,b])=>intersect(rotated[a],rotated[b]));
 function addLine(a,b){if(a===b)return;const pair=a<b?[a,b]:[b,a];lines.set(pair.join(','),pair);}
 for(const f of squares){const ids=[];for(let k=0;k<4;k++){const found=intersect(rotated[f[k]],rotated[f[(k+1)%4]]);ids.push(...found);}const u=[...new Set(ids)];if(u.length===2)addLine(...u);else if(u.length>2){for(let k=0;k<4;k++){const found=intersect(rotated[f[k]],rotated[f[(k+1)%4]]);if(found.length===2)addLine(...found);}}}
 const faces=[];const faceKeys=new Set();
 for(const cell of cells){const ids=[...new Set(edges.flatMap((edge,i)=>edge.every(v=>cell.vertices.includes(v))?edgePoints[i]:[]))];if(ids.length<3)continue;
  const p0=points[ids[0]],u=sub(points[ids[1]],p0);let n=null;
  for(let k=2;k<ids.length;k++){const c=cross(u,sub(points[ids[k]],p0));if(length(c)>EPS){n=c.map(x=>x/length(c));break}}
  if(!n)continue;
  // A whole cubic cell can lie in the slicing hyperplane at a boundary. It is a volume, not a facet.
  if(ids.some(i=>Math.abs(dot(sub(points[i],p0),n))>1e-7))continue;
  const center=[0,1,2].map(d=>ids.reduce((s,i)=>s+points[i][d],0)/ids.length),basis=u.map(x=>x/length(u)),v=cross(n,basis);
  ids.sort((a,b)=>Math.atan2(dot(sub(points[a],center),v),dot(sub(points[a],center),basis))-Math.atan2(dot(sub(points[b],center),v),dot(sub(points[b],center),basis)));
  const key=[...ids].sort((a,b)=>a-b).join(',');if(!faceKeys.has(key)){faceKeys.add(key);faces.push(ids)}
 }
 return {vertices:points,edges:[...lines.values()],faces};
}
