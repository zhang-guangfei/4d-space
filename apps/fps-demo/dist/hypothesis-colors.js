/** IDs belong only to these illustrative hypotheses, never physical station cells. */
export const HYPOTHESIS_ROOM_COLORS=Object.freeze({
 H1:'#56d9e8',H2:'#f3aa54',H3:'#a78cf0',H4:'#76d58b',HC:'#f0739d',
 HR1:'#e6d266',HR2:'#74a3ed',HR3:'#ed8266',HR4:'#64d0b4',
 T1:'#56d9e8',T2:'#f3aa54',T3:'#a78cf0',T4:'#76d58b',
 TL1:'#e6d266',TL2:'#74a3ed',TL3:'#ed8266',TL4:'#64d0b4',
 TR1:'#f0739d',TR2:'#b6c86a',TR3:'#c99863',TR4:'#a8b9e8',
 SN:'#62d7ed',SS:'#f080b5'
});
export function hypothesisRoomColor(id){if(!Object.hasOwn(HYPOTHESIS_ROOM_COLORS,id))throw Error('Unknown hypothesis-local room '+id);return HYPOTHESIS_ROOM_COLORS[id];}
