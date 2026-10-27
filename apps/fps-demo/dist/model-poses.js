/** Shared mathematical poses for both room miniatures and expanded hypothesis models. */
export function beltRoomPose(t,k,reversed=false){
 const phase=Number.isFinite(Number(t))?Number(t):0;
 const x=((k+(reversed?1:-1)*phase+2)%4+4)%4-2;
 const u=Math.max(0,Math.min(1,(2-Math.abs(x))/.5));
 return {x,fade:u*u*(3-2*u),forward:reversed?[-1,0,0]:[1,0,0],up:[0,1,0],left:reversed?[0,0,-1]:[0,0,1],right:reversed?[0,0,1]:[0,0,-1]};
}
export function hallPose(t,vertical=false){
 const phase=Number.isFinite(Number(t))?Number(t):0,a=-(((phase%4)+4)%4)*Math.PI/2,s=Math.sin(a),c=Math.cos(a);
 return vertical?{position:[s,c,0],up:[0,0,-1],forward:[-c,s,0],right:[s,c,0]}:{position:[s,0,c],up:[0,1,0],forward:[-c,0,s],right:[s,0,c]};
}
