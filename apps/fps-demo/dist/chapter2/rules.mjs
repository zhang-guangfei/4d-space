import { bridgeAligned, cargoDocked, createBoard, moveBoard, undoBoard } from './puzzles.mjs';
export { displayCell, rotateXW, sliceProfile, bridgeAligned } from './puzzles.mjs';

const shift = ['w-', 'w+'];
const turn = ['turn-', 'turn+'];
const receiver = [0, 1.9];
const entrance = [0, -2.6];
const leftMooring = [-2, 1.9];
const rightMooring = [2.8, 1.9];

export const SECTIONS = [
  {
    id: 'echo', title: '回声泊位', subtitle: '门后的敲击', companion: true, controls: shift,
    opening: '有人在敲舱壁。两短，一长。那是领航员岑遥的交班暗号。',
    beats: [
      { at: entrance, label: '接听器', goal: '走到接听器旁，敲回暗号。', reply: '岑遥：“没听清。别往前走，换一页。我还站在老地方。”' },
      { at: entrance, label: '隔层听筒', w: 1, goal: '保持脚下位置，切到 W2 接听。', wrong: '耳机只有底噪。同一个位置，另一层才有她。', reply: '岑遥：“听见了。去信匣拿航线，我得知道该往哪儿逃。”' },
    ],
  },
  {
    id: 'vault', title: '密封信匣', subtitle: '没有破口的墙', companion: false, controls: shift,
    opening: '信匣在封舱线后。它记着岑遥失联前最后一次折返。',
    beats: [
      { at: entrance, label: '封舱灯', goal: '到红色封舱线前查验舱锁。', reply: '岑遥：“铅封还在。试试隔壁那一页，看同一堵墙还在不在。”' },
      { at: [0, 4.5], label: '航线信匣', w: 0, goal: '在 W2 越过墙的位置，回 W1 取信匣。', wrong: '信匣留在 W1。站到墙后，再回到有铅封的那层。', reply: '铅封完好。航线的终点离她只有一步，那一步却悬在断桥上。' },
    ],
  },
  {
    id: 'bridge', title: '折页天桥', subtitle: '消失的桥长', companion: true, controls: turn,
    opening: '岑遥把安全索抛了过来。绳子垂进裂口，她攥住另一端等你。',
    beats: [
      { at: entrance, label: '近端桥靴', goal: '走到断桥边，接通近端桥靴。', reply: '岑遥：“我这边有两个插脚。把桥转过来，白线得和两端都接上。”' },
      { at: [0, 4.7], label: '对岸绞盘', condition: 'bridge', goal: '转动 ZW 桥至双端对接，过桥收索。', wrong: '投影碰到了，桥靴还没扣紧。再转一格。', reply: '岑遥翻过栏杆。她的信匣里有两道潮线，我们还缺一个定位基准。' },
    ],
  },
  {
    id: 'sphere', title: '潮汐球', subtitle: '不会呼吸的灯', companion: false, controls: shift,
    opening: '第一道潮线来自航标。球影忽大忽小，计时器却一格也没动。',
    beats: [
      { at: receiver, label: '球影测距仪', w: 0, goal: '靠近测距仪，在 W1 记录球影。', wrong: '先到 W1 留下第一条半径刻痕。', reply: '第一道刻痕亮了。换到 W2，准星已落在球影里面。' },
      { at: receiver, label: '球心刻度', w: 1, goal: '切到 W2，记录最宽截面。', wrong: '沿 W 找到最大球影，再对准测距仪。', reply: '中心刻度落定。如果这是一整个东西，越过中心会再见到第一道刻痕。' },
      { at: receiver, label: '另一侧潮线', w: 2, goal: '到中心的另一侧，寻找同半径球影。', wrong: '从 W2 再向深处走一层，找与首道刻痕吻合的球影。', reply: '两道刻痕重合。岑遥：“不是它在呼吸，是我们经过了它。”' },
    ],
  },
  {
    id: 'crystal', title: '八面体雪线', subtitle: '另一种潮汐', companion: false, controls: shift,
    opening: '第二道潮线有尖角。球形航标背后，还有另一座写进星图的实体。',
    beats: [
      { at: receiver, label: '晶面测针', w: 1, goal: '切到中心 W2，采样晶体的六个尖端。', wrong: '先回到上一座航标的中心层 W2。', reply: '中心量程与球相同。退一层后，两条潮线还会重合吗？' },
      { at: receiver, label: '晶尖刻线', w: 2, goal: '到 W3 比对尖端，补齐航线标定。', wrong: '到 W3，把晶尖与上一节球影留下的刻线对比。', reply: '晶尖退得更快。两组标记交会在四号货栈，失联信号在那里转过一次。' },
    ],
  },
  {
    id: 'cargo', title: '四维货栈', subtitle: '最后一格从背后进', companion: false,
    controls: ['basis', 'move', 'undo', 'reset'],
    opening: '转发器缺一枚中继件。接上货运车，把金色中继箱推上四号舱的接点。',
    beats: [
      { at: receiver, label: '货栈手柄', goal: '走到货栈台接管轨道车。', reply: '货运车已接通。先推向 W4，再从上甲板绕到箱后。' },
      { at: receiver, label: '中继插座', condition: 'cargo', goal: '将金箱推到 W4 接点，再签收。', wrong: '箱子还没到接点。切换 XYZ / XYW 能看清箱后的上层通道。', reply: '转发器上电。岑遥打开工具袋：“我还留着半把钥匙。”' },
    ],
  },
  {
    id: 'mirror', title: '反手钥匙', subtitle: '日、月、星', companion: true, controls: turn,
    opening: '日、月、星三根齿都在。两半钥匙靠到一起，偏偏缺口朝同一边。',
    beats: [
      { at: receiver, label: '三齿钥匙', goal: '走到岑遥身边，把两把钥匙比在一起。', reply: '岑遥：“日齿向左，月齿向上。别换标签，把它整个翻出去。”' },
      { at: receiver, label: '镜像锁槽', condition: 'mirror', goal: '让钥匙经过 W 方向半周，回到槽内拼合。', wrong: '三齿没有同时入槽。钥匙先离开原层，走完半周才能回来。', reply: '两半咬合，日月星没换位置。锁后是把岑遥困在此处的旧系泊锚。' },
    ],
  },
  {
    id: 'rings', title: '双环锚', subtitle: '整环脱扣', companion: false, controls: shift,
    opening: '两个闭合锚环套在一起。切断任何一环，返航舱都将失去系泊点。',
    beats: [
      { at: leftMooring, label: '活动锚环', w: 0, goal: '到左锚座，抓住活动环。', wrong: '先回 W1 扣住活动环的牵引扣。', reply: '牵引扣锁住。先错开两环所在的层，再牵它横向离开。' },
      { at: rightMooring, label: '分离锚座', w: 1, goal: '升到 W2，走到右锚座牵环脱扣。', wrong: '两环还在同层。先牵活动环进入相邻层 W2。', reply: '环心已横向分开。回到原来的层，让它落进右侧锚座。' },
      { at: rightMooring, label: '归层锚点', w: 0, goal: '回 W1，将完整锚环安放到右座。', wrong: '右座的实体在 W1。', reply: '两道连续的金属回响。救援舱解锁了，岑遥的航服还在发出故障声。' },
    ],
  },
  {
    id: 'clinic', title: '无创取芯', subtitle: '航服里的第二个脉冲', companion: true, controls: [...shift, ...turn],
    opening: '岑遥：“我数过，心跳只有一个。另一个声音在我胸前，帮我找出来。”',
    beats: [
      { at: receiver, label: '航服扫描架', goal: '靠近岑遥，请她接通航服扫描架。', reply: '岑遥：“呼吸我自己管。把肩部扫描架倾一格，追那个慢一拍的亮点。”' },
      { at: receiver, label: '扫描标线', angle: 45, w: 2, goal: '把扫描架转到 45°，在 W3 定位异物。', wrong: '扫描带要倾一格至 45°，采样层指向 W3。', reply: '慢脉冲来自航服内衬。返航签被卷进夹层，分离钳已经在另一层夹住它。' },
      { at: receiver, label: '返航签', w: 1, goal: '沿 W 退回一层，取出返航签。', wrong: '保持夹持，退到 W2 的接收槽。', reply: '故障声停了。岑遥：“你听，剩下这个才是我。走，咱们一起交班。”' },
    ],
  },
  {
    id: 'home', title: '空白回执', subtitle: '相对的两扇门', companion: true, controls: shift,
    opening: '返航签的一面仍留着回廊站的红色起点。另一面空着，等对岸签收。',
    beats: [
      { at: receiver, label: '对岸发信器', w: 3, goal: '走到发信器，在 W4 投递返航签。', wrong: '发信器只在最远一层 W4 与接收窗接触。', reply: '岑遥敲了两短一长。对岸一片寂静。回初始泊位，听一次完整回执。' },
      { at: entrance, label: '值班听筒', w: 0, goal: '回 W1，走向入口的值班听筒。', wrong: '值班听筒在 W1 的起始泊位。', reply: '两短，一长。随后传来第三个人的声音：“这里是另一座壳。你们终于来了。”' },
    ],
  },
];

