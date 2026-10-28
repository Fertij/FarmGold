// state.js — общее состояние игры + event bus
import * as THREE from 'three';

const _listeners = {};

export const state = {
  // Three.js-объекты (заполняются game.js / модулями)
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  sunLight: null,
  sunMesh: null,
  sunSprite: null,
  ambientLight: null,
  skyCanvas: null,
  skyTexture: null,
  skyContext: null,
  windmillBlades: null,

  // Состояние
  gameState: 'menu', // 'menu' | 'cutscene' | 'playing' | 'paused'
  currentSlot: null,

  // Ресурсы
  resources: {
    coins: 0,
    seeds: { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0 },
    harvest: { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0 },
    eggs: 0,
  },

  upgrades: {
    plots: 3,
    chickenCount: 0,
  },

  unlockedCrops: ['corn'],
  selectedSeed: 'corn',
  selectedTool: 'seed', // 'seed' | 'water'

  waterCan: {
    amount: 15,
    refilling: false,
    refillTimer: 0,
  },

  stats: {
    totalEarned: 0,
    totalSpent: 0,
    totalHarvested: 0,
    totalPlanted: 0,
    totalEggsCollected: 0,
  },
  achievementsUnlocked: [],

  // Рантайм
  plots: [],
  animals: [],
  eggs: [],
  colliders: [],
  particles: [],
  clouds: [],
  rainDrops: [],
  pondPos: { x: -15, z: -10, radius: 7 },

  player: {
    pos: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    group: null,
    limbs: {},
    speed: 5,
    radius: 0.5,
    bobOffset: 0,
  },

  cameraCtrl: {
    angle: Math.PI / 4,
    pitch: 0.7,
    dist: 15,
  },

  input: {
    joystick: { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 },
    cameraDrag: { active: false, id: null, lastX: 0, lastY: 0 },
    keys: {},
    mouse: { dragging: false, lastX: 0, lastY: 0, downX: 0, downY: 0 },
    isTouch: false,
  },

  // Время
  elapsed: 0,
  day: 1,
  dayTime: 0.25,

  // Погода
  weather: {
    raining: false,
    rainTimer: 0,
    nextCheck: 60,
  },

  // Аудио
  audioEnabled: true,
  audioCtx: null,

  // Взаимодействие
  nearestInteractable: null, // { kind: 'plot' | 'egg' | 'pond', ref }

  // Катсцена
  cutscene: {
    timer: 0,
    step: 0,
  },
};

export function emit(event, data) {
  const fns = _listeners[event];
  if (!fns) return;
  for (let i = 0; i < fns.length; i++) {
    try { fns[i](data); }
    catch (e) { console.error('[emit]', event, e); }
  }
}

export function on(event, fn) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(fn);
  return () => {
    const arr = _listeners[event];
    if (!arr) return;
    const idx = arr.indexOf(fn);
    if (idx >= 0) arr.splice(idx, 1);
  };
}

export function resetRuntimeState() {
  state.plots.length = 0;
  state.animals.length = 0;
  state.eggs.length = 0;
  state.colliders.length = 0;
  state.particles.length = 0;
  state.clouds.length = 0;
  state.rainDrops.length = 0;
  state.nearestInteractable = null;
  state.elapsed = 0;
  state.day = 1;
  state.dayTime = 0.25;
  state.weather.raining = false;
  state.weather.rainTimer = 0;
  state.weather.nextCheck = 60;
  state.cutscene.timer = 0;
  state.cutscene.step = 0;
  state.waterCan.amount = 15;
  state.waterCan.refilling = false;
  state.waterCan.refillTimer = 0;
}

export function resetGameState() {
  state.resources.coins = 0;
  state.resources.seeds = { corn: 5, strawberry: 0, watermelon: 0, pumpkin: 0 };
  state.resources.harvest = { corn: 0, strawberry: 0, watermelon: 0, pumpkin: 0 };
  state.resources.eggs = 0;
  state.upgrades.plots = 3;
  state.upgrades.chickenCount = 0;
  state.unlockedCrops = ['corn'];
  state.selectedSeed = 'corn';
  state.selectedTool = 'seed';
  state.stats = {
    totalEarned: 0, totalSpent: 0, totalHarvested: 0,
    totalPlanted: 0, totalEggsCollected: 0,
  };
  state.achievementsUnlocked = [];
  state.waterCan.amount = 15;
}

export function vec3(x, y, z) { return new THREE.Vector3(x, y, z); }