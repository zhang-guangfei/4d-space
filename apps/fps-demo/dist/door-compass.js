import {cellId} from './chapter-topology.js';
import {walkDoor} from './hatch.js';

// Match the three orthogonal camera directions to a permutation of the room axes.
// Independent extrema would label the same door twice near a diagonal or when rolling.
const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
export function doorCompass(state, basis, phase) {
 const axes = [basis.right,basis.up,basis.forward];
 let score = -1, best;
 for (const order of permutations) {
  const candidate = axes.reduce((value,v,i) => value+Math.abs(v[order[i]]),0);
  if (candidate > score) {score=candidate; best=order;}
 }
 return [[2,1],[2,-1],[0,-1],[0,1],[1,1],[1,-1]].map(([cameraAxis,sign]) => {
  const index = best[cameraAxis], signInFrame = axes[cameraAxis][index] < 0 ? -sign : sign;
  const neighbor = state.frame[index].map(value => value*signInFrame);
  return {target:cellId(neighbor), open:phase!=='upper'||walkDoor(state.normal,neighbor,phase)};
 });
}
