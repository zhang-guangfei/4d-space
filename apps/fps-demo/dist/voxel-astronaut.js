/**
 * High-Detail Sculpted Sci-Fi Voxel Character Builder for Beyond 3D.
 *
 * Features:
 *  - Crisp articulated voxel-armor geometry with grounded boots at y = 0.0
 *  - Multi-layer helmet: brow visor rim, dual glowing headlamps, side comms pod & glowing antenna,
 *    tinted reflective visor glass, and expressive voxel face/eyes inside
 *  - Sculpted chest harness: layered chestplate, glowing plasma suit core, twin O2 manifold tubes,
 *    utility belt pouches, and dual-ring plasma jetpack thrusters
 *  - Articulated arms with layered shoulder pauldrons, wrist holo-displays,
 *    Left Crimson Gauntlet (#f25c54) & Right Golden Gauntlet (#f7c346)
 *  - Tactical thigh pouches, chamfered knee armor, armored boots & mag-soles
 *  - Zero per-frame GC allocations in pose()
 */

export const VOXEL_PALETTES = Object.freeze({
  player: {
    suit: '#eef5f4',
    armor: '#a8c6cf',
    trim: '#628a99',
    dark: '#223644',
    visor: '#2ed4e8',
    core: '#5ef2e4',
    skin: '#f2ccb0',
    eyes: '#162836',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  },
  companion: {
    suit: '#f7f1e6',
    armor: '#e0be7c',
    trim: '#a47e3e',
    dark: '#2c3542',
    visor: '#f5b041',
    core: '#ffd666',
    skin: '#f5d0b5',
    eyes: '#1e2d3b',
    hair: '#4a3228',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  },
  amber: {
    suit: '#f6e4bc',
    armor: '#e6b85c',
    trim: '#a87d2e',
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
    trim: '#3a6eb5',
    dark: '#223654',
    visor: '#4da3ff',
    core: '#80c4ff',
    skin: '#f2ccb0',
    eyes: '#162836',
    leftGauntlet: '#f25c54',
    rightGauntlet: '#f7c346'
  }
});

