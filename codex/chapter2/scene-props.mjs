import {CREW_PIECES,isSleeve,shoulderFor} from '../crew-model.js';
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
// A broken blade grows from the field at an angle. Each ring is narrower
// and slips to one side; the grooves on its cleaved face are part of the stone.
function echoStone(p,x,z,signal,receiver=false) {
  const layers=[
    [-.61,.33,.01,-.24,.50],[-.51,.43,.28,-.26,.46],
    [-.41,.50,.81,-.19,.38],[-.18,.59,1.27,-.13,.28],[.38,.57,1.62,-.04,.14],
  ];
  const rings=layers.map(([lo,hi,y,front,back])=>[
    [x+lo,y,z+front],[x+hi,y,z+front],[x+hi-.08,y,z+back],[x+lo+.09,y,z+back],
  ]);
  const uv=[[.02,.05],[.23,.05],[.23,.95],[.02,.95]];
  const frontTints=['637079','788285','888c8b','b1aea0'];
  for(let i=0;i<rings.length-1;i++){
    for(let edge=0;edge<4;edge++){
      const next=(edge+1)%4;
      const a=rings[i][edge],b=rings[i][next],c=rings[i+1][next],d=rings[i+1][edge];
      const ux=b[0]-a[0],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      const normal=[uz*vy,ux*vz-uz*vx,-ux*vy],len=Math.hypot(...normal);
      p.hull.quad([a,b,c,d],normal.map(n=>n/len),uv,edge===0?frontTints[i]:edge===1?'695f69':'535765');
    }
  }
  p.hull.quad(rings.at(-1),[0,1,0],uv,'c5baa8');
  for(const side of [-1,1]){
    const slant=side===1?.25:-.38;
    p.hull.round(x+side*.47,.29,z+.16,.29,.89,.42,'6e707b','octa',-.12,.1,slant);
  }
  // The short, short, held rhythm can be read on a still image, even at a distance.
  for(const [offset,y,length] of [[-.16,.91,.14],[.04,.93,.14],[.24,.95,.29]]){
    const front=z-.19+(y-.81)*(.06/.46);
    const a=[x+offset,y,front-.018],b=[x+offset+length*.86,y+length*.31,front-.016];
    p.hull.beam(a,b,.069,.04,'39434c');
    p.light.beam([a[0],a[1]+.009,a[2]-.026],[b[0],b[1]+.009,b[2]-.026],.040,.017,signal);
  }
  if(!receiver)return;
  // A pocket receiver left by one of the travellers. A single lamp and a
  // red wrist cord separate the stranded crew's belongings from the field.
  const h=p.hull,l=p.light;
  h.box(x-.43,.43,z-.31,.29,.47,.16,'967b62',2,-.36,-.12);
  h.box(x-.43,.44,z-.405,.26,.36,.06,INK,1,-.36,-.12);
  h.box(x-.46,.55,z-.446,.14,.031,.024,EDGE,0,-.36);
  l.box(x-.45,.50,z-.45,.05,.026,.022,'a8eadb',0,-.36);
  h.beam([x-.55,.56,z-.31],[x-.68,.77,z-.29],.022,.025,EDGE);
  safetyLine(p,[[x-.50,.62,z-.32],[x-.64,.61,z-.37],[x-.69,.43,z-.43],
    [x-.63,.18,z-.49],[x-.51,.14,z-.46],[x-.48,.25,z-.41]]);
}
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
  // This looks like a single inclined foliation across the path. The pale
  // doubled line is the seal that can be verified from the other side.
  for(const s of [-1,1]){
    h.box(s*3.5,2.56,0,6.99,5.1,.42,'69777c',0);
    for(let i=-1;i<4;i++){
      const x=s*(i*1.2-.3);
      h.beam([x,.12,-.235],[x+s*1.75,5.09,-.235],.047,.025,'35434f');
      l.beam([x+s*.48,1.52,-.254],[x+s*.83,2.54,-.254],.035,.018,'9eb2ad');
    }
    h.beam([0,.42,-.255],[s*1.37,2.10,-.255],.11,.09,'334450');
    l.beam([s*.11,.61,-.308],[s*1.37,2.10,-.308],.046,.02,'f4ae85');
    h.beam([s*1.37,2.10,-.255],[0,4.0,-.255],.11,.09,'334450');
    l.beam([s*1.37,2.10,-.308],[s*.38,3.45,-.308],.046,.02,'f4ae85');
  }
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
  {
    // A small instrumentation silhouette on a dedicated screen shows the
    // flight suit's telemetry channels and embedded return tag.
    h.box(2.0,1.46,3.58,1.33,1.61,.16,INK,2);
    for(const s of [-1,1]) {
      h.round(2+s*.22,1.61,3.47,.33,.59,.08,'718e8d','sphere');
      l.beam([2+s*.05,1.82,3.415],[2+s*.28,1.45,3.415],.025,.016,'8ddfcd');
    }
    if (!state.done && (state.step >= 1 || (state.angle === 45 && state.w === 2))) {
      l.round(2.13,1.56,3.39,.12,.13,.053,state.step === 0 ? 'ffd693' : TEAL,'octa');
    }
    h.box(2,.53,3.58,.22,.65,.16,STEEL);
  }
}

