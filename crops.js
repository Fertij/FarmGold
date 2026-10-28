// crops.js — процедурные 3D-модели растений (геометрия 1:1 с оригиналом)
import * as THREE from 'three';

// ---------- Текстуры ----------
let cornTex = null;
let melonTex = null;

function createCornTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffca3a';
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 128; y += 12) {
    for (let x = 0; x < 64; x += 12) {
      const offset = (y % 24 === 0) ? 6 : 0;
      ctx.fillStyle = Math.random() > 0.5 ? '#f18701' : '#ffea00';
      ctx.beginPath();
      ctx.arc(x + offset, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(x + offset - 1, y - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function createWatermelonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, 256, 256);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#81c784';
  for (let i = 0; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.bezierCurveTo(i + 20, 80, i - 20, 170, i, 256);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function ensureTextures() {
  if (!cornTex) cornTex = createCornTexture();
  if (!melonTex) melonTex = createWatermelonTexture();
}

// ---------- Форма листа (один раз) ----------
let leafGeoCache = null;
function getLeafGeo() {
  if (leafGeoCache) return leafGeoCache;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.15, 0.2, 0.1, 0.6);
  shape.quadraticCurveTo(0.05, 0.8, 0, 0.9);
  shape.quadraticCurveTo(-0.05, 0.8, -0.1, 0.6);
  shape.quadraticCurveTo(-0.15, 0.2, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02, bevelEnabled: true, bevelSegments: 2,
    steps: 2, bevelSize: 0.02, bevelThickness: 0.01,
  });
  geo.center();
  leafGeoCache = geo;
  return geo;
}

// ---------- Кукуруза ----------
export function createDetailedCornPlant() {
  ensureTextures();
  const plant = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.8 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.3, 8), stemMat);
  stem.position.y = 0.65; stem.castShadow = true; plant.add(stem);

  const cobMat = new THREE.MeshStandardMaterial({ map: cornTex, roughness: 0.4 });
  const cobGroup = new THREE.Group();
  cobGroup.name = 'fruit';
  const cobMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 6, 12), cobMat);
  cobMesh.castShadow = true; cobGroup.add(cobMesh);
  cobGroup.position.y = 0.85; cobGroup.visible = false;
  plant.add(cobGroup);

  const leafMatPlant = new THREE.MeshStandardMaterial({
    color: 0x52b788, roughness: 0.5, side: THREE.DoubleSide,
  });
  const leafGeo = getLeafGeo();
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMatPlant);
    leaf.castShadow = true;
    leaf.position.set(0, 0.6, 0);
    leaf.rotation.y = (Math.PI * 2 / 3) * i;
    leaf.rotation.x = -Math.PI / 6;
    leaf.rotation.z = Math.PI / 4;
    leaf.scale.set(1.6, 1.6, 1.6);
    plant.add(leaf);
  }
  return plant;
}

// ---------- Арбуз ----------
export function createWatermelonPlant() {
  ensureTextures();
  const plant = new THREE.Group();
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });

  const vine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6), vineMat);
  vine1.rotation.z = Math.PI / 2; vine1.position.set(0.4, 0.05, 0);
  vine1.castShadow = true; plant.add(vine1);

  const vine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6), vineMat);
  vine2.rotation.x = Math.PI / 2; vine2.position.set(0.8, 0.05, 0.3);
  vine2.castShadow = true; plant.add(vine2);

  const leafMatPlant = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.6, flatShading: true,
  });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), leafMatPlant);
    leaf.scale.set(1.2, 0.1, 0.8);
    leaf.position.set(0.2 + Math.random() * 0.6, 0.1, (Math.random() - 0.5) * 0.6);
    leaf.rotation.y = Math.random() * Math.PI;
    leaf.castShadow = true;
    plant.add(leaf);
  }

  const melonGroup = new THREE.Group();
  melonGroup.name = 'fruit';
  const melonMat = new THREE.MeshStandardMaterial({ map: melonTex, roughness: 0.3 });
  const melonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), melonMat);
  melonMesh.scale.set(1, 0.85, 1.2);
  melonMesh.position.set(0.8, 0.35, 0.3);
  melonMesh.castShadow = true;
  melonGroup.add(melonMesh);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 5), vineMat);
  stem.position.set(0.8, 0.7, 0.3);
  melonGroup.add(stem);
  melonGroup.visible = false;
  plant.add(melonGroup);
  return plant;
}

