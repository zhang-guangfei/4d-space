import {parts,assemble} from './scene-geometry.mjs';

// Contacts are cast onto deck paint and aft framing. A transverse light scan
// measures phase; no deck, wall, camera or sky is translated by a W command.
export function makePhaseGauge(scene,materials) {
  const p=parts();
  for(let z=-8.7;z<10;z+=.96){
    p.light.box(0,.053,z,.054,.016,.67,'a6f4df');
    p.light.box(-.12,.045,z+.08,.022,.012,.27,'7eb6b2');
    p.light.box(.13,.045,z-.07,.029,.011,.18,'d3e9b9');
  }
  for(const z of [-.51,2.51,9.78]) {
    for(let i=0;i<6;i++)p.light.box(0,.19+i*.24,z,.04,.13,.03,i%2===0?'e8cc92':'9bdacf');
  }
  const root=assemble(scene,'transverse W phase gauge',p,materials);root.setEnabled(false);
  return root;
}

export function solidSample(scene,materials,id){
  if(id!=='sphere'&&id!=='crystal')return null;
  const p=parts(),sphere=id==='sphere';
  p.hull.round(0,0,0,2,2,2,sphere?'eeb581':'94dfdd',sphere?'sphere':'octa');
  if(sphere){
    for(const t of [-.31,.31]){
      const diameter=2*Math.sqrt(1-t*t);
      p.hull.round(0,t,0,diameter,.12,diameter,'cf9c6c','ring');
    }
  }
  const root=assemble(scene,'true slice of '+id,p,materials);
  root.position.set(0,2.1,4.18);
  return root;
}
