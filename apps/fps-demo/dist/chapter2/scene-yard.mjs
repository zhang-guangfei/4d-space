import {enamel} from './scene-coating.mjs';
import {Batch,parts,assemble} from './scene-geometry.mjs';

export const INK='233541', STEEL='587180', EDGE='a1b1b0', PALE='d4d0bd', OCHRE='df8b42', TEAL='51dcdb';
const RIB='83949c', SHADE='364955', IVORY='d5cdc1';
export const PAGES=['79d9df','e9a95e','94d9b2','dba2d4'];
export const SWEPT=['385b66','76604c','405f59','62526a'];
const art = name => new URL('./art/'+name,import.meta.url).href;

export function coatings(scene) {
  const B = BABYLON;
  const texture = name => new B.Texture(art(name),scene,false,false,B.Texture.TRILINEAR_SAMPLINGMODE);
  const hull=enamel(scene,texture);
  // Native point samples and luminous ink need no Babylon lighting permutations.
  const vertexSource=`precision highp float;attribute vec3 position;attribute vec2 uv;attribute vec4 color;
    uniform mat4 worldViewProjection;varying vec2 tc;varying vec3 tint;
    void main(){tc=uv;tint=color.rgb;gl_Position=worldViewProjection*vec4(position,1.);}`;
  const flat=(name,source,textureName)=>{
    const material=new B.ShaderMaterial(name,scene,{vertexSource,fragmentSource:source},
      {attributes:['position','uv','color'],uniforms:['worldViewProjection'],samplers:textureName?['chart']:[]});
    if(textureName)material.setTexture('chart',texture(textureName));
    return material;
  };
  const chart=`precision mediump float;varying vec2 tc;uniform sampler2D chart;
    void main(){gl_FragColor=texture2D(chart,tc);}`;
  const light=flat('inset phosphor strips',`precision mediump float;varying vec3 tint;void main(){gl_FragColor=vec4(tint,1.);}`);
  const labels=flat('enameled instrument plates',chart,'plates.webp');labels.backFaceCulling=false;
  const space=flat('outboard terminator',chart,'terminator.webp');space.backFaceCulling=false;
  return {hull,light,labels,space};
}

export function sky(scene,mat) {
  const batch=new Batch(), slices=70, r=100;
  for(let i=0;i<slices;i++){
    const a=(i/slices-.5)*Math.PI*2,b=((i+1)/slices-.5)*Math.PI*2;
    const ax=Math.sin(a)*r,az=Math.cos(a)*r,bx=Math.sin(b)*r,bz=Math.cos(b)*r;
    batch.quad([[ax,-65,az],[bx,-65,bz],[bx,67,bz],[ax,67,az]],[0,0,1],[[i/slices,1],[(i+1)/slices,1],[(i+1)/slices,0],[i/slices,0]]);
  }
  const skybox=batch.mesh(scene,'ringed ice giant',mat);
  skybox.infiniteDistance=true;
  return skybox;
}

// Raised sill, buckled end plates, two bearing arcs and an inset lifting eye.
export function crate(p,x,y,z,scale=1,color=OCHRE) {
  const b=(a,c,e,w,h,d,col,t=0)=>p.hull.box(x+a*scale,y+c*scale,z+e*scale,w*scale,h*scale,d*scale,col,t);
  b(0,.49,0,1,.82,.88,color,2);
  for (const side of [-1,1]) {
    b(side*.38,.5,0,.092,1,.99,INK);b(side*.38,.93,0,.11,.084,.95,EDGE);
    b(side*.24,.49,-.451,.045,.53,.04,SHADE);b(side*.5,.12,0,.07,.13,1,STEEL);
  }
  b(0,.15,-.45,.65,.1,.035,INK);b(0,.61,-.452,.23,.12,.025,IVORY);
  b(0,.65,0,.69,.14,1.0,color);
}

export function winch(p,x,z,scale=1) {
  const h=p.hull,l=p.light;
  h.round(x,.22*scale,z,.98*scale,.38*scale,.98*scale,INK,'octagon');
  h.round(x,.46*scale,z,.85*scale,.13*scale,.85*scale,EDGE,'octagon');
  h.box(x,.76*scale,z,.47*scale,.6*scale,.51*scale,STEEL,2);
  h.box(x,.95*scale,z-.055*scale,.72*scale,.28*scale,.48*scale,OCHRE,2,-.07);
  l.box(x,1.07*scale,z-.13*scale,.47*scale,.028*scale,.18*scale,TEAL);
  h.box(x,1.18*scale,z+.11*scale,.38*scale,.08*scale,.07*scale,EDGE);
}
function floorTile(p,x,z,width,depth,side) {
  const hull=p.hull;
  hull.box(x,-.16,z,width-.025,.29,depth-.025,side? '647682':'879599',2);
  if(side) {
    hull.box(x,.003,z,width*.58,.016,depth*.81,'586b73',1);
    hull.box(x+(x>0?-1:1)*width*.42,.014,z,.09,.015,depth*.91,OCHRE);
  }
}