export function createState(index = 0) {
  if (!Number.isInteger(index) || !SECTIONS[index]) throw new RangeError('Unknown section');
  const section = SECTIONS[index];
  return {
    index, step: 0, w: 0, angle: 0, basis: 'XYZ',
    board: section.id === 'cargo' ? createBoard() : null,
    done: false, line: section.opening,
  };
}

function beat(state) {
  const beats = SECTIONS[state.index].beats;
  return beats[Math.min(state.step, beats.length - 1)];
}

export function objective(state) {
  if (state.done) return state.index === SECTIONS.length - 1 ? '返航回执已签收。' : '记录已收存，可进入下一小节。';
  return beat(state).goal;
}

export function target(state) {
  const { at: [x, z], label } = beat(state);
  return { x, z, label };
}

function requirementMet(state, actionBeat) {
  if (actionBeat.w !== undefined && actionBeat.w !== state.w) return false;
  if (actionBeat.angle !== undefined && actionBeat.angle !== state.angle) return false;
  switch (actionBeat.condition) {
    case 'bridge': return bridgeAligned(state.angle);
    case 'mirror': return state.angle === 180;
    case 'cargo': return cargoDocked(state.board);
    default: return true;
  }
}

function interact(state, near) {
  const current = beat(state);
  if (!near) return { ...state, line: '靠近' + current.label + '，再伸手操作。' };
  if (!requirementMet(state, current)) return { ...state, line: current.wrong };
  const step = state.step + 1;
  return { ...state, step, done: step === SECTIONS[state.index].beats.length, line: current.reply };
}

