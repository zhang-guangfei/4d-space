import {assemble,parts} from './scene-geometry.mjs';
import {INK,STEEL,EDGE,PALE} from './scene-yard.mjs';

function clinic(p) {
 const h=p.hull,l=p.light;
 // Two parted leaf-shaped sections of the same shell shelter the human
 // instrument. Gaps above the berth keep its connection to the field visible.
 for(const s of [-1,1]){
  for(let i=0;i<5;i++){
   const z=-2.8+i*2.75, crest=4.3+.58*Math.sin(i*.85);
   h.box(s*5.1,.34,z,1.23,.67,2.65,'4e6570',1);
   h.box(s*5.1,.71,z,1.31,.13,2.60,'8b9994',0);
   h.beam([s*5.32,-.1,z],[s*5.72,2.77,z+.55],.32,.86,'698184');
   h.beam([s*5.72,2.77,z+.55],[s*4.94,crest,z+1.08],.31,.83,'75868a');
   h.beam([s*4.94,crest,z+1.08],[s*3.37,crest+.76,z+1.47],.29,.77,'a0a79b');
   l.beam([s*5.51,2.83,z+.24],[s*4.79,crest-.12,z+.8],.045,.05,'aecbc1');
  }
  h.beam([s*3.9,4.65,4.28],[s*1.56,4.17,3.72],.13,.23,'a9b3a5');
  h.beam([s*1.56,4.17,3.72],[s*.70,3.85,3.54],.09,.19,'9ba69b');
 }
 // The small halo is Cen Yao's reference lamp and stays stationary across W.
 h.round(0,3.75,3.51,1.76,2,1.76,STEEL,'ring');
 l.round(0,3.70,3.51,1.78,1.2,1.78,'c6d9b9','ring');
}

function freight(p){
 const h=p.hull,l=p.light;
 // Misregistered ranks outside the little human board make the four visible
 // tracks read at two scales. Locally only the gold transit piece is pushable.
 for(const s of [-1,1])for(let i=0;i<3;i++){
  const x=s*4.9,z=1.16+i*3.29;
  h.box(x,.31,z,1.72,.59,3.23,'344751',1);
  for(let j=0;j<4;j++){
   const y=.78+j*.61;
   const dx=s*.13*Math.sin(i+j*.96);
   h.box(x+dx,y,z,1.47,.24,2.83,'828881',0,.10*s);
   h.box(x+dx,y+.16,z+.15,1.07,.08,2.01,'48555a',0,.10*s);
   for(let n=0;n<=j;n++) l.box(x+dx+s*.742,y+.037,z-.64+n*.26,.04,.06,.13,'cba481');
  }
 }
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
 // The split ends keep a clear sight line to the answering shell.
 for(const s of [-1,1]) {
  h.box(s*5.17,2.18,8.61,2.02,4.35,.95,'485963',2);
  h.beam([s*4.87,3.97,8.61],[s*3.1,5.31,8.61],.73,.95,'8f9997',2);
  l.beam([s*4.35,4.04,8.10],[s*2.94,5.09,8.10],.075,.08,'ffd5a1');
  for(let i=0;i<4;i++)h.box(s*5.17,1.05+i*.65,8.08,1.48,.35,.15,'2b3e49',1);
 }
 // A small closed figure repeats the shape of the boundary from chapter one.
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
