// world.js — сцена: небо, солнце, облака, земля, забор, пруд, деревья, здания
import * as THREE from 'three';
import { state } from './state.js';
import { CONFIG } from './config.js';

let groundMesh = null;
let waterMesh = null;
let waterTex = null;
let skyGradientStops = [];
const SKY_KEY = [
  { t: 0.00, top: '#0b1a3a', bottom: '#1a2a5c' },  // ночь
  { t: 0.20, top: '#3b5a9a', bottom: '#ffb07c' },  // рассвет
  { t: 0.30, top: '#4facfe', bottom: '#ffd6a5' },  // утро
  { t: 0.50, top: '#4facfe', bottom: '#00f2fe' },  // день
  { t: 0.70, top: '#4facfe', bottom: '#ffd6a5' },  // вечер
  { t: 0.82, top: '#3b5a9a', bottom: '#ffb07c' },  // закат
  { t: 1.00, top: '#0b1a3a', bottom: '#1a2a5c' },  // ночь
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return `rgb(${Math.round(ca.r + (cb.r - ca.r) * t)},${Math.round(ca.g + (cb.g - ca.g) * t)},${Math.round(ca.b + (cb.b - ca.b) * t)})`;
}
function sampleSky(t) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < SKY_KEY.length - 1 && SKY_KEY[i + 1].t < t) i++;
  const a = SKY_KEY[i], b = SKY_KEY[i + 1];
  const f = (t - a.t) / (b.t - a.t || 1);
  return { top: lerpColor(a.top, b.top, f), bottom: lerpColor(a.bottom, b.bottom, f) };
}

export function setDayTime(t) {
  state.dayTime = t;
  const sky = sampleSky(t);
  const ctx = state.skyContext;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  state.skyTexture.needsUpdate = true;

  // Освещение
  const dayPhase = Math.sin((t - 0.25) * Math.PI * 2); // -1 ночь, +1 полдень
  const lightFactor = Math.max(0, dayPhase);
  const sunI = CONFIG.day.sunMinIntensity + (CONFIG.day.sunMaxIntensity - CONFIG.day.sunMinIntensity) * lightFactor;
  const ambI = CONFIG.day.ambientMin + (CONFIG.day.ambientMax - CONFIG.day.ambientMin) * lightFactor;
  if (state.sunLight) {
    state.sunLight.intensity = sunI;
    const angle = (t - 0.25) * Math.PI * 2;
    const dist = 90;
    state.sunLight.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist * 0.8 + 15, Math.sin(angle * 0.5) * 40 + 20);
  }
  if (state.ambientLight) state.ambientLight.intensity = ambI;

  // Солнце-меши
  if (state.sunMesh && state.sunLight) {
    state.sunMesh.position.copy(state.sunLight.position).multiplyScalar(2);
    state.sunMesh.visible = lightFactor > 0.05;
  }
  if (state.sunSprite && state.sunLight) {
    state.sunSprite.position.copy(state.sunLight.position).multiplyScalar(2);
    state.sunSprite.visible = lightFactor > 0.05;
  }

  // Туман
  if (state.scene.fog) {
    const fog = state.scene.fog;
    const c = sampleSky(t).bottom;
    fog.color.setStyle(c);
    fog.near = 60 - lightFactor * 20;
    fog.far = 150 - lightFactor * 40;
  }
}

function createSky(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#00f2fe');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  scene.background = tex;
  state.skyCanvas = canvas;
  state.skyContext = ctx;
  state.skyTexture = tex;
}

function createLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  state.ambientLight = ambient;

  const sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  state.sunLight = sun;

  // Диск солнца (без тумана — иначе исчезает за far)
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(8, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffee, fog: false })
  );
  sunMesh.position.copy(sun.position).multiplyScalar(2);
  scene.add(sunMesh);
  state.sunMesh = sunMesh;

  // Свечение-спрайт (тоже без тумана)
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128; glowCanvas.height = 128;
  const gCtx = glowCanvas.getContext('2d');
  const radGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  radGrad.addColorStop(0, 'rgba(255,255,200,1)');
  radGrad.addColorStop(0.5, 'rgba(255,255,150,0.5)');
  radGrad.addColorStop(1, 'rgba(255,255,0,0)');
  gCtx.fillStyle = radGrad;
  gCtx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunSprite.scale.set(60, 60, 1);
  sunSprite.position.copy(sunMesh.position);
  scene.add(sunSprite);
  state.sunSprite = sunSprite;
}

