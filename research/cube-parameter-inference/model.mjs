// Geometric inverse-fit model of Jason Hise's public-domain reference animation.
// Estimated parameters, not recovered original Maya scene. No video frames used.
export const params={d4:3.0543863938108604,s:2.0543863938108604,R:5.59170353355185,f:345.7017708210825,az:.5536725699521114,el:.3399068001961633,roll:-.030779686432092664,cx:125.50474595434497,cy:127.13085490714941,omega:Math.PI/6.72};
export const vertices=Array.from({length:16},(_,i)=>[3,2,1,0].map(k=>(i>>k&1)?1:-1));
export const edges=[];for(let i=0;i<16;i++)for(let j=i+1;j<16;j++)if(vertices[i].filter((x,k)=>x!==vertices[j][k]).length===1)edges.push([i,j]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function rotate4(v,t,{reverse=false}={}){const a=params.omega*t*(reverse?-1:1),c=Math.cos(a),s=Math.sin(a);return [c*v[0]-s*v[3],v[1],v[2],s*v[0]+c*v[3]];}
export function project4(v){const k=params.s/(params.d4-v[3]);return v.slice(0,3).map(x=>x*k);}
export function project3(v){const p=params,c=[Math.sin(p.az)*Math.cos(p.el),Math.sin(p.el),Math.cos(p.az)*Math.cos(p.el)],right=[Math.cos(p.az),0,-Math.sin(p.az)],up=[-Math.sin(p.az)*Math.sin(p.el),Math.cos(p.el),-Math.cos(p.az)*Math.sin(p.el)];const z=p.R-dot(c,v),x=p.f*dot(right,v)/z,y=-p.f*dot(up,v)/z;return [p.cx+Math.cos(p.roll)*x-Math.sin(p.roll)*y,p.cy+Math.sin(p.roll)*x+Math.cos(p.roll)*y];}
export function frame(t,options={}){const p4=vertices.map(v=>rotate4(v,t,options)),p3=p4.map(project4),p2=p3.map(project3);return {p4,p3,p2,edges};}
// Reference48frames: frame(n*.070), n=0..47. No ease-in/out, no camera orbit.
