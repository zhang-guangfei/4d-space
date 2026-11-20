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
    id: 'echo', title: '回声褶面', subtitle: '空地在敲门', companion: true, controls: shift,
    opening: '镜面在身后合上。你和岑遥在异星文明留下的回声场里走散了。空地传来你们的暗号：两短，一长。',
    beats: [
      { at: entrance, label: '暗号的来处', w: 1, goal: '记住脚下的位置，沿 W 找到岑遥，在她身边回应暗号。', wrong: '听筒里只剩自己的呼吸。保持站位，试试相邻的 W 切片。', reply: '岑遥：“碰到你的手了。可我刚掉的绳扣，怎么会在那堵墙后面？”' },
    ],
  },
  {
    id: 'vault', title: '无缝之壁', subtitle: '墙后的绳扣', companion: false, controls: shift,
    opening: '一道无缝的壁隔开了你们。壁后的小匣里躺着岑遥的绳扣，断口上还有她手套留下的红线。',
    beats: [
      { at: [0, 4.5], label: '壁后的绳扣', w: 0, goal: '保持封壁完整，取回壁后的绳扣。', wrong: '你摸到一处空窝。记住匣子的位置，找有绳扣的那一页。', reply: '绳扣还是热的。岑遥一拉，断绳的两端同时绷紧。中间那一截去了哪里？' },
    ],
  },
  {
    id: 'bridge', title: '折页天桥', subtitle: '绷紧的断绳', companion: true, controls: turn,
    opening: '绳子两端绷紧，中段却从视野里消失。裂隙上悬着半截桥，岑遥在对岸举起另一端。',
    beats: [
      { at: [0, 4.7], label: '对岸的绳扣', condition: 'bridge', goal: '转动折桥，让两端都接合，走到岑遥一侧收绳。', wrong: '一个接点还悬着。对照两头的白线，再试桥的角度。', reply: '桥一合，整根绳索出现在你手里。沿绳望去，一颗琥珀色的球悬在场的深处。' },
    ],
  },
  {
    id: 'sphere', title: '潮汐球', subtitle: '石头也会呼吸吗', companion: false, controls: shift,
    opening: '你们循绳来到一颗悬空的球前。岑遥说它和拳头一样大，你却得张开双臂才能比出它的宽度。',
    beats: [
      { at: receiver, label: '第一道球痕', w: 0, goal: '在 W1 的测针留下第一道球影刻痕。', wrong: '先在 W1 留下刻痕，才能比较两人看见的大小。', reply: '岑遥：“我让绳子贴着它。你往里走一页，我替你记住刚才的宽度。”' },
      { at: receiver, label: '最宽处', w: 1, goal: '沿 W 寻找最宽的球影，留下第二道刻痕。', wrong: '测针还没抵达最宽处。沿 W 比较邻近切片。', reply: '中心刻痕落下。岑遥：“再往前一页，你猜会碰到哪道旧痕？”' },
      { at: receiver, label: '另一侧的球痕', w: 2, goal: '越过中心，找回与第一道等宽的截面。', wrong: '到中心另一侧，再把球缘同第一道刻痕对齐。', reply: '球缘回到第一道痕上。绳旁还有一道生着尖角的影子，中心的宽度恰好和球相同。' },
    ],
  },
  {
    id: 'crystal', title: '八面体雪线', subtitle: '相同宽度的第二道影子', companion: false, controls: shift,
    opening: '球的中心刻痕穿过一枚六尖晶体。两件东西此刻一样宽，岑遥把上一节的绳结留在原处等你比较。',
    beats: [
      { at: receiver, label: '六尖晶面', w: 1, goal: '在 W2 量下晶体的中心宽度。', wrong: '中心绳结在 W2。', reply: '岑遥：“现在碰得刚好。你猜隔一页，尖端还够得着球的旧刻痕吗？”' },
      { at: receiver, label: '晶尖刻线', w: 2, goal: '向 W3 移动一格，比较晶尖与球影的旧刻痕。', wrong: '球影在 W3 留过一道痕。到同一页比较。', reply: '晶尖缩得更快，露出一个方孔。孔里的金色方块带着两道旧刻痕，像是在等人把它推回缺口。' },
    ],
  },
  {
    id: 'cargo', title: '四维货栈', subtitle: '岑遥眼前只有一面', companion: false,
    controls: ['basis', 'move', 'undo', 'reset'],
    opening: '晶尖背后铺满空格，金块正好填进其中一格。岑遥钻进引导车，她的窄窗只能看见眼前这一页。',
    beats: [
      { at: receiver, label: '金块的缺口', condition: 'cargo', goal: '指引岑遥把金块推至 W4 的亮格，到标记处签收。', wrong: '亮格还是空的。换个观察基，看看岑遥能从哪里站到箱后。', reply: '金块落定，缺口吐出两枚钥片。岑遥攥住一枚：“我这半边刻着日、月、星。你呢？”' },
    ],
  },
  {
    id: 'mirror', title: '反手钥匙', subtitle: '另一只手', companion: true, controls: turn,
    opening: '两枚钥片都印着同一组星点，却像两只左手，怎么也合不拢。岑遥把她那半按在空槽旁。',
    beats: [
      { at: receiver, label: '岑遥的钥槽', condition: 'mirror', goal: '让手里的钥片翻过 W 方向，回到槽内与岑遥的半片拼合。', wrong: '三根齿还有一根朝外。观察旋转时哪一部分离开了这一页。', reply: '两片咬合，星点次序仍在。缝里现出两枚闭环，一枚牵着你，另一枚牵着岑遥。' },
    ],
  },
  {
    id: 'rings', title: '双环结', subtitle: '绳尾的两枚闭环', companion: false, controls: shift,
    opening: '钥槽后露出的两枚环各牵一人。隔着手套，岑遥能摸到你这头绳子的颤动。割断它，你们就会再次失联。',
    beats: [
      { at: leftMooring, label: '左侧活动环', w: 0, goal: '抓住左侧的活动环，准备解开双环。', wrong: '左侧牵引扣留在 W1。', reply: '岑遥：“我握紧剩下的环。你试试，我们还能在哪一页碰到它？”' },
      { at: rightMooring, label: '右侧环座', w: 1, goal: '让两环错开，牵着活动环到右侧环座。', wrong: '固定环还挡着去路。比较相邻的 W 切片。', reply: '你隔着整枚闭环把绳子牵了过去。右座还差一页才够得到。' },
      { at: rightMooring, label: '原页的环座', w: 0, goal: '回到原页，将完整的环扣进右座。', wrong: '右座的实体留在 W1。', reply: '两根绳索终于各自松开。岑遥说她胸前仍有一下一下的牵扯，慢过自己的心跳。' },
    ],
  },
  {
    id: 'clinic', title: '第二脉搏', subtitle: '航服里的陌生节拍', companion: true, controls: [...shift, ...turn],
    opening: '双环已经解开，岑遥的航服却仍响着第二道脉搏。她主动把肩架扣好，让你找出藏在内衬里的声源。',
    beats: [
      { at: receiver, label: '慢脉冲的标线', angle: 45, w: 2, goal: '倾斜扫描带，沿 W 寻找慢脉冲，标出它的位置。', wrong: '夹持线没碰到亮点。试着把扫描带倾至 45°，对准 W3。', reply: '亮点来自航服内衬。一枚薄签缠进织带，刻着你们相遇过的每一处位置。' },
      { at: receiver, label: '织带里的薄签', w: 1, goal: '保持夹持，在相邻切片取出薄签。', wrong: '再往 W2 退一格，薄签才会进入夹口。', reply: '岑遥听了一会儿：“它每回响一下，正好是我碰到你的一次。它记下了我们之间的路。”' },
    ],
  },
  {
    id: 'home', title: '空白回执', subtitle: '谁站在另一头', companion: true, controls: shift,
    opening: '薄签的一头亮起回廊里你第一次挥手的地方，另一头空着。建造者留下的场竟能记住两处如何相遇，接收的一端会有谁？',
    beats: [
      { at: receiver, label: '对岸的收签口', w: 3, goal: '把两人的薄签送到 W4 的收签口。', wrong: '收签口的边缘在 W4。', reply: '岑遥敲了两短一长。没有声音回来。起点那道缝却微微张开，里面透着和你掌心一样的温度。' },
      { at: entrance, label: '起点的回纹', w: 0, goal: '回到 W1 的入口，接取对岸的回声。', wrong: '当初听见暗号的地方在 W1。', reply: '两短，一长。岑遥双手都在你眼前。第三个人的声音贴着你的头盔问：“这一次，你们看见彼此了吗？”' },
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
  if (state.done) return state.index === SECTIONS.length - 1 ? '回声已抵达另一端。' : '这一处已走通，可以继续前行。';
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
  const before = state.board;
  let board;
  if (action === 'move') board = moveBoard(before, axis, delta);
  if (action === 'undo') board = undoBoard(before);
  if (action === 'reset') board = createBoard();
  if (!board) return state;
  let line = state.line;
  if (action === 'move') {
    if (board === before) line = '岑遥：“这儿过不去。给我一条别的路，或者倒回一格。”';
    else if (cargoDocked(board)) line = '岑遥：“对上了！我扶着箱子，你在台上签收。”';
    else if (before.boxes !== board.boxes) line = '岑遥：“推得动。我从车窗只看得到金块贴着我的这一面。”';
    else line = '引导车已移动一格。';
  } else {
    line = action === 'reset' ? '引导车和金块已回到出发格。' : '回到上一格。';
  }
  return { ...state, board, w: board.player[3], line };
}