export function act(state, action, { near = false, axis, delta } = {}) {
  if (state.done) return state;
  if (action === 'interact') return interact(state, near);
  if (!SECTIONS[state.index].controls.includes(action)) return state;
  if (action === 'w+' || action === 'w-') {
    const w = Math.max(0, Math.min(3, state.w + (action === 'w+' ? 1 : -1)));
    return w === state.w ? state : { ...state, w };
  }
  if (action === 'turn+' || action === 'turn-') {
    const angle = Math.max(0, Math.min(180, state.angle + (action === 'turn+' ? 45 : -45)));
    return angle === state.angle ? state : { ...state, angle };
  }
  if (action === 'basis') return { ...state, basis: state.basis === 'XYZ' ? 'XYW' : 'XYZ' };
  if (state.step === 0) return { ...state, line: '先走到货栈手柄旁，接通轨道车。' };
  const before = state.board;
  let board;
  if (action === 'move') board = moveBoard(before, axis, delta);
  if (action === 'undo') board = undoBoard(before);
  if (action === 'reset') board = createBoard();
  if (!board) return state;
  let line = state.line;
  if (action === 'move') {
    if (board === before) line = '轨道在此处封闭。换个方向，或撤销上一步。';
    else if (cargoDocked(board)) line = '金色接点已亮。回到货栈台，签收中继件。';
    else line = '转发器等待中继件。W4 接点只能从正面推入。';
  } else {
    line = action === 'reset' ? '货运车和中继件已回到出发格。' : '回到上一格。';
  }
  return { ...state, board, w: board.player[3], line };
}
