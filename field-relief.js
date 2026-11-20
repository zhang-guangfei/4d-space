import {H} from './room-dimensions.js';

// Four original mineral records in one mipmapped atlas. The opposite cell
// exposes the reverse growth direction. Inset the sampling domain two texels
// so oblique views do not borrow a neighbouring tile's border.
const materials = {
  W: {tile:[0,1], obsidian:[.15,.26,.29], face:[.42,.57,.57], light:[.46,.90,.79], blades:3, lean:.55},
  X: {tile:[1,1], obsidian:[.23,.16,.19], face:[.55,.42,.38], light:[.99,.68,.40], blades:4, lean:-.63},
  Y: {tile:[0,0], obsidian:[.14,.24,.21], face:[.43,.54,.42], light:[.70,.89,.60], blades:2, lean:-.35},
  Z: {tile:[1,0], obsidian:[.15,.18,.29], face:[.44,.43,.59], light:[.77,.67,.99], blades:3, lean:.24}
};

export function fieldAtlasFrame(id) {
  const {tile}=materials[id[0]];
  const inset=2/2048, span=.5-2*inset, reversed=id[1]==='-';
  return [reversed?-span:span, span, .5*tile[0]+inset+(reversed?span:0), .5*tile[1]+inset];
}

// A fan of faceted lamellae grows on either side of the aperture, just inside
// the wall. Their peaks stay behind the suit's clearance and their outlines
// stay outside all hatch/window silhouettes. All six faces use one opaque draw.
export function createFieldRelief(B, scene, id, faces) {
  const material=materials[id[0]], handed=id[1]==='-'?-1:1;
  const positions=[], colors=[], indices=[], distantIndices=[];
  function triangle(a,b,c,tint,illumination,distant=false) {
    const first=positions.length/3;
    positions.push(...a,...b,...c);
    for(const gain of illumination)colors.push(tint[0]*gain,tint[1]*gain,tint[2]*gain,1);
    indices.push(first,first+1,first+2);
    if(distant)distantIndices.push(first,first+1,first+2);
  }

  for(const {axis,sign,other,frame} of faces) {
    // U must be horizontal on a walking door. The upper walk threshold
    // reaches the deck but never the shoulders on either side of the door.
    const [u,v]=frame[other[0]][2]===0?other:[other[1],other[0]];
    const point=(x,y,inset)=>{
      const p=[0,0,0];p[axis]=sign*(H-inset);p[u]=x;p[v]=y;return p;
    };
    for(const side of [-1,1]){
      for(let i=0;i<material.blades;i++){
        const f=i/(material.blades-1), waist=1.65+1.01*f;
        const twist=side*handed*sign, offset=material.lean*(f-.43);
        const root=point(side*(2.24+.46*f),twist*(-1.51+offset),.019);
        const tip=point(side*(1.53+.79*f),twist*(1.38-.45*f+offset),.015);
        const inner=point(side*(waist-.105),twist*(-.20+offset),.025);
        const outer=point(side*(waist+.18),twist*(.13+offset),.022);
        const crest=point(side*waist,twist*(.10+offset),.145-.025*f);
        // Beyond a portal only the edges of the innermost and outermost
        // lamellae subtend whole pixels. Keep their lit faces and one inlay.
        const edge=i===0 || i===material.blades-1;
        triangle(root,inner,crest,material.obsidian,[.69,.74,1.36]);
        triangle(inner,tip,crest,material.face,[.64,.76,1.12],edge);
        triangle(tip,outer,crest,material.obsidian,[.85,.65,1.14]);
        triangle(outer,root,crest,material.face,[.70,.59,1.06],edge);
        // An inclusion inside one facet: short inlaid wedges, with an unlit
        // interruption between them. No alpha, animated noise or bloom pass.
        if(edge){
          const along=(a,b,t)=>a.map((x,k)=>x+(b[k]-x)*t);
          const jewel=(a,b,width,distant=false)=>{
            const A=along(crest,tip,a), C=along(crest,tip,b), B=along(crest,tip,(a+b)/2);
            B[u]+=side*width;
            for(const p of [A,B,C])p[axis]-=sign*.007;
            triangle(A,B,C,material.light,[.66,1.06,.73],distant);
          };
          jewel(.12,.48,.052,i===0);jewel(.55,.72,.034);
        }
      }
    }
  }

  const data=new B.VertexData(),mesh=new B.Mesh('echo field folded lamellae',scene);
  data.positions=positions;data.indices=indices;data.colors=colors;
  data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);
  data.uvs=new Array(positions.length/3*2).fill(0);
  data.applyToMesh(mesh);
  return {mesh,distantIndices};
}