function createClouds(scene) {
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,
    roughness: 1, flatShading: true, transparent: true, opacity: 0.95,
  });
  for (let i = 0; i < 20; i++) {
    const cloud = new THREE.Group();
    const parts = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < parts; j++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 2), cloudMat);
      p.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3);
      p.castShadow = false;
      cloud.add(p);
    }
    cloud.position.set(
      (Math.random() - 0.5) * 160,
      40 + Math.random() * 20,
      (Math.random() - 0.5) * 160
    );
    scene.add(cloud);
    state.clouds.push(cloud);
  }
}

function createGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.groundSize, CONFIG.world.groundSize),
    new THREE.MeshStandardMaterial({ color: 0x80ed99, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  groundMesh = ground;
}

function createFence(scene) {
  const L = CONFIG.world.limit;
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xddb892, roughness: 0.8 });
  const postGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.5, 6);
  const railGeo = new THREE.BoxGeometry(L * 2, 0.2, 0.1);

  function side(x, z, rotY) {
    const s = new THREE.Group();
    const postCount = Math.floor(L * 2 / 5);
    for (let i = 0; i <= postCount; i++) {
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(-L + i * (L * 2 / postCount), 1.25, 0);
      post.castShadow = true;
      s.add(post);
    }
    const r1 = new THREE.Mesh(railGeo, fenceMat);
    r1.position.set(0, 0.8, 0); r1.castShadow = true; s.add(r1);
    const r2 = new THREE.Mesh(railGeo, fenceMat);
    r2.position.set(0, 1.8, 0); r2.castShadow = true; s.add(r2);
    s.position.set(x, 0, z); s.rotation.y = rotY;
    return s;
  }

  const group = new THREE.Group();
  group.add(side(0, -L, 0));
  group.add(side(0, L, 0));
  group.add(side(-L, 0, Math.PI / 2));
  group.add(side(L, 0, Math.PI / 2));
  scene.add(group);
}

function createWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4fc3f7'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.bezierCurveTo(
      Math.random() * 256, Math.random() * 256,
      Math.random() * 256, Math.random() * 256,
      Math.random() * 256, Math.random() * 256
    );
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createPond(scene) {
  const p = CONFIG.world.pond;
  state.pondPos = { x: p.x, z: p.z, radius: p.radius };

  const pondGroup = new THREE.Group();
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(p.radius, 0.6, 16, 32), dirtMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(p.x, 0.05, p.z);
  rim.receiveShadow = true; rim.castShadow = true;
  pondGroup.add(rim);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 25; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = p.radius + (Math.random() - 0.5) * 0.4;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5), rockMat);
    rock.position.set(p.x + Math.cos(a) * r, 0.15, p.z + Math.sin(a) * r);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true; rock.receiveShadow = true;
    pondGroup.add(rock);
  }

  const reedMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
  const reedTopMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = p.radius - 0.5;
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 1.5 + Math.random()), reedMat);
    reed.position.set(p.x + Math.cos(a) * r, 0.8, p.z + Math.sin(a) * r);
    reed.castShadow = true;
    pondGroup.add(reed);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3), reedTopMat);
    top.position.copy(reed.position);
    top.position.y += 0.8;
    pondGroup.add(top);
  }
  scene.add(pondGroup);

  waterTex = createWaterTexture();
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x00bfff, map: waterTex, transparent: true, opacity: 0.8,
    roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide,
  });
  waterMesh = new THREE.Mesh(new THREE.CircleGeometry(p.radius - 0.1, 32), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(p.x, 0.02, p.z);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  const lilyMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.6, side: THREE.DoubleSide });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (p.radius - 2);
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.2, 8, 0.2), lilyMat);
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(p.x + Math.cos(a) * r, 0.04, p.z + Math.sin(a) * r);
    lily.rotation.z = Math.random() * Math.PI;
    scene.add(lily);
    if (Math.random() > 0.5) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 5), flowerMat);
      flower.position.copy(lily.position);
      flower.position.y = 0.1;
      scene.add(flower);
    }
  }
}

