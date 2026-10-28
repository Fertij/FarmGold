// saves.js — сохранение/загрузка + миграция v1 -> v2
import { state, emit } from './state.js';
import { CONFIG } from './config.js';

const SAVES_KEY = 'littleFarmSaves_v2';
const SETTINGS_KEY = 'littleFarmSettings_v2';
const OLD_KEY = 'littleFarmSaves';

export function getSaves() {
  try {
    return JSON.parse(localStorage.getItem(SAVES_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function getSaveData(slot) {
  return getSaves()[`slot${slot}`] || null;
}

export function hasSave(slot) {
  return !!getSaveData(slot);
}

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      audioEnabled: state.audioEnabled,
    }));
  } catch (e) { /* ignored */ }
}

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s && typeof s.audioEnabled === 'boolean') {
      state.audioEnabled = s.audioEnabled;
    }
  } catch (e) { /* ignored */ }
}

export function saveGame() {
  if (state.currentSlot === null) return;

  const saves = getSaves();
  const plotsData = state.plots.map(p => ({
    state: p.state,
    type: p.type,
    timer: p.timer,
    maxTime: p.maxTime,
    watered: p.watered,
    scale: p.activePlant ? p.activePlant.scale.x : 1,
  }));
  const animalsData = state.animals.map(a => ({
    pos: { x: a.group.position.x, z: a.group.position.z },
    eggTimer: a.eggTimer,
    targetX: a.targetX,
    targetZ: a.targetZ,
    state: a.state,
    waitTimer: a.waitTimer,
  }));
  const eggsData = state.eggs.map(e => ({
    x: e.mesh.position.x,
    z: e.mesh.position.z,
  }));

  saves[`slot${state.currentSlot}`] = {
    version: 2,
    coins: state.resources.coins,
    seeds: { ...state.resources.seeds },
    harvest: { ...state.resources.harvest },
    eggs: state.resources.eggs,
    upgrades: { ...state.upgrades },
    unlockedCrops: [...state.unlockedCrops],
    selectedSeed: state.selectedSeed,
    selectedTool: state.selectedTool,
    stats: { ...state.stats },
    achievementsUnlocked: [...state.achievementsUnlocked],
    waterCan: { amount: state.waterCan.amount },
    day: state.day,
    dayTime: state.dayTime,
    plots: plotsData,
    animals: animalsData,
    eggsOnGround: eggsData,
    date: new Date().toLocaleString(),
  };

  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch (e) {
    console.error('Не удалось сохранить', e);
  }
}

export function deleteSave(slot) {
  const saves = getSaves();
  delete saves[`slot${slot}`];
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch (e) { /* ignored */ }
}

// Миграция старого формата (v1) → v2. Вызывается на старте из game.js.
export function migrateOldSaves() {
  let old = null;
  try { old = JSON.parse(localStorage.getItem(OLD_KEY)); }
  catch (e) { old = null; }
  if (!old) return;

  const migrated = getSaves();
  for (let i = 1; i <= 3; i++) {
    const d = old[`slot${i}`];
    if (!d) continue;
    if (migrated[`slot${i}`]) continue; // уже есть v2 — не перезаписываем

    const seedMap = d.seeds || {};
    const cornSeeds = seedMap.corn || 0;
    const strawberrySeeds = seedMap.strawberry || 0;
    const watermelonSeeds = seedMap.watermelon || 0;
    const pumpkinSeeds = seedMap.pumpkin || 0;

    const unlocked = ['corn'];
    if (strawberrySeeds > 0) unlocked.push('strawberry');
    if (watermelonSeeds > 0) unlocked.push('watermelon');
    if (pumpkinSeeds > 0) unlocked.push('pumpkin');

    const plots = (d.plots || []).map(p => ({
      state: p.state === 'growing' ? 'growing' : (p.state === 'ready' ? 'ready' : 'empty'),
      type: p.type || null,
      timer: p.timer || 0,
      maxTime: p.type && CONFIG.crops[p.type] ? CONFIG.crops[p.type].growTime : 5,
      watered: false,
      scale: p.state === 'ready' ? 1 : 0.1,
    }));

    migrated[`slot${i}`] = {
      version: 2,
      coins: d.coins || 0,
      seeds: {
        corn: cornSeeds, strawberry: strawberrySeeds,
        watermelon: watermelonSeeds, pumpkin: pumpkinSeeds,
      },
      harvest: { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0 },
      eggs: 0,
      upgrades: { plots: 3, chickenCount: 0 },
      unlockedCrops: unlocked,
      selectedSeed: d.selectedSeed || 'corn',
      selectedTool: 'seed',
      stats: {
        totalEarned: 0, totalSpent: 0, totalHarvested: 0,
        totalPlanted: 0, totalEggsCollected: 0,
      },
      achievementsUnlocked: [],
      waterCan: { amount: CONFIG.economy.waterCanCapacity },
      day: 1,
      dayTime: 0.25,
      plots,
      animals: [],
      eggsOnGround: [],
      date: d.date || new Date().toLocaleString(),
    };
  }

  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(migrated));
  } catch (e) { /* ignored */ }
}

