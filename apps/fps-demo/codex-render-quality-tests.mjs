import assert from 'node:assert/strict';
import {createRenderQuality, readRenderQualityMode, saveRenderQualityMode} from './dist/render-quality.js';

function samples(controller, ms, n) {
  let changes = 0;
  for (let i = 0; i < n; i++) changes += Number(controller.sample(ms));
  return changes;
}
const quality = createRenderQuality();
const scale = () => quality.scale(1920, 1080, 1);
assert.equal(scale(), 1);
assert.equal(samples(quality, 1000 / 120, 1400), 3);
assert.equal(scale(), 1 / 1.5);
assert.equal(samples(quality, 1000, 1), 0);
assert.equal(scale(), 1 / 1.5);
assert.equal(samples(quality, 25, 90), 1);
const recovered = scale();
assert.ok(recovered > 1 / 1.5 && recovered < 1);
assert.equal(samples(quality, 16.667, 600), 0);
assert.equal(samples(quality, 16.667, 1000), 1);
const retina = createRenderQuality();
assert.equal(retina.scale(3840, 2160, 2, 'high'), 1);
assert.equal(retina.scale(1280, 720, 2, 'native'), .5);
assert.equal(retina.scale(1280, 720, 1, 'high'), 2 / 3);
const fixedRefresh = createRenderQuality();
assert.equal(samples(fixedRefresh, 16.667, 330), 1);
const fallback = createRenderQuality({software:true});
assert.equal(fallback.scale(1920, 1080), 3);
samples(fallback, 35, 200);
assert.equal(fallback.scale(1920, 1080), 5);
const overloaded = createRenderQuality();
samples(overloaded, 310, 24);
assert.ok(overloaded.scale(1280, 720) > 1);
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable:true, value: {
  getItem: key => storage.get(key), setItem: (key, mode) => storage.set(key, mode)
}});
assert.equal(readRenderQualityMode(), 'auto');
saveRenderQualityMode('high');
saveRenderQualityMode('invalid');
assert.equal(readRenderQualityMode(), 'high');
Object.defineProperty(globalThis, 'localStorage', {get(){throw new Error('disabled');}});
saveRenderQualityMode('native');
assert.equal(readRenderQualityMode(), 'auto');
console.log('PASS adaptive framebuffer quality at 60 and 120 Hz, software fallback, DPR, pixel ceiling and recovery hysteresis.');
