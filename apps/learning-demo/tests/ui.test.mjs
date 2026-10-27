import fs from 'node:fs';import assert from 'node:assert/strict';
const nodes=new Map();let frames=[],clock=1,draws=0;
class Element{constructor(id=''){this.id=id;this.style={};this.children=[];this.listeners={};this.attributes={};this.hidden=false;this.checked=true;this.value='0';this.textContent='';this.classList={items:new Set(),toggle(n,b){if(b??!this.items.has(n))this.items.add(n);else this.items.delete(n)},add(n){this.items.add(n)},remove(n){this.items.delete(n)}};if(id)nodes.set(id,this)}set innerHTML(v){this.html=v;for(const match of v.matchAll(/id="([^"]+)"/g))new Element(match[1])}get innerHTML(){return this.html}setAttribute(k,v){this.attributes[k]=v}append(el){this.children.push(el)}addEventListener(k,f){(this.listeners[k]??=[]).push(f)}fire(k,e={}){for(const fn of this.listeners[k]??[])fn({target:this,preventDefault(){},...e})}getBoundingClientRect(){return{width:900,height:500}}focus(){}setPointerCapture(){}getContext(){return ctx}}
const ctx=new Proxy({}, {get(t,k){if(k in t)return t[k];return (...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),`Canvas ${k} got ${x}`);draws++}},set(t,k,v){t[k]=v;return true}});
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');for(const m of html.matchAll(/id="([^"]+)"/g))new Element(m[1]);nodes.get('sceneLegend').children=[new Element(),new Element()];
globalThis.document={getElementById:id=>nodes.get(id),createElement:()=>new Element(),hidden:false,body:{},addEventListener(){}};globalThis.window={devicePixelRatio:2};const mq={matches:false,addEventListener(){}};globalThis.matchMedia=()=>mq;globalThis.getComputedStyle=()=>({fontFamily:'sans-serif'});globalThis.ResizeObserver=class{constructor(cb){this.cb=cb}observe(){this.cb()}};globalThis.requestAnimationFrame=f=>frames.push(f);
await import('../dist/app.mjs');
function tick(ms=17){clock+=ms;const q=frames;frames=[];q.forEach(f=>f(clock))}
function click(id){nodes.get(id).fire('click');tick()}
function input(id,value){nodes.get(id).value=String(value);nodes.get(id).fire('input');tick()}
const text=id=>nodes.get(id).textContent;
tick();assert.ok(draws>100);for(let i=0;i<120;i++)tick(17);assert.equal(text('val3'),'0°');assert.equal(text('val4'),'0°');assert.equal(nodes.get('cameraToggle').attributes['aria-pressed'],'false');assert.equal(nodes.get('cellGrid').children.length,8);
click('resetAll');assert.equal(text('val3'),'0°');assert.equal(text('playText'),'慢速演示');
click('sliceMode');assert.ok(text('sliceStats').includes('8 个顶点 · 12 条棱 · 6 个面'));
click('octaSlice');assert.equal(text('sliceStats'),'6 个顶点 · 12 条棱 · 8 个面');
input('sliceLevel',1);assert.equal(text('sliceStats'),'4 个顶点 · 6 条棱 · 4 个面');
input('sliceLevel',2.1);assert.equal(text('sliceStats'),'当前超平面没有穿过超立方体');
click('cubeSlice');for(const level of [-1,0,1]){input('sliceLevel',level);assert.equal(text('sliceStats'),'8 个顶点 · 12 条棱 · 6 个面')}
click('projectionMode');click('orthographic');assert.equal(nodes.get('orthographic').attributes['aria-pressed'],'true');
nodes.get('cellGrid').children[0].fire('click');tick();assert.ok(text('cellHelp').includes('X = −1'));
click('plane3');input('angle',45);assert.equal(text('val3'),'45°');const c=nodes.get('scene');c.fire('pointerdown',{button:0,pointerId:1,clientX:100,clientY:100});c.fire('pointermove',{pointerId:1,clientX:160,clientY:130});c.fire('pointerup');c.fire('keydown',{key:'ArrowLeft'});tick();assert.equal(text('val3'),'45°');
click('guided');assert.equal(text('val3'),'90°');click('resetAll');click('playPause');for(let i=0;i<120;i++)tick(17);assert.notEqual(text('val3'),'0°');assert.equal(text('val4'),'0°');assert.equal(text('val5'),'0°');click('playPause');const paused=text('val3');for(let i=0;i<120;i++)tick(17);assert.equal(text('val3'),paused);click('plane4');click('stepForward');assert.equal(text('val3'),'0°');assert.equal(text('val4'),'5°');assert.ok(text('planeHelp').includes('X、Z 不变'));click('cameraToggle');assert.equal(nodes.get('cameraToggle').attributes['aria-pressed'],'true');assert.equal(text('val4'),'5°');click('cameraReset');assert.equal(text('val4'),'5°');
click('resetAll');assert.equal(text('val3'),'0°');assert.equal(text('val4'),'0°');console.log('UI tests passed: controls, true slice presets, orthographic mode, 8-cell selection, independent camera, 4D animation, finite canvas rendering.');
