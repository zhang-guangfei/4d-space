import {enamel} from './scene-coating.mjs';
import {fieldArchitecture} from './scene-field.mjs';
import {Batch,parts,assemble} from './scene-geometry.mjs';

export const INK='233541', STEEL='587180', EDGE='a1b1b0', PALE='d4d0bd', OCHRE='df8b42', TEAL='51dcdb';
const SHADE='364955', IVORY='d5cdc1';
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
  const space=flat('far interference field',chart,'field-horizon.webp');space.backFaceCulling=false;
  return {hull,light,space};
}

export function sky(scene,mat) {
  const batch=new Batch(), slices=48, rings=14, r=118;
  function point(u,v){
    const az=(u-.5)*2*Math.PI,lat=(.5-v)*Math.PI;
    return [r*Math.sin(az)*Math.cos(lat),r*Math.sin(lat),r*Math.cos(az)*Math.cos(lat)];
  }
  for(let i=0;i<slices;i++)for(let j=0;j<rings;j++){
    const a=i/slices,b=(i+1)/slices,c=j/rings,d=(j+1)/rings;
    batch.quad([point(a,d),point(b,d),point(b,c),point(a,c)],[0,0,1],[[a,d],[b,d],[b,c],[a,c]]);
  }
  const skybox=batch.mesh(scene,'far interference field',mat);
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
function walkway(p,z1,z2) {
  const mid=(z1+z2)/2, d=z2-z1;
  // A dark, finely laminated cut surface carries the two stranded travellers.
  // Their single gold trail runs through the seams. Its width stays human-scaled.
  p.hull.box(0,-.73,mid,12.5,1.02,d,'29313f',0);
  const count=Math.ceil(d/2.35),len=d/count;
  for(let j=0;j<count;j++){
    const z=z1+(j+.5)*len;
    for(let i=0;i<4;i++){
      const x=(i-1.5)*3.1;
      p.hull.box(x,-.149,z,3.075,.28,len-.026,(j+i)%3===0?'485766':'435461',0);
    }
    for(const s of [-1,1]){
      p.hull.box(s*5.85,-.025,z,.45,.07,len-.06,'39434c',1);
      p.light.box(s*5.85,.013,z,.038,.011,len*.80,'98a49d');
    }
    for(const s of [-1,1]){
      const x=s*(3.46+.37*(j%2));
      p.hull.beam([x,.008,z-.49*len],[x-s*.94,.008,z+.16*len],.033,.024,'769390');
      p.hull.beam([x-s*.94,.008,z+.16*len],[x-s*.94,.008,z+.48*len],.033,.024,'769390');
      for(let k=0;k<5;k++){
        const shift=.18*k;
        p.hull.box(s*(4.38+shift),.009,z+.34*len-shift*.32,.13,.012,.033,'85979b');
      }
    }
    p.hull.box(0,.004,z,.06,.013,len*.94,'bda780');
    p.hull.box(-.093,.003,z-.35*len,.045,.012,.19,'a69c86');
  }
}

export function yard(scene,materials) {
  const p=parts(),h=p.hull,l=p.light;
  walkway(p,-9.7,-.5);walkway(p,2.5,9.7);
  for(const z of [-.51,2.51]) {
    h.box(0,-.36,z,12.6,.63,.18,'474858',1);
    for(const x of [-5.5,-3.2,3.2,5.5]) h.box(x,-.47,z,.12,.84,.26,'8e8076');
  }
  // Oblique piers tie the near edge to the environment beneath the walkable
  // surface. Open sides make the sheer depth visible on every bearing.
  for(const s of [-1,1]) {
    h.box(s*6.21,.21,0,.38,.43,19.6,'424655',0);
    for(let i=0;i<4;i++){
      const z=-8+i*5.3, height=3.8+(i%3)*1.75;
      h.beam([s*6.35,-3.8,z],[s*7.3,height,z+1.7],.62,1.06,'61616a');
      h.beam([s*6.02,-3.4,z-.05],[s*6.97,height-.12,z+1.62],.08,.41,'af967c');
      h.beam([s*7.52,height+.56,z+1.92],[s*7.85,height+2.3,z+2.37],.62,1.0,'747078');
      l.beam([s*6.73,.85,z+.94],[s*6.89,1.76,z+1.15],.05,.08,'cda984');
      h.box(s*6.25,-1.26,z,1.10,.14,2.09,'8d8283',0);
    }
    // Descending records continue under the floor, then curl up behind the player.
    for(let i=0;i<10;i++){
      const z=-18+i*5.1, x=11.7+1.08*i, y=-4.6-1.19*i;
      h.beam([s*x,y,z],[s*(x+6),y+.9,z+2.4],.84,3.2,'515568');
      h.beam([s*x,y+.47,z],[s*(x+5),y+1.23,z+2.07],.07,.25,'b1937f');
      h.beam([s*(x+9),y-8,z+1],[s*(x+10),y+8.8,z+6],.66,1.2,'626575');
    }
    for(let i=0;i<6;i++){
      const x=s*(9+i*3.0), z=-14-i*3.6;
      h.beam([x,-8,z],[x+s*2.9,9+i*.85,z-3.7],1.07,.92,'67616d');
      l.beam([x+s*.32,-5.1,z-.2],[x+s*2.96,8.3+i*.85,z-3.64],.075,.08,'ad9798');
    }
  }
  return assemble(scene,'field cleavage and bearings',p,materials);
}
export function midDeck(scene,materials){
  const p=parts();walkway(p,-.5,2.5);
  return assemble(scene,'central removable deck',p,materials);
}

export function pageFittings(scene,materials,w,section) {
  const p=parts(), color=PAGES[w];
  fieldArchitecture(p,section.id,w);
  // Inscribed notches beside the foreground ribs echo the W instrument.
  // The front aperture stays free of floating signage.
  for(const s of [-1,1]){
    p.hull.beam([s*5.86,.13,4.67],[s*6.25,2.65,4.62],.42,.44,SWEPT[w]);
    for(let i=0;i<4;i++){
      p.light.box(s*(5.95+.029*i),.69+i*.185,4.415,.27,.052,.04,i<=w?color:'27333c');
    }
  }
  return assemble(scene,'slice '+w,p,materials);
}
