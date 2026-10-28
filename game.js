// game.js — bootstrap, главный цикл, катсцена, достижения
import * as THREE from 'three';
import { state, emit, on, resetRuntimeState, resetGameState } from './state.js';
import { CONFIG } from './config.js';
import { initAudio, playSound } from './audio.js';
import { initParticles, updateParticles } from './particles.js';
import {
  loadSettings, migrateOldSaves, saveGame,
  applySaveToState, applyNewGameToState, getSaveData,
} from './saves.js';
import { initWorld, updateWorld } from './world.js';
import { initPlayer, tickPlayer, resetPlayerPosition } from './player.js';
import {
  initFarm, tickFarm, getPlotAtPlayer,
  plantSeed, waterPlot, harvestPlot, resetPlots,
} from './farm.js';
import {
  setChickenCount, tickAnimals, getNearestEgg, collectEgg, clearAnimals,
} from './animals.js';
import { initWeather, tickWeather } from './weather.js';
import { initInput, updateCamera } from './input.js';
import * as UI from './ui.js';

function setupThree() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(15, 15, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  state.scene = scene;
  state.camera = camera;
  state.renderer = renderer;
  state.clock = new THREE.Clock();

  return renderer.domElement;
}

function resizeGame() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  if (state.camera && state.renderer) {
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h, false);
    state.renderer.domElement.style.width = w + 'px';
    state.renderer.domElement.style.height = h + 'px';
  }
}

export function startCutscene() {
  state.gameState = 'cutscene';
  state.cutscene.timer = 0;
  state.cutscene.step = 0;

  // --- ИСПРАВЛЕНИЕ: Скрываем главное меню перед началом катсцены ---
  const mainMenu = document.getElementById('mainMenu');
  if (mainMenu) {
    mainMenu.style.display = 'none';
    mainMenu.style.opacity = '0';
  }
  // -------------------------------------------------------------

  const ov = document.getElementById('cutsceneOverlay');
  ov.style.display = 'block';
  document.getElementById('fadeOverlay').style.opacity = '1';
  setTimeout(() => {
    ov.classList.add('active');
    document.getElementById('fadeOverlay').style.opacity = '0';
  }, 50);

  ['cutsceneText1', 'cutsceneText2', 'cutsceneText3'].forEach(id => {
    document.getElementById(id).classList.remove('show');
  });
}

export function skipCutscene() {
  document.getElementById('fadeOverlay').style.opacity = '1';
  setTimeout(() => {
    document.getElementById('cutsceneOverlay').classList.remove('active');
    document.getElementById('cutsceneOverlay').style.display = 'none';
    document.getElementById('fadeOverlay').style.opacity = '0';
    state.gameState = 'playing';
    UI.showGameUI();
  }, 900);
}

function updateCutscene(dt) {
  const c = state.cutscene;
  c.timer += dt;

  if (c.timer > 0.5 && c.step === 0) { document.getElementById('cutsceneText1').classList.add('show'); c.step = 1; }
  if (c.timer > 3.5 && c.step === 1) { document.getElementById('cutsceneText1').classList.remove('show'); c.step = 2; }
  if (c.timer > 5.0 && c.step === 2) { document.getElementById('cutsceneText2').classList.add('show'); c.step = 3; }
  if (c.timer > 8.0 && c.step === 3) { document.getElementById('cutsceneText2').classList.remove('show'); c.step = 4; }
  if (c.timer > 9.5 && c.step === 4) { document.getElementById('cutsceneText3').classList.add('show'); c.step = 5; }
  if (c.timer > 12.0 && c.step === 5) { document.getElementById('cutsceneText3').classList.remove('show'); c.step = 6; }

  const p = state.pondPos;
  const cam = state.camera;

  if (c.timer < 4.0) {
    const t = c.timer / 4.0;
    const e = t * t * (3 - 2 * t);
    cam.position.set(p.x + 10 - e * 15, 25 - e * 10, p.z + 15 - e * 5);
    cam.lookAt(p.x, 0, p.z);
  } else if (c.timer < 9.0) {
    const t = (c.timer - 4.0) / 5.0;
    const e = t * t * (3 - 2 * t);
    const angle = Math.PI + e * Math.PI * 0.8;
    const radius = 25 - e * 10;
    cam.position.set(Math.sin(angle) * radius, 30 - e * 15, Math.cos(angle) * radius + 10);
    cam.lookAt(0, 1, -5);
  } else {
    const t = Math.min(1, (c.timer - 9.0) / 3.0);
    const e = t * t * (3 - 2 * t);
    const targetX = 15 * Math.sin(Math.PI / 4) * Math.cos(0.7);
    const targetY = 15 * Math.sin(0.7);
    const targetZ = 15 * Math.cos(Math.PI / 4) * Math.cos(0.7);
    cam.position.set(
      cam.position.x + (targetX - cam.position.x) * e,
      cam.position.y + (targetY - cam.position.y) * e,
      cam.position.z + (targetZ - cam.position.z) * e
    );
    cam.lookAt(0, 1, 0);
  }

  if (c.timer > 12.5) {
    skipCutscene();
  }
}

