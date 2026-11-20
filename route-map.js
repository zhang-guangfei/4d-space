import {CELL_IDS, cellId, cellNeighbors} from './chapter-topology.js';

const origin = 'W+';
const doors = new Map(CELL_IDS.map(id => [id, cellNeighbors(id).map(cellId)]));

// A shared square is one move. Stop after eight distinct cells: the return
// to the mirror at W+ belongs to the story after the challenge.
function finishRoute(prefix) {
  if (prefix[0] !== origin || new Set(prefix).size !== prefix.length) return null;
  if (!prefix.slice(1).every((id, i) => doors.get(prefix[i])?.includes(id))) return null;

  const path = [...prefix];
  function extend() {
    if (path.length === CELL_IDS.length) return true;
    for (const next of doors.get(path.at(-1))) {
      if (path.includes(next)) continue;
      path.push(next);
      if (extend()) return true;
      path.pop();
    }
    return false;
  }
  return extend() ? path : null;
}

const freshRoute = Object.freeze(finishRoute([origin]));

/** Adapt a ChapterProgress snapshot for the static map, without changing play. */
export function routeMapState(snapshot, showHint = false) {
  if (snapshot.phase !== 'lower') {
    return {visible: false, currentCell: null, visited: [], canHint: false, route: [], status: 'hidden'};
  }

  const {currentCell, counts, surveyComplete, routeActive, routeComplete, routeFailure, routeTrail, pending} = snapshot;
  const visited = routeTrail.length ? [...routeTrail] : CELL_IDS.filter(id => counts[id] > 0);
  const canHint = surveyComplete && !routeComplete;
  const state = {visible: true, currentCell, visited, canHint, route: [], status: 'survey'};
  if (routeComplete) state.status = 'complete';
  else if (routeFailure) state.status = 'restart';
  else if (routeActive) state.status = 'active';
  else if (surveyComplete) state.status = 'ready';

  if (!showHint || !canHint) return state;
  if (!routeActive) return {...state, route: [...freshRoute]};

  // The live player marker crosses immediately. A cell only becomes part of
  // the attempt after ChapterProgress has accepted its interior entry.
  if (pending) {
    const ahead = finishRoute([...routeTrail, pending.cell]);
    if (ahead) return {...state, route: ahead};
  }
  const solution = finishRoute(routeTrail);
  if (!solution) return {...state, status: 'restart', route: [...freshRoute]};
  return {...state, status: pending ? 'backtrack' : 'active', route: solution};
}
