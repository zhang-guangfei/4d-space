// Both chapters use this metre-scale pressure suit. The source frame is
// feet-on-deck, facing -Z. Individual fittings are grouped by attachment so
// an arm, not its shoulder pad, follows a wave or reaches for a repair fitting.
export const CREW_SHOULDER = Object.freeze([.348, 1.435, 0]);
export const CREW_SOLE = .0135;
export const CREW_EYE = 1.754;
const ink='233541', steel='587180', edge='a1b1b0', ochre='df8b42', teal='51dcdb';
const fabric='4b6267', harness='273e49', ivory='e5dcbe', amber='d4894e', skin='b98769';

function pressureSuit() {
  const pieces = [];
  const group = name => ({
    box: (...args) => pieces.push({name, shape:'box', args}),
    round: (...args) => pieces.push({name, shape:'round', args}),
    beam: (...args) => pieces.push({name, shape:'beam', args}),
    lamp: (...args) => pieces.push({name, shape:'box', args, lamp:true}),
  });
  for (const s of [-1,1]) {
    // Left/right refer to the wearer's own hands when looking along -Z.
    const side = s>0 ? 'left ' : 'right ';
    group(side+'boot').box(s*.151,.123,-.055,.234,.20,.394,harness,2);
    group(side+'sole stripe').box(s*.151,.047,-.06,.25,.067,.4,'132c37',1);
    group(side+'sole stripe').box(s*.151,.075,-.255,.19,.025,.019,s>0?'ce7361':ochre);
    const leg=group(side+'leg');
    leg.box(s*.151,.27,.016,.2,.27,.22,fabric,1);
    leg.box(s*.151,.426,0,.21,.20,.24,'667c7d',2);
    leg.box(s*.151,.447,-.12,.15,.14,.07,ivory,2);
    leg.box(s*.15,.65,.02,.22,.32,.25,amber,2);
    leg.box(s*.262,.63,.021,.05,.17,.15,harness,1);
    leg.box(s*.15,.84,0,.24,.14,.265,fabric);

    const shoulder=group(side+'shoulder patch');
    shoulder.box(s*.33,1.43,.01,.185,.205,.28,ivory,2,0,0,s*.07);
    shoulder.box(s*.415,1.436,-.009,.022,.049,.175,s>0?'ce7361':ochre);
    // Arm fittings are in shoulder-pivot coordinates; all others are in deck coordinates.
    const sleeve=group(side+'arm');
    sleeve.box(s*.032,-.116,0,.17,.23,.22,amber,2,s*.12);
    sleeve.box(s*.047,-.245,-.008,.161,.11,.207,harness,1);
    sleeve.box(s*.057,-.363,-.047,.154,.181,.18,ivory,2,0,.16);
    group(side+'cuff').box(s*.06,-.458,-.063,.146,.048,.17,s>0?'ce7361':ochre);
    const glove=group(side+'glove');
    glove.box(s*.06,-.487,-.068,.14,.109,.164,harness,1);
    glove.box(s*.041,-.516,-.094,.122,.06,.125,steel);
  }

  const jacket=group('torso');
  jacket.box(0,.97,0,.53,.29,.36,fabric,1);
  jacket.box(0,1.08,0,.59,.13,.4,harness,2);
  jacket.box(0,1.28,0,.55,.38,.35,amber,2);
  jacket.box(0,1.46,-.006,.59,.19,.34,ivory,2);
  const panel=group('chest controls');
  panel.box(-.09,1.08,-.216,.095,.088,.047,ivory);
  panel.box(0,1.22,-.19,.38,.164,.075,harness,1);
  for(const s of [-1,1]){
    panel.box(s*.196,1.34,-.193,.065,.39,.055,fabric,0,s*.13);
    panel.box(s*.222,1.08,-.21,.13,.14,.08,amber,2);
  }
  panel.box(.089,1.415,-.193,.10,.065,.022,ivory);
  panel.box(.09,1.414,-.211,.067,.013,.018,steel);
  for(let i=0;i<3;i++)panel.lamp(-.083+i*.056,1.26,-.232,.035,.035,.012,i<2?teal:ochre);

  const pack=group('backpack'), radio=group('backpack panel');
  pack.box(0,1.30,.307,.49,.47,.17,harness,2);
  for(const s of [-1,1]) {
    pack.box(s*.15,1.32,.40,.16,.43,.16,ivory,1);
    radio.box(s*.15,1.30,.516,.17,.087,.05,ochre);
    // Pressure vessel caps, retaining collars, numbered inspection tape.
    pack.round(s*.15,1.548,.40,.123,.057,.123,steel,'octagon');
    pack.box(s*.15,1.592,.40,.064,.047,.066,ochre);
    radio.box(s*.15,1.49,.485,.17,.036,.035,fabric);
    radio.box(s*.15,1.143,.485,.17,.036,.035,fabric);
    radio.box(s*.15,1.373,.485,.094,.035,.019,'ede8d0');
    radio.box(s*.15,1.373,.498,.044,.012,.014,'364650');
    radio.box(s*.15,1.30,.547,.083,.065,.022,steel);
    radio.box(s*.15,1.30,.561,.045,.018,.013,ivory);
  }
  radio.box(0,1.32,.409,.106,.25,.044,steel,2);
  radio.box(0,1.356,.438,.072,.093,.023,ink);
  radio.lamp(0,1.371,.456,.044,.025,.016,teal);
  for(let j=0;j<3;j++)radio.box(0,1.276-j*.021,.441,.058,.009,.014,harness);
  pack.box(.27,1.65,.27,.035,.54,.035,edge);
  pack.lamp(.27,1.94,.27,.044,.055,.044,teal);
  group('neck collar').box(0,1.60,.004,.28,.1,.26,harness,1);
  const helmet=group('helmet'), face=group('visor');
  helmet.box(0,1.77,0,.47,.35,.413,ivory,2);
  helmet.box(0,1.96,.014,.42,.084,.38,amber);
  // Rear closure is visible in the return image. The collar, exhaust slots
  // and rescue lamp locate the head even when the wearer faces away.
  helmet.box(0,1.641,.199,.394,.055,.046,harness);
  helmet.box(0,1.828,.213,.269,.095,.027,'788a89');
  for(let j=0;j<3;j++)helmet.box(-.076+j*.076,1.827,.232,.045,.052,.018,ink);
  helmet.box(-.163,1.731,.215,.064,.042,.034,fabric);
  helmet.lamp(-.163,1.731,.238,.043,.018,.016,teal);
  helmet.box(.106,1.739,.216,.084,.033,.023,ochre);
  for(const s of [-1,1]){
    helmet.box(s*.239,1.78,-.005,.076,.187,.23,fabric,2);
    helmet.round(s*.282,1.8,0,.11,.06,.11,edge,'octagon',0,0,Math.PI/2);
    helmet.box(s*.19,1.68,-.18,.068,.14,.095,ivory);
  }
  face.box(0,1.738,-.212,.345,.202,.038,skin);
  face.box(0,1.851,-.224,.397,.087,.063,'1d3742');
  face.box(0,1.865,-.262,.348,.028,.014,'62949c');
  face.lamp(-.091,1.867,-.273,.115,.016,.012,'c2dfd4');
  for(const s of [-1,1]){
    face.box(s*.157,1.775,-.226,.043,.109,.032,'674f46');
    face.box(s*.080,1.787,-.245,.078,.017,.027,'644e43',0,s*.09);
    face.box(s*.079,1.752,-.248,.065,.030,.023,'efddbc');
    face.box(s*.073,1.754,-.267,.025,.027,.018,'2e3c3c');
    face.box(s*.115,1.713,-.241,.046,.016,.016,'b77f68');
  }
  face.box(0,1.718,-.249,.041,.048,.037,'ca9677');
  face.box(.006,1.679,-.241,.069,.011,.017,'78594f',0,.05);
  face.box(0,1.634,-.208,.22,.043,.053,harness);
  face.box(-.166,1.865,-.195,.053,.06,.048,'795a43');
  face.box(-.224,1.7,-.18,.042,.08,.04,ink);
  face.beam([-.22,1.68,-.2],[-.075,1.67,-.26],.026,.026,ink);
  return pieces;
}

export const CREW_PIECES=Object.freeze(pressureSuit());
export function shoulderFor(name) {
  return [(name.startsWith('left')?1:-1)*CREW_SHOULDER[0], CREW_SHOULDER[1], CREW_SHOULDER[2]];
}
export function isSleeve(name) {
  return / (arm|cuff|glove)$/.test(name);
}
// The contact microphone, eyelids and fasteners fall below a pixel in optical
// repeats. Keep boots, kneepads, cuffs, goggle band and both pressure tanks.
export function visibleAtDistance({name,shape,args}) {
  if(shape!=='box')return false;
  if(name.endsWith('shoulder patch')||name.endsWith('sole stripe'))return true;
  const [w,h,d]=args.slice(3,6);
  return w*h*d>=.00030;
}
