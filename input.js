// input.js — touch/мышь/клавиатура + плавная камера
import * as THREE from 'three';
import { state } from './state.js';
import { CONFIG } from './config.js';
import { initAudio, playSound } from './audio.js';

const joyEl = document.getElementById('joystick');
const stickEl = document.getElementById('jstick');
const actionBtn = document.getElementById('actionBtn');

const touchCache = {};

function setupTouch(canvas) {
  state.input.isTouch = true;
  document.body.classList.remove('desktop');

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    for (const t of e.changedTouches) {
      touchCache[t.identifier] = { x: t.clientX, y: t.clientY };
      const j = state.input.joystick;
      const c = state.input.cameraDrag;
      if (t.clientX < window.innerWidth / 2 && !j.active && Object.keys(touchCache).length === 1) {
        j.active = true; j.id = t.identifier;
        j.startX = t.clientX; j.startY = t.clientY;
        joyEl.style.display = 'block';
        joyEl.style.left = (t.clientX - 65) + 'px';
        joyEl.style.top = (t.clientY - 65) + 'px';
        stickEl.style.left = '35px';
        stickEl.style.top = '35px';
      } else if (t.clientX >= window.innerWidth / 2 && !c.active && Object.keys(touchCache).length === 1) {
        c.active = true; c.id = t.identifier;
        c.lastX = t.clientX; c.lastY = t.clientY;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touches = Array.from(e.touches);
    // Пинч-зум
    if (touches.length === 2) {
      const p1 = touchCache[touches[0].identifier];
      const p2 = touchCache[touches[1].identifier];
      if (p1 && p2) {
        const cur = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
        const prev = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const cc = state.cameraCtrl;
        if (cur > prev) cc.dist = Math.max(CONFIG.camera.minDist, cc.dist - 0.2);
        else cc.dist = Math.min(CONFIG.camera.maxDist, cc.dist + 0.2);
      }
    }
    for (const t of e.changedTouches) {
      touchCache[t.identifier] = { x: t.clientX, y: t.clientY };
      const j = state.input.joystick;
      const c = state.input.cameraDrag;
      if (j.active && t.identifier === j.id) {
        let dx = t.clientX - j.startX;
        let dy = t.clientY - j.startY;
        const d = Math.hypot(dx, dy), max = 55;
        if (d > max) { dx = dx / d * max; dy = dy / d * max; }
        j.dx = dx / max; j.dy = dy / max;
        stickEl.style.left = (35 + dx) + 'px';
        stickEl.style.top = (35 + dy) + 'px';
      } else if (c.active && t.identifier === c.id) {
        const cc = state.cameraCtrl;
        cc.angle -= (t.clientX - c.lastX) * CONFIG.camera.touchSensitivity;
        cc.pitch = Math.max(CONFIG.camera.minPitch, Math.min(CONFIG.camera.maxPitch,
          cc.pitch + (t.clientY - c.lastY) * CONFIG.camera.touchSensitivity));
        c.lastX = t.clientX; c.lastY = t.clientY;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      delete touchCache[t.identifier];
      const j = state.input.joystick;
      const c = state.input.cameraDrag;
      if (j.active && t.identifier === j.id) {
        j.active = false; j.dx = 0; j.dy = 0;
        joyEl.style.display = 'none';
      } else if (c.active && t.identifier === c.id) {
        c.active = false;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    for (const t of e.changedTouches) {
      delete touchCache[t.identifier];
    }
    state.input.joystick.active = false;
    state.input.joystick.dx = 0;
    state.input.joystick.dy = 0;
    joyEl.style.display = 'none';
    state.input.cameraDrag.active = false;
  });
}

function setupMouse(canvas) {
  state.input.isTouch = false;
  document.body.classList.add('desktop');

  let dragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    initAudio();
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const cc = state.cameraCtrl;
    cc.angle -= (e.clientX - lastX) * CONFIG.camera.mouseSensitivity;
    cc.pitch = Math.max(CONFIG.camera.minPitch, Math.min(CONFIG.camera.maxPitch,
      cc.pitch + (e.clientY - lastY) * CONFIG.camera.mouseSensitivity));
    lastX = e.clientX; lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cc = state.cameraCtrl;
    const delta = Math.sign(e.deltaY);
    cc.dist = Math.max(CONFIG.camera.minDist, Math.min(CONFIG.camera.maxDist,
      cc.dist + delta * 1.5));
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    state.input.keys[e.code] = true;

    // 1-4 — выбор семян по доступным
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') {
      const idx = parseInt(e.code.slice(-1), 10) - 1;
      const type = CONFIG.cropOrder[idx];
      if (type && state.unlockedCrops.includes(type)) {
        state.selectedSeed = type;
        state.selectedTool = 'seed';
        import('./ui.js').then(m => m.refreshSeedButton());
        playSound('click');
      }
    }

    // T — сменить инструмент
    if (e.code === 'KeyT') {
      state.selectedTool = state.selectedTool === 'seed' ? 'water' : 'seed';
      import('./ui.js').then(m => m.refreshToolButtons());
      playSound('click');
    }

    // E — действие
    if (e.code === 'KeyE' && state.gameState === 'playing') {
      if (actionBtn && actionBtn.style.display !== 'none') actionBtn.click();
    }

    // Escape — меню/пауза
    if (e.code === 'Escape' && state.gameState === 'playing') {
      const menuBtn = document.getElementById('menuBtn');
      if (menuBtn) menuBtn.click();
    }

    // Q/E для зума
    if (e.code === 'KeyQ') {
      state.cameraCtrl.dist = Math.min(CONFIG.camera.maxDist, state.cameraCtrl.dist + 1);
    }
    if (e.code === 'KeyR') {
      state.cameraCtrl.dist = Math.max(CONFIG.camera.minDist, state.cameraCtrl.dist - 1);
    }
  });

  window.addEventListener('keyup', (e) => {
    state.input.keys[e.code] = false;
  });
}

export function initInput(canvas) {
  // Определяем тач-устройство
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouchDevice) setupTouch(canvas);
  else setupMouse(canvas);
  setupKeyboard();
}

// Плавная камера — вызывается каждый кадр в animate()
export function updateCamera(dt) {
  if (!state.player.group) return;
  const p = state.player;
  const cc = state.cameraCtrl;
  const camX = p.pos.x + cc.dist * Math.sin(cc.angle) * Math.cos(cc.pitch);
  const camY = p.group.position.y + cc.dist * Math.sin(cc.pitch);
  const camZ = p.pos.z + cc.dist * Math.cos(cc.angle) * Math.cos(cc.pitch);

  const targetPos = new THREE.Vector3(camX, camY, camZ);
  const targetLook = new THREE.Vector3(p.pos.x, p.group.position.y + 1, p.pos.z);
  const lerp = 1.0 - Math.pow(0.0001, dt);
  state.camera.position.lerp(targetPos, lerp);

  const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion).add(state.camera.position);
  currentLook.lerp(targetLook, lerp);
  state.camera.lookAt(currentLook);
}