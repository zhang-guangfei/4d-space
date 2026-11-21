// The 3D framebuffer has its own pixel density. DOM text and instruments stay at display resolution.
const densities = [.5, .64, .8, 1, 1.18, 1.35, 1.5, 1.75, 2];
const softwareWidths = [384, 448, 512, 640, 768, 896, 1024, 1280, 1536];
const maxPixels = 3840 * 2160;

export function createRenderQuality({software = false} = {}) {
  let level = 3;
  let ceiling = densities.length - 1;
  let elapsed = 0, frames = 0, stable = 0, slow = 0, hold = 0, stalls = 0;

  function scale(width, height, dpr = 1, mode = 'auto') {
    width = Math.max(1, width);
    height = Math.max(1, height);
    const native = Math.max(1, Math.min(2, dpr || 1));
    const limit = Math.min(Math.max(1.5, native), Math.sqrt(maxPixels / (width * height)));
    let density;
    if (mode === 'native') density = native;
    else if (mode === 'high') density = limit;
    else if (software) {
      density = Math.min(limit, softwareWidths[level] / width);
    } else {
      // Keep one tier at the limit itself, even when the screen budget falls between tiers.
      ceiling = densities.findIndex(value => value >= limit);
      if (ceiling < 0) ceiling = densities.length - 1;
      level = Math.min(level, ceiling);
      density = Math.min(limit, densities[level]);
    }
    return 1 / density;
  }

  function sample(ms) {
    // A tab suspension or a section load does not describe steady-state rendering cost.
    if (!Number.isFinite(ms) || ms <= 0) return false;
    if (ms >= 250) {
      // One shader compilation can block a frame. Repeated stalls during play
      // still need to lower resolution, even if each interval exceeds 250 ms.
      if (++stalls < 3) return false;
      ms = 250;
    } else stalls = 0;
    elapsed += ms;
    frames++;
    if (elapsed < 750) return false;
    const average = elapsed / frames;
    hold = Math.max(0, hold - elapsed);
    // A 60 Hz monitor can have spare rendering time even when rAF never exceeds 60 FPS.
    stable = average <= 17.6 ? stable + elapsed : 0;
    slow = average > (software ? 29 : 19) ? slow + elapsed : 0;
    elapsed = frames = 0;
    const step = slow >= 1400 && level > 0 ? -1
      : stable >= (average < 13 ? 1500 : 4500) && !hold && level < ceiling ? 1 : 0;
    if (!step) return false;
    level += step;
    slow = stable = 0;
    if (step < 0) hold = 20000;
    return true;
  }
  return {scale, sample};
}

const modeKey = 'beyond3d.codex.resolution';
const modes = ['auto', 'native', 'high'];
export function readRenderQualityMode() {
  try {
    const mode = globalThis.localStorage.getItem(modeKey);
    return modes.includes(mode) ? mode : 'auto';
  } catch { return 'auto'; }
}

export function saveRenderQualityMode(mode) {
  try { if (modes.includes(mode)) globalThis.localStorage.setItem(modeKey, mode); }
  catch { /* Private browsing can disable persistent settings. */ }
}
