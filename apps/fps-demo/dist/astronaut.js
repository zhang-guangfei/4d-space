/**
 * High-Detail Sculpted Sci-Fi Voxel Astronaut Suit (Unified with Chapter 2's voxel-astronaut.js).
 * Eye origin is anchored at y = 0.0; boot soles touch exact floor y = -1.68.
 * Matte opaque voxel armor; the dual-thruster jetpack stays strictly separated from the torso rear.
 */
export const SUIT_COLORS = Object.freeze({
  suit: '#eef5f4',
  armor: '#a8c6cf',
  trim: '#628a99',
  joint: '#223644',
  visor: '#2ed4e8',
  panel: '#5ef2e4',
  skin: '#f2ccb0',
  eyes: '#162836',
  left: '#f25c54',
  right: '#f7c346'
});

export const SUIT_PARTS = Object.freeze([
  // 1. Torso, Pelvis, Utility Belt & Layered Chest Armor (eye y = 0, torso y = -0.32..-0.86)
  { name: 'torso', group: 'body', shape: 'box', size: [0.46, 0.50, 0.26], position: [0, -0.57, -0.02], material: 'suit' },
  { name: 'pelvis', group: 'body', shape: 'box', size: [0.44, 0.14, 0.25], position: [0, -0.82, -0.02], material: 'joint', hideLocal: true },
  { name: 'belt rim', group: 'body', shape: 'box', size: [0.48, 0.06, 0.28], position: [0, -0.80, -0.02], material: 'trim', hideLocal: true },
  { name: 'belt buckle', group: 'body', shape: 'box', size: [0.14, 0.08, 0.04], position: [0, -0.80, 0.13], material: 'panel', hideLocal: true },
  { name: 'chest plate', group: 'body', shape: 'box', size: [0.40, 0.30, 0.05], position: [0, -0.53, 0.13], material: 'armor', hideLocal: true },
  { name: 'chest core frame', group: 'body', shape: 'box', size: [0.18, 0.18, 0.025], position: [0, -0.52, 0.16], material: 'joint', hideLocal: true },
  { name: 'chest controls', group: 'body', shape: 'box', size: [0.12, 0.12, 0.025], position: [0, -0.52, 0.178], material: 'panel', hideLocal: true },
  { name: 'neck collar', group: 'body', shape: 'box', size: [0.34, 0.09, 0.28], position: [0, -0.28, -0.01], material: 'joint', hideLocal: true },

  // 2. Separated Dual-Thruster Voxel Jetpack (torso rear = -0.15, pack front = -0.18 -> 3cm gap; panel separated > 0.8cm)
  { name: 'backpack', group: 'body', shape: 'box', size: [0.38, 0.42, 0.18], position: [0, -0.55, -0.27], material: 'suit', hideLocal: true },
  { name: 'backpack frame', group: 'body', shape: 'box', size: [0.42, 0.09, 0.19], position: [0, -0.40, -0.27], material: 'trim', hideLocal: true },
  { name: 'backpack core', group: 'body', shape: 'box', size: [0.22, 0.24, 0.015], position: [0, -0.56, -0.372], material: 'joint', hideLocal: true },
  { name: 'backpack panel', group: 'body', shape: 'box', size: [0.13, 0.16, 0.018], position: [0, -0.56, -0.392], material: 'panel', hideLocal: true },
  { name: 'left thruster', group: 'body', shape: 'box', size: [0.12, 0.15, 0.12], position: [-0.12, -0.80, -0.28], material: 'joint', hideLocal: true },
  { name: 'right thruster', group: 'body', shape: 'box', size: [0.12, 0.15, 0.12], position: [0.12, -0.80, -0.28], material: 'joint', hideLocal: true },
  { name: 'left flame', group: 'body', shape: 'box', size: [0.06, 0.05, 0.06], position: [-0.12, -0.90, -0.28], material: 'panel', hideLocal: true },
  { name: 'right flame', group: 'body', shape: 'box', size: [0.06, 0.05, 0.06], position: [0.12, -0.90, -0.28], material: 'panel', hideLocal: true },

  // 3. Sculpted Voxel Helmet with Crisp Trim Contrast, Crest, Brow Shield, Headlamps, Antenna & Framed Visor (hidden locally)
  { name: 'helmet', group: 'body', shape: 'box', size: [0.42, 0.36, 0.40], position: [0, -0.02, -0.01], material: 'suit', hideLocal: true },
  { name: 'helmet crest', group: 'body', shape: 'box', size: [0.14, 0.055, 0.38], position: [0, 0.185, -0.02], material: 'trim', hideLocal: true },
  { name: 'helmet back band', group: 'body', shape: 'box', size: [0.44, 0.075, 0.10], position: [0, -0.03, -0.19], material: 'trim', hideLocal: true },
  { name: 'helmet brow', group: 'body', shape: 'box', size: [0.44, 0.06, 0.09], position: [0, 0.11, 0.195], material: 'trim', hideLocal: true },
  { name: 'helmet chin', group: 'body', shape: 'box', size: [0.43, 0.075, 0.42], position: [0, -0.20, 0.0], material: 'armor', hideLocal: true },
  { name: 'visor frame', group: 'body', shape: 'box', size: [0.40, 0.24, 0.03], position: [0, -0.02, 0.195], material: 'joint', hideLocal: true },
  { name: 'visor', group: 'body', shape: 'box', size: [0.34, 0.18, 0.03], position: [0, -0.02, 0.215], material: 'visor', hideLocal: true },
  { name: 'headlamp left', group: 'body', shape: 'box', size: [0.07, 0.04, 0.04], position: [-0.14, 0.12, 0.24], material: 'panel', hideLocal: true },
  { name: 'headlamp right', group: 'body', shape: 'box', size: [0.07, 0.04, 0.04], position: [0.14, 0.12, 0.24], material: 'panel', hideLocal: true },
  { name: 'ear pod left', group: 'body', shape: 'box', size: [0.055, 0.13, 0.14], position: [-0.235, -0.02, -0.02], material: 'trim', hideLocal: true },
  { name: 'ear pod', group: 'body', shape: 'box', size: [0.055, 0.13, 0.14], position: [0.235, -0.02, -0.02], material: 'trim', hideLocal: true },
  { name: 'antenna mast', group: 'body', shape: 'box', size: [0.028, 0.22, 0.028], position: [0.25, 0.14, -0.04], material: 'joint', hideLocal: true },
  { name: 'antenna tip', group: 'body', shape: 'box', size: [0.055, 0.055, 0.055], position: [0.25, 0.27, -0.04], material: 'panel', hideLocal: true },

  // 4. Articulated Voxel Arms (Pauldrons, Crimson Left / Gold Right Gauntlets, Wrist Holo) & Armored Mag-Boot Legs
  ...['left', 'right'].flatMap((side, i) => {
    const s = i ? 1 : -1;
    return [
      { name: side + ' shoulder patch', group: side + 'Arm', shape: 'box', size: [0.22, 0.15, 0.24], position: [s * 0.01, -0.02, 0], material: side },
      { name: side + ' shoulder rim', group: side + 'Arm', shape: 'box', size: [0.24, 0.05, 0.26], position: [s * 0.01, 0.06, 0], material: 'trim' },
      { name: side + ' arm', group: side + 'Arm', shape: 'box', size: [0.16, 0.24, 0.18], position: [0, -0.21, 0.01], material: 'suit' },
      { name: side + ' cuff', group: side + 'Arm', shape: 'box', size: [0.19, 0.20, 0.20], position: [0, -0.41, 0.02], material: side },
      { name: side + ' wrist holo', group: side + 'Arm', shape: 'box', size: [0.04, 0.10, 0.12], position: [s * 0.10, -0.40, 0.03], material: 'panel' },
      { name: side + ' glove', group: side + 'Arm', shape: 'box', size: [0.15, 0.12, 0.16], position: [0, -0.55, 0.02], material: 'joint' },

      // Legs (hip joint at y = -0.84; sole bottom at -0.84 - 0.824 - 0.016 = -1.68 exact!)
      { name: side + ' leg', group: side + 'Leg', shape: 'box', size: [0.18, 0.36, 0.20], position: [0, -0.19, 0], material: 'suit' },
      { name: side + ' knee armor', group: side + 'Leg', shape: 'box', size: [0.21, 0.11, 0.23], position: [0, -0.40, 0.025], material: 'armor' },
      { name: side + ' shin', group: side + 'Leg', shape: 'box', size: [0.17, 0.24, 0.19], position: [0, -0.56, 0], material: 'suit' },
      { name: side + ' boot', group: side + 'Leg', shape: 'box', size: [0.21, 0.14, 0.29], position: [0, -0.74, 0.045], material: 'joint' },
      { name: side + ' sole stripe', group: side + 'Leg', shape: 'box', size: [0.22, 0.032, 0.30], position: [0, -0.824, 0.045], material: side }
    ];
  })
]);

