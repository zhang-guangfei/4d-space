/** CPU/NullEngine regression, not GPU pixel validation. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {STATUE_LIGHTING_GLSL} from './dist/statue-lighting.js';
import {StationRenderer,installStationShaders} from './dist/station-renderer.js';
import {createColoredTesseract} from './dist/colored-tesseract.js';
import {statueData} from './dist/classical-statues.js';
import {statuePaletteBytes} from './dist/statue-palette.js';
import {initialState,normalFor} from './dist/chapter-topology.js';
// Read coefficients from shipped GLSL instead of duplicating a second lighting model.
const base=Number(STATUE_LIGHTING_GLSL.match(/illumination=([.\d]+)/)[1]);
const dirMatches=[...STATUE_LIGHTING_GLSL.matchAll(/statueLobe\(N,vec3\(([^)]+)\)\)/g)].map(m=>{const d=m[1].split(',').map(Number),l=Math.hypot(...d);return d.map(v=>v/l);});
const weightMatches=[...STATUE_LIGHTING_GLSL.matchAll(/\+([.\d]+)\*(?:keyWrap|fillLobe|bounceLobe)/g)].map(m=>+m[1]);
assert.equal(dirMatches.length,3);assert.equal(weightMatches.length,3);assert.match(STATUE_LIGHTING_GLSL,/return wrapped\*wrapped/);
const lobes=dirMatches.map((direction,idx)=>({weight:weightMatches[idx],direction}));
const illumination=n=>base+lobes.reduce((s,l)=>s+l.weight*(.5+.5*n.reduce((v,x,i)=>v+x*l.direction[i],0))**2,0);
let min=Infinity,max=-Infinity;
for(let i=0;i<30000;i++){const y=1-2*(i+.5)/30000,r=Math.sqrt(1-y*y),angle=i*Math.PI*(3-Math.sqrt(5)),n=[r*Math.cos(angle),y,r*Math.sin(angle)],v=illumination(n);min=Math.min(min,v);max=Math.max(max,v);assert.ok(v>.22&&v<.95,'all directions readable with museum chiaroscuro contrast and below white clipping');}
assert.ok(max-min>.35,'retain rich sculptural chiaroscuro form, not flat gray wash');
for(const kind of ['bronze','stone'])for(const lod of ['high','low']){const n=statueData(kind,lod).normals,palette=statuePaletteBytes(kind);for(let i=0;i<n.length;i+=3){const length=Math.hypot(n[i],n[i+1],n[i+2]),v=illumination([n[i]/length,n[i+1]/length,n[i+2]/length]);assert.ok(Number.isFinite(v)&&v>.22&&v<.95);for(let c=0;c<3;c++)assert.ok(v*palette[c]/255<.95);}}
const ctx=new Proxy({},{get:()=>()=>{}}),canvas=()=>({getContext:()=>ctx,width:512,height:256});
const sandbox={exports:{},module:{},console,setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}},document:{createElement:canvas,addEventListener(){},removeEventListener(){}},OffscreenCanvas:class{constructor(){Object.assign(this,canvas());}},navigator:{}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/vendor/babylon.js','utf8'),sandbox);
const B=sandbox.exports,engine=new B.NullEngine(),scene=new B.Scene(engine);new B.FreeCamera('test',new B.Vector3(0,0,-5),scene);
B.RawCubeTexture=class{constructor(scene,faces,size){let t=new B.RawTexture(faces[0],size,size,B.Engine.TEXTUREFORMAT_RGBA,scene,false,false);t._texture.isCube=true;return t;}};
const renderer=new StationRenderer(B,scene),instance={normal:normalFor('Y+'),transform:{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]},materials:[]};
for(const kind of ['bronze','stone','shell','suit-suit','truth-fill-neutral']){const m=renderer.makeMaterial(instance,kind);assert.equal(m._floats.statueSurface,['bronze','stone'].includes(kind)?1:0);assert.equal(m.disableDepthWrite,kind==='truth-fill-neutral');}
installStationShaders(B);const fragment=B.Effect.ShadersStore.stationFragmentShader;
assert.ok(fragment.includes(STATUE_LIGHTING_GLSL));assert.ok(fragment.indexOf('clipPlanes[i]')<fragment.indexOf('color=softStatueColor(albedo,'));
assert.ok(fragment.indexOf('N=detailedSurfaceNormal(N)')<fragment.indexOf('color=softStatueColor(albedo,'));
assert.match(fragment,/if\(statueSurface>\.5\)/);assert.match(fragment,/color=mix\(color,vec3\(\.58,\.64,\.66\),fog\)/);
// Each portal unfolds its room differently; the soft rig must travel with it.
for(const mode of ['upper','lower']){renderer.rebuild(initialState(),mode);for(const room of renderer.instances){const world=room.node.computeWorldMatrix(true),local=new B.Vector3(.3,.8,-.5).normalize(),display=B.Vector3.TransformNormal(local,world),recovered=B.Vector3.TransformNormal(display,room.statueLightFrame).normalize();assert.ok(B.Vector3.Distance(local,recovered)<1e-6);for(const material of room.materials)assert.ok(material._matrices.statueLightFrame);}}
const model=createColoredTesseract(B,scene),figures=model.meshes.filter(m=>m.metadata.kind==='statue');assert.equal(figures.length,2);
for(const m of figures){assert.equal(m.material.metadata.statueSoftLighting,true);assert.equal(m.material.disableDepthWrite,false);assert.equal(m.material.needAlphaBlending(),false);assert.ok(m.material._textures.labelTexture);}
const resources=()=>[scene.lights.length,scene.materials.length,scene.textures.length,scene.meshes.length],before=resources();
for(let i=0;i<48;i++){model.set4DAngle(-i*Math.PI/24);scene.render();}assert.deepEqual(resources(),before,'no new lights/materials/textures per animation frame');
assert.equal(scene.lights.length,0,'statues readable without extra actual lights');model.dispose();renderer.dispose();scene.dispose();engine.dispose();
console.log(`PASS statue soft lighting: 30000 sphere directions and all high/low artist normals, response ${min.toFixed(4)}–${max.toFixed(4)}, shared inspector/portal shader, no light allocations, opaque depth/normalmap/clipping retained.`);