export function doAction() {
  if (state.gameState !== 'playing') return;
  const p = state.player.pos;

  const egg = getNearestEgg(p, 1.5);
  if (egg) {
    collectEgg(egg);
    UI.refreshHUD();
    return;
  }

  const plot = getPlotAtPlayer(p, 2.5);
  if (plot) {
    if (state.selectedTool === 'water') {
      if (plot.state === 'growing' && !plot.watered) {
        if (waterPlot(plot)) {
          UI.refreshHUD();
          UI.refreshMarket();
        } else {
          playSound('error');
          UI.showCustomAlert('Внимание', 'Лейка пуста! Пополните её у пруда.');
        }
      } else if (plot.watered) {
        playSound('error');
      } else {
        playSound('error');
      }
      return;
    }

    if (plot.state === 'empty') {
      const type = state.selectedSeed;
      if (!state.unlockedCrops.includes(type)) {
        UI.showCustomAlert('Внимание', 'Семена этой культуры не открыты. Откройте их в магазине!');
        playSound('error');
        return;
      }
      if (state.resources.seeds[type] <= 0) {
        UI.showCustomAlert('Внимание', 'У вас нет этих семян! Купите их в магазине.');
        playSound('error');
        return;
      }
      if (plantSeed(plot, type)) {
        UI.refreshHUD();
        UI.refreshInventory();
      }
    } else if (plot.state === 'ready') {
      harvestPlot(plot);
      UI.refreshHUD();
      UI.refreshInventory();
      UI.refreshMarket();
    }
    return;
  }

  const pd = state.pondPos;
  const distPond = Math.hypot(p.x - pd.x, p.z - pd.z);
  if (distPond < pd.radius + 2 && state.waterCan.amount < CONFIG.economy.waterCanCapacity) {
    state.waterCan.amount = CONFIG.economy.waterCanCapacity;
    playSound('water');
    UI.refreshHUD();
    return;
  }
}

function updateActionButton() {
  const btn = document.getElementById('actionBtn');
  if (state.gameState !== 'playing') { btn.style.display = 'none'; return; }
  const p = state.player.pos;

  const egg = getNearestEgg(p, 1.5);
  if (egg) {
    btn.style.display = 'flex';
    btn.classList.add('active');
    btn.textContent = 'ВЗЯТЬ 🥚';
    return;
  }

  const plot = getPlotAtPlayer(p, 2.5);
  if (plot) {
    btn.style.display = 'flex';
    if (state.selectedTool === 'water') {
      if (plot.state === 'growing' && !plot.watered && state.waterCan.amount > 0) {
        btn.classList.add('active');
        btn.textContent = 'ПОЛИТЬ 💧';
      } else {
        btn.classList.remove('active');
        btn.style.display = 'none';
      }
    } else {
      if (plot.state === 'empty') {
        btn.classList.add('active');
        btn.textContent = 'ПОСАДИТЬ';
      } else if (plot.state === 'ready') {
        btn.classList.add('active');
        btn.textContent = 'СОБРАТЬ';
      } else {
        btn.classList.remove('active');
        btn.style.display = 'none';
      }
    }
    return;
  }

  const pd = state.pondPos;
  const distPond = Math.hypot(p.x - pd.x, p.z - pd.z);
  if (distPond < pd.radius + 2 && state.waterCan.amount < CONFIG.economy.waterCanCapacity) {
    btn.style.display = 'flex';
    btn.classList.add('active');
    btn.textContent = 'НАБРАТЬ 💧';
    return;
  }

  btn.classList.remove('active');
  btn.style.display = 'none';
}

