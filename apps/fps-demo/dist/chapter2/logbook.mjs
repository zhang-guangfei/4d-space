import { SECTIONS, act, createState } from './rules.mjs';

// Store only player decisions. Rebuilding via the rules also restores undo history.
const slot = 'beyond3d.codex.fold.log.v1';
const revision = 2;
const oldBriefings = new Set(['echo', 'vault', 'bridge', 'cargo', 'mirror', 'clinic']);

function replayCommands(data, section) {
  if (data.revision === revision) return data.commands;
  if (data.revision !== undefined) throw new RangeError('Unknown logbook revision');
  if (!oldBriefings.has(section.id)) return data.commands;
  // The original log only wrote successful interactions. Its first F in
  // these six sections acknowledged a briefing now given on arrival. Keep
  // every switch of W, rotation or basis on either side of that action.
  const briefing = data.commands.findIndex(command => command[0] === 'interact');
  return data.commands.filter((command, index) => index !== briefing);
}
export function openLogbook(storage) {
  let record = { revision, index: 0, commands: [], sound: true, pose: null };
  let state = createState(0);
  try {
    const data = JSON.parse(storage.getItem(slot));
    if (data && Number.isInteger(data.index) && SECTIONS[data.index] && Array.isArray(data.commands)) {
      const chapter = SECTIONS[data.index];
      let restored = createState(data.index);
      const commands = replayCommands(data, chapter);
      for (const [name, axis, delta] of commands) {
        if (name !== 'interact' && !chapter.controls.includes(name)) throw new RangeError('Unknown command');
        restored = act(restored, name, { near: true, axis, delta });
      }
      state = restored;
      record = { revision, index: data.index, commands, sound: data.sound !== false, pose: data.pose };
    }
  } catch { /* Private browsing and old saves can both start from the first berth. */ }
  function write() {
    try { storage.setItem(slot, JSON.stringify(record)); } catch { /* In-memory play still works. */ }
  }
  return {
    initial: state,
    get pose() { return record.pose; },
    get sound() { return record.sound; },
    switchTo(index) { record.index = index; record.commands = []; record.pose = null; write(); },
    append(name, { axis, delta }, pose) {
      record.commands.push([name, axis, delta]);
      record.pose = pose;
      write();
    },
    savePose(pose) { record.pose = pose; write(); },
    toggleSound() { record.sound = !record.sound; write(); return record.sound; }
  };
}
