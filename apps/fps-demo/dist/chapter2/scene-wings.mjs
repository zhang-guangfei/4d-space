import {assemble,parts} from './scene-geometry.mjs';
import {crate,INK,STEEL,EDGE,PALE,OCHRE,TEAL} from './scene-yard.mjs';

function locker(p,x,y,z,height=2.48) {
 const h=p.hull,l=p.light;
 h.box(x,y+height/2,z,1.08,height,.65,'627f83',2);
 h.box(x,y+height*.52,z-.341,.94,height*.88,.075,'c2c5ac',2);
 h.box(x+.32,y+height*.49,z-.419,.06,.35,.10,INK);
 h.box(x,y+height*.76,z-.396,.51,.19,.035,INK,1);
 l.box(x-.29,y+height*.65,z-.406,.058,.07,.02,TEAL);
 h.box(x,y+.16,z-.33,1.12,.16,.26,STEEL);
}

function clinic(p){
 const h=p.hull,l=p.light;
 // Short low service bays surround a tall treatment well, sheltering Cen Yao's berth.
 for(const s of [-1,1]){
  h.box(s*6.10,2.43,2.7,.68,4.86,14.5,'6c8c8d',2);
  for(const z of [-2.9,.1,3.1,6.1,9.1]){
   h.box(s*5.71,2.61,z,.11,4.31,2.86,'a9b6ae',2);
   h.box(s*5.60,1.12,z,.18,.17,2.92,STEEL);
   h.box(s*5.54,2.86,z,.16,.55,2.37,'43646b',1);
   l.box(s*5.45,3.16,z,.031,.05,2.34,'a9ebce');
   h.box(s*5.47,3.96,z,.29,.69,2.61,PALE,2);
  }
  h.beam([s*5.8,4.48,-3],[s*3.7,4.98,-3],.25,.42,PALE,2);
  h.box(s*4.73,4.55,2.9,2.15,.54,13.7,'788f8e',1);
  h.box(s*4.3,4.24,3.0,.99,.085,9.3,INK);
  l.box(s*4.3,4.19,3.0,.62,.035,8.87,'c0ddc7');
  for(const z of [-1.9,1.8,5.5,8.8]){
   h.box(s*5.05,.37,z,1.25,.72,2.66,INK,1);
   h.box(s*5.0,.78,z,1.45,.14,2.78,PALE,2);
   h.box(s*5.18,1.13,z+.5,.65,.6,.72,'84aaa5',2);
  }
 }
 h.box(0,2.44,9.57,13.1,4.88,.51,'709195',2);
 h.box(0,4.92,8.8,12.2,.35,2.15,PALE,1);
 for(const x of [-4.85,-3.67,-2.49,2.49,3.67,4.85])locker(p,x,.03,8.97,2.73);
 h.box(0,1.75,9.18,3.29,3.5,.37,STEEL,2);
 h.box(0,1.73,8.95,2.5,3.34,.12,'a0b7ad',2);
 h.box(0,1.7,8.87,.07,3.26,.06,INK);
 for(const s of [-1,1]) {
  h.box(s*.65,2.09,8.86,.86,.78,.15,'324e56',2);
  l.box(s*.65,2.42,8.77,.66,.035,.03,TEAL);
 }
 // A geometric surgical cross and an articulated halo lamp signal the new location.
 l.box(0,4.11,9.27,.25,.97,.04,'b4e3be');l.box(0,4.11,9.26,.97,.25,.04,'b4e3be');
 h.beam([-3.5,4.36,4.3],[-1.77,4.11,3.72],.22,.19,EDGE);
 h.beam([-1.77,4.11,3.72],[0,3.91,3.54],.15,.19,PALE);
 h.round(0,3.82,3.51,1.80,2.3,1.80,STEEL,'ring');
 l.round(0,3.74,3.51,1.83,2.2,1.83,'d6eccd','ring');
 for(const s of [-1,1]) {
  h.box(s*.71,3.66,3.51,.42,.15,.61,PALE,2);
  l.box(s*.71,3.56,3.51,.29,.05,.40,'ecedd6');
 }
}