function walkway(p,z1,z2) {
  const mid=(z1+z2)/2, d=z2-z1;
  p.hull.box(0,-.52,mid,14,.72,d,INK,1);
  const count=Math.ceil(d/2.35);
  for(let j=0;j<count;j++) {
    const z=z1+(j+.5)*d/count, len=d/count;
    for(let i=0;i<6;i++) {
      const x=(i-2.5)*2.22;
      floorTile(p,x,z,2.22,len,i===0||i===5);
    }
    for(const x of [-2.63,2.63]) {
      p.hull.box(x,.017,z,.13,.017,len-.08,INK);
      p.light.box(x,.029,z,.036,.012,len*.78,'a6dbde');
    }
    p.hull.box(0,.015,z,.085,.014,len*.29,'d8be8f');
  }
}

// The primary gantries carry conduits, service decks and a clear central passage.
function gantry(p,z) {
  const h=p.hull,l=p.light;
  for(const s of [-1,1]){
    h.box(s*6.75,.27,z,1.2,.53,1.23,SHADE,2);
    h.box(s*6.78,2.05,z,.77,3.55,.92,STEEL,2);
    h.box(s*6.32,2.02,z,.1,2.95,.67,RIB,1);
    h.box(s*6.76,3.88,z,1.13,.38,1.23,EDGE,2);
    h.beam([s*6.72,3.88,z],[s*4.98,5.75,z],.65,.81,RIB,2);
    h.beam([s*6.49,3.85,z-.43],[s*4.84,5.63,z-.43],.16,.08,IVORY);
    h.beam([s*6.32,3.98,z-.472],[s*5.53,4.84,z-.472],.071,.035,OCHRE);
    h.box(s*6.77,1.86,z-.481,.28,2.16,.04,SHADE,1);
    l.box(s*6.77,2.03,z-.508,.056,.92,.024,'9ae4ea');
    h.box(s*5.56,5.61,z,1.64,.4,1.32,SHADE,2);
    h.box(s*5.2,5.37,z,1.07,.09,.32,'353e42');
    l.box(s*5.2,5.31,z,.88,.033,.21,'ffe3a8');
    h.box(s*6.62,.87,z-.52,.54,.31,.09,OCHRE,2);
  }
  h.box(0,5.95,z,10.45,.37,.69,STEEL,2);
  h.box(0,6.22,z,11.55,.24,.91,SHADE,1);
  for(let x=-4;x<=4;x+=2) h.box(x,5.73,z,.23,.18,.93,IVORY,2);
}
function serviceWall(p,s) {
  const h=p.hull,l=p.light;
  // Windows between each rib look past the dock to machinery on the exterior.
  for(const z of [-7,-2,3,8]){
    h.box(s*7.02,.66,z,.51,1.31,4.95,SHADE,2);
    h.box(s*6.73,1.02,z,.12,.34,4.68,STEEL,1);
    h.box(s*6.65,1.4,z,.25,.1,4.96,EDGE);h.box(s*6.65,1.49,z,.22,.035,2.6,OCHRE);
    h.box(s*7.35,4.96,z,.78,.74,4.95,SHADE,1);
    h.box(s*7.1,4.59,z,.36,.15,4.95,EDGE);
    for(const shift of [-1.37,1.37]) {
      h.box(s*6.89,2.92,z+shift,.17,2.86,.12,STEEL);
      l.box(s*6.605,.58,z+shift,.026,.08,.35,'d8bb83');
    }
  }
  for(const x of [3.7,4.13,4.5]) {
    h.box(s*x,5.97,0,.065,.09,23.5,EDGE);
  }
  h.box(s*2.55,6.4,-1,.91,.34,23,'495c69',1);
  h.box(s*7.03,-1.05,0,.5,1,22,STEEL,1);
  for(const z of [-6,0,6]) {
    h.box(s*11,-.7,z,6.2,1.15,4.9,'435761',2);
    h.box(s*11,-.1,z,6.4,.16,4.95,EDGE,2);
    h.box(s*12.5,1.28,z,2.12,2.59,2.2,'3d515b',1);
    for(const off of [-.74,.74]) h.box(s*12.5,1.4,z+off,2.18,.13,.12,OCHRE);
  }
}

