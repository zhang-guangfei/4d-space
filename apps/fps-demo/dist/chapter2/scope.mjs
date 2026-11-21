// On-board axonometric monitor. It only repaints on a resize, a puzzle change or a
// visible movement of the receiver. Each W sample has an independently framed camera.
import { anchorRings, displayCell, rotateXW, sliceProfile } from './puzzles.mjs';
import { KEY_TIPS, PILOT_BERTHS } from './anchors.mjs';

const ink = {
  grid: '#17303a', edge: '#496572', deck: '#233b45', side: '#182c36',
  active: '#a2edda', copper: '#ffbd79', white: '#fcf2d3', fixture: '#7697a9'
};

function path(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  if (fill) {
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

// x and y lie on the deck; h is the vertical offset in the 3D view.
function project(cx, cy, scale, rise) {
  return (x, y, h = 0) => [cx + (x - y) * scale, cy + (x + y) * rise - h];
}

function slab(ctx, iso, x, y, sizeX, sizeY, top, thickness, surface, rim, edge) {
  const a = iso(x, y, top), b = iso(x + sizeX, y, top);
  const c = iso(x + sizeX, y + sizeY, top), d = iso(x, y + sizeY, top);
  const b0 = [b[0], b[1] + thickness], c0 = [c[0], c[1] + thickness], d0 = [d[0], d[1] + thickness];
  path(ctx, [a, b, c, d], surface, null);
  path(ctx, [b, b0, c0, c], rim, null);
  path(ctx, [d, c, c0, d0], rim, null);
  path(ctx, [a, b, c, d, a], null, edge, .9);
  path(ctx, [d0, c0, b0], null, edge, .65);
}

function deckGrid(ctx, iso, top, count, color) {
  for (let n = 1; n < count; n++) {
    path(ctx, [iso(n, 0, top), iso(n, count, top)], null, color, .6);
    path(ctx, [iso(0, n, top), iso(count, n, top)], null, color, .6);
  }
}

function orb(ctx, x, y, radius) {
  if (radius <= 0) return;
  const grad = ctx.createRadialGradient(x - radius * .35, y - radius * .4, 0, x, y, radius);
  grad.addColorStop(0, '#fdf1c5');
  grad.addColorStop(.45, '#efb97a');
  grad.addColorStop(1, '#78583d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function sampleFrame(ctx, x, y, width, height, label, active) {
  ctx.fillStyle = active ? '#102a31' : '#0f2029';
  ctx.fillRect(x+2,y+2,width-4,height-4);
  ctx.strokeStyle = active ? '#598d87' : '#2b424e';
  ctx.lineWidth = active ? 1.4 : .8;
  ctx.strokeRect(x+2.5,y+2.5,width-5,height-5);
  ctx.fillStyle = active ? ink.active : '#9ab3be';
  ctx.font = '600 12px "IBM Plex Mono", Consolas, monospace';
  ctx.fillText(label,x+8,y+17);
  if (active) {
    ctx.fillStyle = ink.active;
    ctx.fillRect(x+width-15,y+10,6,5);
  }
}

function referenceCross(ctx,x,y,active) {
  const color = active ? ink.active : '#73909b';
  for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    path(ctx,[[x+dx*2,y+dy*2],[x+dx*5,y+dy*5]],null,color,1);
  }
}

function samplingWindows(ctx, width, height, state, section, position, beacon) {
  const id = section.id;
  const beat = section.beats[Math.min(state.step,section.beats.length-1)];
  const beaconW = beat.w ?? state.w;
  const cellWidth = width/2, cellHeight = height/2;
  const sampleSpace = Math.max(18,cellHeight-30);
  const scale = Math.min((cellWidth-16)/8,sampleSpace*.4);
  const rise = Math.min(scale*.56,sampleSpace*.06);
  const pillar = Math.min(24,sampleSpace*.28);
  for (let level=0;level<4;level++) {
    const sx=(level%2)*cellWidth, sy=Math.floor(level/2)*cellHeight;
    const active = state.w===level;
    sampleFrame(ctx,sx,sy,cellWidth,cellHeight,'W '+String(level+1).padStart(2,'0'),active);
    const cx=sx+cellWidth*.5, cy=sy+20+(sampleSpace+pillar-8*rise)*.5;
    const iso=project(cx,cy,scale,rise);
    const rim = active ? '#507e7f' : '#34505c';
    const floor = active ? '#295154' : ink.deck;
    slab(ctx, iso, 0, 0, 4, 4, 0, 3.8, floor, ink.side, rim);
    deckGrid(ctx, iso, 0, 4, active ? '#508380' : '#405963');
    // Three fixed struts and back rails make a cutaway bay without hiding its payload.
    const struts = [[0, 0], [3.83, 0], [0, 3.83]];
    for (const [x,y] of struts) slab(ctx, iso, x, y, .16, .16, pillar, pillar, rim, rim, rim);
    path(ctx, [iso(.10,3.93,pillar),iso(.10,.10,pillar),iso(3.93,.10,pillar)], null, rim, 1.9);
    path(ctx, [iso(.10,3.93,pillar - 2),iso(.10,.10,pillar - 2),iso(3.93,.10,pillar - 2)], null, ink.edge, .7);
    if (id === 'sphere' || id === 'crystal') {
      const profile = sliceProfile(id, level);
      if (profile.radius !== null) {
        const [x,y] = iso(2,2,3);
        const r = profile.radius * Math.min(8,sampleSpace * .115);
        if (id === 'sphere') orb(ctx,x,y-r,r);
        else {
          path(ctx, [[x,y-2*r],[x+r,y-r],[x,y],[x-r,y-r]], '#dc9e67', ink.copper);
          path(ctx, [[x-r,y-r],[x+2,y-r*.7],[x+r,y-r]], null, '#755d55');
          path(ctx, [[x,y-2*r],[x+2,y-r*.7],[x,y]], null, '#fbe0a8');
        }
      }
    }
    drawCabinFixture(ctx, iso, state, id, level, pillar);
    const pilotAcquired = id!=='echo' || state.step>0 || state.w===1;
    if (section.companion && pilotAcquired && level === (id==='echo'?1:state.w)) {
      const [x,,z] = PILOT_BERTHS[id];
      const [px,py] = cabinPosition(iso,{x,z});
      const unit = Math.min(1.3,Math.max(.85,pillar/13));
      ctx.fillStyle = '#b78455';
      ctx.fillRect(px-2.8*unit,py-10*unit,5.6*unit,6*unit);
      ctx.fillStyle = '#d6d8c5';
      ctx.fillRect(px-2.2*unit,py-14*unit,4.4*unit,4*unit);
      ctx.fillStyle = '#39575f';
      ctx.fillRect(px-1.8*unit,py-12.9*unit,3.6*unit,1.3*unit);
      for (const side of [-1,1]) {
        ctx.fillStyle = '#81959a';
        ctx.fillRect(px+(side*1.55-.6)*unit,py-4.3*unit,1.4*unit,4.3*unit);
        ctx.fillStyle = '#d8ba90';
        ctx.fillRect(px+(side*3.45-.45)*unit,py-9.5*unit,1.1*unit,4.9*unit);
      }
    }
    if (beacon && level === beaconW && !state.done) {
      const [tx,ty] = cabinPosition(iso,beacon);
      path(ctx, [[tx,ty-8],[tx+4,ty-4],[tx,ty],[tx-4,ty-4],[tx,ty-8]], null, ink.copper, 1.6);
    }
    const [px,py] = cabinPosition(iso,position);
    referenceCross(ctx,px,py-2,active);
    if (!active) continue;
    // The near/far axes use different world-to-chart scales. Project the
    // actual look direction into this window before drawing the compass point.
    const yaw=position.yaw||0;
    const dx=Math.sin(yaw)/11.1, dz=Math.cos(yaw)/18;
    const u=(dx+dz)*scale, v=(dx-dz)*rise;
    const length=Math.hypot(u,v);
    const fx=u/length, fy=v/length;
    path(ctx,[[px+8*fx,py+8*fy],[px-3*fx-3*fy,py-3*fy+3*fx],
      [px-3*fx+3*fy,py-3*fy-3*fx]],ink.active,'#143d42',1);
    path(ctx,[iso(.2,4),iso(3.75,4),iso(4,3.75)],null,ink.active,1.5);
  }
}

function drawCabinFixture(ctx, iso, state, id, level, pillar) {
  if (id === 'echo' || id === 'home') {
    for (const pos of (id==='home'?[-2.18,2.31]:[-2.18])) {
      const [x,y] = cabinPosition(iso,{x:0,z:pos});
      ctx.fillStyle = '#776c53';
      ctx.fillRect(x-3,y-5,6,5);
      path(ctx,[[x+2,y-5],[x+2,y-10]],null,ink.fixture,1);
    }
    if (id==='home') {
      const [x,y]=cabinPosition(iso,{x:0,z:4.34});
      ctx.strokeStyle = level===3?ink.copper:ink.edge;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x,y-pillar*.42,pillar*.42,pillar*.52,-.24,0,2*Math.PI);
      ctx.stroke();
    }
  } else if (id === 'vault' && level === 0) {
    slab(ctx,iso,.05,1.9,3.9,.13,pillar*.65,pillar*.65,'#9ca9ab','#65737b','#abb4ae');
    slab(ctx,iso,1.81,.73,.38,.38,4,4,'#ffbb83','#ac7751','#f2bc88');
  } else if (id === 'mirror' && level === state.w) {
    const [x,y] = cabinPosition(iso,{x:0,z:4.0});
    drawKey(ctx,x,y-5,pillar*.75,state.angle);
  } else if (id === 'rings') {
    for (const ring of anchorRings(state)) {
      const [cx,cy,cz,w] = ring.center;
      if (level!==w) continue;
      const points = [];
      for (let j=0;j<=32;j++) {
        const rad=j*Math.PI/16, sine=ring.radius*Math.sin(rad);
        const x=cx+ring.radius*Math.cos(rad), y=cy+(ring.plane==='XY'?sine:0);
        const z=cz+(ring.plane==='XZ'?sine:0);
        const point=cabinPosition(iso,{x,z});
        point[1]-=y*pillar*.36;
        points.push(point);
      }
      path(ctx,points,null,ring.plane==='XY'?ink.fixture:ink.copper,1.9);
    }
  } else if (id === 'bridge') {
    const radians = state.angle*Math.PI/180;
    if (level===state.w) {
      // Reticle for the shoes at both banks, as seen in the current XYZ projection.
      const start=1.58, center=1.78, reach=Math.sin(radians)*.36;
      for (const side of [-1,1]) slab(ctx,iso,start,center+side*.36,.84,.09,1.4,1.4,ink.fixture,ink.side,ink.edge);
      if (Math.abs(Math.cos(radians))<1e-6) {
        slab(ctx,iso,start,center-.36,.84,.72,1.5,1.5,ink.copper,'#7f654e',ink.copper);
      } else {
        for (const side of [-1,1]) path(ctx,[iso(start,center+side*reach,3),iso(start+.84,center+side*reach,3)],null,ink.copper,1.7);
      }
    }
  } else if (id === 'clinic' && level===state.w) {
    const [cx,cy] = iso(2.0,1.65,2);
    ctx.strokeStyle = '#82c7c6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx,cy-3,pillar*.48,pillar*.23,-.24,0,2*Math.PI);
    ctx.stroke();
    if (!state.done && ((state.angle===45 && state.w===2) || state.step>=1)) orbMarker(ctx,cx+2,cy-2,2);
  }
}

function cabinPosition(iso, point) {
  // The diagram is a floor plan viewed obliquely. These are the playable hull extents.
  return iso(Math.max(.1,Math.min(3.9,(point.x+5.55)/11.1*4)),
    Math.max(.1,Math.min(3.9,(9-point.z)/18*4)),1);
}

function orbMarker(ctx,x,y,radius) {
  ctx.fillStyle = ink.active;
  ctx.strokeStyle = '#23484c';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x,y-radius,radius,0,2*Math.PI);
  ctx.fill();
  ctx.stroke();
}