function tickWaterRefill(dt) {
  const p = state.player.pos;
  const pd = state.pondPos;
  const distPond = Math.hypot(p.x - pd.x, p.z - pd.z);
  if (distPond < pd.radius + 1.5 && state.waterCan.amount < CONFIG.economy.waterCanCapacity) {
    if (!state.waterCan.refilling) {
      state.waterCan.refilling = true;
      state.waterCan.refillTimer = 0;
    }
    state.waterCan.refillTimer += dt;
    if (state.waterCan.refillTimer >= CONFIG.economy.waterCanRefillSeconds) {
      state.waterCan.amount = CONFIG.economy.waterCanCapacity;
      state.waterCan.refilling = false;
      state.waterCan.refillTimer = 0;
      UI.refreshHUD();
    }
  } else if (distPond >= pd.radius + 1.5) {
    state.waterCan.refilling = false;
    state.waterCan.refillTimer = 0;
  }
}

function checkAchievements() {
  for (const ach of CONFIG.achievements) {
    if (state.achievementsUnlocked.includes(ach.id)) continue;
    try {
      if (ach.check(state)) {
        state.achievementsUnlocked.push(ach.id);
        UI.showAchievementToast(ach.name, ach.desc);
        playSound('achievement');
      }
    } catch (e) { /* ignore */ }
  }
}

function enterGame(isNew, slot) {
  if (isNew) {
    applyNewGameToState(slot, null, null, null, null);
    resetPlots();
    setChickenCount(0);
    clearAnimals();
    resetPlayerPosition();
    saveGame();
    startCutscene();
  } else {
    applySaveToState(slot, null, null, null, null);
    UI.showGameUI();
    state.gameState = 'playing';
  }
  document.getElementById('saveModal').style.display = 'none';
  UI.refreshAll();
  UI.refreshToolButtons();
}

window.__loadGame = (slot) => enterGame(false, slot);
window.__startNewGame = (slot) => enterGame(true, slot);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(state.clock.getDelta(), 0.05);
  state.elapsed += dt;

  if (state.scene && state.gameState !== 'menu') {
    updateWorld(dt, state.elapsed);
  }

  if (state.gameState === 'cutscene') {
    updateCutscene(dt);
    state.renderer.render(state.scene, state.camera);
    return;
  }

  if (state.gameState === 'menu') {
    const cam = state.camera;
    cam.position.x = Math.sin(state.elapsed * 0.2) * 25;
    cam.position.z = Math.cos(state.elapsed * 0.2) * 25;
    cam.position.y = 15 + Math.sin(state.elapsed * 0.5) * 2;
    cam.lookAt(0, 0, -5);
    state.renderer.render(state.scene, state.camera);
    return;
  }

  tickPlayer(dt);
  tickFarm(dt, state.elapsed);
  tickAnimals(dt, state.elapsed);
  tickWeather(dt, state.elapsed);
  tickWaterRefill(dt);
  updateParticles(dt);
  updateCamera(dt);
  updateActionButton();

  if (Math.floor(state.elapsed * 2) % 2 === 0) {
    checkAchievements();
  }

  state.renderer.render(state.scene, state.camera);
}

function bootstrap() {
  loadSettings();
  migrateOldSaves();

  const canvas = setupThree();
  initParticles();
  initWorld(state.scene);
  initPlayer(state.scene);
  initFarm();
  initWeather(state.scene);
  initInput(canvas);
  UI.initUI();

  window.addEventListener('resize', resizeGame);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeGame, 100);
    setTimeout(resizeGame, 300);
    setTimeout(resizeGame, 800);
  });
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeGame);
  }

  resizeGame();
  UI.refreshAll();
  document.getElementById('mainMenu').style.opacity = '1';

  animate();
}

bootstrap();