function torusTruss(p,x,y,z,r,n,color) {
  for(let i=0;i<n;i++){
    const a=i*Math.PI*2/n,c=(i+1)*Math.PI*2/n;
    p.hull.beam([x+r*Math.cos(a),y+r*Math.sin(a),z],[x+r*Math.cos(c),y+r*Math.sin(c),z],.19,.33,color);
  }
}
export function yard(scene,materials) {
  const p=parts(),h=p.hull,l=p.light;
  walkway(p,-10,-.5);walkway(p,2.5,10.4);
  // Exposed cross members read as a deep hull at the two edges of the folding bridge.
  for (const z of [-.48,2.48]) {
    h.box(0,-.53,z,13.7,.77,.19,'6c7776',1);
    for(let x=-6;x<=6;x+=1.5)h.box(x,-.4,z,.24,.65,.36,OCHRE,2, .36);
  }
  for(const z of [-9.5,-4.5,.5,5.5,10.4]) gantry(p,z);
  serviceWall(p,-1);serviceWall(p,1);
  // Aft sleeve is open to a second outboard truss; the aperture frames the planet.
  h.box(0,1.0,-10,13.6,2.0,.53,STEEL,2);
  h.box(0,3.25,-10,13.6,2.55,.4,INK,1);
  h.box(0,4.92,-10,13.6,.79,.53,STEEL,2);
  for(const s of [-1,1]) {
    h.box(s*4.12,.54,10.2,5.33,1.09,.56,'586a75',2);
    h.box(s*4.12,1.10,10.18,5.46,.12,.6,EDGE);
    h.box(s*4.41,.54,9.9,2.59,.52,.09,'324854',1);
    h.box(s*4.5,3.8,12,.36,5.4,.45,STEEL,1);
    h.beam([s*4.5,1.3,12],[s*7.2,3.7,19],.26,.34,STEEL);
    for (const depth of [15.4,20.5,25.6]) {
      h.box(s*7.3,2.1,depth,.41,6.1,.6,'52636b',2);
      h.box(s*7.3,5.21,depth,1.1,.34,.86,EDGE);
      h.beam([s*7.3,-.78,depth-.1],[s*7.3,4.9,depth+4.87],.15,.22,'657781');
      l.box(s*7.3,5.44,depth,.24,.17,.33,'dca16c');
    }
    h.box(s*7.3,-.91,21,.87,.78,16.7,STEEL,1);
  }
  // Cargo silos and the segmented docking ring have true parallax behind the windows.
  torusTruss(p,-13.2,2.8,31,6.4,28,'819092');
  torusTruss(p,-13.2,2.8,33,6.18,28,'55646b');
  for(let i=0;i<14;i++) {
    const a=i*Math.PI/7;
    h.beam([-13.2+6.4*Math.cos(a),2.8+6.4*Math.sin(a),31],[-13.2+6.18*Math.cos(a+.14),2.8+6.18*Math.sin(a+.14),33],.15,.16,OCHRE);
  }
  for(const side of [-1,1]) {
    for(let i=0;i<7;i++) {
      const x=side*(9.3+i*1.52), z=23+(i%3)*4;
      h.round(x,-.53+(i%3)*.19,z,1.24,5+(i%2)*1.6,1.24,'5d717b','cylinder');
      h.box(x,2.84+(i%2)*.27,z,.48,.41,.53,IVORY);
      l.box(x,3.1+(i%2)*.27,z,.16,.09,.17,'f5ab79');
    }
  }
  crate(p,-5.3,.02,6.9,1.25);crate(p,-4.28,.02,7.28,.88,'a2a7a0');
  crate(p,5,.02,-5.65,.93,'a2afaf');
  return assemble(scene,'pressure hull',p,materials);
}
export function midDeck(scene,materials){
  const p=parts();walkway(p,-.5,2.5);
  return assemble(scene,'central removable deck',p,materials);
}

export function plateRack(p,index) {
  const h=p.hull;
  // A section name on a freestanding enamel plate, inside the field of view.
  h.box(-3.66,2.42,5.8,2.67,1.08,.22,INK,2);
  for(const x of [-4.67,-2.65])h.box(x,1.18,5.87,.13,2.38,.16,STEEL);
  p.labels.plaque(-3.66,2.43,5.677,2.53,.87,index);
}

export function pageFittings(scene,materials,w,index) {
  const p=parts(), color=PAGES[w];
  for(const s of [-1,1]) {
    p.hull.box(s*5.62,1.16,4.64,.94,2.32,.73,SWEPT[w],2);
    p.hull.box(s*5.62,2.37,4.64,1.08,.13,.81,EDGE);
    for(let i=0;i<4;i++) {
      p.light.box(s*5.62+(i-1.5)*.185,1.79,4.258,.085,.6,.036,i<=w?color:'223a43');
    }
    for(let i=0;i<=w;i++) crate(p,s*(7.9+i*.91),-.07,2.3+i*.32,.79,SWEPT[w]);
  }
  p.hull.box(3.71,2.18,7.4,2.6,.99,.27,INK,2);
  p.hull.box(3.71,1.06,7.43,.56,2.14,.35,STEEL,1);
  p.labels.plaque(3.71,2.18,7.247,2.42,.83,10+w);
  plateRack(p,index);
  return assemble(scene,'slice '+w,p,materials);
}