function cargoScope(ctx, width, height, state) {
  const {board,basis} = state;
  const isXYZ = basis === 'XYZ';
  const count = isXYZ ? board.dims[3] : board.dims[2];
  const depths = isXYZ ? board.dims[2] : board.dims[3];
  const payload = [];
  for (const [type,points] of [['wall',board.walls],['target',board.targets],['box',board.boxes],['player',[board.player]]]) {
    for (const point of points) payload.push({type,...displayCell(point,basis)});
  }
  const focus = displayCell(board.player,basis);
  const frameWidth = isXYZ ? width/2 : width;
  const frameHeight = height/2;
  for (let slice=0;slice<count;slice++) {
    // Independent optical samples. In XYW each fixed-Z diagram runs horizontally
    // from W1 through W4. Only genuine Z displacement has a height on this display.
    const left = isXYZ ? (slice%2)*frameWidth : 0;
    const top = (isXYZ ? Math.floor(slice/2) : count-1-slice)*frameHeight;
    const title = (isXYZ?'W ':'Z ') + String(slice+1).padStart(2,'0');
    sampleFrame(ctx,left,top,frameWidth,frameHeight,title,slice===focus.slice);
    const space = Math.max(20,frameHeight-28);
    const viewWidth = isXYZ ? frameWidth : (frameWidth-8)/depths;
    const pitch = Math.min((viewWidth-10)/8.3,isXYZ?space*.33:space*.6);
    const rise = Math.min(pitch*(isXYZ?.41:.69),space*(isXYZ?.033:.073));
    for (let depth=0;depth<depths;depth++) {
      const cx=isXYZ ? left+frameWidth*.5 : left+4+(depth+.5)*viewWidth;
      const cy=top+20+(isXYZ ? (depths-depth-.5)*space/depths : space*.48)-4*rise;
      const iso=project(cx,cy,pitch,rise);
      const active=slice===focus.slice && depth===focus.depth;
      if (!isXYZ) {
        if (depth>0) path(ctx,[[left+4+depth*viewWidth,top+24],[left+4+depth*viewWidth,top+frameHeight-9]],null,ink.grid,.8);
        ctx.fillStyle=active?ink.active:'#9eb4bd';
        ctx.font='11px "IBM Plex Mono", Consolas, monospace';
        ctx.fillText('W'+(depth+1),cx-8,top+frameHeight-10);
      }
      slab(ctx,iso,0,0,4,4,0,2.8,active?'#2e5958':ink.deck,ink.side,active?'#75a8a3':ink.edge);
      deckGrid(ctx,iso,0,4,active?'#678f89':'#526874');
      const postHeight = Math.min(5,space*.12);
      for (const [x,y] of [[0,0],[3.82,0],[0,3.82]]) slab(ctx,iso,x,y,.18,.18,postHeight,postHeight,ink.edge,ink.side,ink.edge);
      // Paint from the farthest cell; targets stay visible beneath a docked crate.
      const cells = payload.filter(it=>it.slice===slice && it.depth===depth).sort((a,b)=>a.x+a.y-b.x-b.y);
      for (const p of cells) {
        const size = Math.max(2,pitch*.42);
        const [x,y] = iso(p.x+.5,p.y+.5);
        if (p.type === 'wall') slab(ctx,iso,p.x+.12,p.y+.12,.76,.76,size,size,ink.fixture,'#3e596a','#a0b6c2');
        if (p.type === 'target') path(ctx,[iso(p.x+.04,p.y+.04),iso(p.x+.96,p.y+.04),iso(p.x+.96,p.y+.96),iso(p.x+.04,p.y+.96),iso(p.x+.04,p.y+.04)],null,ink.copper,2);
        if (p.type === 'box') slab(ctx,iso,p.x+.12,p.y+.12,.76,.76,size*1.3,size*1.3,'#f0b578','#a5724c','#ffdeb3');
        if (p.type === 'player') {
          slab(ctx,iso,p.x+.12,p.y+.15,.76,.7,size*.55,size*.55,ink.active,'#3e807c',ink.active);
          ctx.fillStyle='#e5cfad';
          ctx.fillRect(x-1.7,y-size*.55-3,3.4,3.2);
          ctx.fillStyle='#486871';
          ctx.fillRect(x-1.6,y-size*.55-2.6,3.1,1.1);
        }
      }
    }
  }
}

