/**
 * Detailed Minecraft-Style Voxel Character Builder for Beyond 3D.
 *
 * Features:
 *  - Crisp articulated cubic/voxel geometry with feet grounded at y = 0.0
 *  - Helmet with side comms antenna, tinted visor glass, and visible voxel face/eyes inside
 *  - Layered chest armor with glowing Suit Core, utility belt, and dual-nozzle jetpack
 *  - Distinct Left Crimson Gauntlet (#ff5e5b) & Right Golden Gauntlet (#ffd15c)
 *  - Knee-pad legs & magnetic boots
 *  - Built-in procedural idle breathing, walking stride, head look-at, hand wave, and medical tilt
 */

export const VOXEL_PALETTES = Object.freeze({
  player: {
    suit: '#e8f0ee',
    armor: '#bfd4d8',
    dark: '#2b414f',
    visor: '#39b8cc',
    core: '#5ef2e4',
    skin: '#f2ccb0',
    eyes: '#162836',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  },
  companion: {
    suit: '#f4eee1',
    armor: '#dcbf85',
    dark: '#353e4a',
    visor: '#f0a848',
    core: '#ffcf56',
    skin: '#f5d0b5',
    eyes: '#1e2d3b',
    hair: '#4a3228',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  },
  amber: {
    suit: '#f6e4bc',
    armor: '#e6b85c',
    dark: '#3d3526',
    visor: '#ffbe42',
    core: '#ffe07d',
    skin: '#f2ccb0',
    eyes: '#1e2d3b',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  },
  sapphire: {
    suit: '#d7e7ff',
    armor: '#74a9f5',
    dark: '#223654',
    visor: '#4da3ff',
    core: '#80c4ff',
    skin: '#f2ccb0',
    eyes: '#162836',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  }
});

