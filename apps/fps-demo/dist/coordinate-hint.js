import {normalFor,canonicalFrame,cellId} from './chapter-topology.js';
export const AXIS_COLORS=Object.freeze({X:'#ba6460',Y:'#678a65',Z:'#547caa',W:'#9175a5'});
/** A physical three-axis corner triad, never a fictitious 4-axis 3D frame. */
export function coordinateHint(cell){const normal=normalFor(cell),frame=canonicalFrame(normal),origin=[3.12,-3.12,3.12];return {normal,frame,origin,fixedLabel:'固定：'+cellId(normal),axes:frame.map((basis,index)=>{const direction=[0,0,0];direction[index]=[-1,1,-1][index];const ambient=basis.map(v=>v*direction[index]);return {direction,ambient,label:cellId(ambient),color:AXIS_COLORS[cellId(ambient)[0]],length:.68};})};}
