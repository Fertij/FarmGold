// player.js — модель фермера + анимация + движение
import * as THREE from 'three';
import { state } from './state.js';
import { CONFIG } from './config.js';

const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcfae });
const shirtMat = new THREE.MeshStandardMaterial({ color: 0xe63946 });
const overallsMat = new THREE.MeshStandardMaterial({ color: 0x1d3557 });
const hatMat = new THREE.MeshStandardMaterial({ color: 0xffd166 });
const hatBandMat = new THREE.MeshStandardMaterial({ color: 0xd90429 });
const bootsMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x90be6d, metalness: 0.3, roughness: 0.5 });
const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

let walkTime = 0;
let bobTime = 0;

function buildArm(playerGroup, x, isRight) {
  const armGroup = new THREE.Group();
  armGroup.position.set(x, 1.1, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), shirtMat);
  upper.position.y = -0.15; upper.castShadow = true; armGroup.add(upper);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), hatBandMat);
  cuff.position.y = -0.32; armGroup.add(cuff);

  const lowerGroup = new THREE.Group();
  lowerGroup.position.y = -0.35;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.15), skinMat);
  lower.position.y = -0.12; lower.castShadow = true; lowerGroup.add(lower);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.12), skinMat);
  hand.position.y = -0.3; hand.castShadow = true; lowerGroup.add(hand);

  if (isRight) {
    const canGroup = new THREE.Group();
    canGroup.position.set(0, -0.35, 0.12);
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 12), metalMat);
    canBody.rotation.z = Math.PI / 2; canBody.castShadow = true; canGroup.add(canBody);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.35, 8), metalMat);
    spout.position.set(0.25, 0.05, 0); spout.rotation.z = -Math.PI / 4;
    spout.castShadow = true; canGroup.add(spout);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.06, 8), metalMat);
    rose.position.set(0.38, 0.18, 0); rose.rotation.z = -Math.PI / 4;
    canGroup.add(rose);
    lowerGroup.add(canGroup);
  }
  armGroup.add(lowerGroup);
  playerGroup.add(armGroup);
  return { armGroup, lowerGroup };
}

function buildLeg(playerGroup, x) {
  const legGroup = new THREE.Group();
  legGroup.position.set(x, 0.45, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), overallsMat);
  upper.position.y = -0.15; upper.castShadow = true; legGroup.add(upper);
  const lowerGroup = new THREE.Group();
  lowerGroup.position.y = -0.3;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), overallsMat);
  lower.position.y = -0.1; lower.castShadow = true; lowerGroup.add(lower);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.35), bootsMat);
  boot.position.set(0, -0.25, 0.08); boot.castShadow = true; lowerGroup.add(boot);
  legGroup.add(lowerGroup);
  playerGroup.add(legGroup);
  return { legGroup, lowerGroup };
}

export function initPlayer(scene) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), shirtMat);
  torso.position.y = 0.9; torso.castShadow = true; group.add(torso);

  const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.37), overallsMat);
  overalls.position.set(0, 0.65, 0); overalls.castShadow = true; group.add(overalls);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.37), shirtMat);
  collar.position.set(0, 1.15, 0); group.add(collar);

  const btnMat = new THREE.MeshStandardMaterial({ color: 0xffd166 });
  const btnL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), btnMat);
  btnL.rotation.x = Math.PI / 2; btnL.position.set(-0.2, 0.8, 0.19); group.add(btnL);
  const btnR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8), btnMat);
  btnR.rotation.x = Math.PI / 2; btnR.position.set(0.2, 0.8, 0.19); group.add(btnR);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
  head.castShadow = true; headGroup.add(head);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.1), skinMat);
  earL.position.set(-0.25, 0, 0); headGroup.add(earL);
  const earR = earL.clone(); earR.position.x = 0.25; headGroup.add(earR);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.15), skinMat);
  nose.position.set(0, -0.02, 0.26); headGroup.add(nose);
  const eyeWhiteL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), whiteMat);
  eyeWhiteL.position.set(-0.12, 0.08, 0.23); headGroup.add(eyeWhiteL);
  const eyeWhiteR = eyeWhiteL.clone(); eyeWhiteR.position.x = 0.12; headGroup.add(eyeWhiteR);
  const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), blackMat);
  pupilL.position.set(-0.12, 0.08, 0.24); headGroup.add(pupilL);
  const pupilR = pupilL.clone(); pupilR.position.x = 0.12; headGroup.add(pupilR);
  const browL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), hairMat);
  browL.position.set(-0.12, 0.16, 0.23); browL.rotation.z = 0.1; headGroup.add(browL);
  const browR = browL.clone(); browR.position.x = 0.12; browR.rotation.z = -0.1; headGroup.add(browR);
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.1), hairMat);
  mustache.position.set(0, -0.12, 0.25); headGroup.add(mustache);
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.6 });
  const cheekL = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), cheekMat);
  cheekL.position.set(-0.18, -0.05, 0.23); headGroup.add(cheekL);
  const cheekR = cheekL.clone(); cheekR.position.x = 0.18; headGroup.add(cheekR);
  group.add(headGroup);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), hatMat);
  hatBrim.position.y = 1.58; hatBrim.castShadow = true; group.add(hatBrim);
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.3, 16), hatMat);
  hatTop.position.y = 1.75; hatTop.castShadow = true; group.add(hatTop);
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.1, 16), hatBandMat);
  hatBand.position.y = 1.65; group.add(hatBand);

  const limbs = {
    armL: buildArm(group, -0.4, false),
    armR: buildArm(group, 0.4, true),
    legL: buildLeg(group, -0.18),
    legR: buildLeg(group, 0.18),
  };

  group.position.set(CONFIG.player.startPos.x, 0, CONFIG.player.startPos.z);
  scene.add(group);

  state.player.group = group;
  state.player.limbs = limbs;
  state.player.pos.set(CONFIG.player.startPos.x, 0, CONFIG.player.startPos.z);
  state.player.group.position.copy(state.player.pos);

  walkTime = 0;
  bobTime = 0;
}