export function applySaveToState(slot, worldAPI, playerAPI, farmAPI, animalsAPI) {
  const data = getSaveData(slot);
  if (!data) return false;

  state.currentSlot = slot;
  state.resources.coins = data.coins || 0;
  state.resources.seeds = { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0, ...(data.seeds || {}) };
  state.resources.harvest = { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0, ...(data.harvest || {}) };
  state.resources.eggs = data.eggs || 0;
  state.upgrades = { plots: 3, chickenCount: 0, ...(data.upgrades || {}) };
  state.unlockedCrops = Array.isArray(data.unlockedCrops) && data.unlockedCrops.length
    ? data.unlockedCrops : ['corn'];
  state.selectedSeed = data.selectedSeed || 'corn';
  state.selectedTool = data.selectedTool || 'seed';
  state.stats = {
    totalEarned: 0, totalSpent: 0, totalHarvested: 0,
    totalPlanted: 0, totalEggsCollected: 0, ...(data.stats || {}),
  };
  state.achievementsUnlocked = Array.isArray(data.achievementsUnlocked) ? data.achievementsUnlocked : [];
  state.waterCan.amount = data.waterCan && typeof data.waterCan.amount === 'number'
    ? data.waterCan.amount
    : CONFIG.economy.waterCanCapacity;
  state.day = data.day || 1;
  state.dayTime = typeof data.dayTime === 'number' ? data.dayTime : 0.25;

  // Применение грядок
  if (farmAPI && Array.isArray(data.plots)) {
    farmAPI.restorePlots(data.plots);
  }
  // Применение животных
  if (animalsAPI) {
    animalsAPI.restoreAnimals(data.animals || [], data.eggsOnGround || []);
    animalsAPI.setChickenCount(state.upgrades.chickenCount);
  }

  emit(CONFIG.events.UI_REFRESH);
  return true;
}

export function applyNewGameToState(slot, worldAPI, playerAPI, farmAPI, animalsAPI) {
  state.currentSlot = slot;
  state.resources.coins = CONFIG.economy.startingCoins;
  state.resources.seeds = { ...CONFIG.economy.startingSeeds };
  state.resources.harvest = { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0 };
  state.resources.eggs = 0;
  state.upgrades = { plots: 3, chickenCount: 0 };
  state.unlockedCrops = ['corn'];
  state.selectedSeed = 'corn';
  state.selectedTool = 'seed';
  state.stats = {
    totalEarned: 0, totalSpent: 0, totalHarvested: 0,
    totalPlanted: 0, totalEggsCollected: 0,
  };
  state.achievementsUnlocked = [];
  state.waterCan.amount = CONFIG.economy.waterCanCapacity;
  state.day = 1;
  state.dayTime = 0.25;

  if (farmAPI) farmAPI.resetPlots();
  if (animalsAPI) {
    animalsAPI.clearAnimals();
    animalsAPI.setChickenCount(0);
  }
  emit(CONFIG.events.UI_REFRESH);
}