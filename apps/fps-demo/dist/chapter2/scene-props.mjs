import {KEY_TIPS,PILOT_BERTHS} from './anchors.mjs';
import {anchorRings} from './puzzles.mjs';
import {Batch,parts,assemble} from './scene-geometry.mjs';
import {crate,winch,INK,STEEL,EDGE,PALE,OCHRE,TEAL,PAGES} from './scene-yard.mjs';
import {bridgeAligned,rotateXW,target} from './rules.mjs';

function plinth(p,x,z,w=2.4,d=1.65) {
  p.hull.box(x,.09,z,w,.17,d,INK,2);
  p.hull.box(x,.23,z,w*.92,.11,d*.92,STEEL,1);
  p.hull.box(x,.32,z,w*.86,.10,d*.86,EDGE,2);
  for(const s of [-1,1])p.light.box(x+s*w*.37,.378,z,.035,.01,d*.6,TEAL);
}
function radio(p,x,z) {
  const h=p.hull,l=p.light;
  plinth(p,x,z,1.28,.96);
  h.box(x,.67,z,.67,.67,.54,STEEL,2);
  h.box(x,.7,z-.28,.46,.37,.055,INK,1);
  h.box(x,1.04,z,1.07,.2,.75,'ba7f4e',2);
  // Main field receiver and angled ceramic toggle bank.
  h.box(x-.08,1.35,z+.09,.86,.62,.19,PALE,2,0,-.13);
  h.box(x-.08,1.35,z-.02,.71,.42,.045,'142e38',0,0,-.13);
  for(let i=0;i<19;i++) {
    const v=Math.abs(Math.sin(i*1.48)*Math.cos(i*.31));
    l.box(x-.387+i*.034,1.35,z-.051,.021,.033+v*.218,.022,i<13?'71ded8':'ffc079');
  }
  for(let i=0;i<4;i++) {
    h.box(x-.36+i*.16,1.156,z-.23,.1,.03,.11,i===3?OCHRE:INK);
  }
  for(const s of [-1,1]) {
    h.box(x+s*.58,.99,z,.08,.27,.55,EDGE);
    h.box(x+s*.56,.71,z,.07,.33,.1,SHADE);
  }
  h.box(x+.42,1.63,z+.12,.058,1.11,.07,EDGE);
  h.box(x+.42,2.18,z+.12,.085,.2,.09,OCHRE);
  l.box(x+.42,2.30,z+.12,.061,.06,.063,'ffc480');
}
const SHADE='435760';
function sampler(p,z) {
  const h=p.hull;
  for(const s of [-1,1]) {
    h.round(s*2.22,.2,z,1.08,.35,1.08,INK,'octagon');
    h.beam([s*2.2,.36,z],[s*2.51,1.43,z],.24,.45,STEEL,2);
    h.beam([s*2.51,1.43,z],[s*2.35,3.03,z],.22,.43,EDGE,2);
    h.beam([s*2.35,3.03,z],[s*1.7,3.7,z],.22,.39,STEEL,2);
    for(let i=0;i<7;i++)p.light.box(s*2.40,.99+i*.29,z-.23,i===3?.26:.11,.029,.025,'9bded8');
    h.box(s*1.93,2.05,z,.92,.08,.1,OCHRE);p.light.box(s*1.46,2.05,z,.09,.07,.09,'ffdf95');
  }
  p.hull.round(0,.20,z,3.4,.28,3.4,INK,'octagon');
  p.hull.round(0,.38,z,2.9,.10,2.9,EDGE,'octagon');
}
function cellHardware(p,board) {
  const cell=.78,originZ=4.45;
  const locate=([x,y,z])=>[(x-1.5)*cell,.48+z*.99,originZ+(y-1.5)*cell];
  plinth(p,0,originZ,4.25,4.13);
  for(let x=0;x<4;x++)for(let y=0;y<4;y++) {
    const [a,h,b]=locate([x,y,0]);
    p.hull.box(a,h,b,.74,.19,.74,'82959a',2);
    for(const edge of [-.34,.34])p.hull.box(a+edge,h+.11,b,.035,.04,.65,INK);
  }
  const w=board.player[3];
  for(const wall of board.walls) if(wall[3]===w) {
    const [a,h,b]=locate(wall);p.hull.box(a,h+.42,b,.66,.64,.63,'465c65',1);
    p.hull.box(a,h+.77,b,.69,.07,.67,EDGE,2);
  }
  for(const point of board.targets) if(point[3]===w) {
    const [x,y,z]=locate(point);
    p.light.round(x,y+.14,z,.61,.69,.61,'f9b95b','ring');
  }
  for(const point of board.boxes)if(point[3]===w){
    const [x,y,z]=locate(point);crate(p,x,y+.14,z,.65,'e5a949');
  }
  const [x,y,z]=locate(board.player);
  p.hull.box(x,y+.27,z,.60,.25,.51,'44847f',2);
  for(const s of [-1,1]) {
    p.hull.box(x+s*.25,y+.2,z,.13,.18,.63,INK,1);
    p.light.box(x+s*.21,y+.35,z-.264,.1,.045,.03,'e9eed6');
  }
  p.hull.box(x,y+.44,z,.31,.16,.31,PALE,2);
  // The worktable mirrors Cen Yao's live freight car at instrument scale.
  // Keep her seated in the tug; no full-size duplicate is present on this deck.
  const h=p.hull,l=p.light;
  h.box(x,y+.46,z+.06,.36,.23,.27,'3c555b',2);
  h.box(x,y+.63,z+.015,.25,.23,.16,'d4995f',2);
  h.box(x,y+.81,z-.012,.225,.17,.195,'ece0c2',2);
  h.box(x,y+.90,z-.008,.18,.044,.17,OCHRE);
  h.box(x,y+.82,z-.118,.19,.076,.033,INK);
  l.box(x-.035,y+.838,z-.139,.086,.018,.014,'88d4d0');
  for(const s of [-1,1]){
    h.box(x+s*.123,y+.68,z-.014,.10,.10,.14,PALE,2);
    h.beam([x+s*.139,y+.64,z],[x+s*.115,y+.56,z-.15],.07,.072,'c99765');
    h.box(x+s*.11,y+.54,z-.157,.067,.076,.073,INK);
  }
  for(const s of [-1,1]){
    p.hull.box(s*1.72,.96,originZ,.13,1.32,3.37,STEEL,1);
    p.light.box(s*1.72,1.65,originZ,.14,.035,3.4,PAGES[w]);
  }
}
// For a zero-W-thickness key at an intermediate XW angle, W'=x sin(theta).
// Its true W=0 section is the 2D intersection of its original components with
// x=0. The remote scope separately shows the entire orthogonal projection.
function keySection(destination,component,xPlane) {
  const hits=[],pos=component.positions,idx=component.indices;
  for(let i=0;i<idx.length;i+=3)for(let edge=0;edge<3;edge++){
    const a=3*idx[i+edge],b=3*idx[i+(edge+1)%3];
    const left=pos[a]-xPlane,right=pos[b]-xPlane;
    if(left*right>0||left===right)continue;
    const t=left/(left-right);
    const y=pos[a+1]+t*(pos[b+1]-pos[a+1]),z=pos[a+2]+t*(pos[b+2]-pos[a+2]);
    if(!hits.some(h=>Math.abs(h[0]-y)+Math.abs(h[1]-z)<1e-6))hits.push([y,z]);
  }
  if(hits.length<3)return;
  // Each component is convex. Close the ordered contact polygon and render
  // both normals so it can be inspected from either side.
  const cy=hits.reduce((v,h)=>v+h[0],0)/hits.length,cz=hits.reduce((v,h)=>v+h[1],0)/hits.length;
  hits.sort((a,b)=>Math.atan2(a[1]-cz,a[0]-cy)-Math.atan2(b[1]-cz,b[0]-cy));
  for(const normal of [-1,1]){
    const first=destination.positions.length/3;
    for(const point of [[cy,cz],...hits,hits[0]]){
      destination.positions.push(xPlane,point[0],point[1]);destination.normals.push(normal,0,0);
      destination.uvs.push(0,0);destination.colors.push(.65,.97,.90,1);
    }
    for(let i=1;i<=hits.length;i++) {
      if(normal===1)destination.indices.push(first,first+i+1,first+i);
      else destination.indices.push(first,first+i,first+i+1);
    }
  }
}
function cargoKey(p,angle) {
  const anchor=[0,1.73,4.0],intermediate=angle>0&&angle<180;
  for(const [i,tip] of KEY_TIPS.entries()) {
    const color=[OCHRE,TEAL,'c497d2'][i],targetX=-tip[0];
    const y=anchor[1]+tip[1],z=anchor[2]+tip[2];
    // Insulating forks mark the fixed, labelled receiver for the returning key.
    p.hull.beam([targetX,y,z+.35],[targetX,.4,4.51],.054,.065,STEEL);
    p.hull.box(targetX,y,z+.20,.37,.085,.12,'728789');
    for(const s of [-1,1])p.light.box(targetX+s*.16,y+.045,z+.13,.036,.11,.13,color);
    const body=intermediate?new Batch():p.hull;
    const [x]=rotateXW([...tip,0],intermediate?0:angle);
    const point=[anchor[0]+x,y,z];
    body.beam(anchor,point,.115,.15,PALE,2);
    if(intermediate)keySection(p.light,body,anchor[0]);
    else body.round(...point,.27,.27,.27,color,['octagon','sphere','octa'][i]);
  }
  const center=intermediate?new Batch():p.hull;
  center.round(...anchor,.31,.31,.31,'2c4d5b','sphere');
  if(intermediate)keySection(p.light,center,anchor[0]);
}
function splitAnchor(p,state) {
  const h=p.hull;
  for(const x of [-2,2.8]) {
    plinth(p,x,2.95,2.1,1.45);
    for(const s of [-1,1])h.box(x+s*.71,.8,2.96,.18,.97,.43,STEEL,1);
  }
  // The fixed ring has support only at W1. The mobile ring shares the
  // operator's layer once attached, and translates sideways on the W2 rail.
  for(const {plane,center,radius} of anchorRings(state)) {
    if(center[3]!==state.w)continue;
    const fixed=plane==='XY',d=2*radius;
    h.round(center[0],center[1],center[2],d,d,d,fixed?'8ebcc0':'ecae6e','ring',fixed?Math.PI/2:0);
  }
}
function airlockWall(p) {
  const h=p.hull,l=p.light;
  for(const s of [-1,1]) {
    h.box(s*4.48,2.57,0,4.98,5.1,.42,'7d8987',2);
    h.box(s*1.0,2.57,0,1.96,5.1,.4,'a3a397',2);
    h.box(s*2.03,2.60,-.26,.18,5.08,.19,INK,1);
    h.box(s*1.05,2.36,-.228,1.53,.45,.05,INK,1);
    l.box(s*1.06,2.46,-.267,1.2,.033,.031,'df7957');
    for(let y=.4;y<4.9;y+=1.35) {
      h.box(s*4.5,y,-.24,4.76,.09,.09,STEEL);
      h.box(s*6.72,y+.39,-.25,.24,.32,.11,OCHRE,2);
    }
    h.beam([s*.25,1.9,-.27],[s*1.61,.54,-.27],.115,.1,STEEL);
  }
  h.box(0,2.56,0,.046,5.12,.46,INK);
  p.labels.plaque(3.78,3.24,-.23,2.7,.93,15);
}
function foldedBridge(p,angle) {
  const h=p.hull, l=p.light, aligned=bridgeAligned(angle);
  for(const z of [-.61,2.61]){
    h.box(0,.032,z,2.54,.08,.22,INK,1);
    for(const x of [-.96,.96]) l.box(x,.083,z,.22,.027,.19,aligned?TEAL:OCHRE);
  }
  if(aligned){
    h.box(0,-.24,1,2.44,.46,3.04,EDGE,2);
    for(let z=-.33;z<2.49;z+=.35)h.box(0,.013,z,2.3,.028,.32,STEEL,3);
    for(const x of [-1.13,1.13])l.box(x,.03,1,.065,.031,3.0,'a9e6ce');
    return;
  }
  // The tiny sampled spine remains in the current slice. Discrete optical
  // pins visualize projected shoe positions without drawing a solid bridge.
  h.round(0,-.13,1,.55,.33,.55,STEEL,'octagon');
  const projected=1.5*Math.sin(angle*Math.PI/180);
  for(const s of [-1,1]) {
    for(const x of [-1.05,1.05]){
      l.box(x,.12,1+s*projected,.12,.10,.10,'f0b67c');
      if(projected>.01)l.box(x,.01,1+s*.5*projected,.022,.019,projected,'688a84');
    }
  }
}
function medicalFrame(p,state) {
  const h=p.hull,l=p.light;
  plinth(p,0,3.48,2.45,1.6);
  for(const s of [-1,1]){
    h.box(s*.93,1.49,3.65,.14,2.35,.33,EDGE,1);
    l.box(s*.93,1.6,3.48,.06,1.54,.032,TEAL);
  }
  h.box(0,2.73,3.65,1.99,.13,.34,STEEL);
  const rad=state.angle*Math.PI/180;
  const y=1.58+(state.w-1)*.15;
  h.round(0,y,3.42,1.6,1.6,1.6,'b0c4bd','ring',rad);
  if(state.step>=1) {
    // A small instrumentation silhouette on a dedicated screen shows the
    // flight suit's telemetry channels and embedded return tag.
    h.box(2.0,1.46,3.58,1.33,1.61,.16,INK,2);
    for(const s of [-1,1]) {
      h.round(2+s*.22,1.61,3.47,.33,.59,.08,'718e8d','sphere');
      l.beam([2+s*.05,1.82,3.415],[2+s*.28,1.45,3.415],.025,.016,'8ddfcd');
    }
    const tag=state.step===1? 'ffd693':TEAL;
    l.round(2.13,1.56,3.39,.12,.13,.053,tag,'octa');
    h.box(2,.53,3.58,.22,.65,.16,STEEL);
  }
}

