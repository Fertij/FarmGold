// particles.js — система частиц: пыль, монеты, листья, брызги, яйцо
import * as THREE from 'three';
import { state } from './state.js';

let dustGeo, dustMat;
let coinGeo, coinMat;
let leafGeo, leafMat;
let waterGeo, waterMat;
let sparkleGeo, sparkleMat;

export function initParticles() {
  dustGeo = new THREE.DodecahedronGeometry(0.1, 0);
  dustMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1 });

  coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
  coinGeo.rotateX(Math.PI / 2);
  coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });

  leafGeo = new THREE.PlaneGeometry(0.2, 0.15);
  leafMat = new THREE.MeshStandardMaterial({ color: 0x52b788, side: THREE.DoubleSide, roughness: 0.7 });

  waterGeo = new THREE.SphereGeometry(0.06, 6, 6);
  waterMat = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7, transparent: true, opacity: 0.75, roughness: 0.1,
  });

  sparkleGeo = new THREE.OctahedronGeometry(0.08, 0);
  sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.9 });
}

function _spawn(mesh, x, y, z, vel, life, type, extra) {
  mesh.position.set(x, y, z);
  mesh.userData = Object.assign({ vel, life, type }, extra || {});
  state.scene.add(mesh);
  state.particles.push(mesh);
  return mesh;
}

export function spawnDust(x, z) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(dustGeo, dustMat);
    _spawn(m,
      x + (Math.random() - 0.5) * 0.5, 0.2, z + (Math.random() - 0.5) * 0.5,
      new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 1, (Math.random() - 0.5) * 2),
      0.6, 'dust');
  }
}

export function spawnCoins(x, z, amount) {
  for (let i = 0; i < amount; i++) {
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.castShadow = true;
    _spawn(m,
      x + (Math.random() - 0.5) * 0.5, 0.5, z + (Math.random() - 0.5) * 0.5,
      new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 4 + 2, (Math.random() - 0.5) * 3),
      0.85, 'coin', { rotSpeed: Math.random() * 10 });
  }
}

export function spawnLeaves(x, z) {
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(leafGeo, leafMat);
    _spawn(m,
      x + (Math.random() - 0.5) * 0.8, 0.5, z + (Math.random() - 0.5) * 0.8,
      new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5 + 0.8, (Math.random() - 0.5) * 1.5),
      1.2, 'leaf', { rotSpeed: Math.random() * 5 });
  }
}

export function spawnWaterDrops(x, z) {
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(waterGeo, waterMat);
    _spawn(m,
      x + (Math.random() - 0.5) * 0.6, 1.2, z + (Math.random() - 0.5) * 0.6,
      new THREE.Vector3((Math.random() - 0.5) * 1, -1 - Math.random() * 2, (Math.random() - 0.5) * 1),
      0.8, 'water');
  }
}

export function spawnSparkles(x, z) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(sparkleGeo, sparkleMat);
    _spawn(m,
      x + (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.6,
      new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 1.5 + 0.3, (Math.random() - 0.5) * 1.2),
      1.0, 'sparkle', { rotSpeed: Math.random() * 8 });
  }
}

export function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.position.addScaledVector(p.userData.vel, dt);
    p.userData.vel.y -= 9.8 * dt;
    p.userData.life -= dt;
    const t = p.userData.type;
    if (t === 'coin' || t === 'sparkle') {
      p.rotation.y += p.userData.rotSpeed * dt;
    } else if (t === 'leaf') {
      p.rotation.x += p.userData.rotSpeed * dt;
      p.rotation.z += p.userData.rotSpeed * 0.5 * dt;
    } else if (t === 'water') {
      p.scale.multiplyScalar(0.98);
    } else {
      p.scale.multiplyScalar(0.95);
    }
    if (p.userData.life <= 0) {
      state.scene.remove(p);
      state.particles.splice(i, 1);
    }
  }
}