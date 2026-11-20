// Small rigid parts sharing a coating are submitted in one draw. Coordinates use
// metres and Babylon’s left-handed XYZ frame. W is never used as world height.
const palette = new Map();
function rgb(hex) {
  if (!palette.has(hex)) {
    const n = Number.parseInt(hex.replace('#', ''), 16);
    palette.set(hex, [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
  }
  return palette.get(hex);
}

const IDENTITY = [1,0,0, 0,1,0, 0,0,1];
let unitBox;
const surfaceCache = new Map();
function basisFor(ax, ay, az) {
  const x = Math.cos(ax), sx = Math.sin(ax);
  const y = Math.cos(ay), sy = Math.sin(ay);
  const z = Math.cos(az), sz = Math.sin(az);
  return [z*y, sz*y, -sy, z*sy*sx-sz*x, sz*sy*sx+z*x, y*sx, z*sy*x+sz*sx, sz*sy*x-z*sx, y*x];
}

export class Batch {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.indices = [];
    this.uvs = [];
    this.colors = [];
  }
  shape(shape, x,y,z, w,h,d, color, tile = 0, basis = IDENTITY) {
    const base = this.positions.length / 3;
    const [r,g,b] = rgb(color);
    const p = shape.positions, n = shape.normals, uv = shape.uvs;
    for (let i=0, j=0; i<p.length; i+=3, j+=2) {
      const a = p[i]*w, c = p[i+1]*h, e = p[i+2]*d;
      this.positions.push(x+basis[0]*a+basis[3]*c+basis[6]*e, y+basis[1]*a+basis[4]*c+basis[7]*e, z+basis[2]*a+basis[5]*c+basis[8]*e);
      const nx=n[i]/w, ny=n[i+1]/h, nz=n[i+2]/d;
      const m=1/Math.hypot(nx,ny,nz);
      this.normals.push((basis[0]*nx+basis[3]*ny+basis[6]*nz)*m, (basis[1]*nx+basis[4]*ny+basis[7]*nz)*m, (basis[2]*nx+basis[5]*ny+basis[8]*nz)*m);
      // The narrow gutters keep adjacent tiles apart in the mip chain.
      this.uvs.push((tile+.02+(uv[j]||0)*.96)/4, .02+(uv[j+1]||0)*.96);
      this.colors.push(r,g,b,1);
    }
    for (const index of shape.indices) this.indices.push(base + index);
  }
  box(x,y,z,w,h,d,color,tile=0, rz=0, rx=0, ry=0) {
    unitBox ??= BABYLON.VertexData.CreateBox({size:1});
    this.shape(unitBox,x,y,z,w,h,d,color,tile,rz||rx||ry ? basisFor(rx,ry,rz) : IDENTITY);
  }
  beam(a,b,w,d,color,tile=0) {
    const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2], length=Math.hypot(dx,dy,dz);
    if (!length) return;
    const x=dx/length, y=dy/length, z=dz/length;
    const horizontal=Math.hypot(x,y);
    const side = horizontal > .0001 ? [y/horizontal,-x/horizontal,0] : [1,0,0];
    const basis = [...side,x,y,z, side[1]*z,-side[0]*z,side[0]*y-side[1]*x];
    unitBox ??= BABYLON.VertexData.CreateBox({size:1});
    this.shape(unitBox,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,length,d,color,tile,basis);
  }
  round(x,y,z,w,h,d,color,kind='sphere', rx=0, ry=0, rz=0) {
    if (!surfaceCache.has(kind)) {
      const V=BABYLON.VertexData;
      const data=kind==='sphere' ? V.CreateSphere({diameter:1,segments:16}) :
        kind==='octa' ? V.CreatePolyhedron({type:1,size:1,flat:true}) :
        kind==='ring' ? V.CreateTorus({diameter:1,thickness:.045,tessellation:40}) :
        V.CreateCylinder({height:1,diameter:1,tessellation:kind==='octagon'?8:24});
      if(kind==='octa') {
        // The canonical 16-cell cut is |x|+|y|+|z|<=r. Babylon's
        // decorative polyhedron has a different orientation, so use axis tips.
        const p=[],n=[],u=[],idx=[];
        for(const a of [-1,1]) for(const b of [-1,1]) for(const c of [-1,1]) {
          const corners=[[a*.5,0,0],[0,b*.5,0],[0,0,c*.5]];
          if(a*b*c>0) corners.reverse();
          const k=p.length/3;
          for(const row of corners) {p.push(...row);n.push(a/Math.sqrt(3),b/Math.sqrt(3),c/Math.sqrt(3));}
          idx.push(k,k+1,k+2);u.push(0,0, .5,1, 1,0);
        }
        Object.assign(data,{positions:p,normals:n,indices:idx,uvs:u});
      }
      surfaceCache.set(kind,data);
    }
    this.shape(surfaceCache.get(kind),x,y,z,w,h,d,color,0,basisFor(rx,ry,rz));
  }
  quad(corners, normal, st, color='ffffff') {
    const k=this.positions.length/3;
    const tint=rgb(color);
    for(let i=0;i<4;i++) {
      this.positions.push(...corners[i]);this.normals.push(...normal);
      this.colors.push(...tint,1);this.uvs.push(...st[i]);
    }
    this.indices.push(k,k+1,k+2,k,k+2,k+3);
  }
  plaque(x,y,z,w,h,index,ry=0) {
    const a=(index%2+.006)/2, b=(Math.floor(index/2)+.012)/8;
    const c=(index%2+.994)/2, d=(Math.floor(index/2)+.988)/8;
    const dx=w/2*Math.cos(ry), dz=-w/2*Math.sin(ry);
    this.quad([[x-dx,y-h/2,z-dz],[x+dx,y-h/2,z+dz],[x+dx,y+h/2,z+dz],[x-dx,y+h/2,z-dz]],[-Math.sin(ry),0,-Math.cos(ry)],[[a,d],[c,d],[c,b],[a,b]]);
  }
  mesh(scene, name, material) {
    if (!this.indices.length) return null;
    material.metadata?.bakePaint?.(this.positions,this.normals,this.colors);
    const V = new BABYLON.VertexData();
    for (const key of ['positions','normals','indices','uvs','colors']) V[key]=this[key];
    const m = new BABYLON.Mesh(name,scene);
    V.applyToMesh(m);m.material=material;m.isPickable=false;
    return m;
  }
}

export function parts() {
  return {hull:new Batch(),light:new Batch(),labels:new Batch()};
}
export function assemble(scene,name,part,materials) {
  const root=new BABYLON.TransformNode(name,scene);
  for(const [key,batch] of Object.entries(part)) {
    const m=batch.mesh(scene,name+'-'+key,materials[key]);
    if(m) m.parent=root;
  }
  return root;
}
