// A lamina is a bevelled solid with an incision along its front. The empty
// spaces between its ends and its echo matter as much as the solid faces.
const uv=[[.02,.02],[.23,.02],[.23,.97],[.02,.97]];
const sectionColors={
  echo:['69627c','aba3aa','e8b384'], vault:['385767','7a9093','8bd1cb'],
  bridge:['675665','b39184','eeb77f'], sphere:['8a685c','c6a385','d9b7a2'],
  crystal:['406c76','83a6a6','87ccc2'], cargo:['556874','8b9790','d4aa7e'],
  mirror:['776075','b798aa','deb3a4'], rings:['716958','b3a488','d7b387'],
  clinic:['466875','8da9ad','9ad2bd'], home:['79677b','c2ab9d','e9c791'],
};
const profiles = {
  echo: [[-.76,-1.22],[-.98,-.44],[-.9,.44],[-.51,.96],[.08,1.12],[.68,.91],[.99,.45],[1,.12]],
  vault: [[-1.14,-1.02],[-1.14,.09],[-.67,.09],[-.67,.83],[.12,.83],[.12,1.07],[.91,1.07],[.91,-.53]],
  bridge: [[-1.2,-.82],[-.86,-.48],[-.36,-.48],[-.02,.26],[.43,.26],[.77,.87],[1.23,.87]],
  sphere: [[-.76,-1.1],[-.98,-.55],[-1,.05],[-.8,.67],[-.34,.96],[.15,.99],[.68,.74],[.97,.24],[.98,-.36]],
  crystal: [[-1.07,-.66],[-.98,.12],[-.19,1.23],[.12,1.05],[1.09,.2],[.83,-.8]],
  cargo: [[-1.02,-1.03],[-1.02,.78],[-.53,.78],[-.53,.42],[.12,.42],[.12,1.02],[.83,1.02],[1.13,1.32]],
  mirror: [[-.92,-1.16],[-.92,.54],[-.44,.99],[.22,.99],[.68,.57],[.68,.19]],
  rings: [[-.82,-.86],[-1.05,-.25],[-.84,.46],[-.17,1.1],[.49,.98],[.99,.54],[1.08,-.09],[.79,-.7],[.28,-.9]],
  clinic: [[-.43,-1.24],[-1.01,-.63],[-1.08,.04],[-.8,.72],[-.15,1.13],[.52,1.31]],
  home: [[-.76,-1.22],[-.98,-.44],[-.9,.44],[-.51,.96],[.08,1.12],[.68,.91],[.99,.45],[1,.12]],
};

function face(batch,a,b,c,d,inside,color){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const len=Math.hypot(...n);
  if(len<.000001)return;
  const outward=n[0]*(a[0]-inside[0])+n[1]*(a[1]-inside[1])+n[2]*(a[2]-inside[2])>0;
  batch.quad(outward?[d,c,b,a]:[a,b,c,d], n.map(x=>(outward?x:-x)/len), uv, color);
}

// Project a family of tilted, stepped strata into one 3D sample of the field.
// The frame can lean in depth; walking sideways reveals real parallax.
function stratum(p,route,place,width,thickness,colors,etched=true) {
  const section=[[-.50,-.31],[-.38,-.50],[.38,-.50],[.50,-.31],[.50,.5],[-.50,.5]];
  const profile=route.map(([x,y],i)=>{
    const before=route[Math.max(0,i-1)],after=route[Math.min(route.length-1,i+1)];
    const dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy);
    return (side,depth)=>place(x-side*width*dy/len,y+side*width*dx/len,depth*thickness);
  });
  for(let i=0;i<profile.length-1;i++){
    const a=profile[i],b=profile[i+1],center=a(0,0);
    for(let j=0;j<section.length;j++){
      const next=(j+1)%section.length;
      face(p.hull,a(...section[j]),b(...section[j]),b(...section[next]),a(...section[next]),center,
        j===0?colors[1]:colors[0]);
    }
    if(etched){
      face(p.light,a(-.25,-.502),b(-.25,-.502),b(-.216,-.502),a(-.216,-.502),center,colors[2]);
      if(i%3===1)face(p.light,a(.24,-.502),b(.24,-.502),b(.259,-.502),a(.259,-.502),center,colors[1]);
    }
  }
  for(const [cap,next] of [[profile[0],profile[1]],[profile.at(-1),profile.at(-2)]]) {
    face(p.hull,cap(-.495,-.31),cap(.495,-.31),cap(.495,.50),cap(-.495,.50),next(0,0),colors[1]);
    face(p.hull,cap(-.38,-.50),cap(.38,-.50),cap(.495,-.31),cap(-.495,-.31),next(0,0),colors[1]);
  }
}