// The same red tracer is sewn into the buckle and the two lengths of safety line.
// Keep it in the section's existing material batches, at the height of a hand.
const tracer = 'fc785e';
function safetyLine(parts, points) {
  for (let i=1; i<points.length; i++) {
    parts.hull.beam(points[i-1],points[i],.052,.052,'b8453d');
    const a=points[i-1], b=points[i];
    parts.light.beam([a[0],a[1]+.019,a[2]],[b[0],b[1]+.019,b[2]],.019,.023,tracer);
  }
}

function lostBuckle(p, collected) {
  const z=5.85;
  plinth(p,0,z,1.45,1.38);
  // Open mineral cradle; its interrupted red stitch can be seen from the far side.
  p.hull.box(0,.58,z,1.08,.29,.86,'53616e',2);
  p.hull.box(0,.75,z+.34,1.12,.38,.16,'939295',2);
  for(const side of [-1,1]) p.hull.box(side*.5,.76,z,.12,.26,.84,'939295',2);
  if(collected)return;
  p.hull.round(0,.89,z-.05,.54,.7,.75,'e2cf9a','ring',Math.PI*.38);
  safetyLine(p,[[.23,.91,z-.04],[.38,.79,z-.24],[.28,.78,z-.42],[.20,.60,z-.45]]);
}

function bridgeTether(p, angle) {
  const a=[.84,.79,-.56], b=[.84,.79,2.54];
  safetyLine(p,[[-.96,1.01,-2.0],[-.12,.63,-1.57],a]);
  safetyLine(p,[b,[.88,.66,3.71],[1.40,1.00,4.91]]);
  if(bridgeAligned(angle)) safetyLine(p,[a,[.84,.66,.23],[.84,.63,1.02],[.84,.66,1.78],b]);
}

export function objects(scene,materials,section,state) {
  const p=parts(), h=p.hull;
  switch(section.id){
    case 'echo':
      echoStone(p,-.98,-2.18,'ffc58b',true);winch(p,1.7,3.95);
      break;
    case 'vault':
      if(state.w===0) {airlockWall(p);lostBuckle(p,state.done);}
      break;
    case 'bridge':
      foldedBridge(p,state.angle);bridgeTether(p,state.angle);winch(p,-.96,-2.0);winch(p,0,5.14);
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
      // The starting cleavage remains unlit until the return signal reaches W1.
      // Across the cut the far end is a split seam, without a second human receiver.
      echoStone(p,-.98,-2.18,state.step>=1&&state.w===0?'ffbd83':'69747b');
      for(const side of [-1,1]){
        h.round(.98+side*.20,.66,2.31,.32,1.55,.67,'899296','octa',0,0,side*.14);
        p.light.beam([.98+side*.032,.45,2.0],[.98+side*.086,.99,2.13],.035,.024,PAGES[state.w]);
      }
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
  const boots=parts(),jacket=parts(),sleeves={left:parts(),right:parts()};
  for(const piece of CREW_PIECES) {
    const {name,shape,args,lamp}=piece;
    const side=name.startsWith('left')?'left':'right';
    const limb=isSleeve(name)?sleeves[side]:/ (leg|boot|sole stripe)$/.test(name)?boots:jacket;
    limb[lamp?'light':'hull'][shape](...args);
  }
  const feet=assemble(scene,'Cen Yao: boots and legs',boots,materials);
  const chest=assemble(scene,'Cen Yao: pressure jacket',jacket,materials);
  chest.parent=feet;
  // Preserve the handedness of Cen Yao's established beckoning animation.
  const arms=['right','left'].map(side=>{
    const limb=assemble(scene,'Cen Yao: glove',sleeves[side],materials);
    limb.parent=chest;
    limb.position.set(...shoulderFor(side));
    return limb;
  });
  feet.position.set(...PILOT_BERTHS[id]);
  feet.rotation.y=id==='mirror'?-.43:id==='clinic'?-.09:.18;
  return {root:feet,chest,arms};
}