function tryMoveAxis(axis, delta) {
  const p = state.player;
  const colliders = state.colliders;
  const next = axis === 'x' ? p.pos.x + delta : p.pos.z + delta;
  for (const c of colliders) {
    const dx = (axis === 'x' ? next : p.pos.x) - c.x;
    const dz = (axis === 'z' ? next : p.pos.z) - c.z;
    if (Math.hypot(dx, dz) < c.radius + p.radius) return false;
  }
  const limit = CONFIG.world.limit - 0.8;
  if (axis === 'x') { if (Math.abs(next) > limit) return false; p.pos.x = next; }
  else { if (Math.abs(next) > limit) return false; p.pos.z = next; }
  return true;
}

export function tickPlayer(dt) {
  const p = state.player;
  if (!p.group) return;

  const joy = state.input.joystick;
  const keys = state.input.keys;
  let mx = joy.dx || 0;
  let my = joy.dy || 0;

  // Клавиатура
  const kx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
  const ky = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
  if (kx || ky) { mx += kx; my += -ky; }
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }

  const isMoving = (mx !== 0 || my !== 0);

  if (isMoving) {
    const moveAngle = Math.atan2(mx, my) + state.cameraCtrl.angle;
    const dx = Math.sin(moveAngle) * p.speed * dt;
    const dz = Math.cos(moveAngle) * p.speed * dt;
    tryMoveAxis('x', dx);
    tryMoveAxis('z', dz);

    let diff = moveAngle - p.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.group.rotation.y += diff * 10 * dt;
    walkTime += dt * 12;
    bobTime += dt;
  } else {
    walkTime = 0;
    bobTime = 0;
  }

  // Гравитация к земле/пруду
  const pond = state.pondPos;
  const distPond = Math.hypot(p.pos.x - pond.x, p.pos.z - pond.z);
  const targetBaseY = distPond < pond.radius - 0.5 ? -0.3 : 0;
  // Плавно
  const currentBaseY = p.group.position.y - p.bobOffset;
  const newBaseY = currentBaseY + (targetBaseY - currentBaseY) * Math.min(1, 10 * dt);

  // Bob — как смещение, не приращение (фикс парения)
  p.bobOffset = isMoving ? Math.abs(Math.sin(walkTime * 2)) * 0.06 : 0;

  p.group.position.set(p.pos.x, newBaseY + p.bobOffset, p.pos.z);

  // Анимация конечностей
  if (isMoving) {
    const swing = Math.sin(walkTime);
    const kneeSwing = Math.max(0, swing) * 0.8;
    p.limbs.legL.legGroup.rotation.x = swing * 0.6;
    p.limbs.legL.lowerGroup.rotation.x = kneeSwing;
    p.limbs.legR.legGroup.rotation.x = -swing * 0.6;
    p.limbs.legR.lowerGroup.rotation.x = Math.max(0, -swing) * 0.8;
    p.limbs.armL.armGroup.rotation.x = -swing * 0.6;
    p.limbs.armL.lowerGroup.rotation.x = -0.2 - Math.max(0, -swing) * 0.5;
    p.limbs.armR.armGroup.rotation.x = swing * 0.6;
    p.limbs.armR.lowerGroup.rotation.x = -0.2 - Math.max(0, swing) * 0.5;
  } else {
    for (const limb of Object.values(p.limbs)) {
      if (limb.legGroup) limb.legGroup.rotation.x *= 0.8;
      if (limb.lowerGroup) limb.lowerGroup.rotation.x *= 0.8;
      if (limb.armGroup) limb.armGroup.rotation.x *= 0.8;
    }
  }
}

export function resetPlayerPosition() {
  const p = state.player;
  if (!p.group) return;
  p.pos.set(CONFIG.player.startPos.x, 0, CONFIG.player.startPos.z);
  p.group.position.set(p.pos.x, 0, p.pos.z);
  p.group.rotation.y = 0;
}