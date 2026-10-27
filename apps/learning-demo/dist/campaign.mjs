const legacy=[
{title:'没有门通向对面',subtitle:'六个邻居 · 两步到对面',story:'你在 W+ 醒来，手中只有一张八格护照。六扇门都在，W− 的门牌却消失了。',task:'先走进 X+，再找到 W−。相对的房间并不直接相邻。',takeaway:'每间房有六个邻居；相对胞需要经过一间中转房。'},
{title:'一直向前，回到起点',subtitle:'四次穿门 · 回到出发点',story:'你决定不再找路，只穿过每间房正对面的门。第四次门开时，熟悉的 W+ 又出现了。',task:'从起点连续按四次“沿正前方走一步”，不选择其他门。',takeaway:'这条面中心路线局部直走、整体闭合；不是所有随意走的路线都闭合。'},
{title:'从背后来的光',subtitle:'光路示意 · 不是光学模拟',story:'你留下一束想象中的光。假如它只能沿房间边界的这条回路前进，会从哪里回来？',task:'点击“光点前进一步”四次，观察它经过的房间。',takeaway:'这是受约束光路的拓扑示意。看到自己的后背还需要光的传播、方向、遮挡和成像条件，不能仅由回路推出。'},
{title:'离开熟悉的方向',subtitle:'离开三维边界 · 进入四维内部',story:'六扇门之外，你得到一次沿 −W 移动的机会。没有第七扇门，但你能离开整个房间所在的三维边界。',task:'把 W 从 +1 调到 0。X、Y、Z 始终为 0；注意“位置类别”改变。',takeaway:'内部不是第九个立方体胞。胞是边界的一部分，内部有四个自由坐标。'},
{title:'中央不是第九间房',subtitle:'穿过内部 · 抵达相对胞',story:'W− 不再需要借道中转房。你沿 W 方向穿过内部，抵达另一侧的边界。',task:'把 W 从 +1 调到 −1，比较内部直达与边界路线。',takeaway:'在 [-1,1]⁴ 中，这两个面中心的内部距离为 2；边界最短路线长 4。只有允许离开边界才有这条捷径。'},
{title:'归来时，左右不同',subtitle:'一次 XW 半周旋转',story:'通行证是一枚有 A、B、C、D 彩色顶点的不对称三维四面体。你没有折叠它，只把它转进第四维，再转回来。',task:'将 XW 角度依次调到 90°、180°；同时比较投影和原 w=0 切片。',takeaway:'180° 时整个物体回到 w=0，x 反号、y 和 z 不变：相对原三维坐标系，带标记物体的手性反转。四维中做的仍是旋转。'},
{title:'八间房，封住所有方向',subtitle:'普通三维墙 · 完整四维边界',story:'你以为有第四维，就可以绕过所有围墙。但八个胞合起来，围住的是一个真正的四维内部。',task:'先试普通三维墙，再尝试从完整边界的内部走到外部。观察路径必须经过什么。',takeaway:'能绕过嵌在 w=0 的普通三维墙，不等于能绕过完整的四维封闭边界。由内部到外部的连续路径必与边界相交。'},
{title:'第九个房间不存在',subtitle:'自由探索 · 收集八枚印章',story:'护照的八格终于有了解释：你可以走遍八个胞，也可以进入四维内部，但不会找到属于边界的第九间房。',task:'自由选择六扇门，点亮全部八枚印章。此章随时可玩。',takeaway:'局部是普通三维房间，整体是超立方体的三维边界。多一个方向，改变的是走法与连接，不是凭空多出一间胞。'}];
export const token=[[.7,-.5,-.3],[-.6,-.4,-.3],[-.3,.7,-.3],[-.2,0,.7]];
export const rotateToken=angle=>token.map(([x,y,z])=>{const t=angle*Math.PI/180;return[x*Math.cos(t),y,z,x*Math.sin(t)];});
export function tokenSlice(angle){if(angle===0||angle===180)return rotateToken(angle);const a=token[0];return token.slice(1).map(b=>{const t=a[0]/(a[0]-b[0]);return[0,a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2]),0];});}
export const location=w=>Math.abs(w)<1?'四维内部':Math.abs(w)===1?'三维边界':'四维外部';
export const enclosurePath=[{label:'内部',p:[0,0,0,0]},{label:'边界 X+',p:[1,0,0,.7]},{label:'外部',p:[1.3,0,0,.7]}];

export const groups=[{title:'第一章 · 胞中的生活',short:'胞中的生活',count:3,start:0},{title:'第二章 · 四维内部的探索',short:'四维内部的探索',count:4,start:3},{title:'第三章 · 胞与内部的交界',short:'胞与内部的交界',count:3,start:7}];
const internal=[
{title:'四个方向的位置',subtitle:'中心附近 · 四个独立坐标',story:'这次你已经在四维内部，周围没有需要跨过的胞面。你把位置记录成四个数，试着每次只改变一个。',task:'分别点击 X、Y、Z、W 的坐标按钮，观察四条数值轴。全程保持在内部。',takeaway:'四个坐标可以独立变化。图上的四条数值轴不是四个方向在屏幕上的真实夹角；本节不穿越边界。'},
{title:'绕过三维障碍',subtitle:'内部旁路 · 不接触外边界',story:'一块三维障碍浮在内部的 w=0 层里。你不必穿透它，只需暂时走到另一层，再从它旁边通过。',task:'按三次“沿内部旁路走一步”：先到 W=0.4，再跨到障碍另一侧，最后回到 W=0。',takeaway:'这是绕过位于内部、W 厚度为零的理想三维障碍。全程 |坐标|≤0.6，不经过超立方体外边界。'},
{...legacy[5],title:'旋转与镜像',story:'你在四维内部悬停，把带 A、B、C、D 标记的刚性信物沿 XW 平面转动。它始终远离外边界，却能回到原三维空间时呈现镜像。',task:'先观察 90°，再转到 180°；所有顶点始终满足 |坐标|<1。'},
{title:'投影与截面',subtitle:'同一个信物 · 两种观察',story:'你不转动信物，只在内部把它沿 W 轻轻平移。它的 XYZ 影子没有变化，原 w=0 空间里却不再有它。',task:'先把信物移到 W=0.4，再移回 W=0；对比左边投影与右边原空间的交集。',takeaway:'投影把 W 信息丢掉；截面只保留真正相交的部分。零 W 厚度的物体平移离开 w=0 后，原切片为空，绝不是物体消失。'}];
export const campaign=[...legacy.slice(0,3).map((v,i)=>({...v,group:0,section:i+1,kind:['door','loop','light'][i]})),...internal.map((v,i)=>({...v,group:1,section:i+1,kind:['coordinates','obstacle','mirror','slice'][i]})),...[
{...legacy[3],title:'从胞走向内部'},
{...legacy[4],title:'穿过内部的捷径'},
{...legacy[6],title:'完整边界与外部'}].map((v,i)=>({...v,group:2,section:i+1,kind:['entry','shortcut','boundary'][i]})),{...legacy[7],title:'八室自由探索',group:3,section:0,kind:'free',task:'独立于正文的自由探索：选择六扇门，收集全部八枚印章。随时可进入。'}];
export const internalDetour=[[-.6,0,0,0],[-.6,0,0,.4],[.6,0,0,.4],[.6,0,0,0]];
export const inside=p=>p.every(v=>Math.abs(v)<1);
export const translateToken=w=>token.map(p=>[...p,w]);
