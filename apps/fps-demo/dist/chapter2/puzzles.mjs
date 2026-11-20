// The cargo bay uses [x, y, z, w]. Z is the two-deck lift, W the four parallel bays.
const DIMS = Object.freeze([4, 4, 2, 4]);
const AXES = Object.freeze(['x', 'y', 'z', 'w']);
const FIXTURES = Object.freeze([
  // The receiving socket can only be loaded from the front of the last bay.
  [1, 2, 0, 3], [3, 2, 0, 3], [2, 3, 0, 3], [2, 2, 0, 2],
  // To stand behind that load, the tug must get onto the upper access rail.
  [1, 0, 0, 3], [3, 0, 0, 3], [2, 0, 0, 2],
  [0, 3, 0, 0], [3, 3, 1, 0], [0, 3, 0, 1], [0, 3, 0, 2],
].map(Object.freeze));
const START = Object.freeze([1, 1, 0, 0]);
const LOAD = Object.freeze([2, 1, 0, 1]);
const SOCKET = Object.freeze([2, 2, 0, 3]);

export function createBoard() {
  return { dims: DIMS, player: START, boxes: [LOAD], targets: [SOCKET], walls: FIXTURES, history: [], moves: 0 };
}

function sameCell(a, b) {
  return a.every((v, i) => b[i] === v);
}

function occupied(board, cell) {
  return cell.some((v, i) => v < 0 || v >= board.dims[i]) || board.walls.some(wall => sameCell(cell, wall));
}

function offset(cell, axis, delta) {
  const result = [...cell];
  result[axis] += delta;
  return result;
}

// Independent axes, solid bulkheads and single-crate pushes. No diagonal jumps or chained pushes.
export function moveBoard(board, axisName, delta) {
  const axis = AXES.indexOf(axisName);
  if (axis < 0 || (delta !== 1 && delta !== -1)) return board;
  const player = offset(board.player, axis, delta);
  if (occupied(board, player)) return board;
  const crate = board.boxes.findIndex(box => sameCell(box, player));
  let boxes = board.boxes;
  if (crate !== -1) {
    const next = offset(player, axis, delta);
    if (occupied(board, next) || boxes.some(box => sameCell(box, next))) return board;
    boxes = boxes.map((box, i) => i === crate ? next : box);
  }
  const history = [...board.history, { player: board.player, boxes: board.boxes }];
  return { ...board, player, boxes, history, moves: board.moves + 1 };
}

export function undoBoard(board) {
  if (!board.history.length) return board;
  const previous = board.history.at(-1);
  return { ...board, ...previous, history: board.history.slice(0, -1), moves: board.moves - 1 };
}

export function cargoDocked(board) {
  return board.targets.every(target => board.boxes.some(box => sameCell(box, target)));
}

// An alternate inspection basis, never a transformation of the physical board.
export function displayCell(point, basis = 'XYZ') {
  const [x, y, z, w] = point;
  return basis === 'XYW' ? { x, y, depth: w, slice: z } : { x, y, depth: z, slice: w };
}

// At fixed W, the Euclidean 4-ball leaves a 3-ball. The 4D cross-polytope
// |x|+|y|+|z|+|w-c| ≤ R leaves an octahedron with a linearly changing axis intercept.
export function sliceRadius(id, w, radius = 1.5, center = 1) {
  if (id !== 'sphere' && id !== 'crystal') throw new RangeError('Unknown section solid');
  const distance = Math.abs(w - center);
  if (distance > radius) return null;
  return id === 'sphere' ? Math.sqrt(radius * radius - distance * distance) : radius - distance;
}

export function sliceProfile(id, w, radius = 1.5, center = 1) {
  return { kind: id === 'sphere' ? 'sphere' : 'octahedron', radius: sliceRadius(id, w, radius, center) };
}

// Rotation is positive in the XW plane. At 180° it reverses only X in the original XYZ slice.
export function rotateXW([x, y, z, w], degrees) {
  const radians = degrees * Math.PI / 180;
  return [x * Math.cos(radians) - w * Math.sin(radians), y, z, x * Math.sin(radians) + w * Math.cos(radians)];
}

// An articulated bridge lies along W at 0°. Rotate it into Z. Both endpoints
// must meet their fixed shoes in four-space before its safety interlock opens.
export function bridgeAligned(degrees, length = 3, clearance = 0.04) {
  const radians = degrees * Math.PI / 180;
  return Math.hypot(length * Math.sin(radians) - length, length * Math.cos(radians)) <= clearance;
}

// Torus centre lines. An XY disk is pierced at two X-axis points by the XZ
// circle; exactly one point falls inside it before the travelling ring moves.
export function anchorRings({ step, w }) {
  return [
    { plane: 'XY', center: [-2, 1.63, 2.95, 0], radius: .875 },
    { plane: 'XZ', center: [step >= 2 ? 2.8 : -1.32, 1.63, 2.95, step > 0 ? w : 0], radius: .84 },
  ];
}
