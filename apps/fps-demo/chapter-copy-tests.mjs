/** Game-facing copy only: real progress predicates, minimal DOM, no renderer. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ChapterProgress} from './dist/chapter-progress.js';
import {roomModel,MODEL_CONTENT,ROOM_MODELS} from './dist/model-content.js';
import {initialState,normalFor,cellId} from './dist/chapter-topology.js';

const html=fs.readFileSync('dist/index.html','utf8');
assert.equal(html,fs.readFileSync('dist/chapter.html','utf8'));
assert.match(html,/<title>维度之外 · 第一章：回廊空间站<\/title>/);
assert.match(html,/<meta name="application-name" content="维度之外">/);
assert.match(html,/<meta name="description" content="《维度之外》第一章：回廊空间站。[^"<>]+">/);
assert.match(html,/<header><b>维度之外<\/b>/);
assert.match(html,/<section id="menu"[^]*?<h1>维度之外<\/h1>/);
assert.match(html,/第一章 · 玻璃回廊/,'chapter phase names remain descriptive, not rebranded');
assert.match(html,/你已经经过这里。/,'opening story line is retained');
assert.doesNotMatch(html,/ORBIT \/ 08|<title>回廊空间站/);
const historicalHtml=fs.readFileSync('dist/v3.html','utf8');
assert.match(historicalHtml,/<title>维度之外 · 四胞回环原型（历史版本）<\/title>/);
assert.match(historicalHtml,/<span class="brand">维度之外<\/span>/);

const beforeEnding=html.split('<section id="ending"')[0];
assert.doesNotMatch(beforeEnding,/真相|S³|镜面球|第二章|四维内部|下半部|四胞直行自像|边界内/,'initial and optional menus do not reveal later locations, rewards or the answer');
assert.doesNotMatch(html,/待制作|伪装|原型说明|视角修订|光路预算/,'player UI is not an implementation report');
for(const name of ['假说描述','能解释什么','还无法解释什么'])assert.equal((html.match(new RegExp('>'+name+'<','g'))||[]).length,1);
assert.deepEqual(Object.values(MODEL_CONTENT).map(x=>x.title),['中央大厅假说','跑步机假说','球壳赤道假说','八胞体魔方假说']);
for(const model of Object.values(MODEL_CONTENT)){
 assert.match(model.explanation,/也许/,'models remain hypotheses rather than the revealed answer');
 assert.doesNotMatch(Object.values(model).join(' '),/真相|已排除|不可能|已证明|S³|游戏中|尚未实现/);
}
assert.match(MODEL_CONTENT['colored-tesseract'].limitation,/步行参照/);
assert.match(MODEL_CONTENT['colored-tesseract'].limitation,/不代表始终待在同一间房/);
assert.match(MODEL_CONTENT.sphere.explanation,/内侧/);
assert.match(MODEL_CONTENT.sphere.limitation,/这个球壳模型/,'limit applies to this ordinary sphere candidate, not every spherical topology');

const code=fs.readFileSync('dist/chapter.js','utf8');
const ui=code.slice(code.indexOf('function isTruthRoom('),code.indexOf('function setZoom('));
const elements=new Map();
function $(id){if(!elements.has(id))elements.set(id,{textContent:'',disabled:false,hidden:false,classList:{toggle(_,v){elements.get(id).hidden=v;}}});return elements.get(id);}
const context={progress:new ChapterProgress(),state:initialState(),cellId,roomModel,ROOM_MODELS,renderer:null,$,debug:false,keyboardCorridor:false,locked:false,labRoom:null,id:()=>cellId(context.state.normal)};
vm.createContext(context);vm.runInContext(ui,context);
const visibleText=()=>[...elements.values()].filter(x=>!x.hidden).map(x=>x.textContent).join('\n');
const refresh=()=>{vm.runInContext('updateHUD();refreshLabStatus()',context);};
// Three readings reveal a fourth model; only viewing it at physical W+ allows the door.
// Loop telemetry is deliberately irrelevant and other model panels never show a door.
for(const inspected of [false,true])for(const loop of [false,true])for(const viewed of [false,true])for(const atStart of [false,true])for(const selected of ['W+','X-','X+','W-']){
 context.progress.reset();context.progress.loopComplete=loop;
 if(inspected)for(const base of ['central-hall','treadmill','sphere'])context.progress.inspectModel(base);
 if(viewed)context.progress.viewTruth();
 context.state.normal=normalFor(atStart?'W+':'X+');context.progress.currentCell=atStart?'W+':'X+';
 context.labRoom=selected;refresh();
 const objective=inspected?(atStart?'查看新模型，再打开舱门。':'返回 W+ 查看新模型。'):'阅读三个空间假说';
 assert.equal($('objective').textContent,objective);assert.equal($('unlockHint').textContent,objective);
 assert.match($('hint').textContent,/Shift 跑步/);assert.match($('movementHelp').textContent,/按住 Shift 跑步/);
 assert.match($('hint').textContent,/按住 Space 跳起悬浮，松开下落/);assert.match($('movementHelp').textContent,/松开关闭喷气背包/);assert.doesNotMatch(visibleText(),/W\/S 视线喷气|Shift 加速/);
 const showDoor=inspected&&atStart&&selected==='W+';
 assert.equal($('unlock').hidden,!showDoor);assert.equal($('unlock').disabled,!(showDoor&&viewed));assert.equal($('unlock').textContent,'打开舱门');
 assert.equal($('beginRoute').hidden,true);assert.equal($('routeHelp').textContent,'');
 assert.equal($('route').textContent,'','no upper-stage loop requirement');
 assert.doesNotMatch(visibleText(),/镜面球|下半部|第二章|真相|完成.*环/);
 if(!inspected)assert.doesNotMatch(visibleText(),/返回 W\+|查看新模型/,'new model and return prompt stay hidden before the third reading');
}
context.labRoom='X-';refresh();assert.doesNotMatch($('inspectionStatus').textContent,/真相|答案|通行条件/);
// Later objectives appear only in their active stage; never disclose the reward early.
context.state=initialState();context.labRoom='W+';context.progress.reset();for(const base of ['central-hall','treadmill','sphere'])context.progress.inspectModel(base);assert.ok(context.progress.viewTruth());assert.ok(context.progress.unlockLower('W+',10));refresh();
assert.match($('objective').textContent,/每间房间进入 3 次/);
assert.equal($('unlock').hidden,true);
assert.match($('hint').textContent,/Shift 加速/);
assert.match($('movementHelp').textContent,/按住 Shift 加速/);assert.match($('movementHelp').textContent,/松开停止喷气、继续漂移/);
assert.doesNotMatch($('movementHelp').textContent,/跳跃|蹲下|跑步/);
assert.doesNotMatch(visibleText(),/镜面球|第二章|四维内部/);
context.progress.debugCompleteSurvey();refresh();assert.match($('objective').textContent,/路线挑战已开放/);
assert.ok(context.progress.startRoute('W+',10));refresh();assert.match($('objective').textContent,/八间不同/);
assert.doesNotMatch(visibleText(),/镜面球|第二章|四维内部/);
context.progress.onCross('X+',11);context.progress.updateInterior('X+',1,12);context.progress.onCross('W+',13);context.progress.updateInterior('W+',1,14);refresh();
assert.match($('objective').textContent,/本次路线结束/);
assert.doesNotMatch(visibleText(),/镜面球|第二章|四维内部/);
context.progress.debugCompleteRoute();refresh();assert.match($('objective').textContent,/镜面球/);
assert.doesNotMatch($('objective').textContent,/进入即可|完成第一章|第二章|四维内部/,'newly observable object is not an announced ending trigger');
console.log('PASS spoiler-free copy: exact names/headings, tentative candidates, truthful projection limit, initial/upper/lower/active/completed-stage text, 64 reveal/view/location/model-panel combinations and loop independence.');
