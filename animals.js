// animals.js — куры, ИИ, яйца на земле
import * as THREE from 'three';
import { state, emit } from './state.js';
import { CONFIG } from './config.js';
import { playSound } from './audio.js';
import { spawnSparkles } from './particles.js';

const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
const wingMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9, flatShading: true });
const beakMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.6 });
const combMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.6 });
const legMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.6 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const eggMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.4 });

const CHICKEN_AREA_RADIUS = 3.5;
const CHICKEN_AREA_CENTER = { x: 20, z: -2 }; 

function createEggMesh() {
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), eggMat);
  egg.scale.set(1.2, 1.5, 1.2); 
  egg.castShadow = true;
  const glow = new THREE.PointLight(0xfff8e1, 0.5, 1.5);
  glow.position.set(0, 0.2, 0);
  egg.add(glow);
  return egg;
}

function createChickenModel() {
  const chicken = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), bodyMat);
  body.scale.set(1, 0.9, 1.2);
  body.position.y = 0.4;
  body.castShadow = true;
  chicken.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), bodyMat);
  head.position.set(0, 0.8, 0.15);
  head.castShadow = true;
  chicken.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.78, 0.36);
  chicken.add(beak);

  const comb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), combMat);
  comb.scale.set(1, 0.6, 0.3);
  comb.position.set(0, 1.0, 0.15);
  chicken.add(comb);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
  eyeL.position.set(-0.1, 0.85, 0.32);
  chicken.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  chicken.add(eyeR);

  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), wingMat);
  wingL.scale.set(0.3, 0.8, 1);
  wingL.position.set(-0.32, 0.4, 0);
  chicken.add(wingL);
  const wingR = wingL.clone();
  wingR.position.x = 0.32;
  chicken.add(wingR);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 6), bodyMat);
  tail.rotation.x = -Math.PI / 3;
  tail.position.set(0, 0.55, -0.35);
  chicken.add(tail);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), legMat);
  legL.position.set(-0.1, 0.1, 0.05);
  chicken.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.1;
  chicken.add(legR);

  return chicken;
}

function randomTargetInArea() {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * CHICKEN_AREA_RADIUS;
  return {
    x: CHICKEN_AREA_CENTER.x + Math.cos(angle) * r,
    z: CHICKEN_AREA_CENTER.z + Math.sin(angle) * r,
  };
}

function spawnChicken() {
  const model = createChickenModel();
  const pos = randomTargetInArea();
  model.position.set(pos.x, 0, pos.z);
  model.rotation.y = Math.random() * Math.PI * 2;
  state.scene.add(model);
  const animal = {
    group: model,
    eggTimer: CONFIG.economy.chickenEggInterval * (0.5 + Math.random() * 0.5),
    targetX: pos.x,
    targetZ: pos.z,
    state: 'idle',
    waitTimer: 1 + Math.random() * 2,
    peckTimer: 0,
    bobPhase: Math.random() * Math.PI * 2,
  };
  state.animals.push(animal);
  return animal;
}

function spawnEgg(x, z) {
  const egg = createEggMesh();
  egg.position.set(x + (Math.random() - 0.5) * 0.6, 0.25, z + (Math.random() - 0.5) * 0.6);
  state.scene.add(egg);
  const eggObj = {
    mesh: egg,
    bobPhase: Math.random() * Math.PI * 2,
  };
  state.eggs.push(eggObj);
  return eggObj;
}

export function setChickenCount(count) {
  while (state.animals.length < count) spawnChicken();
  while (state.animals.length > count) {
    const a = state.animals.pop();
    if (a && a.group) state.scene.remove(a.group);
  }
}

export function buyChicken() {
  const price = CONFIG.economy.chickenPrice;
  if (state.resources.coins < price) return false;
  state.resources.coins -= price;
  state.upgrades.chickenCount++;
  spawnChicken();
  playSound('buy');
  emit(CONFIG.events.RESOURCE_CHANGE);
  return true;
}

