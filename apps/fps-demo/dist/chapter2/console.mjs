import { SECTIONS, createState, objective, target } from './rules.mjs';
import { drawScope, drawMeasurement, measurement } from './scope.mjs';

function numbered(index) {
  return String(index + 1).padStart(2, '0');
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function control(action, label, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.action = action;
  button.textContent = label;
  if (options.title) button.title = options.title;
  if (options.axis) {
    button.dataset.axis = options.axis;
    button.dataset.delta = String(options.delta);
    button.setAttribute('aria-label', options.title);
  }
  return button;
}

function row(...buttons) {
  const container = document.createElement('div');
  container.className = 'button-row';
  container.append(...buttons);
  return container;
}

function buildSliceKeys(element) {
  const meter = document.createElement('div');
  meter.className = 'slice-meter';
  meter.setAttribute('aria-hidden','true');
  for (let i=0;i<4;i++) meter.append(document.createElement('i'));
  const back = control('w-','沿 W 退',{title:'在场景中向下滚动或按 [，沿 W 后退一格'});
  const forward = control('w+','沿 W 进',{title:'在场景中向上滚动或按 ]，沿 W 前进一格'});
  for (const [button,shortcut] of [[back,'['],[forward,']']]) {
    const cap = document.createElement('kbd');
    cap.textContent = shortcut;
    button.prepend(cap, ' ');
    button.setAttribute('aria-keyshortcuts',shortcut);
  }
  element.replaceChildren(back,meter,forward);
}

function buildSectionControls(element, section) {
  element.replaceChildren();
  if (section.controls.includes('turn+')) {
    const plane = section.id === 'bridge' ? 'ZW' : 'XW';
    element.append(row(control('turn-',plane+' −45°'),control('turn+',plane+' +45°')));
  }
  if (section.id !== 'cargo') return;
  const basis = control('basis','');
  basis.className = 'basis-button';
  basis.append('切换坐标基',document.createElement('strong'));
  element.append(basis);
  const axes = {x:'左右轨',y:'前后轨',z:'上下甲板',w:'沿 W 轨道'};
  for (const sign of [1,-1]) {
    const axisRow = document.createElement('div');
    axisRow.className = 'axis-row';
    for (const [axis,name] of Object.entries(axes)) {
      const label = axis.toUpperCase() + (sign===1?'+':'−');
      const button = control('move',label,{axis,delta:sign,title:name + ' ' + label});
      if (axis==='w') {
        const shortcut = sign===1?']':'[';
        button.title = '操控引导车 · 在场景中' + (sign===1?'上滚':'下滚') + '或按 ' + shortcut;
        button.setAttribute('aria-keyshortcuts',shortcut);
      }
      axisRow.append(button);
    }
    element.append(axisRow);
  }
  element.append(row(control('undo','撤销'),control('reset','重置货栈')));
}

function buildLegend(element, cargo, companion) {
  const entries = cargo ? [['player','岑遥的车'],['cargo','箱'],['target','接点'],['wall','墙']] : [['heading','你的朝向'],['target','信标']];
  if (companion && !cargo) entries.push(['pilot','岑遥']);
  element.replaceChildren(...entries.map(([color,name]) => {
    const item = document.createElement('span');
    const chip = document.createElement('i');
    chip.className = color;
    item.append(chip,name);
    return item;
  }));
}

export function createConsole({onAction, onStart, onPause, onSection, onNext, onExpand, onPointer} = {}) {
  const get = id => document.getElementById(id);
  const scope = get('scope'), deckKeys = get('slice-keys'), extras = get('section-controls');
  const chooser = get('chapter-select'), trigger = get('interact'), start = get('start');
  const gate = get('gate'), next = get('next'), hud = get('world-hud');
  const expansion = get('expand'), instrument = get('instrument');
  const marker = {x:0, z:-6, yaw:0};
  let state = createState(0), mode = 'loading', sectionIndex = -1;
  let captured = false, near = false, hint = '', ready = false, paintQueued = false;
  let beacon = target(state), sections = SECTIONS;
  const meterView = get('measurement-view'), meterPanel = get('measurement');
  let meterDirty = true;

  function schedulePaint() {
    if (paintQueued || instrument.hidden) return;
    paintQueued = true;
    requestAnimationFrame(() => {
      paintQueued = false;
      if (instrument.hidden) return;
      drawScope(scope,state,sections[state.index],marker,beacon);
      if (meterDirty && !meterPanel.hidden) {
        meterDirty = false;
        drawMeasurement(meterView,state,sections[state.index].id);
      }
    });
  }

  function setSections(items = SECTIONS, index = state.index) {
    sections = items;
    chooser.replaceChildren(...items.map((section, n) => new Option(numbered(n) + '　' + section.title,String(n))));
    chooser.value = String(index);
  }

  function updateRange() {
    const distance = Math.hypot(marker.x-beacon.x,marker.z-beacon.z);
    setText(get('range'),distance.toFixed(1) + ' m');
    get('range-bar').style.width = Math.round(100 / (1 + distance * .22)) + '%';
  }

  function updateInteract() {
    trigger.hidden = state.done || !near || mode !== 'playing';
    trigger.disabled = !near || mode!=='playing';
    setText(get('interact-text'),hint || (near ? beacon.label : '靠近' + beacon.label));
  }

  function updateButtons() {
    const section = sections[state.index];
    for (const button of instrument.querySelectorAll('button[data-action]')) {
      const name = button.dataset.action;
      let disabled = mode!=='playing' || state.done;
      if (name==='w-') disabled ||= state.w<=0;
      if (name==='w+') disabled ||= state.w>=3;
      if (name==='turn-') disabled ||= state.angle<=0;
      if (name==='turn+') disabled ||= state.angle>=180;
      if (name==='undo') disabled ||= !state.board?.history.length;
      button.disabled = disabled;
    }
    next.hidden = mode!=='playing' || !state.done;
    const advanceLabel = state.index===sections.length-1 && state.done ? '接收回执' : '下一小节';
    setText(get('next-name'),advanceLabel);
    setText(get('instrument-status'),mode==='playing' ? (state.done ? '本节已完成' :
      section.id==='cargo' ? '岑遥就位 · Z 轴切换上下甲板' :
      '接收器在线') : '接收器待命');
    updateInteract();
  }

  function render(value) {
    state = value;
    const section = sections[state.index], cargo = section.id==='cargo';
    const differentSection = sectionIndex!==state.index;
    if (differentSection) {
      sectionIndex = state.index;
      buildSectionControls(extras,section);
      buildLegend(get('scope-legend'),cargo,section.companion);
      deckKeys.hidden = !section.controls.includes('w+');
      get('shift-hint').hidden = deckKeys.hidden && !cargo;
      get('shift-tug').hidden = !cargo;
      setText(get('dial-title'),cargo ? '岑遥 · 车位' : section.controls.includes('turn+') ? '旋转控制' : '当前 W 切片');
      setText(get('scope-title'),cargo?'货栈四维坐标':'W 取样窗');
      chooser.value = String(state.index);
      marker.x = 0;
      marker.z = -6;
      marker.yaw = 0;
      near = false;
      hint = '';
    }
    beacon = target(state);
    setText(get('beacon-name'),beacon.label);
    get('range-instrument').hidden = cargo;
    const observed = measurement(state,section.id);
    meterPanel.hidden = !observed;
    if (observed) {
      setText(get('measurement-title'),observed[0]);
      setText(get('measurement-value'),observed[1]);
      meterView.setAttribute('aria-label',observed.join(' · '));
      meterDirty = true;
    }
    updateRange();
    setText(get('section-id'),'小节 ' + numbered(state.index) + ' / ' + String(sections.length).padStart(2,'0'));
    setText(get('mission-title'),section.title);
    setText(get('section-context'),section.opening);
    setText(get('objective'),objective(state));
    const quote = /^岑遥[：:]\s*[“「]?(.+?)[”」]?$/.exec(state.line);
    get('voice-line').hidden = state.line === section.opening;
    setText(get('speaker'),quote?'岑遥':'回声');
    setText(get('dialogue'),quote ? quote[1] : state.line);
    let readout = 'W ' + numbered(state.w);
    if (cargo) {
      readout = state.board.player.map((v,i)=>'XYZW'[i]+(v+1)).join(' ');
      setText(extras.querySelector('.basis-button strong'),state.basis + ' ⇄ ' + (state.basis==='XYZ'?'XYW':'XYZ'));
    } else if (section.controls.includes('turn+')) {
      readout = state.angle + '°' + (section.controls.includes('w+')?'  /  '+readout:'');
    }
    setText(get('w-value'),readout);
    get('scope-note').hidden = false;
    setText(get('scope-note'),cargo ? (state.basis==='XYZ'?'X ↘　Y ↙　甲板高度为 Z':'Z 固定　W 沿横向依次取样') :
      '十字准星对照同一 XYZ');
    setText(get('basis-readout'),cargo ? (state.basis==='XYZ'?'固定 W · XYZ':'固定 Z · XYW') : 'XYZ / W');
    for (const [n,bar] of [...deckKeys.querySelectorAll('.slice-meter i')].entries()) bar.classList.toggle('active',n===state.w);
    scope.setAttribute('aria-label',cargo ? (state.basis==='XYZ'?'四个并列 W 切片，各有两个 Z 甲板':'两个 Z 甲板，各自横向比对四个 W 切片') :
      '并列 W 取样窗以十字对齐同一 XYZ。当前 W' + (state.w+1) + '。');
    updateButtons();
    schedulePaint();
  }

  function setMode(value) {
    mode = value;
    document.body.dataset.mode = value;
    const active = value==='playing', paused = value==='paused', ending = value==='ending';
    gate.hidden = !paused && !ending;
    hud.hidden = !gate.hidden;
    get('pause').hidden = !active;
    chooser.disabled = !ready;
    start.disabled = !ready;
    get('pointer-toggle').disabled = !active;
    if (!gate.hidden) {
      setText(get('gate-kicker'),ending?'第二章 · 折页之间':'第二章 · 已暂停');
      setText(get('gate-title'),ending?'另一座壳':'行动暂停');
      setText(get('gate-subtitle'),ending?'第三章待续':sections[state.index].title);
      setText(get('gate-story'),ending?state.line:objective(state));
      setText(start,ending?'重访回声场':'继续行动');
    }
    updateButtons();
  }

  function setPointerCaptured(value) {
    captured = Boolean(value);
    document.body.dataset.captured = String(captured);
    setText(get('pointer-state'),captured?'鼠标环视':'拖动环视');
    get('pointer-toggle').setAttribute('aria-pressed',String(captured));
    setText(get('switch-action'),captured?'释放鼠标':'捕获鼠标');
  }

  function setNear(value, text = '') {
    if (near===Boolean(value) && hint===text) return;
    near = Boolean(value);
    hint = text || '';
    updateInteract();
  }

  function setPosition(point, yaw = 0) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) || !Number.isFinite(yaw)) return;
    const moved = Math.abs(point.x-marker.x)+Math.abs(point.z-marker.z)>=.04;
    if (!moved && Math.abs(yaw-marker.yaw)<.015) return;
    marker.x = point.x;
    marker.z = point.z;
    marker.yaw = yaw;
    if (sections[state.index].id!=='cargo') {
      if (moved) updateRange();
      schedulePaint();
    }
  }

  instrument.addEventListener('click',event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const options = button.dataset.axis ? {axis:button.dataset.axis,delta:Number(button.dataset.delta)} : {};
    onAction?.(button.dataset.action,options);
  });
  start.addEventListener('click',()=>onStart?.());
  get('pointer-toggle').addEventListener('click',()=>onPointer?.());
  get('pause').addEventListener('click',()=>onPause?.());
  next.addEventListener('click',()=>onNext?.());
  trigger.addEventListener('click',()=>onAction?.('interact',{}));
  chooser.addEventListener('change',()=>onSection?.(Number(chooser.value)));
  expansion.addEventListener('click',()=>{
    const closed = !instrument.hidden;
    instrument.hidden = closed;
    document.body.classList.toggle('console-closed',closed);
    expansion.setAttribute('aria-expanded',String(!closed));
    const label = closed?'展开操作台':'收起操作台';
    setText(expansion.querySelector('.sr'),label);
    expansion.title = label;
    onExpand?.(!closed);
    schedulePaint();
  });
  const observer = new ResizeObserver(() => { meterDirty = true; schedulePaint(); });
  observer.observe(scope);
  observer.observe(meterView);
  buildSliceKeys(deckKeys);
  setSections();
  render(state);
  setMode('loading');
  setPointerCaptured(false);
  return {
    render,setMode,setNear,setPosition,setSections,setPointerCaptured,
    setStatus(message) {
      if (mode === 'playing' && message) {
        get('voice-line').hidden = false;
        setText(get('speaker'),'航服');
        setText(get('dialogue'),message);
      } else {
        setText(get('status'),message || '');
      }
    },
    setReady(value) {
      ready = Boolean(value);
      chooser.disabled = !ready;
      start.disabled = !ready;
      if (ready) setText(get('status'),'');
    },
  };
}