export function fieldArchitecture(p,id,w){
  const colors=sectionColors[id],profile=profiles[id];
  const rank=Object.keys(profiles).indexOf(id), pairing=id==='mirror'||id==='clinic';
  const twists=[-.32,.18,.44,-.16,-.3,.09,-.54,.61,.27,.35];
  for(let i=0;i<5;i++){
    const size=9.1-i*.67, z=21+i*9.9;
    // Across W the ends of the stone slip past one another in X and Z. The
    // deck never accompanies them; its position remains a reference for XYZ.
    const angle=twists[rank]+i*(id==='rings'?.61:.24)+(w-1)*(.15+i*.025);
    const co=Math.cos(angle),si=Math.sin(angle),tilt=.18*Math.sin(i*1.17+rank);
    const cx=(id==='bridge'?-3:0)-2.4+i*.27+1.18*w, cy=3.6+i*.06;
    function place(u,v,d){
      if(pairing&&i%2)u=-u;
      return [cx+size*(u*co-v*si),cy+size*(u*si+v*co),z+size*(u*tilt+v*.17)+d];
    }
    stratum(p,profile,place,.14+(i%2)*.014,1.7+i*.39,colors);
    const inset = profile.slice(1,-1).map(([x,y])=>[x*.89,y*.89]);
    stratum(p,inset,place,.023,.61,colors,false);
    // Inside each hewn rim a shallow stela reads edge-on as a comb. The
    // irregular ribs remain anchored to the front face when the bearing leans.
    for(let j=1;j<profile.length-2;j++){
      const [u,v]=profile[j], [nextU,nextV]=profile[j+1];
      for(const t of [.13,.23,.33,.59]){
        const at=[u+(nextU-u)*t,v+(nextV-v)*t];
        const m=Math.hypot(nextU-u,nextV-v);
        const ax=(v-nextV)/m,ay=(nextU-u)/m;
        const a=place(at[0]+.031*ax,at[1]+.031*ay,-.94-i*.195);
        const b=place(at[0]+.060*ax,at[1]+.060*ay,-.94-i*.195);
        p.light.beam(a,b,.034+i*.011,.045,colors[1]);
      }
    }
    // Offset keystones mark the open ends without ever closing the aperture.
    const [u,v]=profile.at(-1);
    for(let j=1;j<=3;j++){
      const [x,y,depth]=place(u-.016*j,v-.09*j,-.11);
      p.hull.box(x,y,depth,size*.06,size*.032,.6,colors[1],0,-angle);
    }
  }
  // Structures hang well outside the broad near arch. Their repeated breaks
  // supply a horizon, even when a traveller is looking away from the specimen.
  for(const s of [-1,1])for(let n=0;n<12;n++){
    const z=23+n*3.3;
    const y=-18+((n+rank)%7)*1.84;
    const x=s*(9.4+n*2.3);
    const top=[x+s*(3.4+w*.34),7.5+(n%5)*2.2,z+5.4];
    p.hull.beam([x,y,z],top,.9+n*.09,2.3,colors[0],1);
    p.hull.beam([top[0],top[1]+.81,top[2]],[top[0]+s*.79,top[1]+4.72,top[2]+1.09],.9+n*.09,2.3,colors[0],1);
    p.light.beam([x-s*.46,y+.41,z-.76],[top[0]-s*.47,top[1]-.22,top[2]-.78],.058,.09,colors[1]);
  }
  // A hairline opening is suspended at the last vanishing point. Tiny offset
  // stones on each side let distance read without stars or a planetary horizon.
  p.hull.round(-1,3.6,78,3.9,11,2.9,'483d4b','octa',0,.32,-.18);
  p.light.beam([-1.77,.15,76.99],[-.64,6.88,76.69],.17,.16,'f1ce99');
  for(let n=0;n<5;n++)p.hull.box(-2.8+n*.17,1.7+n*.77,76.1,.86,.12,.65,'c4ac8c',0,-.14);
}
