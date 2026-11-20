export const ROOMS=['w+','x+','y+','z+','w-','x-','y-','z-'];
export const AXES=['x','y','z','w'];
export const vector=id=>AXES.map(a=>id[0]===a?(id[1]==='+'?1:-1):0);
export const room=v=>AXES[v.findIndex(x=>x!==0)]+(v.find(x=>x!==0)>0?'+':'-');
export const neg=v=>v.map(x=>-x);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const initial=()=>({id:'w+',frame:[vector('y+'),vector('z+'),vector('x+')],route:['w+']});
export const doors=s=>s.frame.flatMap((v,i)=>[{id:room(v),axis:i,sign:1},{id:room(neg(v)),axis:i,sign:-1}]);
export function cross(s,id){if(!doors(s).some(d=>d.id===id))throw Error('Rooms are not adjacent');const n=vector(s.id),v=vector(id);return {id,frame:s.frame.map(a=>a.map((x,i)=>x-dot(a,v)*(v[i]+n[i]))),route:[...s.route,id]};}