export const SUIT_JOINTS = Object.freeze({
  body: [0, 0, 0],
  leftLeg: [-0.135, -0.84, -0.02],
  rightLeg: [0.135, -0.84, -0.02],
  leftArm: [-0.34, -0.32, -0.01],
  rightArm: [0.34, -0.32, -0.01]
});

export function createAstronautSuit(B, scene, { material, parent = null } = {}) {
  const body = new B.TransformNode('astronaut', scene);
  body.parent = parent;
  body.metadata = { asset: 'voxel-astronaut-suit', anchor: 'eyes' };
  const groups = { body };
  const parts = [];
  for (const [key, pos] of Object.entries(SUIT_JOINTS)) {
    if (key === 'body') continue;
    const node = new B.TransformNode(key + ' joint', scene);
    node.parent = body;
    node.position.set(...pos);
    groups[key] = node;
  }
  for (const p of SUIT_PARTS) {
    const mesh = p.shape === 'box'
      ? B.MeshBuilder.CreateBox(p.name, { width: p.size[0], height: p.size[1], depth: p.size[2] }, scene)
      : B.MeshBuilder.CreateSphere(p.name, { diameterX: p.size[0], diameterY: p.size[1], diameterZ: p.size[2], segments: 10 }, scene);
    mesh.position.set(...p.position);
    mesh.parent = groups[p.group];
    mesh.material = material(p.material);
    mesh.metadata = { asset: 'voxel-astronaut-suit', suitPart: p.name, hideLocal: !!p.hideLocal };
    parts.push(mesh);
  }
  return {
    body,
    parts,
    arms: { left: groups.leftArm, right: groups.rightArm },
    legs: { left: groups.leftLeg, right: groups.rightLeg }
  };
}