export function createVoxelAstronaut(arg0, arg1, arg2, arg3) {
  // Support both (B, scene, prefix, opts) and legacy/shorthand (scene, prefix, opts)
  let B, scene, prefix, opts;
  if (arg0 && typeof arg0.TransformNode === 'function') {
    B = arg0; scene = arg1; prefix = arg2; opts = arg3 || {};
  } else {
    B = globalThis.BABYLON; scene = arg0; prefix = arg1; opts = arg2 || {};
  }
  const {
    role = 'player',
    isLocalFirstPerson = false,
    withInternalOrgans = false
  } = opts;

  const pal = VOXEL_PALETTES[role] || VOXEL_PALETTES.player;
  const materials = new Map();

  function getMat(key, hex, { alpha = 1, emissive = 0.14, specular = 0.35, specPow = 42, unlit = false } = {}) {
    const id = `${key}_${alpha}_${emissive}_${specular}`;
    if (materials.has(id)) return materials.get(id);
    const m = new B.StandardMaterial(`${prefix}_mat_${id}`, scene);
    m.diffuseColor = B.Color3.FromHexString(hex);
    m.emissiveColor = m.diffuseColor.scale(emissive);
    m.specularColor = new B.Color3(specular, specular * 1.04, specular * 1.08);
    m.specularPower = specPow;
    m.alpha = alpha;
    m.disableLighting = unlit;
    m.backFaceCulling = false;
    materials.set(id, m);
    return m;
  }

  const root = new B.TransformNode(`${prefix}_root`, scene);
  const body = new B.TransformNode(`${prefix}_body`, scene);
  body.parent = root;

  const meshes = [];
  const headMeshes = [];

  function vox(name, [w, h, d], [x, y, z], matKey, hex, parent, vOpts = {}) {
    const m = B.MeshBuilder.CreateBox(`${prefix}_${name}`, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    m.material = getMat(matKey, hex, vOpts);
    m.parent = parent;
    m.isPickable = false;
    meshes.push(m);
    if (vOpts.isHead) headMeshes.push(m);
    return m;
  }

  // 1. Sculpted Torso, Layered Armor & Jetpack (y: 0.72 to 1.38)
  const torsoPivot = new B.TransformNode(`${prefix}_torsoPivot`, scene);
  torsoPivot.position.set(0, 0.72, 0);
  torsoPivot.parent = body;

  vox('pelvis', [0.44, 0.14, 0.26], [0, 0.07, 0], 'dark', pal.dark, torsoPivot);
  vox('beltRim', [0.48, 0.06, 0.29], [0, 0.10, 0], 'trim', pal.trim || pal.armor, torsoPivot, { specular: 0.55 });
  vox('beltBuckle', [0.14, 0.09, 0.31], [0, 0.09, 0.01], 'core', pal.core, torsoPivot, { emissive: 0.65 });
  vox('beltPouchL', [0.09, 0.11, 0.12], [-0.24, 0.09, 0.04], 'dark', pal.dark, torsoPivot);
  vox('beltPouchR', [0.09, 0.11, 0.12], [0.24, 0.09, 0.04], 'dark', pal.dark, torsoPivot);

  const mainChest = vox('chest', [0.46, 0.50, 0.26], [0, 0.39, 0], 'suit', pal.suit, torsoPivot);
  const chestPlate = vox('chestPlate', [0.40, 0.32, 0.31], [0, 0.43, 0.015], 'armor', pal.armor, torsoPivot, { specular: 0.52 });
  const chestCoreFrame = vox('chestCoreFrame', [0.18, 0.18, 0.33], [0, 0.44, 0.02], 'dark', pal.dark, torsoPivot);
  const chestCore = vox('chestCore', [0.12, 0.12, 0.35], [0, 0.44, 0.025], 'core', pal.core, torsoPivot, { emissive: 0.85 });
  // Twin shoulder-to-chest oxygen harness straps
  vox('strapL', [0.07, 0.42, 0.32], [-0.14, 0.43, 0.01], 'trim', pal.trim || pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('strapR', [0.07, 0.42, 0.32], [0.14, 0.43, 0.01], 'trim', pal.trim || pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('collar', [0.36, 0.08, 0.30], [0, 0.66, 0], 'dark', pal.dark, torsoPivot, { isHead: true, specular: 0.5 });

  // Detailed Dual-Thruster Jetpack
  vox('packMain', [0.40, 0.44, 0.18], [0, 0.42, -0.21], 'armor', pal.armor, torsoPivot, { isHead: isLocalFirstPerson, specular: 0.48 });
  vox('packFrame', [0.44, 0.10, 0.21], [0, 0.56, -0.21], 'trim', pal.trim || pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('packCore', [0.18, 0.24, 0.21], [0, 0.42, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson });
  vox('packGlow', [0.10, 0.16, 0.225], [0, 0.42, -0.22], 'core', pal.core, torsoPivot, { emissive: 0.82, isHead: isLocalFirstPerson });
  vox('thrusterL', [0.12, 0.16, 0.12], [-0.13, 0.17, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson, specular: 0.6 });
  vox('thrusterR', [0.12, 0.16, 0.12], [0.13, 0.17, -0.22], 'dark', pal.dark, torsoPivot, { isHead: isLocalFirstPerson, specular: 0.6 });
  vox('flameL', [0.07, 0.05, 0.07], [-0.13, 0.08, -0.22], 'core', pal.core, torsoPivot, { emissive: 0.92, isHead: isLocalFirstPerson });
  vox('flameR', [0.07, 0.05, 0.07], [0.13, 0.08, -0.22], 'core', pal.core, torsoPivot, { emissive: 0.92, isHead: isLocalFirstPerson });

  // 2. High-Detail Voxel Head & Armored Space Helmet (pivot at neck y = 1.40)
  const headPivot = new B.TransformNode(`${prefix}_headPivot`, scene);
  headPivot.position.set(0, 0.68, 0);
  headPivot.parent = torsoPivot;

  vox('innerHead', [0.34, 0.34, 0.32], [0, 0.20, 0], 'skin', pal.skin, headPivot, { isHead: true, specular: 0.12 });
  vox('eyeL', [0.06, 0.055, 0.02], [-0.08, 0.21, 0.165], 'eyes', pal.eyes, headPivot, { isHead: true });
  vox('eyeR', [0.06, 0.055, 0.02], [0.08, 0.21, 0.165], 'eyes', pal.eyes, headPivot, { isHead: true });
  vox('eyeSparkL', [0.02, 0.02, 0.025], [-0.07, 0.22, 0.168], 'white', '#ffffff', headPivot, { emissive: 0.75, isHead: true });
  vox('eyeSparkR', [0.02, 0.02, 0.025], [0.09, 0.22, 0.168], 'white', '#ffffff', headPivot, { emissive: 0.75, isHead: true });
  vox('brow', [0.24, 0.04, 0.02], [0, 0.28, 0.165], 'dark', pal.hair || pal.dark, headPivot, { isHead: true });

  // Multi-piece beveled helmet shell + brow shield + headlamps
  vox('helmetTop', [0.46, 0.09, 0.46], [0, 0.40, 0], 'suit', pal.suit, headPivot, { isHead: true, specular: 0.5 });
  vox('helmetCrest', [0.14, 0.05, 0.42], [0, 0.46, -0.02], 'armor', pal.armor, headPivot, { isHead: true, specular: 0.6 });
  vox('helmetBrow', [0.44, 0.06, 0.10], [0, 0.36, 0.21], 'trim', pal.trim || pal.armor, headPivot, { isHead: true, specular: 0.55 });
  vox('headlampL', [0.07, 0.04, 0.04], [-0.14, 0.37, 0.25], 'core', '#ffffff', headPivot, { emissive: 0.95, isHead: true });
  vox('headlampR', [0.07, 0.04, 0.04], [0.14, 0.37, 0.25], 'core', '#ffffff', headPivot, { emissive: 0.95, isHead: true });
  vox('helmetBack', [0.46, 0.38, 0.11], [0, 0.21, -0.17], 'suit', pal.suit, headPivot, { isHead: true, specular: 0.45 });
  vox('helmetSideL', [0.09, 0.38, 0.38], [-0.195, 0.21, -0.02], 'suit', pal.suit, headPivot, { isHead: true, specular: 0.45 });
  vox('helmetSideR', [0.09, 0.38, 0.38], [0.195, 0.21, -0.02], 'suit', pal.suit, headPivot, { isHead: true, specular: 0.45 });
  vox('helmetChin', [0.45, 0.09, 0.44], [0, 0.04, 0.015], 'armor', pal.armor, headPivot, { isHead: true, specular: 0.55 });
  vox('visorGlass', [0.38, 0.26, 0.04], [0, 0.21, 0.20], 'visor', pal.visor, headPivot, { alpha: 0.42, emissive: 0.45, specular: 0.95, specPow: 96, isHead: true });
  vox('earPod', [0.06, 0.14, 0.14], [0.25, 0.21, -0.02], 'armor', pal.armor, headPivot, { isHead: true, specular: 0.55 });
  vox('antennaMast', [0.026, 0.24, 0.026], [0.26, 0.37, -0.04], 'dark', pal.dark, headPivot, { isHead: true });
  vox('antennaTip', [0.055, 0.055, 0.055], [0.26, 0.50, -0.04], 'core', pal.core, headPivot, { emissive: 0.95, isHead: true });

  // 3. Articulated Voxel Arms with Pauldrons & Holo Wrist Panels
  const leftArm = new B.TransformNode(`${prefix}_leftArm`, scene);
  leftArm.position.set(-0.34, 0.58, 0);
  leftArm.parent = torsoPivot;
  vox('shoulderL', [0.22, 0.16, 0.24], [-0.01, -0.03, 0], 'leftG', pal.leftGauntlet, leftArm, { emissive: 0.28, specular: 0.5 });
  vox('shoulderRimL', [0.24, 0.05, 0.26], [-0.01, 0.05, 0], 'armor', pal.armor, leftArm, { specular: 0.55 });
  vox('upperArmL', [0.16, 0.24, 0.18], [0, -0.22, 0], 'suit', pal.suit, leftArm);
  vox('gauntletL', [0.19, 0.21, 0.21], [0, -0.42, 0.01], 'leftG', pal.leftGauntlet, leftArm, { emissive: 0.38, specular: 0.55 });
  vox('wristHoloL', [0.04, 0.10, 0.12], [-0.10, -0.41, 0.02], 'core', pal.core, leftArm, { emissive: 0.85 });
  vox('handL', [0.15, 0.12, 0.16], [0, -0.56, 0.01], 'dark', pal.dark, leftArm);

  const rightArm = new B.TransformNode(`${prefix}_rightArm`, scene);
  rightArm.position.set(0.34, 0.58, 0);
  rightArm.parent = torsoPivot;
  vox('shoulderR', [0.22, 0.16, 0.24], [0.01, -0.03, 0], 'rightG', pal.rightGauntlet, rightArm, { emissive: 0.28, specular: 0.5 });
  vox('shoulderRimR', [0.24, 0.05, 0.26], [0.01, 0.05, 0], 'armor', pal.armor, rightArm, { specular: 0.55 });
  vox('upperArmR', [0.16, 0.24, 0.18], [0, -0.22, 0], 'suit', pal.suit, rightArm);
  vox('gauntletR', [0.19, 0.21, 0.21], [0, -0.42, 0.01], 'rightG', pal.rightGauntlet, rightArm, { emissive: 0.38, specular: 0.55 });
  vox('wristHoloR', [0.04, 0.10, 0.12], [0.10, -0.41, 0.02], 'core', pal.core, rightArm, { emissive: 0.85 });
  vox('handR', [0.15, 0.12, 0.16], [0, -0.56, 0.01], 'dark', pal.dark, rightArm);

  const handSocket = new B.TransformNode(`${prefix}_handSocket`, scene);
  handSocket.position.set(0, -0.58, 0.16);
  handSocket.parent = rightArm;

  // 4. Articulated Armored Legs & Mag-Boots (y: 0.72 down to 0.00)
  const leftLeg = new B.TransformNode(`${prefix}_leftLeg`, scene);
  leftLeg.position.set(-0.135, 0.72, 0);
  leftLeg.parent = body;
  vox('thighL', [0.18, 0.34, 0.20], [0, -0.17, 0], 'suit', pal.suit, leftLeg);
  vox('thighGuardL', [0.05, 0.18, 0.14], [-0.10, -0.16, 0], 'armor', pal.armor, leftLeg, { specular: 0.5 });
  vox('kneeL', [0.21, 0.11, 0.23], [0, -0.36, 0.025], 'armor', pal.armor, leftLeg, { specular: 0.55 });
  vox('shinL', [0.17, 0.22, 0.19], [0, -0.50, 0], 'suit', pal.suit, leftLeg);
  vox('bootL', [0.21, 0.12, 0.29], [0, -0.66, 0.04], 'dark', pal.dark, leftLeg, { specular: 0.45 });
  vox('soleL', [0.22, 0.032, 0.30], [0, -0.704, 0.04], 'leftG', pal.leftGauntlet, leftLeg, { emissive: 0.42 });

  const rightLeg = new B.TransformNode(`${prefix}_rightLeg`, scene);
  rightLeg.position.set(0.135, 0.72, 0);
  rightLeg.parent = body;
  vox('thighR', [0.18, 0.34, 0.20], [0, -0.17, 0], 'suit', pal.suit, rightLeg);
  vox('thighGuardR', [0.05, 0.18, 0.14], [0.10, -0.16, 0], 'armor', pal.armor, rightLeg, { specular: 0.5 });
  vox('kneeR', [0.21, 0.11, 0.23], [0, -0.36, 0.025], 'armor', pal.armor, rightLeg, { specular: 0.55 });
  vox('shinR', [0.17, 0.22, 0.19], [0, -0.50, 0], 'suit', pal.suit, rightLeg);
  vox('bootR', [0.21, 0.12, 0.29], [0, -0.66, 0.04], 'dark', pal.dark, rightLeg, { specular: 0.45 });
  vox('soleR', [0.22, 0.032, 0.30], [0, -0.704, 0.04], 'rightG', pal.rightGauntlet, rightLeg, { emissive: 0.42 });

  // 5. Optional Voxel Internal Organs (Heart, Lungs, Spine, Golden Vessels & 3 Shards for Section 15!)
  let organs = null;
  if (withInternalOrgans) {
    const organRoot = new B.TransformNode(`${prefix}_organs`, scene);
    organRoot.position.set(0, 0.38, 0.01);
    organRoot.parent = torsoPivot;

    const heart = vox('organHeart', [0.12, 0.14, 0.12], [0.04, 0.03, 0.03], 'heart', '#ff4757', organRoot, { emissive: 0.85 });
    const lungL = vox('organLungL', [0.13, 0.24, 0.14], [-0.11, 0.04, 0.0], 'lung', '#5ce1e6', organRoot, { alpha: 0.65, emissive: 0.48 });
    const lungR = vox('organLungR', [0.13, 0.24, 0.14], [0.11, 0.04, 0.0], 'lung', '#5ce1e6', organRoot, { alpha: 0.65, emissive: 0.48 });
    const spine = vox('organSpine', [0.07, 0.44, 0.07], [0, 0.0, -0.07], 'spine', '#fff3d1', organRoot, { emissive: 0.45 });
    const aorta = vox('organAorta', [0.04, 0.36, 0.04], [0.02, 0.02, 0.01], 'vessel', '#ffd15c', organRoot, { emissive: 0.75 });

    const shard1 = vox('shard1', [0.09, 0.09, 0.09], [0.05, 0.04, 0.05], 'shard', '#d96bff', organRoot, { emissive: 0.95 });
    const shard2 = vox('shard2', [0.09, 0.09, 0.09], [-0.12, 0.08, 0.02], 'shard', '#d96bff', organRoot, { emissive: 0.95 });
    const shard3 = vox('shard3', [0.09, 0.09, 0.09], [0.0, -0.14, -0.05], 'shard', '#d96bff', organRoot, { emissive: 0.95 });

    organs = { organRoot, heart, lungL, lungR, spine, aorta, shards: [shard1, shard2, shard3] };
  }

  if (isLocalFirstPerson) {
    for (const m of headMeshes) m.setEnabled(false);
    mainChest.scaling.set(0.55, 0.78, 0.50);
    chestPlate.setEnabled(false);
    chestCoreFrame.setEnabled(false);
    chestCore.setEnabled(false);
  }

  // Reusable scratch objects for zero-GC pose() updates
  const _bodyQuat = new B.Quaternion();
  const _yawQuat = new B.Quaternion();
  const _backSrc = new B.Vector3(0, -1.65, -0.26);
  const _backOut = new B.Vector3();
  body.rotationQuaternion = _bodyQuat;

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
        if (k.startsWith('visor')) m.alpha = Math.min(0.46, alpha * 0.6);
        else if (k.startsWith('lung')) m.alpha = Math.min(0.65, alpha * 0.75);
        else m.alpha = alpha;
      }
    },
    setSuitXRay(xrayAlpha = 0.18) {
      mainChest.material = getMat('suitXray', pal.suit, { alpha: xrayAlpha, emissive: 0.15 });
      chestPlate.material = getMat('armorXray', pal.armor, { alpha: xrayAlpha, emissive: 0.15 });
      chestCoreFrame.setEnabled(xrayAlpha > 0.5);
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

      const breath = breatheTime ? Math.sin(breatheTime * 2.6) * 0.012 : 0;
      torsoPivot.position.y = 0.72 + breath;

      B.Quaternion.RotationYawPitchRollToRef(yaw, isLocalFirstPerson ? 0 : pitch, tiltZRad, _bodyQuat);
      if (isLocalFirstPerson) {
        B.Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, _yawQuat);
        _backSrc.rotateByQuaternionToRef(_yawQuat, _backOut);
        root.position.addInPlace(_backOut);
      }

      headPivot.rotation.set(headPitch, headYaw, 0);
      leftLeg.rotation.x = leftLegAngle;
      rightLeg.rotation.x = rightLegAngle;

      const idleSwingL = -rightLegAngle * 0.55;
      const idleSwingR = -leftLegAngle * 0.55;
      leftArm.rotation.x = waveLeft > 0.01 ? -waveLeft * 2.35 : idleSwingL;
      leftArm.rotation.z = waveLeft > 0.01 ? waveLeft * 0.25 : -0.06;

      rightArm.rotation.x = waveRight > 0.01 ? -waveRight * 2.35 : holdRight > 0.01 ? -holdRight * 1.15 : idleSwingR;
      rightArm.rotation.z = waveRight > 0.01 ? -waveRight * 0.25 : 0.06;
    }
  };
}
