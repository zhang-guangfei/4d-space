// Pixel bounds are deliberately rounded OUT, plus a guard pixel on each edge
// for float uniforms, first/last inclusive samples and MSAA sample locations.
export function portalRectangle(bounds, width, height, out = {}) {
 if (!bounds) return null;
 const x = Math.max(0, Math.floor((bounds[0] + 1) * .5 * width) - 1);
 const y = Math.max(0, Math.floor((bounds[1] + 1) * .5 * height) - 1);
 const right = Math.min(width, Math.ceil((bounds[2] + 1) * .5 * width) + 1);
 const top = Math.min(height, Math.ceil((bounds[3] + 1) * .5 * height) + 1);
 if (x === 0 && y === 0 && right === width && top === height) return null;
 out.x = x; out.y = y; out.width = Math.max(0, right - x); out.height = Math.max(0, top - y);
 return out;
}

// Install once on the first-person scene only. prepare() runs after optical
// selection each frame, even when the set of portal paths stayed the same.
export function installPortalScissors(engine, scene) {
 const receivers = new WeakMap();
 let insideMainPass = false;
 let active = null;
 function clear() {
  if (!active) return;
  engine.disableScissor();
  active = null;
 }
 function beforeDraw(mesh) {
  if (!insideMainPass) return;
  const rectangle = receivers.get(mesh)?.rectangle;
  if (!rectangle) { clear(); return; }
  if (rectangle !== active) {
   engine.enableScissor(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
   active = rectangle;
  }
 }
 // Fixed Babylon 9.32 scene-component hook. Unlike a material bind observer it
 // runs for every submesh, including unmanaged meshes, before drawing. One hook
 // avoids adding thousands of observers to the pooled optical room geometry.
 const stage = scene._beforeRenderingMeshStage;
 if (!stage?.registerStep) return () => {};
 stage.registerStep(1, scene, beforeDraw);
 scene.onAfterRenderingGroupObservable.add(clear);
 scene.onBeforeDrawPhaseObservable.add(() => {
  // ReflectionProbe renders its cube faces before the camera draw phase.
  // Scissor coordinates only describe a full-viewport main framebuffer.
  const camera = scene.activeCamera, v = camera?.viewport;
  insideMainPass = !camera?.outputRenderTarget && v?.x === 0 && v.y === 0 && v.width === 1 && v.height === 1;
 });
 scene.onAfterDrawPhaseObservable.add(() => { clear(); insideMainPass = false; });
 const owners = new WeakMap();
 return function prepare(instances, specs) {
  const width = engine.getRenderWidth(), height = engine.getRenderHeight();
  for (let i = 0; i < instances.length; i++) {
   const instance = instances[i], spec = specs[i];
   let owner = owners.get(instance);
   if (!owner) {
    owner = {buffer: {}, rectangle: null, meshCount: 0};
    owners.set(instance, owner);
   }
   // Local suits and reveal-gated exhibits can be added to a resident slot.
   while (owner.meshCount < instance.meshes.length) {
    receivers.set(instance.meshes[owner.meshCount++], owner);
   }
   owner.rectangle = spec && spec.key === instance.key && spec.depth > 0
    ? portalRectangle(spec.screenBounds, width, height, owner.buffer) : null;
  }
 };
}