export function objects(scene,materials,section,state) {
  const p=parts(), h=p.hull;
  switch(section.id){
    case 'echo':
      radio(p,-.98,-2.18);winch(p,1.7,3.95);
      break;
    case 'vault':
      if(state.w===0) {airlockWall(p);plinth(p,0,5.85,1.55,1.54);crate(p,0,.39,5.85,.96);}
      radio(p,-.98,-2.18);
      break;
    case 'bridge':
      foldedBridge(p,state.angle);winch(p,-.96,-2.0);winch(p,0,5.14);
      break;
    case 'sphere':
    case 'crystal': {
      const z=4.18;sampler(p,z);
      winch(p,0,2.18,.81);break;
    }
    case 'cargo':
      cellHardware(p,state.board);winch(p,0,2.04,.81);break;
    case 'mirror':
      plinth(p,0,4.0,2.5,1.6);cargoKey(p,state.angle);
      // Four labelled point tips have a fixed companion-side receiver.
      h.box(0,.9,4.0,.28,1.1,.29,STEEL,1);winch(p,0,2.15,.82);break;
    case 'rings':
      splitAnchor(p,state);break;
    case 'clinic':
      medicalFrame(p,state);winch(p,0,2.13,.78);break;
    case 'home':
      radio(p,-.98,-2.18);radio(p,.98,2.31);
      for(const s of [-1,1]) {
        h.beam([s*2.62,.1,4.0],[s*2.24,3.07,4.0],.34,.55,STEEL,1);
        h.beam([s*2.24,3.07,4.0],[s*1.26,4.13,4.0],.24,.49,EDGE,2);
        p.light.beam([s*2.14,3.07,3.71],[s*1.19,4.04,3.71],.056,.03,PAGES[state.w]);
      }
      h.round(0,2.36,4.34,2.72,2.72,2.72,PALE,'ring',Math.PI/2);
      break;
  }
  const t=target(state), color=state.done? TEAL:'f3be69';
  // The amber floor brackets mark the active handle without covering the focal object.
  for(const s of [-1,1]){
    p.light.box(t.x+s*.69,.055,t.z-.31,.07,.023,.43,color);
    p.light.box(t.x+s*.59,.055,t.z-.50,.24,.023,.055,color);
  }
  return assemble(scene,section.id+' equipment',p,materials);
}