function freight(p){
 const h=p.hull,l=p.light;
 for(const s of [-1,1]) {
  for(const z of [1.16,4.48,7.8]) {
   for(const dz of [-1.56,1.56]) h.box(s*4.85,1.77,z+dz,.2,3.55,.20,'af7951',2);
   for(const level of [0,1]){
    h.box(s*4.90,.25+level*1.66,z,1.69,.18,3.25,STEEL,1);
    for(const dz of [-.69,.66])crate(p,s*4.90,.39+level*1.66,z+dz,.99,level===0?'c89363':'a8b4a6');
   }
  }
 }
 h.box(0,4.45,4.37,10.83,.58,.54,'ae7547',2);
 for(let x=-4.7;x<5;x+=.62)h.box(x,4.52,4.07,.14,.52,.035,INK,0,-.51);
 h.box(.39,4.04,4.37,1.65,.39,.78,STEEL,1);
 h.box(.39,3.66,4.37,.04,.55,.035,EDGE);l.box(.39,3.36,4.37,.11,.06,.08,OCHRE);
}
function relic(p){
 const h=p.hull,l=p.light;
 for(let i=0;i<3;i++){
  const z=5.0+i*2.3;
  for(const s of [-1,1]) {
   const x=s*(3.83+i*.39);
   h.box(x,2.10,z,.55,4.18,.82,'5d685f',1);
   h.box(x-s*.27,2.10,z-.26,.18,3.35,.48,'a3977c',2);
   h.beam([x,4.11,z],[s*2.19,5.14,z],.52,.81,'87958d',2);
   for(let k=0;k<3;k++)l.box(x-s*.41,2.3+k*.18,z-.535,.09,.061,.043,'e3a95d');
  }
  h.box(0,5.12,z,4.85,.46,.79,'6d796e',2);
 }
 for(const s of [-1,1]) {
  h.beam([s*5.0,.12,7.6],[s*2.3,.82,8.8],.39,.66,'5c746e',1);
  h.round(s*4.8,.88,5.2,.93,1.66,.93,'81918b','octagon');
 }
}
function flightWindow(p) {
 const h=p.hull,l=p.light;
 // Technicians have left a clear sight line through the tall return telescope.
 for(const s of [-1,1]) {
  h.box(s*5.17,2.18,8.61,2.02,4.35,.95,'485963',2);
  h.beam([s*4.87,3.97,8.61],[s*3.1,5.31,8.61],.73,.95,'8f9997',2);
  l.beam([s*4.35,4.04,8.10],[s*2.94,5.09,8.10],.075,.08,'ffd5a1');
  for(let i=0;i<4;i++)h.box(s*5.17,1.05+i*.65,8.08,1.48,.35,.15,'2b3e49',1);
 }
 // The distant station is a separate shell. The existing eighth room is never copied.
 const c=[1.1,5.7,43],a=5.6;
 for(const s of [-1,1])for(const t of [-1,1]){
  h.beam([c[0]+s*a,c[1]+t*a,c[2]-a],[c[0]+s*a,c[1]+t*a,c[2]+a],.39,.39,'bbab90',2);
  h.beam([c[0]+s*a,c[1]-a,c[2]+t*a],[c[0]+s*a,c[1]+a,c[2]+t*a],.48,.42,'889da0',2);
  h.beam([c[0]-a,c[1]+s*a,c[2]+t*a],[c[0]+a,c[1]+s*a,c[2]+t*a],.44,.42,'9c9b89',2);
  l.box(c[0]+s*a,c[1]+t*a,c[2]-a,.71,.71,.71,'ffc18d');
 }
 h.round(c[0],c[1],c[2],3.56,3.56,3.56,'8ea6a4','octa');
}

export function wing(scene,materials,id){
 const builders={cargo:freight,rings:relic,clinic,home:flightWindow};
 if(!builders[id])return null;
 const p=parts();builders[id](p);
 return assemble(scene,id+' outfitting',p,materials);
}