function createBarn(x, z, scene) {
  const barn = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.5 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 10), wallMat);
  body.position.y = 3; body.castShadow = true; body.receiveShadow = true;
  barn.add(body);

  const roofL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 10.5), roofMat);
  roofL.position.set(-2.2, 7.5, 0);
  roofL.rotation.z = Math.PI / 6;
  roofL.castShadow = true; barn.add(roofL);

  const roofR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 10.5), roofMat);
  roofR.position.set(2.2, 7.5, 0);
  roofR.rotation.z = -Math.PI / 6;
  roofR.castShadow = true; barn.add(roofR);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-4, 0); gableShape.lineTo(4, 0);
  gableShape.lineTo(0, 3.5); gableShape.lineTo(-4, 0);
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.2, bevelEnabled: false });
  const gableFront = new THREE.Mesh(gableGeo, wallMat);
  gableFront.position.set(0, 6, 5); barn.add(gableFront);
  const gableBack = new THREE.Mesh(gableGeo, wallMat);
  gableBack.position.set(0, 6, -5.2); barn.add(gableBack);

  const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.2), doorMat);
  doorL.position.set(-1.4, 2, 5.1); barn.add(doorL);
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.2), doorMat);
  doorR.position.set(1.4, 2, 5.1); barn.add(doorR);

  const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.3), trimMat);
  doorFrameL.position.set(-2.8, 2, 5.1); barn.add(doorFrameL);
  const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.3), trimMat);
  doorFrameR.position.set(2.8, 2, 5.1); barn.add(doorFrameR);
  const doorFrameT = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.2, 0.3), trimMat);
  doorFrameT.position.set(0, 4.2, 5.1); barn.add(doorFrameT);

  const window = new THREE.Mesh(new THREE.CircleGeometry(0.8, 4), trimMat);
  window.rotation.z = Math.PI / 4; window.position.set(0, 7.2, 5.2); barn.add(window);
  const windowCenter = new THREE.Mesh(new THREE.CircleGeometry(0.6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  windowCenter.rotation.z = Math.PI / 4; windowCenter.position.set(0, 7.2, 5.21); barn.add(windowCenter);

  barn.position.set(x, 0, z);
  barn.rotation.y = -Math.PI / 4;
  scene.add(barn);
  state.colliders.push({ x, z, radius: 6.5 });
}

function createFarmHouse(x, z, scene) {
  const house = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), wallMat);
  body.position.y = 2; body.castShadow = true; body.receiveShadow = true; house.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3, 4), roofMat);
  roof.position.y = 5.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true; house.add(roof);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
  chimney.position.set(1.5, 6.5, -1.5); chimney.castShadow = true; house.add(chimney);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), doorMat);
  door.position.set(0, 1.1, 3.05); house.add(door);

  const winMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), winMat);
  win1.position.set(-1.8, 2.2, 3.05); house.add(win1);
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), winMat);
  win2.position.set(1.8, 2.2, 3.05); house.add(win2);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  [['box', 1.1, 0.1, -1.8], ['box', 0.1, 1.1, -1.8], ['box', 1.1, 0.1, 1.8], ['box', 0.1, 1.1, 1.8]].forEach(([_, w, h, px], i) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
    f.position.set(px, 2.2, 3.06); house.add(f);
  });

  house.position.set(x, 0, z);
  scene.add(house);
  state.colliders.push({ x, z, radius: 4.5 });
}

function createWindmill(x, z, scene) {
  const mill = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 8, 8), bodyMat);
  tower.position.y = 4; tower.castShadow = true; tower.receiveShadow = true; mill.add(tower);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.5, 8), roofMat);
  roof.position.y = 9.25; roof.castShadow = true; mill.add(roof);

  const blades = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.8 });
  const axisMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });

  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8), axisMat);
  axis.rotation.x = Math.PI / 2; axis.position.z = 0.5; blades.add(axis);

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 0.2), axisMat);
    frame.position.y = 2.5; blade.add(frame);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.5, 0.05), bladeMat);
    cloth.position.set(0.7, 2.5, 0); blade.add(cloth);
    blade.rotation.z = (Math.PI / 2) * i;
    blades.add(blade);
  }
  blades.position.set(0, 8, 2.5);
  mill.add(blades);

  mill.position.set(x, 0, z);
  mill.rotation.y = Math.PI;
  scene.add(mill);
  state.windmillBlades = blades;
  state.colliders.push({ x, z, radius: 3.5 });
}