export function drawScope(canvas, state, section, position, beacon) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (width < 4 || height < 4) return;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const w = Math.round(width*dpr), h = Math.round(height*dpr);
  if (canvas.width!==w || canvas.height!==h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = '#0b1b23';
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle = ink.grid;
  for (let y=6;y<height;y+=12) for (let x=6;x<width;x+=12) ctx.fillRect(x,y,1,1);
  if (section.id==='cargo' && state.board) cargoScope(ctx,width,height,state);
  else samplingWindows(ctx,width,height,state,section,position,beacon);
}

const keyColors = ['#ffc68a','#8adacb','#c8a4d3'];

function drawKey(ctx,x,y,scale,angle) {
  for (const [i,tip] of KEY_TIPS.entries()) {
    const [vx,vy,vz] = rotateXW([...tip,0],angle);
    const tx=x+(vx-.44*vz)*scale, ty=y+(-vy+vz*.34)*scale;
    path(ctx,[[x,y],[tx,ty]],null,keyColors[i],Math.max(1,scale*.075));
    const size=Math.max(1.6,scale*.065);
    ctx.fillStyle=keyColors[i];
    if (i===0) ctx.fillRect(tx-size,ty-size,size*2,size*2);
    else if (i===1) {ctx.beginPath();ctx.arc(tx,ty,size*1.17,0,Math.PI*2);ctx.fill();}
    else path(ctx,[[tx,ty-size*1.4],[tx+size,ty],[tx,ty+size*1.4],[tx-size,ty]],keyColors[i],null);
  }
  orbMarker(ctx,x,y+2,2.2);
}

