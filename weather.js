// weather.js — день/ночь + дождь (визуал + автополив)
import * as THREE from 'three';
import { state, emit } from './state.js';
import { CONFIG } from './config.js';
import { setDayTime } from './world.js';
import { autoWaterAll } from './farm.js';

let rainGroup = null;

function createRainSystem(scene) {
  const dropGeo = new THREE.BoxGeometry(0.02, 0.4, 0.02);
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xaad4ff, transparent: true, opacity: 0.6,
  });
  rainGroup = new THREE.Group();
  for (let i = 0; i < CONFIG.weather.raindropCount; i++) {
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(
      (Math.random() - 0.5) * 80,
      Math.random() * 30 + 10,
      (Math.random() - 0.5) * 80
    );
    drop.userData.vy = 18 + Math.random() * 12;
    rainGroup.add(drop);
  }
  rainGroup.visible = false;
  scene.add(rainGroup);
}

function startRain() {
  state.weather.raining = true;
  state.weather.rainTimer = CONFIG.weather.rainDurationMin +
    Math.random() * (CONFIG.weather.rainDurationMax - CONFIG.weather.rainDurationMin);
  if (rainGroup) rainGroup.visible = true;

  // Автополив всех грядок
  autoWaterAll();

  // Затемнить небо/свет через понижение dayTime? Нет — просто приглушить ambient
  emit(CONFIG.events.WEATHER_CHANGE, { raining: true });
}

function stopRain() {
  state.weather.raining = false;
  if (rainGroup) rainGroup.visible = false;
  emit(CONFIG.events.WEATHER_CHANGE, { raining: false });
}

export function initWeather(scene) {
  createRainSystem(scene);
  state.weather.raining = false;
  state.weather.rainTimer = 0;
  state.weather.nextCheck = 60 + Math.random() * 60;
  if (rainGroup) rainGroup.visible = false;
}

export function tickWeather(dt, elapsed) {
  // Время суток
  const prevDayTime = state.dayTime;
  state.dayTime += dt / CONFIG.day.durationSeconds;
  if (state.dayTime >= 1) {
    state.dayTime -= 1;
    state.day++;
    emit(CONFIG.events.DAY_CHANGE, { day: state.day });
  }
  setDayTime(state.dayTime);

  // Проверка на дождь
  if (!state.weather.raining) {
    state.weather.nextCheck -= dt;
    if (state.weather.nextCheck <= 0) {
      state.weather.nextCheck = CONFIG.weather.rainCheckIntervalMin +
        Math.random() * (CONFIG.weather.rainCheckIntervalMax - CONFIG.weather.rainCheckIntervalMin);
      if (Math.random() < CONFIG.weather.rainChance) startRain();
    }
  } else {
    state.weather.rainTimer -= dt;
    // Анимация капель
    if (rainGroup) {
      for (const drop of rainGroup.children) {
        drop.position.y -= drop.userData.vy * dt;
        if (drop.position.y < 0) {
          drop.position.y = 30 + Math.random() * 10;
          drop.position.x = (Math.random() - 0.5) * 80;
          drop.position.z = (Math.random() - 0.5) * 80;
        }
      }
    }
    if (state.weather.rainTimer <= 0) stopRain();
  }
}

export function isRaining() {
  return state.weather.raining;
}