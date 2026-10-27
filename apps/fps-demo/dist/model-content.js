/** Eight room-specific, falsifiable experiments. These are hypotheses, not claims about S³. */
export const ROOM_MODELS={
 'W+':{base:'central-hall',variant:'orbit-horizontal',title:'围绕中央大厅？',explanation:'如果四间走廊只是环绕普通大厅，我们会从四个方向观察中央物体。',prediction:'中心物体的侧面应依次变化，但上下窗口未必能同时闭合成同样的回廊。',experiment:'拖动行程，观察橙色旅行者绕大厅运动；比较它的朝向与真实窗口。'},
 'X+':{base:'treadmill',variant:'belt-forward',title:'房间在搬运我？',explanation:'将旅行者固定，让四间房沿传送带通过并在远端回收。',prediction:'房间会重新进入视野，但回收位置和运动方向是普通空间中的额外机制。',experiment:'拖动行程，看房间移动而旅行者不动；寻找这个模型的回收接缝。'},
 'W-':{base:'sphere',variant:'great-circle',title:'走在普通球面上？',explanation:'沿普通二维球面的大圆前进，可以回到原来的位置和朝向。',prediction:'一条闭合路径本身不足以区分球面与其他空间，还要比较房间邻接。',experiment:'拖动完整一圈，观察绿色法向和旅行者切向一起转动。'},
 'X-':{base:'central-hall',variant:'orbit-vertical',title:'把大厅竖起来呢？',explanation:'把同一条大厅轨道转为竖直平面，检验上下重复能否由普通轨道解释。',prediction:'竖直轨道能形成上下回环，但不能自动产生另一组独立的左右窗口关系。',experiment:'拖动行程；旅行者现在从大厅上方、下方经过，不再只在地面绕行。'},
 'Y+':{base:'central-hall',variant:'statue-observer',title:'同一雕像的四个侧面',explanation:'红色不对称鳍片让“同一个物体”和四个相似复制品产生可比较的观察证据。',prediction:'绕同一雕像移动时，红色鳍片的可见侧面依次改变；旅行者始终面向中心。',experiment:'拖动四分之一圈一段，跟随橙色视线检查雕像；与实际左窗的 90° 视角变化对照。'},
 'Y-':{base:'treadmill',variant:'belt-reverse-echo',title:'反向传送带与背影',explanation:'反转传送带，并让一枚橙色人形标记随房间移动，测试它能否冒充自己的背影。',prediction:'随房间移动的标记会相对观察者滑走；它不具有真实自像对动作的同步关系。',experiment:'拖动行程；观察固定旅行者与移动标记的距离变化，再在真实走廊中挥动左手的红色手套。'},
 'Z+':{base:'sphere',variant:'spherical-triangle',title:'绕三角形后朝向如何？',explanation:'在普通球面上沿三个大圆弧走闭合三角形，并平行运输旅行者的方向。',prediction:'回到起点时切向会改变；闭路的朝向变化也是需要测量的证据。',experiment:'拖到行程终点，比较旅行者返回北极前后的切向；橙色三角线是真实球面路径。'},
 'Z-':{base:'sphere',variant:'eight-tiles',title:'八块标记就是八胞吗？',explanation:'把八个立方标记放到普通球面上，再走过它们，检查“数量相同”是否意味着连接相同。',prediction:'八个分离标记不构成八个立方体按整张方形面相接的邻接结构。',experiment:'沿八标记路径拖动，观察标记之间的间隙；与真实空间每胞六个出口的连接表比较。'}
};
export function roomModel(id){const key=String(id).replace('−','-').toUpperCase();if(!ROOM_MODELS[key])throw Error('Unknown model room '+id);const content=ROOM_MODELS[key];return {...content,id:key,explanation:content.explanation+' 模型已放大 1.5 倍并移除底座。橙色 HYP L/R 是该假说预测的左右房间；下方青色 OBS Y+、紫色 OBS Y− 是上半四胞回廊固定侧邻接的对照图，连线仅表达连接，不是四维空间的三维嵌入。',prediction:content.prediction+' 比较橙色预测侧房间与青紫色已观察侧房间：名称和颜色不同，不能把假说图当成实际拓扑。'};}