export function measurement(state,id) {
  if (id==='bridge') return ['桥梁侧视 · ZW',state.angle===90?'桥靴对接':'桥靴分离'];
  if (id==='mirror') return ['钥匙正投影 · XYZ',state.angle===180?'轮廓吻合':'比对槽型'];
  if (id==='sphere' || id==='crystal') {
    const {radius} = sliceProfile(id,state.w);
    const value = radius===null?'无截面':radius.toFixed(2)+' m';
    return [id==='sphere'?'球截面半径':'晶体轴截距',value];
  }
  if (id==='clinic') return ['航服扫描带',state.done?'薄签已取出':state.step>=1?'薄签已锁定':'扫查中'];
  return null;
}

function textLabel(ctx,text,x,y,color='#abbfc2') {
  ctx.fillStyle=color;
  ctx.font='12px "Noto Sans CJK SC", sans-serif';
  ctx.fillText(text,x,y);
}

export function drawMeasurement(canvas,state,id) {
  const width=canvas.clientWidth, height=canvas.clientHeight;
  if (width<2 || height<2) return;
  const dpr=Math.min(1.5,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(width*dpr) || canvas.height!==Math.round(height*dpr)){
    canvas.width=Math.round(width*dpr);
    canvas.height=Math.round(height*dpr);
  }
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  if (id==='mirror') {
    const scale=height*.73, mid=height*.71;
    drawKey(ctx,width*.22,mid,scale,state.angle);
    drawKey(ctx,width*.73,mid,scale,180);
    textLabel(ctx,'钥匙',6,height-3);
    textLabel(ctx,'锁槽',width*.51,height-3);
    path(ctx,[[width*.49,6],[width*.49,height-5]],null,ink.edge,.75);
  } else if (id==='bridge') {
    const cx=width*.5,cy=height*.52;
    // Identical world lengths use the same scale in Z and W. The zoomed sockets
    // mark opposite XYZ endpoints; the true rigid segment can rotate away from W=0.
    const reach=height*.37, rad=state.angle*Math.PI/180;
    path(ctx,[[cx-reach-27,cy],[cx+reach+25,cy]],null,ink.edge,1);
    path(ctx,[[cx,cy-reach-4],[cx,cy+reach+3]],null,ink.edge,1);
    for(const s of [-1,1]) {
      const x=cx+s*reach, y=cy;
      path(ctx,[[x+s*6,y-6],[x,y-6],[x,y+6],[x+s*6,y+6]],null,ink.fixture,2);
    }
    const dx=Math.sin(rad)*reach,dy=Math.cos(rad)*reach;
    path(ctx,[[cx-dx,cy+dy],[cx+dx,cy-dy]],null,state.angle===90?ink.active:ink.copper,3.4);
    for(const s of [-1,1]) orbMarker(ctx,cx+s*dx,cy-s*dy+2,2.4);
    textLabel(ctx,'W',cx+4,12);
    textLabel(ctx,'Z',cx+reach+30,cy+4);
  } else if (id==='sphere'||id==='crystal') {
    const left=18,right=width-21,base=height-16;
    const xx=w=>left+(w+.5)/3.5*(right-left), yy=r=>base-r*(height-26)/1.5;
    path(ctx,[[left,base],[right,base]],null,ink.edge,.9);
    const curve=[];
    for(let i=0;i<=120;i++) {
      const w=-.5+3*i/120;
      curve.push([xx(w),yy(sliceProfile(id,w).radius??0)]);
    }
    path(ctx,curve,null,id==='sphere'?ink.copper:ink.active,1.5);
    for(let w=0;w<4;w++) {
      const x=xx(w),r=sliceProfile(id,w).radius;
      path(ctx,[[x,base],[x,base+3]],null,ink.edge);
      textLabel(ctx,'W'+(w+1),x-9,height-2,w===state.w?ink.white:'#839ba1');
      if(w===state.w && r!==null) {
        path(ctx,[[x,base],[x,yy(r)]],null,ink.white,1);
        orbMarker(ctx,x,yy(r)+2,3);
      }
    }
  } else if (id==='clinic') {
    const cx=width*.42,cy=height*.55, pitch=height*.12;
    // Suit telemetry is a diagram of the liner, its scanning band and the return tag.
    ctx.strokeStyle='#75949a';ctx.lineWidth=1.2;
    path(ctx,[[cx-24,cy-18],[cx-11,cy-21],[cx-6,cy-15],[cx+6,cy-15],[cx+11,cy-21],[cx+24,cy-18],[cx+27,cy-4],[cx+14,cy+1],[cx+13,cy+16],[cx-13,cy+16],[cx-14,cy+1],[cx-27,cy-4],[cx-24,cy-18]],null,'#9eafb0',1.2);
    const y=cy+(1-state.w)*pitch, rad=state.angle*Math.PI/180;
    path(ctx,[[cx-35*Math.cos(rad),y-17*Math.sin(rad)],[cx+35*Math.cos(rad),y+17*Math.sin(rad)]],null,ink.active,2);
    if(!state.done && ((state.angle===45&&state.w===2)||state.step>=1)) {
      ctx.fillStyle=ink.copper;
      ctx.fillRect(cx+3,cy-7,5,5);
    }
    textLabel(ctx,'内衬',cx+43,cy+3);
  }
}