export function createVoxelAstronaut(B, scene, prefix, {
  role = 'player',
  isLocalFirstPerson = false,
  withInternalOrgans = false
} = {}) {
  const pal = VOXEL_PALETTES[role] || VOXEL_PALETTES.player;
  const materials = new Map();

  function getMat(key, hex, { alpha = 1, emissive = 0.16, unlit = false } = {}) {
    const id = `${key}_${alpha}_${emissive}`;
    if (materials.has(id)) return materials.get(id);
    const m = new B.StandardMaterial(`${prefix}_mat_${id}`, scene);
    m.diffuseColor = B.Color3.FromHexString(hex);
    m.emissiveColor = m.diffuseColor.scale(emissive);
    m.specularColor = new B.Color3(0.18, 0.22, 0.25);
    m.alpha = alpha;
    m.disableLighting = unlit;
    m.backFaceCulling = false;
    materials.set(id, m);
    return m;
  }

  const root = new B.TransformNode(`${prefix}_root`, scene);
  // body pivot is at feet level (y = 0) so standing at (x, 0, z) puts boots squarely on the floor!
  const body = new B.TransformNode(`${prefix}_body`, scene);
  body.parent = root;

  const meshes = [];
  const headMeshes = [];

  function vox(name, [w, h, d], [x, y, z], matKey, hex, parent, opts = {}) {
    const m = B.MeshBuilder.CreateBox(`${prefix}_${name}`, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    m.material = getMat(matKey, hex, opts);
    m.parent = parent;
    m.isPickable = false;
    meshes.push(m);
    if (opts.isHead) headMeshes.push(m);
    return m;
  }

  // 1. Torso & Armor (y: 0.72 to 1.36)
  const torsoPivot = new B.TransformNode(`${prefix}_torsoPivot`, scene);
  torsoPivot.position.set(0, 0.72, 0);
  torsoPivot.parent = body;

  vox('pelvis', [0.44, 0.14, 0.26], [0, 0.07, 0], 'dark', pal.dark, torsoPivot);
  vox('beltBuckle', [0.14, 0.09, 0.28], [0, 0.07, 0], 'core', pal.core, torsoPivot, { emissive: 0.45 });
  const mainChest = vox('chest', [0.46, 0.50, 0.26], [0, 0.39, 0], 'suit', pal.suit, torsoPivot);
  const chestPlate = vox('chestPlate', [0.40, 0.34, 0.30], [0, 0.42, 0.01], 'armor', pal.armor, torsoPivot);
  const chestCore = vox('chestCore', [0.14, 0.14, 0.33], [0, 0.43, 0.02], 'core', pal.core, torsoPivot, { emissive: 0.65 });
  vox('collar', [0.34, 0.07, 0.28], [0, 0.66, 0], 'dark', pal.dark, torsoPivot, { isHead: true });

  // Jetpack & Dual Thrusters on Back
  vox('packMain', [0.38, 0.42, 0.18], [0, 0.41, -0.21], 'armor', pal.armor, torsoPivot, { isHead: isLocalFirstPerson });
  vox('packCore', [0.18, 0.22, 0.20], [0, 0.42, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('thrusterL', [0.10, 0.14, 0.10], [-0.12, 0.17, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('thrusterR', [0.10, 0.14, 0.10], [0.12, 0.17, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('flameL', [0.06, 0.04, 0.06], [-0.12, 0.09, -0.22], 'core', pal.core, torsoPivot, { emissive: 0.7, isHead: isLocalFirstPerson });
  vox('flameR', [0.06, 0.04, 0.06], [0.12, 0.09, -0.22], 'core', pal.core, torsoPivot, { emissive: 0.7, isHead: isLocalFirstPerson });

  // 2. Minecraft-Style Voxel Head & Helmet (pivot at neck y = 1.38)
  const headPivot = new B.TransformNode(`${prefix}_headPivot`, scene);
  headPivot.position.set(0, 0.68, 0);
  headPivot.parent = torsoPivot;

  // Inner voxel head with face & eyes
  vox('innerHead', [0.34, 0.34, 0.32], [0, 0.20, 0], 'skin', pal.skin, headPivot, { isHead: true });
  vox('eyeL', [0.06, 0.05, 0.02], [-0.08, 0.21, 0.165], 'eyes', pal.eyes, headPivot, { isHead: true });
  vox('eyeR', [0.06, 0.05, 0.02], [0.08, 0.21, 0.165], 'eyes', pal.eyes, headPivot, { isHead: true });
  vox('eyeSparkL', [0.02, 0.02, 0.025], [-0.07, 0.22, 0.168], 'white', '#ffffff', headPivot, { emissive: 0.6, isHead: true });
  vox('eyeSparkR', [0.02, 0.02, 0.025], [0.09, 0.22, 0.168], 'white', '#ffffff', headPivot, { emissive: 0.6, isHead: true });
  vox('brow', [0.24, 0.04, 0.02], [0, 0.28, 0.165], 'dark', pal.hair || pal.dark, headPivot, { isHead: true });

  // Outer Voxel Helmet Shell & Visor
  vox('helmetTop', [0.44, 0.08, 0.44], [0, 0.40, 0], 'suit', pal.suit, headPivot, { isHead: true });
  vox('helmetBack', [0.44, 0.38, 0.10], [0, 0.21, -0.17], 'suit', pal.suit, headPivot, { isHead: true });
  vox('helmetSideL', [0.08, 0.38, 0.36], [-0.19, 0.21, -0.02], 'suit', pal.suit, headPivot, { isHead: true });
  vox('helmetSideR', [0.08, 0.38, 0.36], [0.19, 0.21, -0.02], 'suit', pal.suit, headPivot, { isHead: true });
  vox('helmetChin', [0.44, 0.08, 0.42], [0, 0.04, 0.01], 'armor', pal.armor, headPivot, { isHead: true });
  vox('visorGlass', [0.36, 0.26, 0.04], [0, 0.22, 0.19], 'visor', pal.visor, headPivot, { alpha: 0.45, emissive: 0.35, isHead: true });
  // Comms antenna on right side of helmet
  vox('earPod', [0.05, 0.12, 0.12], [0.24, 0.21, -0.02], 'armor', pal.armor, headPivot, { isHead: true });
  vox('antennaMast', [0.025, 0.22, 0.025], [0.25, 0.36, -0.04], 'dark', pal.dark, headPivot, { isHead: true });
  vox('antennaTip', [0.05, 0.05, 0.05], [0.25, 0.48, -0.04], 'core', pal.core, headPivot, { emissive: 0.85, isHead: true });

  // 3. Articulated Voxel Arms (Left = Crimson Gauntlet, Right = Golden Gauntlet)
  const leftArm = new B.TransformNode(`${prefix}_leftArm`, scene);
  leftArm.position.set(-0.33, 0.58, 0);
  leftArm.parent = torsoPivot;
  vox('shoulderL', [0.20, 0.16, 0.22], [0, -0.04, 0], 'leftG', pal.leftGauntlet, leftArm, { emissive: 0.25 });
  vox('upperArmL', [0.16, 0.24, 0.18], [0, -0.22, 0], 'suit', pal.suit, leftArm);
  vox('gauntletL', [0.18, 0.20, 0.20], [0, -0.42, 0.01], 'leftG', pal.leftGauntlet, leftArm, { emissive: 0.35 });
  vox('handL', [0.15, 0.12, 0.16], [0, -0.56, 0.01], 'dark', pal.dark, leftArm);

  const rightArm = new B.TransformNode(`${prefix}_rightArm`, scene);
  rightArm.position.set(0.33, 0.58, 0);
  rightArm.parent = torsoPivot;
  vox('shoulderR', [0.20, 0.16, 0.22], [0, -0.04, 0], 'rightG', pal.rightGauntlet, rightArm, { emissive: 0.25 });
  vox('upperArmR', [0.16, 0.24, 0.18], [0, -0.22, 0], 'suit', pal.suit, rightArm);
  vox('gauntletR', [0.18, 0.20, 0.20], [0, -0.42, 0.01], 'rightG', pal.rightGauntlet, rightArm, { emissive: 0.35 });
  vox('handR', [0.15, 0.12, 0.16], [0, -0.56, 0.01], 'dark', pal.dark, rightArm);

  // Hand-held prop attachment socket (for chiral key half or scanner)
  const handSocket = new B.TransformNode(`${prefix}_handSocket`, scene);
  handSocket.position.set(0, -0.58, 0.16);
  handSocket.parent = rightArm;

  // 4. Articulated Voxel Legs & Mag-Boots (y: 0.72 down to 0.00!)
  const leftLeg = new B.TransformNode(`${prefix}_leftLeg`, scene);
  leftLeg.position.set(-0.13, 0.72, 0);
  leftLeg.parent = body;
  vox('thighL', [0.18, 0.34, 0.20], [0, -0.17, 0], 'suit', pal.suit, leftLeg);
  vox('kneeL', [0.20, 0.10, 0.22], [0, -0.36, 0.02], 'armor', pal.armor, leftLeg);
  vox('shinL', [0.17, 0.22, 0.19], [0, -0.50, 0], 'suit', pal.suit, leftLeg);
  vox('bootL', [0.20, 0.12, 0.28], [0, -0.66, 0.04], 'dark', pal.dark, leftLeg);
  vox('soleL', [0.21, 0.03, 0.29], [0, -0.705, 0.04], 'leftG', pal.leftGauntlet, leftLeg, { emissive: 0.3 });

  const rightLeg = new B.TransformNode(`${prefix}_rightLeg`, scene);
  rightLeg.position.set(0.13, 0.72, 0);
  rightLeg.parent = body;
  vox('thighR', [0.18, 0.34, 0.20], [0, -0.17, 0], 'suit', pal.suit, rightLeg);
  vox('kneeR', [0.20, 0.10, 0.22], [0, -0.36, 0.02], 'armor', pal.armor, rightLeg);
  vox('shinR', [0.17, 0.22, 0.19], [0, -0.50, 0], 'suit', pal.suit, rightLeg);
  vox('bootR', [0.20, 0.12, 0.28], [0, -0.66, 0.04], 'dark', pal.dark, rightLeg);
  vox('soleR', [0.21, 0.03, 0.29], [0, -0.705, 0.04], 'rightG', pal.rightGauntlet, rightLeg, { emissive: 0.3 });

  // 5. Optional Voxel Internal Organs (Heart, Lungs, Spine, Golden Vessels for Section 8 Medical Scan!)
  let organs = null;
  if (withInternalOrgans) {
    const organRoot = new B.TransformNode(`${prefix}_organs`, scene);
    organRoot.position.set(0, 0.38, 0.01);
    organRoot.parent = torsoPivot;

    const heart = vox('organHeart', [0.12, 0.14, 0.12], [0.04, 0.03, 0.03], 'heart', '#ff4757', organRoot, { emissive: 0.8 });
    const lungL = vox('organLungL', [0.13, 0.24, 0.14], [-0.11, 0.04, 0.0], 'lung', '#5ce1e6', organRoot, { alpha: 0.65, emissive: 0.45 });
    const lungR = vox('organLungR', [0.13, 0.24, 0.14], [0.11, 0.04, 0.0], 'lung', '#5ce1e6', organRoot, { alpha: 0.65, emissive: 0.45 });
    const spine = vox('organSpine', [0.07, 0.44, 0.07], [0, 0.0, -0.07], 'spine', '#fff3d1', organRoot, { emissive: 0.4 });
    const aorta = vox('organAorta', [0.04, 0.36, 0.04], [0.02, 0.02, 0.01], 'vessel', '#ffd15c', organRoot, { emissive: 0.7 });

    // 3 removable purple 4D anomaly shards lodged inside Heart, Left Lung, and Lower Spine!
    const shard1 = vox('shard1', [0.09, 0.09, 0.09], [0.05, 0.04, 0.05], 'shard', '#d96bff', organRoot, { emissive: 0.9 });
    const shard2 = vox('shard2', [0.09, 0.09, 0.09], [-0.12, 0.08, 0.02], 'shard', '#d96bff', organRoot, { emissive: 0.9 });
    const shard3 = vox('shard3', [0.09, 0.09, 0.09], [0.0, -0.14, -0.05], 'shard', '#d96bff', organRoot, { emissive: 0.9 });

    organs = { organRoot, heart, lungL, lungR, spine, aorta, shards: [shard1, shard2, shard3] };
  }

  if (isLocalFirstPerson) {
    for (const m of headMeshes) m.setEnabled(false);
    mainChest.scaling.set(0.55, 0.78, 0.50);
    chestPlate.setEnabled(false);
    chestCore.setEnabled(false);
  }

  return {
    root,
    body,
    torsoPivot,
    headPivot,
    arms: { left: leftArm, right: rightArm },
    legs: { left: leftLeg, right: rightLeg },
    handSocket,
    meshes,
    organs,
    setAlpha(alpha) {
      root.setEnabled(alpha > 0.02);
      for (const [k, m] of materials.entries()) {
        if (k.startsWith('visor')) m.alpha = Math.min(0.48, alpha * 0.6);
        else if (k.startsWith('lung')) m.alpha = Math.min(0.65, alpha * 0.75);
        else m.alpha = alpha;
      }
    },
    setSuitXRay(xrayAlpha = 0.18) {
      mainChest.material = getMat('suitXray', pal.suit, { alpha: xrayAlpha, emissive: 0.15 });
      chestPlate.material = getMat('armorXray', pal.armor, { alpha: xrayAlpha, emissive: 0.15 });
      chestCore.setEnabled(xrayAlpha > 0.5);
    },
    pose({
      position = [0, 0, 0],
      yaw = 0,
      pitch = 0,
      headYaw = 0,
      headPitch = 0,
      leftLegAngle = 0,
      rightLegAngle = 0,
      waveLeft = 0,
      waveRight = 0,
      holdRight = 0,
      mirrorX = false,
      tiltZRad = 0,
      breatheTime = 0
    } = {}) {
      root.position.set(position[0], position[1], position[2]);
      body.scaling.set(mirrorX ? -1 : 1, 1, 1);

      // Gentle breathing bob on torso
      const breath = breatheTime ? Math.sin(breatheTime * 2.6) * 0.012 : 0;
      torsoPivot.position.y = 0.72 + breath;

      body.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(yaw, isLocalFirstPerson ? 0 : pitch, tiltZRad);
      if (isLocalFirstPerson) {
        const back = new B.Vector3(0, -1.65, -0.26).rotateByQuaternionToRef(
          B.Quaternion.RotationYawPitchRoll(yaw, 0, 0),
          new B.Vector3()
        );
        root.position.addInPlace(back);
      }

      headPivot.rotation.set(headPitch, headYaw, 0);
      leftLeg.rotation.x = leftLegAngle;
      rightLeg.rotation.x = rightLegAngle;

      // Natural arm swing counter to legs + active wave/hold
      const idleSwingL = -rightLegAngle * 0.55;
      const idleSwingR = -leftLegAngle * 0.55;
      leftArm.rotation.x = waveLeft > 0.01 ? -waveLeft * 2.35 : idleSwingL;
      leftArm.rotation.z = waveLeft > 0.01 ? waveLeft * 0.25 : -0.06;

      rightArm.rotation.x = waveRight > 0.01 ? -waveRight * 2.35 : holdRight > 0.01 ? -holdRight * 1.15 : idleSwingR;
      rightArm.rotation.z = waveRight > 0.01 ? -waveRight * 0.25 : 0.06;
    }
  };
}
