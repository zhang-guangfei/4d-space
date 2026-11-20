import { SECTIONS, act, createState } from './rules.mjs';

// Store only player decisions. Rebuilding via the rules also restores undo history.
const slot = 'beyond3d.codex.fold.log.v1';
export function openLogbook(storage) {
  let record = { index: 0, commands: [], sound: true, pose: null };
  let state = createState(0);
  try {
    const data = JSON.parse(storage.getItem(slot));
    if (data && Number.isInteger(data.index) && SECTIONS[data.index] && Array.isArray(data.commands)) {
      const chapter = SECTIONS[data.index];
      let restored = createState(data.index);
      for (const [name, axis, delta] of data.commands) {
        if (name !== 'interact' && !chapter.controls.includes(name)) throw new RangeError('Unknown command');
        restored = act(restored, name, { near: true, axis, delta });
      }
      state = restored;
      record = { index: data.index, commands: data.commands, sound: data.sound !== false, pose: data.pose };
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
