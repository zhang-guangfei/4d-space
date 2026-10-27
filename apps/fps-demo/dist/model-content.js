/** Exactly three canonical hypotheses. Room placements repeat these, not new experiments. */
export const MODEL_CONTENT={
 'central-hall':{base:'central-hall',variant:'orbit-horizontal',title:'中央大厅假说',explanation:'四个房间围绕普通大厅，旅行者沿环形通道前进；双脚落在房间或连接通道的地面上。当前行进方向的左侧是中央大厅，右侧是外侧房间。',prediction:'沿环绕路径观察中央物体，可以看到不同侧面；还必须比较左右、上下连接才能判断它是否符合站内观察。',experiment:'拖动行程或旋转模型，比较旅行者左侧的中央大厅与右侧的外部房间。'},
 treadmill:{base:'treadmill',variant:'belt-forward',title:'跑步机假说',explanation:'旅行者固定站在房间内部的地面上，房间向后移动；远端房间先淡出，再从另一端淡入。旅行者面向 +X，所以左侧房间在 +Z、右侧在 −Z。',prediction:'示意性回收能重复呈现房间，但淡出／淡入不是实际空间的穿门连接。',experiment:'拖动或反向拖动行程，观察房间移动、旅行者保持原位，以及两端平滑的示意性回收。'},
 sphere:{base:'sphere',variant:'great-circle',title:'球壳内侧赤道假说',explanation:'旅行者在普通球壳内侧赤道行走，脚贴内壁、头朝球心；左右两个房间位于相对的两极。',prediction:'当前正向演示左通向北极、右通向南极；滑块回放位置，不改变旅行者的行走朝向规则。闭合路径并不能单独说明八个立方房间的连接关系，也不否定真正边界的 S³ 拓扑。',experiment:'沿赤道拖动一圈，再回放先前位置；检查朝内的上方向，以及 SN（北极）／SS（南极）和 HYP L/R 的对应。'}
};
MODEL_CONTENT['colored-tesseract']={base:'colored-tesseract',variant:'colored-topology',title:'彩色八胞体 · 可选真相提示',explanation:'把魔方的彩色面推广成八个彩色立方胞：它们共同组成四维超立方体的三维边界。这里展示的是投影，不是八个普通三维房间的无重叠摆放。',prediction:'每个胞都与另外六个胞相邻，只有同轴反号胞不相邻；选择胞后可对照本章的真实连接。颜色帮助追踪胞的身份，不代表物理距离。',experiment:'拖动视图观察；选择一个胞查看六个邻居。旋转平面与滑块改变四维投影，重叠、缩放和形变是投影效果。此模型仅作可选提示，不增加通行条件。'};
const ROOM_BASES={'W+':'central-hall','X+':'treadmill','W-':'sphere','X-':'colored-tesseract'};
export const ROOM_MODELS=Object.fromEntries(Object.entries(ROOM_BASES).map(([id,base])=>[id,{...MODEL_CONTENT[base]}]));
export function roomModel(id){const key=String(id).replace('−','-').toUpperCase();if(!ROOM_MODELS[key])throw Error('Unknown model room '+id);const content=ROOM_MODELS[key];return {...content,id:key,explanation:content.explanation+(content.base==='colored-tesseract'?'': ' 本站有中央大厅、跑步机、球壳内侧赤道这三类必需观察模型，另有彩色八胞体可选提示。模型放大 1.5 倍、无底座。每个房间实体使用稳定颜色与模型内编号：大厅 H1–H4／HC／HR1–HR4；跑步机 T1–T4（侧房 TL／TR）；球面两极 SN／SS。编号只在该假说内识别房间，不对应实际站内的 W／X 等胞；HYP L/R 表示行进朝向的左／右。这些模型用于提出和比较预测，不是实际八胞空间的三维嵌入。')};}
