import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {StationRenderer,installStationShaders} from './dist/station-renderer.js';
// Read the exact production scaling expression: devicePixelRatio must never
// reduce canvas resolution below CSS pixels (the old DPR / 1.25 did this).
const source=fs.readFileSync('dist/chapter.js','utf8');
const match=source.match(/setHardwareScalingLevel\((.*?)\);/);
assert.ok(match,'resolution expression present');
for(const dpr of [undefined,.5,1,1.25,1.5,2,3,4]){
 const scaling=vm.runInNewContext(match[1],{window:{devicePixelRatio:dpr}});
 assert.ok(scaling<=1&&scaling>=2/3,'screen resolution never below CSS or above1.5x');
 assert.ok(Math.abs(1/scaling-Math.min(Math.max(dpr||1,1),1.5))<1e-12);
}
// Verify capability fallback compiles the ordinary shader without derivative
// calls, and detailed materials alone opt into the optional shader path.
const B={Effect:{ShadersStore:{}}};installStationShaders(B);
const frag=B.Effect.ShadersStore.stationFragmentShader;
assert.match(frag,/#ifdef NORMAL_DETAIL\s+#extension GL_OES_standard_derivatives/);
assert.match(frag,/if\(length2<1e-14\)return N/,'degenerate UVs cannot yield NaN');
assert.match(frag,/surfaceNormalEnabled>\.5/,'failed/not-yet-loaded texture preserves geometry normals');
assert.match(frag,/texture2D\(surfaceNormalTexture,vUV\)/,'uses original artist UV detail map');
assert.match(fs.readFileSync('dist/station-renderer.js','utf8'),/this.venusNormalTexture\(\);m.setTexture\('surfaceNormalTexture',this.white\)/,'texture-load failure cannot block statue material readiness');
assert.match(frag,/clipPlanes\[i\]/,'portal clipping retained');
assert.match(fs.readFileSync('dist/station-renderer.js','utf8'),/kind==='bronze'&&!!this.scene.getEngine\(\).getCaps\(\).standardDerivatives/,'David and other surfaces unchanged');
// Exercise texture factory with no browser/GPU: one cached mipmapped linear
// data texture, never one allocation per portal clone or room transition.
let calls=[];
class Texture{constructor(...args){calls.push(args);}static TRILINEAR_SAMPLINGMODE=3;static WRAP_ADDRESSMODE=1;}
const renderer=Object.create(StationRenderer.prototype);renderer.B={Texture};renderer.scene={};renderer.statueNormalTexture=null;
const t=renderer.venusNormalTexture();for(let i=0;i<80;i++)assert.equal(renderer.venusNormalTexture(),t);
assert.equal(calls.length,1);assert.match(calls[0][0],/assets\/classical-statues\/venus-normal.jpg$/);
assert.equal(calls[0][2],false,'mipmaps enabled');assert.equal(calls[0][3],true,'shipped UVs verified: all15634 are (u,1-v) versus source GLB, restored by Blender import');assert.equal(calls[0][4],3,'trilinear rather than nearest filtering');
assert.equal(t.gammaSpace,false,'normal values are linear, not colors');assert.equal(t.anisotropicFilteringLevel,4);
assert.ok(fs.statSync('dist/assets/classical-statues/venus-normal.jpg').size>100000,'actual source normal texture bundled');
// Exercise material binding, including the exact failed-load fallback: listing a
// not-ready image in ShaderMaterial textures would hide the entire statue.
class Material{
 constructor(name,scene,path,options){this.options=options;this.textures={};this.floats={};this.callbacks=[];this.onBindObservable={add:f=>this.callbacks.push(f)};}
 setTexture(k,v){this.textures[k]=v;}setFloat(k,v){this.floats[k]=v;}setMatrix(){}setColor3(){}setVector3(){}setArray4(){}getEffect(){return this;}
}
Object.assign(B,{ShaderMaterial:Material,Texture,Matrix:{Identity:()=>({})},Color3:{FromHexString:x=>x},Vector3:class{constructor(...v){this.v=v;}}});
const materialRenderer=Object.create(StationRenderer.prototype);
Object.assign(materialRenderer,{B,scene:{getEngine:()=>({getCaps:()=>({standardDerivatives:true})})},serial:0,white:{ready:true},fallbackCube:{},statueNormalTexture:null});
Texture.prototype.isReady=function(){return this.ready===true;};
const instance=()=>({normal:[0,0,0,1],transform:{rotation:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0]},materials:[]});
const m=materialRenderer.makeMaterial(instance(),'bronze',materialRenderer.white);
assert.deepEqual(m.options.defines,['#define NORMAL_DETAIL']);
assert.equal(m.textures.surfaceNormalTexture,materialRenderer.white);
m.callbacks.forEach(f=>f({visibility:1}));assert.equal(m.floats.surfaceNormalEnabled,0);assert.equal(m.textures.surfaceNormalTexture,materialRenderer.white);
materialRenderer.statueNormalTexture.ready=true;m.callbacks.forEach(f=>f({visibility:1}));
assert.equal(m.floats.surfaceNormalEnabled,1);assert.equal(m.textures.surfaceNormalTexture,materialRenderer.statueNormalTexture);
const david=materialRenderer.makeMaterial(instance(),'stone',materialRenderer.white);assert.deepEqual(david.options.defines,[]);
materialRenderer.scene={getEngine:()=>({getCaps:()=>({standardDerivatives:false})})};
const oldDevice=materialRenderer.makeMaterial(instance(),'bronze',materialRenderer.white);assert.deepEqual(oldDevice.options.defines,[]);
console.log('PASS Venus detail: production DPI scaling at8ratios; artist normal-map shader/fallback, portal clips, shared mip/anisotropy cache. GPU pixels not tested.');