/** Low-poly closed 3D voxel suit meshes for batched room markers inside the 4D tesseract. */
export function miniatureSuitGeometry() {
  const buckets = {
    suit: { positions: [], normals: [], indices: [] },
    detail: { positions: [], normals: [], indices: [] },
    accent: { positions: [], normals: [], indices: [] }
  };
  const faces = [
    { n: [1, 0, 0], c: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
    { n: [-1, 0, 0], c: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
    { n: [0, 1, 0], c: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
    { n: [0, -1, 0], c: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
    { n: [0, 0, 1], c: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], c: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] }
  ];
  for (const p of SUIT_PARTS) {
    const key = ['left', 'right'].includes(p.material) ? 'accent' : (p.material === 'suit' || p.material === 'armor') ? 'suit' : 'detail';
    const out = buckets[key];
    const origin = p.position.map((x, i) => x + SUIT_JOINTS[p.group][i]);
    const half = p.size.map(v => v * 0.5);
    for (const f of faces) {
      const start = out.positions.length / 3;
      for (const corner of f.c) {
        out.positions.push(origin[0] + corner[0] * half[0], origin[1] + corner[1] * half[1], origin[2] + corner[2] * half[2]);
        out.normals.push(f.n[0], f.n[1], f.n[2]);
      }
      out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  return buckets;
}