// ---------- Тыква ----------
export function createPumpkinPlant() {
  const plant = new THREE.Group();
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.9 });

  const vine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), vineMat);
  vine1.rotation.z = Math.PI / 2; vine1.position.set(0.45, 0.08, 0);
  vine1.castShadow = true; plant.add(vine1);

  const vine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6), vineMat);
  vine2.rotation.x = Math.PI / 2; vine2.position.set(0.9, 0.08, 0.35);
  vine2.castShadow = true; plant.add(vine2);

  const leafMatPlant = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.6, flatShading: true,
  });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), leafMatPlant);
    leaf.scale.set(1.3, 0.1, 1);
    leaf.position.set(0.2 + Math.random() * 0.7, 0.1, (Math.random() - 0.5) * 0.7);
    leaf.rotation.y = Math.random() * Math.PI;
    leaf.castShadow = true;
    plant.add(leaf);
  }

  const pumpkinGroup = new THREE.Group();
  pumpkinGroup.name = 'fruit';
  const pumpkinMat = new THREE.MeshStandardMaterial({
    color: 0xff7518, roughness: 0.5, flatShading: true,
  });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), pumpkinMat);
  center.scale.set(1, 0.8, 1); center.castShadow = true; pumpkinGroup.add(center);
  for (let i = 0; i < 4; i++) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), pumpkinMat);
    lobe.scale.set(1, 0.8, 1);
    lobe.position.x = Math.cos(i * Math.PI / 2) * 0.2;
    lobe.position.z = Math.sin(i * Math.PI / 2) * 0.2;
    lobe.castShadow = true;
    pumpkinGroup.add(lobe);
  }
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6), stemMat);
  stem.position.y = 0.35; stem.rotation.z = 0.2;
  pumpkinGroup.add(stem);
  pumpkinGroup.position.set(0.9, 0.35, 0.35);
  pumpkinGroup.visible = false;
  plant.add(pumpkinGroup);
  return plant;
}

// ---------- Клубника ----------
export function createStrawberryPlant() {
  const plant = new THREE.Group();
  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.8, flatShading: true,
  });
  for (let i = 0; i < 12; i++) {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), bushMat);
    leaf.scale.set(1.5, 0.2, 0.8);
    leaf.position.set(
      (Math.random() - 0.5) * 0.6,
      0.15 + Math.random() * 0.15,
      (Math.random() - 0.5) * 0.6
    );
    leaf.rotation.x = Math.random() * Math.PI;
    leaf.rotation.y = Math.random() * Math.PI;
    leaf.rotation.z = Math.random() * Math.PI;
    leaf.castShadow = true;
    plant.add(leaf);
  }
  const berriesGroup = new THREE.Group();
  berriesGroup.name = 'fruit';
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.3 });
  const seedMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const berryLeafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });

  for (let i = 0; i < 3; i++) {
    const berryGroup = new THREE.Group();
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), berryMat);
    berry.scale.set(1, 1.2, 1);
    berry.castShadow = true;
    berryGroup.add(berry);

    for (let j = 0; j < 5; j++) {
      const topLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), berryLeafMat);
      topLeaf.position.set(
        Math.cos(j * Math.PI / 2.5) * 0.06, 0.12,
        Math.sin(j * Math.PI / 2.5) * 0.06
      );
      topLeaf.rotation.z = Math.cos(j * Math.PI / 2.5) * 0.5;
      topLeaf.rotation.x = Math.sin(j * Math.PI / 2.5) * 0.5;
      berryGroup.add(topLeaf);
    }
    for (let j = 0; j < 10; j++) {
      const seed = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.015), seedMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      seed.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.12,
        Math.cos(phi) * 0.14,
        Math.sin(phi) * Math.sin(theta) * 0.12
      );
      berryGroup.add(seed);
    }
    berryGroup.position.set(
      0.2 + (Math.random() - 0.5) * 0.3,
      0.15 + Math.random() * 0.1,
      0.2 + (Math.random() - 0.5) * 0.3
    );
    berriesGroup.add(berryGroup);
  }
  berriesGroup.visible = false;
  plant.add(berriesGroup);
  return plant;
}

// ---------- Универсальный фабричный метод ----------
export function createPlant(type) {
  switch (type) {
    case 'corn': return createDetailedCornPlant();
    case 'watermelon': return createWatermelonPlant();
    case 'pumpkin': return createPumpkinPlant();
    case 'strawberry': return createStrawberryPlant();
    default: return createDetailedCornPlant();
  }
}