function createBoulder(x, z, scene) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.9, flatShading: true });
  const rock = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const part = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + Math.random() * 0.8, 0), rockMat);
    part.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.5);
    part.rotation.set(Math.random(), Math.random(), Math.random());
    part.castShadow = true; part.receiveShadow = true;
    rock.add(part);
  }
  rock.position.set(x, 0.5, z);
  scene.add(rock);
  state.colliders.push({ x, z, radius: 2.5 });
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9c6644, roughness: 1 });
const leafMatTree = new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.8, flatShading: true });
const darkSoilMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });

function createTree(x, z, scene) {
  const tree = new THREE.Group();
  const soilPatch = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 8), darkSoilMat);
  soilPatch.position.y = 0.03; soilPatch.receiveShadow = true; soilPatch.castShadow = true; tree.add(soilPatch);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 / 8) * i;
    const clod = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), darkSoilMat);
    clod.position.set(Math.cos(a) * 1.1, 0.08, Math.sin(a) * 1.1);
    clod.castShadow = true; tree.add(clod);
  }
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3, 6), trunkMat);
  trunk.position.y = 1.5; trunk.castShadow = true; tree.add(trunk);
  const leafPositions = [
    { x: 0, y: 4, z: 0, s: 2.2 }, { x: 1.2, y: 3.5, z: 0.5, s: 1.6 },
    { x: -1, y: 3.8, z: -0.5, s: 1.8 }, { x: 0.5, y: 4.8, z: -0.8, s: 1.5 },
  ];
  leafPositions.forEach(p => {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(p.s, 1), leafMatTree);
    leaf.position.set(p.x, p.y, p.z);
    leaf.scale.y = 0.8;
    leaf.castShadow = true;
    tree.add(leaf);
  });
  tree.position.set(x, 0, z);
  scene.add(tree);
  state.colliders.push({ x, z, radius: 1.0 });
}

const bushMat = new THREE.MeshStandardMaterial({ color: 0x74c69d, roughness: 0.9, flatShading: true });

function createBush(x, z, scene) {
  const bush = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.4, 1), bushMat);
    leaf.position.set((Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 1.2);
    leaf.castShadow = true;
    bush.add(leaf);
  }
  bush.position.set(x, 0, z);
  scene.add(bush);
}

export function initWorld(scene) {
  createSky(scene);
  createLights(scene);
  createClouds(scene);
  createGround(scene);
  createFence(scene);
  createPond(scene);
  createBarn(20, -15, scene);
  createFarmHouse(0, -15, scene);
  createWindmill(-20, 20, scene);
  createBoulder(15, -25, scene);
  createBoulder(-25, -15, scene);
  createBoulder(25, 15, scene);
  createBoulder(-15, 35, scene);
  createBoulder(30, -5, scene);

  // Деревья/кусты — не задевая пруд, дом, амбар, мельницу, грядки
  for (let i = 0; i < 24; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    let tooClose = false;
    if (Math.hypot(x - CONFIG.world.pond.x, z - CONFIG.world.pond.z) < CONFIG.world.pond.radius + 4) tooClose = true;
    if (Math.hypot(x - 20, z + 15) < 12) tooClose = true;
    if (Math.hypot(x, z + 15) < 10) tooClose = true;
    if (Math.hypot(x + 20, z - 20) < 10) tooClose = true;
    if (Math.abs(x) < 6 && z > -12 && z < 0) tooClose = true;
    if (!tooClose) {
      if (Math.random() > 0.3) createTree(x, z, scene);
      else createBush(x, z, scene);
    }
  }

  setDayTime(0.25);
}

export function updateWorld(dt, elapsed) {
  if (state.windmillBlades) state.windmillBlades.rotation.z += dt * 1.5;

  state.clouds.forEach((c, idx) => {
    c.position.x += Math.sin(elapsed * 0.1 + idx) * 0.02;
    c.position.z += Math.cos(elapsed * 0.15 + idx) * 0.02;
  });

  if (waterTex) {
    waterTex.offset.x = elapsed * 0.05;
    waterTex.offset.y = elapsed * 0.03;
  }
  if (waterMesh) {
    waterMesh.position.y = 0.02 + Math.sin(elapsed * 2) * 0.01;
  }
}

export function getGround() { return groundMesh; }