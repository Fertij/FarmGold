// farm.js — грядки: посадка, рост, полив, сбор, расширение, сохранение/загрузка
import * as THREE from 'three';
import { state, emit } from './state.js';
import { CONFIG } from './config.js';
import { createPlant } from './crops.js';
import { spawnDust, spawnCoins, spawnLeaves, spawnWaterDrops, spawnSparkles } from './particles.js';
import { playSound } from './audio.js';

let soilMat = null;
let darkSoilMat = null;

function ensureSoilMaterials() {
  if (soilMat) return;
  const soilCanvas = document.createElement('canvas');
  soilCanvas.width = 128; soilCanvas.height = 128;
  const ctx = soilCanvas.getContext('2d');
  ctx.fillStyle = '#a68a64';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#936639' : '#c2a878';
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 4 + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(soilCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  soilMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
  darkSoilMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
}

// Позиции для слотов грядок (9 точек — 3x3). Дополнительные открываются по одной.
function computeAllPlotPositions() {
  const { cols, rows, spacing, startOffsetZ } = CONFIG.world.plots;
  const positions = [];
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      positions.push({
        x: (x - (cols - 1) / 2) * spacing,
        z: (z - (rows - 1) / 2) * spacing + startOffsetZ,
      });
    }
  }
  return positions;
}

const ALL_PLOT_POSITIONS = computeAllPlotPositions();

function buildPlotDeco(scene, px, pz) {
  ensureSoilMaterials();
  const borderMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 2.4), darkSoilMat);
  borderMesh.position.set(px, 0.04, pz);
  borderMesh.receiveShadow = true;
  scene.add(borderMesh);

  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 1.1 + Math.random() * 0.2;
    const clod = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.1, 0), darkSoilMat);
    clod.position.set(px + Math.cos(a) * dist, 0.08, pz + Math.sin(a) * dist);
    clod.castShadow = true;
    scene.add(clod);
  }

  const plotMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), soilMat);
  plotMesh.position.set(px, 0.06, pz);
  plotMesh.receiveShadow = true;
  scene.add(plotMesh);
}

function createPlotObject(index) {
  const pos = ALL_PLOT_POSITIONS[index];
  const scene = state.scene;
  buildPlotDeco(scene, pos.x, pos.z);

  const plantGroups = {};
  for (const type of CONFIG.cropOrder) {
    const g = createPlant(type);
    g.position.set(pos.x, 0.1, pos.z);
    g.visible = false;
    scene.add(g);
    plantGroups[type] = g;
  }

  return {
    index,
    x: pos.x,
    z: pos.z,
    state: 'empty', // 'empty' | 'growing' | 'ready'
    type: null,
    timer: 0,
    maxTime: 0,
    watered: false,
    activePlant: null,
    plantGroups,
    offsetY: Math.random() * Math.PI * 2,
  };
}

export function initFarm() {
  ensureSoilMaterials();
  state.plots.length = 0;
  const total = ALL_PLOT_POSITIONS.length;
  for (let i = 0; i < total; i++) {
    const plot = createPlotObject(i);
    // Показываем только открытые (upgrades.plots)
    const visible = i < state.upgrades.plots;
    for (const type of CONFIG.cropOrder) {
      plot.plantGroups[type].visible = false;
    }
    plot.locked = !visible;
    state.plots.push(plot);
  }
}

export function getVisiblePlots() {
  return state.plots.filter(p => !p.locked);
}

export function expandFarm() {
  const current = state.upgrades.plots;
  if (current >= ALL_PLOT_POSITIONS.length) return false;
  const cost = CONFIG.economy.plotExpandCosts[current - 3] || 999;
  if (state.resources.coins < cost) return false;
  state.resources.coins -= cost;
  state.upgrades.plots = current + 1;
  state.plots[current].locked = false;
  emit(CONFIG.events.RESOURCE_CHANGE);
  return true;
}

export function getExpandCost() {
  const current = state.upgrades.plots;
  if (current >= ALL_PLOT_POSITIONS.length) return null;
  return CONFIG.economy.plotExpandCosts[current - 3] || 999;
}