export function collectEgg(eggObj) {
  const idx = state.eggs.indexOf(eggObj);
  if (idx === -1) return false;
  state.scene.remove(eggObj.mesh);
  state.eggs.splice(idx, 1);
  state.resources.eggs++;
  state.stats.totalEggsCollected++;
  playSound('egg');
  spawnSparkles(eggObj.mesh.position.x, eggObj.mesh.position.z);
  emit(CONFIG.events.RESOURCE_CHANGE);
  return true;
}

export function getNearestEgg(playerPos, maxDist = 1.5) {
  let best = null;
  let bestDist = Infinity;
  for (const e of state.eggs) {
    const d = Math.hypot(playerPos.x - e.mesh.position.x, playerPos.z - e.mesh.position.z);
    if (d < maxDist && d < bestDist) { bestDist = d; best = e; }
  }
  return best;
}

export function tickAnimals(dt, elapsed) {
  for (const a of state.animals) {
    a.eggTimer -= dt;
    if (a.eggTimer <= 0) {
      a.eggTimer = CONFIG.economy.chickenEggInterval * (0.8 + Math.random() * 0.4);
      if (state.eggs.length < state.animals.length * CONFIG.economy.chickenMaxPendingEggs) {
        spawnEgg(a.group.position.x, a.group.position.z);
      }
    }

    if (a.state === 'idle') {
      a.waitTimer -= dt;
      if (a.waitTimer <= 0) {
        const t = randomTargetInArea();
        a.targetX = t.x;
        a.targetZ = t.z;
        a.state = 'walking';
      }
    } else if (a.state === 'walking') {
      const dx = a.targetX - a.group.position.x;
      const dz = a.targetZ - a.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15) {
        a.state = 'idle';
        a.waitTimer = 1 + Math.random() * 3;
      } else {
        const speed = 1.2;
        const nx = a.group.position.x + (dx / dist) * speed * dt;
        const nz = a.group.position.z + (dz / dist) * speed * dt;
        
        // Проверка коллизий для курицы (чтобы не проходила сквозь деревья и камни)
        let blocked = false;
        for (let c of state.colliders) {
          if (Math.hypot(nx - c.x, nz - c.z) < c.radius + 0.4) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          // Если путь заблокирован, останавливаемся и ищем новую цель
          a.state = 'idle';
          a.waitTimer = 1 + Math.random();
        } else {
          a.group.position.x = nx;
          a.group.position.z = nz;
          const targetAngle = Math.atan2(dx, dz);
          let diff = targetAngle - a.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.group.rotation.y += diff * 8 * dt;
        }
      }
    }

    a.bobPhase += dt * (a.state === 'walking' ? 8 : 2);
    a.group.position.y = Math.abs(Math.sin(a.bobPhase)) * 0.04;
  }

  for (const e of state.eggs) {
    e.bobPhase += dt * 1.5;
    e.mesh.rotation.y = Math.sin(e.bobPhase) * 0.15;
  }
}

export function clearAnimals() {
  for (const a of state.animals) {
    if (a.group) state.scene.remove(a.group);
  }
  state.animals.length = 0;
  for (const e of state.eggs) {
    state.scene.remove(e.mesh);
  }
  state.eggs.length = 0;
}

export function restoreAnimals(animalsData, eggsData) {
  clearAnimals();
  const target = Math.max(animalsData.length, 0);
  for (let i = 0; i < target; i++) {
    const d = animalsData[i];
    const a = spawnChicken();
    if (d && d.pos) {
      a.group.position.x = d.pos.x;
      a.group.position.z = d.pos.z;
      a.targetX = typeof d.targetX === 'number' ? d.targetX : d.pos.x;
      a.targetZ = typeof d.targetZ === 'number' ? d.targetZ : d.pos.z;
      a.eggTimer = typeof d.eggTimer === 'number' ? d.eggTimer : CONFIG.economy.chickenEggInterval;
      a.state = d.state || 'idle';
      a.waitTimer = d.waitTimer || 1;
    }
  }
  for (const e of eggsData) {
    if (!e) continue;
    spawnEgg(e.x, e.z);
  }
}