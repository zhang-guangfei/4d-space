import {routeMapState} from './route-map.js';

// An exploded orthographic view of the eight-cube net. W+ touches the six
// signed XYZ cells. The last cube (W-) folds onto the far face of X+.
// The seven pale hinges show how this net folds, not every possible doorway.
const cells = {
  'W+': [67, 74], 'X+': [110, 53], 'X-': [24, 95],
  'Y+': [67, 32], 'Y-': [67, 116], 'Z+': [24, 53],
  'Z-': [110, 95], 'W-': [153, 32],
};
const cellIds = Object.keys(cells);
const svgNamespace = 'http://www.w3.org/2000/svg';

function svgNode(parent, tag, attributes, text) {
  const node = parent.ownerDocument.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}

function drawNet(panel) {
  const hinges = panel.querySelector('#mapHinges');
  const cubes = panel.querySelector('#mapCells');
  const nodes = new Map();
  for (const id of cellIds) {
    const [x,y] = cells[id];
    if (id !== 'W+') {
      const from = cells[id === 'W-' ? 'X+' : 'W+'];
      svgNode(hinges, 'line', {x1:from[0], y1:from[1], x2:x, y2:y});
    }
    const group = svgNode(cubes, 'g', {'data-cell':id, transform:`translate(${x} ${y})`});
    svgNode(group, 'path', {class:'map-cube-top', d:'M0 -15 15 -8 0 0 -15 -8Z'});
    svgNode(group, 'path', {class:'map-cube-left', d:'M-15 -8 0 0 0 16 -15 8Z'});
    svgNode(group, 'path', {class:'map-cube-right', d:'M0 0 15 -8 15 8 0 16Z'});
    svgNode(group, 'text', {class:'map-cell-label', y:8}, id.replace('-', '−'));
    // The player marker and sequence number occupy opposite top corners.
    svgNode(group, 'path', {class:'map-player', d:'M-19 -18 -6 -13 -16 -5Z'});
    const badge = svgNode(group, 'g', {class:'map-badge', transform:'translate(11 -11)'});
    svgNode(badge, 'circle', {r:6});
    const number = svgNode(badge, 'text', {y:3.6});
    nodes.set(id, {group, number});
  }
  return nodes;
}

// Choose a shallow arc that clears intervening cells. A straight line through
// a third cell in the drawing would suggest a stop that the route never makes.
const pathCache = new Map();
function connection(from, to) {
  const key = from + to;
  if (pathCache.has(key)) return pathCache.get(key);
  const [ax,ay] = cells[from], [bx,by] = cells[to];
  const dx = bx-ax, dy = by-ay;
  const otherCells = cellIds.filter(id => id !== from && id !== to);
  let bestScore = Infinity, path;
  for (const bend of [0, .23, -.23, .48, -.48, .8, -.8]) {
    const cx = Math.max(4, Math.min(173, (ax+bx)/2 - bend*dy));
    const cy = Math.max(4, Math.min(137, (ay+by)/2 + bend*dx));
    let score = Math.abs(bend);
    for (let i=1; i<24; i++) {
      const t=i/24, u=1-t;
      const x=u*u*ax+2*u*t*cx+t*t*bx, y=u*u*ay+2*u*t*cy+t*t*by;
      for (const id of otherCells) {
        const [ox,oy] = cells[id];
        score += Math.max(0, 18 - Math.hypot(x-ox, y-oy));
      }
    }
    if (score < bestScore) {
      bestScore = score;
      path = `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}`;
      if (score === 0) break;
    }
  }
  pathCache.set(key, path);
  return path;
}

function instruction(state, snapshot, showHint) {
  if (state.status === 'survey') return '虚线是折缝。六扇门的去向见罗盘。';
  if (state.status === 'complete') return '八胞路线已完成';
  if (state.status === 'restart') return showHint ? '回 W+ 重开，按金线编号前进。' : '回 W+ 按 R 可重开路线。';
  if (state.status === 'backtrack') return `先退回 ${snapshot.routeTrail.at(-1)}，再按金线走。`;
  if (state.status === 'ready') return showHint ? '从 W+ 启动，按金线编号前进。' : '在 W+ 按 R 启动路线。';
  if (!showHint) return '';
  if (snapshot.pending) return '深入廊室，登记本次到达。';
  const next = state.route[state.route.indexOf(state.currentCell)+1];
  return next ? `下一站 ${next} · 找罗盘中的同名门` : '深入廊室，登记本次到达。';
}

export function createRouteMapView(panel) {
  const hint = panel.querySelector('#routeHint');
  const solution = panel.querySelector('#mapSolution');
  const label = panel.querySelector('#mapHintLabel');
  const count = panel.querySelector('#mapCount');
  const help = panel.querySelector('#mapInstruction');
  const here = panel.querySelector('#mapHere');
  const description = panel.querySelector('#mapDescription');
  let snapshot, nodes, previousKey, showHint = false;

  function render() {
    const state = routeMapState(snapshot, showHint);
    panel.hidden = !state.visible;
    panel.dataset.status = state.status;
    if (!state.visible) { showHint = false; return; }
    if (!nodes) nodes = drawNet(panel);
    if (!state.canHint) showHint = false;
    hint.hidden = !state.canHint;
    hint.setAttribute('aria-pressed', String(showHint));
    label.textContent = showHint ? '收起路线提示' : '显示路线提示';
    const countLabel = snapshot.routeTrail.length ? '本轮' : '调查';
    count.textContent = `${countLabel} ${state.visited.length}/8`;
    here.textContent = '你在 '+state.currentCell;
    help.textContent = instruction(state, snapshot, showHint);
    description.textContent = `当前位置 ${state.currentCell}。已走过 ${state.visited.join('、')}。` +
      (state.route.length ? '建议路线依次为 '+state.route.join('、')+'。' : '');
    for (const [id, {group, number}] of nodes) {
      group.dataset.current = String(id === state.currentCell);
      group.dataset.visited = String(state.visited.includes(id));
      const step = state.route.indexOf(id) + 1;
      group.dataset.step = step ? String(step) : '';
      number.textContent = step || '';
    }
    solution.replaceChildren();
    for (let i=1; i<state.route.length; i++) {
      const from=state.route[i-1], to=state.route[i];
      svgNode(solution, 'path', {
        d:connection(from,to), 'data-from':from, 'data-to':to, 'data-step':i+1,
      });
    }
  }
  function toggleHint() {
    if (!snapshot || panel.hidden || hint.hidden) return false;
    showHint = !showHint;
    render();
    return true;
  }
  hint.addEventListener('click', toggleHint);
  return {
    toggleHint,
    update(next) {
      snapshot = next;
      if (next.phase !== 'lower' && panel.hidden) return;
      // Camera rotation and the HUD poll do not change a static room map.
      const key = [next.phase, next.currentCell, next.routeActive, next.routeComplete,
        next.surveyComplete, next.routeFailure?.cell, next.pending?.cell,
        next.routeTrail.join(','), ...cellIds.map(id=>next.counts[id]>0)].join('|');
      if (key !== previousKey) { previousKey = key; render(); }
    },
  };
}