export function companion(scene,materials,section,state) {
  const id=section.id;
  if(!section.companion||(id==='echo'&&state.w!==1))return null;
  const p=parts(),h=p.hull,l=p.light;
  const fabric='4b6267', harness='273e49', white='e5dcbe', suit='d4894e',skin='b98769';
  // Mooring pilot Cen Yao. Built at human scale, with layered fabric and rigid fittings.
  // Feet stay on deck. The torso pivot carries respirator, straps, helmet and arms.
  for(const s of [-1,1]){
    h.box(s*.151,.123,-.055,.234,.20,.394,harness,2);
    h.box(s*.151,.047,-.06,.25,.067,.4,'132c37',1);
    h.box(s*.151,.27,.016,.2,.27,.22,fabric,1);
    h.box(s*.151,.426,0,.21,.20,.24,'667c7d',2);
    h.box(s*.151,.447,-.12,.15,.14,.07,white,2);
    h.box(s*.15,.65,.02,.22,.32,.25,suit,2);
    h.box(s*.262,.63,.021,.05,.17,.15,harness,1);
    h.box(s*.15,.84,0,.24,.14,.265,fabric);
  }
  const feet=assemble(scene,'Cen Yao: boots and legs',p,materials);
  const body=parts(),b=body.hull,e=body.light;
  b.box(0,.97,0,.53,.29,.36,fabric,1);
  b.box(0,1.08,0,.59,.13,.4,harness,2);
  b.box(-.09,1.08,-.216,.095,.088,.047,white);
  b.box(0,1.28,0,.55,.38,.35,suit,2);
  b.box(0,1.46,-.006,.59,.19,.34,white,2);
  b.box(0,1.22,-.19,.38,.164,.075,harness,1);
  for(const s of [-1,1]){
    b.box(s*.196,1.34,-.193,.065,.39,.055,fabric,0,s*.13);
    b.box(s*.222,1.08,-.21,.13,.14,.08,suit,2);
    b.box(s*.33,1.43,.01,.185,.205,.28,white,2,0,0,s*.07);
  }
  // Backpack tank housings, hose mounts, antenna and a radio that blinks in dialogue.
  b.box(0,1.30,.235,.49,.47,.21,harness,2);
  for(const s of [-1,1]) {
    b.box(s*.15,1.32,.36,.16,.43,.16,white,1);
    b.box(s*.15,1.3,.453,.17,.11,.05,OCHRE);
  }
  b.box(.27,1.65,.27,.035,.54,.035,EDGE);
  e.box(.27,1.94,.27,.044,.055,.044,TEAL);
  b.box(0,1.60,.004,.28,.1,.26,harness,1);
  b.box(0,1.77,0,.47,.35,.413,white,2);
  b.box(0,1.96,.014,.42,.084,.38,suit);
  for(const s of [-1,1]){
    b.box(s*.239,1.78,-.005,.076,.187,.23,fabric,2);
    b.round(s*.282,1.8,0,.11,.06,.11,EDGE,'octagon',0,0,Math.PI/2);
    b.box(s*.19,1.68,-.18,.068,.14,.095,white);
  }
  // The short visor is latched above her eyes. At talking distance the player
  // can read her expression, the copper hairline and the asymmetry of her radio.
  b.box(0,1.738,-.212,.345,.202,.038,skin);
  b.box(0,1.851,-.224,.397,.087,.063,'1d3742');
  b.box(0,1.865,-.262,.348,.028,.014,'62949c');
  e.box(-.091,1.867,-.273,.115,.016,.012,'c2dfd4');
  for(const s of [-1,1]){
    b.box(s*.157,1.775,-.226,.043,.109,.032,'674f46');
    b.box(s*.080,1.787,-.245,.078,.017,.027,'644e43',0,s*.09);
    b.box(s*.079,1.752,-.248,.065,.030,.023,'efddbc');
    b.box(s*.073,1.754,-.267,.025,.027,.018,'2e3c3c');
    b.box(s*.115,1.713,-.241,.046,.016,.016,'b77f68');
  }
  b.box(0,1.718,-.249,.041,.048,.037,'ca9677');
  b.box(.006,1.679,-.241,.069,.011,.017,'78594f',0,.05);
  b.box(0,1.634,-.208,.22,.043,.053,harness);
  b.box(.089,1.415,-.193,.10,.065,.022,white);
  b.box(.09,1.414,-.211,.067,.013,.018,STEEL);
  b.box(-.166,1.865,-.195,.053,.06,.048,'795a43');
  b.box(-.224,1.7,-.18,.042,.08,.04,INK);
  b.beam([-.22,1.68,-.2],[-.075,1.67,-.26],.026,.026,INK);
  for(let i=0;i<3;i++)e.box(-.083+i*.056,1.26,-.232,.035,.035,.012,i<2?TEAL:OCHRE);
  const chest=assemble(scene,'Cen Yao: pressure jacket',body,materials);
  chest.parent=feet;
  const arms=[];
  for(const s of [-1,1]){
    const a=parts(),u=a.hull;
    u.box(s*.032,-.116,0,.17,.23,.22,suit,2, s*.12);
    u.box(s*.047,-.245,-.008,.161,.11,.207,harness,1);
    u.box(s*.057,-.363,-.047,.154,.181,.18,white,2,0,.16);
    u.box(s*.06,-.487,-.068,.14,.109,.164,harness,1);
    u.box(s*.041,-.516,-.094,.122,.06,.125,STEEL);
    const limb=assemble(scene,'Cen Yao: glove',a,materials);
    limb.parent=chest;limb.position.set(s*.348,1.435,0);
    arms.push(limb);
  }
  feet.position.set(...PILOT_BERTHS[id]);
  feet.rotation.y=id==='mirror'?-.43:id==='clinic'?-.09:.18;
  return {root:feet,chest,arms};
}