// Взаимодействие с ближайшей грядкой
export function getPlotAtPlayer(playerPos, maxDist = 2.5) {
  let best = null;
  let bestDist = Infinity;
  for (const p of state.plots) {
    if (p.locked) continue;
    const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
    if (d < maxDist && d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function plantSeed(plot, seedType) {
  if (!plot || plot.state !== 'empty') return false;
  if (!state.unlockedCrops.includes(seedType)) return false;
  if (state.resources.seeds[seedType] <= 0) return false;

  const crop = CONFIG.crops[seedType];
  state.resources.seeds[seedType]--;
  plot.state = 'growing';
  plot.type = seedType;
  plot.timer = crop.growTime;
  plot.maxTime = crop.growTime;
  plot.watered = false;
  plot.activePlant = plot.plantGroups[seedType];

  // Скрываем остальные растения
  for (const type of CONFIG.cropOrder) {
    if (plot.plantGroups[type] !== plot.activePlant) {
      plot.plantGroups[type].visible = false;
    }
  }

  plot.activePlant.visible = true;
  plot.activePlant.scale.set(0.1, 0.1, 0.1);
  const fruit = plot.activePlant.getObjectByName('fruit');
  if (fruit) fruit.visible = false;

  state.stats.totalPlanted++;
  playSound('plant');
  spawnDust(plot.x, plot.z);
  emit(CONFIG.events.PLANT);
  return true;
}

export function waterPlot(plot) {
  if (!plot || plot.state !== 'growing') return false;
  if (plot.watered) return false;
  if (state.waterCan.amount <= 0) return false;
  state.waterCan.amount--;
  plot.watered = true;
  plot.timer = Math.max(0.1, plot.timer / CONFIG.economy.wateringBoost);
  playSound('water');
  spawnWaterDrops(plot.x, plot.z);
  emit(CONFIG.events.WATER);
  return true;
}

export function harvestPlot(plot) {
  if (!plot || plot.state !== 'ready') return 0;
  const type = plot.type;
  const crop = CONFIG.crops[type];
  const count = crop.yieldMin + Math.floor(Math.random() * (crop.yieldMax - crop.yieldMin + 1));

  state.resources.harvest[type] += count;
  state.stats.totalHarvested += count;

  playSound('harvest');
  spawnLeaves(plot.x, plot.z);
  spawnSparkles(plot.x, plot.z);

  // Сброс
  if (plot.activePlant) plot.activePlant.visible = false;
  plot.state = 'empty';
  plot.type = null;
  plot.timer = 0;
  plot.maxTime = 0;
  plot.watered = false;
  plot.activePlant = null;

  emit(CONFIG.events.HARVEST, { type, count });
  return count;
}

// Автополив во время дождя
export function autoWaterAll() {
  for (const p of state.plots) {
    if (p.locked) continue;
    if (p.state === 'growing' && !p.watered) {
      p.watered = true;
      p.timer = Math.max(0.1, p.timer / CONFIG.economy.wateringBoost);
    }
  }
}

export function tickFarm(dt, elapsed) {
  for (const p of state.plots) {
    if (p.locked) continue;
    if (p.state !== 'empty' && p.activePlant) {
      p.activePlant.rotation.z = Math.sin(elapsed * 2 + p.offsetY) * 0.04;
      p.activePlant.rotation.x = Math.cos(elapsed * 1.5 + p.offsetY) * 0.04;
    }
    if (p.state === 'growing') {
      p.timer -= dt;
      const progress = Math.min(1, 1 - (p.timer / p.maxTime));
      p.activePlant.scale.set(progress, progress, progress);
      if (progress > 0.7) {
        const fruit = p.activePlant.getObjectByName('fruit');
        if (fruit) fruit.visible = true;
      }
      if (p.timer <= 0) {
        p.state = 'ready';
        p.activePlant.scale.set(1, 1, 1);
      }
    }
  }
}

// Восстановление из сейва
export function restorePlots(plotsData) {
  // Сбрасываем всё
  for (const p of state.plots) {
    if (p.activePlant) p.activePlant.visible = false;
    for (const type of CONFIG.cropOrder) p.plantGroups[type].visible = false;
    p.state = 'empty';
    p.type = null;
    p.timer = 0;
    p.watered = false;
    p.activePlant = null;
    p.locked = p.index >= state.upgrades.plots;
  }
  for (let i = 0; i < plotsData.length && i < state.plots.length; i++) {
    const p = state.plots[i];
    const d = plotsData[i];
    if (!d) continue;
    if (d.state === 'empty' || !d.type) { p.state = 'empty'; continue; }

    const crop = CONFIG.crops[d.type];
    if (!crop) continue;

    p.state = d.state === 'ready' ? 'ready' : 'growing';
    p.type = d.type;
    p.maxTime = d.maxTime || crop.growTime;
    p.timer = typeof d.timer === 'number' ? d.timer : p.maxTime;
    p.watered = !!d.watered;
    p.activePlant = p.plantGroups[d.type];
    p.activePlant.visible = true;

    const progress = p.state === 'ready' ? 1 : Math.min(1, 1 - (p.timer / p.maxTime));
    p.activePlant.scale.set(progress, progress, progress);
    if (progress > 0.7) {
      const fruit = p.activePlant.getObjectByName('fruit');
      if (fruit) fruit.visible = true;
    }
  }
}

export function resetPlots() {
  for (const p of state.plots) {
    if (p.activePlant) p.activePlant.visible = false;
    for (const type of CONFIG.cropOrder) p.plantGroups[type].visible = false;
    p.state = 'empty';
    p.type = null;
    p.timer = 0;
    p.maxTime = 0;
    p.watered = false;
    p.activePlant = null;
    p.locked = p.index >= state.upgrades.plots;
  }
}