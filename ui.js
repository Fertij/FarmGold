// ui.js — весь DOM-интерфейс
import { state, emit, on } from './state.js';
import { CONFIG } from './config.js';
import { getSaves, deleteSave, saveSettings, saveGame, applySaveToState, applyNewGameToState, getSaveData } from './saves.js';
import { initAudio, playSound } from './audio.js';
import { plantSeed, waterPlot, harvestPlot, expandFarm, getExpandCost } from './farm.js';
import { buyChicken, collectEgg } from './animals.js';

const $ = id => document.getElementById(id);

let confirmCallback = null;

export function showCustomAlert(title, message) {
  $('customModalTitle').textContent = title;
  $('customModalText').textContent = message;
  $('customModalBtns').innerHTML = `<button class="custom-btn btn-ok" id="customAlertOk">ОК</button>`;
  $('customModalOverlay').style.display = 'flex';
  $('customAlertOk').onclick = closeCustomModal;
}

export function showCustomConfirm(title, message, onYes) {
  $('customModalTitle').textContent = title;
  $('customModalText').textContent = message;
  $('customModalBtns').innerHTML =
    `<button class="custom-btn btn-cancel" id="customConfirmNo">Отмена</button>` +
    `<button class="custom-btn btn-ok" id="customConfirmYes">Да</button>`;
  $('customModalOverlay').style.display = 'flex';
  confirmCallback = onYes || null;
  $('customConfirmNo').onclick = () => { confirmCallback = null; closeCustomModal(); };
  $('customConfirmYes').onclick = () => {
    const cb = confirmCallback;
    confirmCallback = null;
    closeCustomModal();
    if (cb) cb();
  };
}

export function closeCustomModal() {
  $('customModalOverlay').style.display = 'none';
  confirmCallback = null;
}

export function refreshHUD() {
  $('coins').textContent = state.resources.coins;
  $('eggsHud').textContent = state.resources.eggs;

  const dayIcon = $('dayIcon');
  const dayNumber = $('dayNumber');
  const t = state.dayTime;
  let icon = '☀️';
  if (t < 0.2 || t > 0.85) icon = '🌙';
  else if (t < 0.32) icon = '🌅';
  else if (t > 0.68) icon = '🌇';
  else icon = '☀️';
  dayIcon.textContent = icon;
  dayNumber.textContent = `День ${state.day}`;

  $('waterCount').textContent = state.waterCan.amount;

  const toolBtn = $('toolBtn');
  if (toolBtn) {
    if (state.selectedTool === 'water') toolBtn.classList.add('active');
    else toolBtn.classList.remove('active');
  }
  refreshSeedButton();
}

export function refreshSeedButton() {
  const btn = $('seedBtn');
  if (!btn) return;
  const crop = CONFIG.crops[state.selectedSeed];
  if (crop) btn.textContent = crop.icon;
}

export function refreshToolButtons() {
  const toolBtn = $('toolBtn');
  const seedBtn = $('seedBtn');
  if (!toolBtn || !seedBtn) return;
  if (state.gameState !== 'playing') return;
  seedBtn.style.display = 'flex';
  seedBtn.style.opacity = '1';
  toolBtn.style.display = 'flex';
  toolBtn.style.opacity = '1';
  if (state.selectedTool === 'water') toolBtn.classList.add('active');
  else toolBtn.classList.remove('active');
  $('waterCount').textContent = state.waterCan.amount;
}

export function refreshShop() {
  const cont = $('shopItems');
  if (!cont) return;
  cont.innerHTML = '';
  for (const type of CONFIG.cropOrder) {
    const crop = CONFIG.crops[type];
    const unlocked = state.unlockedCrops.includes(type);
    const item = document.createElement('div');
    item.className = 'shop-item' + (unlocked ? '' : ' locked');

    if (unlocked) {
      item.innerHTML = `
        <div class="item-top">
          <div class="item-icon">${crop.icon}</div>
          <div class="item-name">${crop.name}<br>семена</div>
        </div>
        <div class="item-bottom">
          <div class="item-price">
            <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd700" stroke="#d4a373" stroke-width="2"/><circle cx="12" cy="12" r="7" fill="#ffea00"/></svg>
            ${crop.seedPrice}
          </div>
          <button class="buy-btn" data-buy="${type}">Купить</button>
        </div>`;
      const btn = item.querySelector('button');
      btn.disabled = state.resources.coins < crop.seedPrice;
      if (btn.disabled) btn.textContent = 'Мало монет';
      btn.addEventListener('click', () => buySeed(type));
    } else {
      item.innerHTML = `
        <div class="item-top">
          <div class="item-icon">🔒</div>
          <div class="item-name">${crop.name}<br>🔒 Не открыто</div>
        </div>
        <div class="item-bottom">
          <div class="item-price">
            <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd700" stroke="#d4a373" stroke-width="2"/><circle cx="12" cy="12" r="7" fill="#ffea00"/></svg>
            ${crop.unlockCost}
          </div>
          <button class="buy-btn" data-unlock="${type}">Открыть</button>
        </div>`;
      const btn = item.querySelector('button');
      btn.disabled = state.resources.coins < crop.unlockCost;
      if (btn.disabled) btn.textContent = 'Мало монет';
      btn.addEventListener('click', () => unlockCrop(type));
    }
    cont.appendChild(item);
  }
}

function buySeed(type) {
  const crop = CONFIG.crops[type];
  if (state.resources.coins < crop.seedPrice) { playSound('error'); return; }
  state.resources.coins -= crop.seedPrice;
  state.resources.seeds[type]++;
  state.stats.totalSpent += crop.seedPrice;
  playSound('buy');
  refreshHUD();
  refreshShop();
  refreshInventory();
  refreshMarket();
  emit(CONFIG.events.RESOURCE_CHANGE);
}

function unlockCrop(type) {
  const crop = CONFIG.crops[type];
  if (state.unlockedCrops.includes(type)) return;
  if (state.resources.coins < crop.unlockCost) { playSound('error'); return; }
  state.resources.coins -= crop.unlockCost;
  state.stats.totalSpent += crop.unlockCost;
  state.unlockedCrops.push(type);
  playSound('unlock');
  refreshHUD();
  refreshShop();
  refreshInventory();
  refreshSeedChoices();
  emit(CONFIG.events.RESOURCE_CHANGE);
}

export function refreshInventory() {
  const cont = $('invItems');
  if (!cont) return;
  cont.innerHTML = '';
  for (const type of CONFIG.cropOrder) {
    if (!state.unlockedCrops.includes(type)) continue;
    const crop = CONFIG.crops[type];
    const count = state.resources.harvest[type];
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `
      <div class="item-top">
        <div class="item-icon">${crop.icon}</div>
        <div class="item-name">${crop.name}</div>
      </div>
      <div class="inv-count">${count}</div>`;
    cont.appendChild(div);
  }
  const eggDiv = document.createElement('div');
  eggDiv.className = 'inv-item';
  eggDiv.innerHTML = `
    <div class="item-top">
      <div class="item-icon" style="background:#fff8e1;border-color:#ffd180;box-shadow:0 3px 0 #ffb74d">🥚</div>
      <div class="item-name">Яйца</div>
    </div>
    <div class="inv-count">${state.resources.eggs}</div>`;
  cont.appendChild(eggDiv);

  for (const type of CONFIG.cropOrder) {
    if (!state.unlockedCrops.includes(type)) continue;
    const crop = CONFIG.crops[type];
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `
      <div class="item-top">
        <div class="item-icon" style="font-size:20px">${crop.icon}🌱</div>
        <div class="item-name">${crop.name}<br><span style="font-size:12px;color:#a68a64">семена</span></div>
      </div>
      <div class="inv-count">${state.resources.seeds[type]}</div>`;
    cont.appendChild(div);
  }
}

let currentMarketTab = 'sell';

export function refreshMarket() {
  const sellCont = $('marketSellTab');
  const buyCont = $('marketBuyTab');
  if (!sellCont || !buyCont) return;

  sellCont.innerHTML = '';
  let anySell = false;
  for (const type of CONFIG.cropOrder) {
    const count = state.resources.harvest[type];
    if (count <= 0) continue;
    anySell = true;
    const crop = CONFIG.crops[type];
    const div = document.createElement('div');
    div.className = 'market-sell-item';
    div.innerHTML = `
      <div class="item-top">
        <div class="item-icon">${crop.icon}</div>
        <div class="item-name">${crop.name}<br><span style="font-size:13px;color:#a68a64">×${count} × 🪙${crop.sellPrice}</span></div>
      </div>
      <div class="sell-actions">
        <button class="buy-btn" data-sell-one="${type}">1</button>
        <button class="buy-btn sell-all" data-sell-all="${type}">Все</button>
      </div>`;
    div.querySelector('[data-sell-one]').addEventListener('click', () => sellCrop(type, 1));
    div.querySelector('[data-sell-all]').addEventListener('click', () => sellCrop(type, state.resources.harvest[type]));
    sellCont.appendChild(div);
  }
  if (state.resources.eggs > 0) {
    anySell = true;
    const div = document.createElement('div');
    div.className = 'market-sell-item';
    div.innerHTML = `
      <div class="item-top">
        <div class="item-icon" style="background:#fff8e1;border-color:#ffd180;box-shadow:0 3px 0 #ffb74d">🥚</div>
        <div class="item-name">Яйца<br><span style="font-size:13px;color:#a68a64">×${state.resources.eggs} × 🪙${CONFIG.economy.eggSellPrice}</span></div>
      </div>
      <div class="sell-actions">
        <button class="buy-btn" id="sellEggOne">1</button>
        <button class="buy-btn sell-all" id="sellEggAll">Все</button>
      </div>`;
    div.querySelector('#sellEggOne').addEventListener('click', () => sellEggs(1));
    div.querySelector('#sellEggAll').addEventListener('click', () => sellEggs(state.resources.eggs));
    sellCont.appendChild(div);
  }
  if (!anySell) {
    sellCont.innerHTML = `<div class="market-empty">Нет товаров для продажи.<br>Соберите урожай или яйца!</div>`;
  }

  buyCont.innerHTML = '';
  const chickenItem = document.createElement('div');
  chickenItem.className = 'market-buy-item';
  const chickenPrice = CONFIG.economy.chickenPrice;
  chickenItem.innerHTML = `
    <div class="item-top">
      <div class="item-icon" style="background:#fff;border-color:#ddd;box-shadow:0 3px 0 #bbb">🐔</div>
      <div>
        <div class="item-name">Курица</div>
        <div class="item-desc">Несёт яйца каждые ${CONFIG.economy.chickenEggInterval}с.<br>Куплено: ${state.upgrades.chickenCount}</div>
      </div>
    </div>
    <button class="buy-btn" id="buyChickenBtn">🪙 ${chickenPrice}</button>`;
  buyCont.appendChild(chickenItem);
  const cBtn = chickenItem.querySelector('#buyChickenBtn');
  cBtn.disabled = state.resources.coins < chickenPrice;
  if (cBtn.disabled) cBtn.textContent = 'Мало монет';
  cBtn.addEventListener('click', () => {
    if (buyChicken()) {
      refreshHUD(); refreshMarket();
    }
  });

  const expandCost = getExpandCost();
  const expandItem = document.createElement('div');
  expandItem.className = 'market-buy-item';
  if (expandCost !== null) {
    expandItem.innerHTML = `
      <div class="item-top">
        <div class="item-icon" style="background:#e8f5e9;border-color:#a5d6a7;box-shadow:0 3px 0 #81c784">🌱</div>
        <div>
          <div class="item-name">Новая грядка</div>
          <div class="item-desc">Грядок: ${state.upgrades.plots}/9</div>
        </div>
      </div>
      <button class="buy-btn" id="expandBtn">🪙 ${expandCost}</button>`;
    buyCont.appendChild(expandItem);
    const eBtn = expandItem.querySelector('#expandBtn');
    eBtn.disabled = state.resources.coins < expandCost;
    if (eBtn.disabled) eBtn.textContent = 'Мало монет';
    eBtn.addEventListener('click', () => {
      if (expandFarm()) {
        playSound('buy');
        refreshHUD(); refreshMarket();
      }
    });
  } else {
    expandItem.innerHTML = `
      <div class="item-top">
        <div class="item-icon" style="background:#e8f5e9;border-color:#a5d6a7;box-shadow:0 3px 0 #81c784">🌱</div>
        <div>
          <div class="item-name">Все грядки открыты</div>
          <div class="item-desc">9 из 9</div>
        </div>
      </div>`;
    buyCont.appendChild(expandItem);
  }
}

function sellCrop(type, amount) {
  if (amount <= 0) return;
  amount = Math.min(amount, state.resources.harvest[type]);
  if (amount <= 0) return;
  const price = CONFIG.crops[type].sellPrice;
  const total = amount * price;
  state.resources.harvest[type] -= amount;
  state.resources.coins += total;
  state.stats.totalEarned += total;
  playSound('sell');
  refreshHUD(); refreshMarket(); refreshInventory();
  emit(CONFIG.events.RESOURCE_CHANGE);
}

function sellEggs(amount) {
  if (amount <= 0) return;
  amount = Math.min(amount, state.resources.eggs);
  if (amount <= 0) return;
  const total = amount * CONFIG.economy.eggSellPrice;
  state.resources.eggs -= amount;
  state.resources.coins += total;
  state.stats.totalEarned += total;
  playSound('sell');
  refreshHUD(); refreshMarket(); refreshInventory();
  emit(CONFIG.events.RESOURCE_CHANGE);
}

export function refreshSeedChoices() {
  const cont = $('seedChoices');
  if (!cont) return;
  cont.innerHTML = '';
  for (const type of CONFIG.cropOrder) {
    const crop = CONFIG.crops[type];
    const unlocked = state.unlockedCrops.includes(type);
    const choice = document.createElement('div');
    choice.className = 'seed-choice' + (state.selectedSeed === type ? ' selected' : '') + (unlocked ? '' : ' locked');
    choice.dataset.type = type;
    choice.innerHTML = `
      <div class="item-top">
        <div class="item-icon">${unlocked ? crop.icon : '🔒'}</div>
        <div class="item-name">${crop.name}</div>
      </div>
      <div class="inv-count">${unlocked ? state.resources.seeds[type] : '—'}</div>`;
    if (unlocked) {
      choice.addEventListener('click', () => {
        state.selectedSeed = type;
        state.selectedTool = 'seed';
        refreshSeedChoices();
        refreshHUD();
        refreshToolButtons();
        playSound('buy');
        setTimeout(() => { $('seedModal').style.display = 'none'; }, 150);
      });
    }
    cont.appendChild(choice);
  }
}

export function renderSlots() {
  const saves = getSaves();
  const list = $('slotList');
  list.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const data = saves[`slot${i}`];
    const div = document.createElement('div');
    div.className = 'slot-container';
    if (data) {
      div.innerHTML = `
        <div class="slot-title">Слот ${i} <span style="font-size:12px;color:#a68a64;float:right">${data.date || ''}</span></div>
        <div class="slot-info">🪙 ${data.coins} · 🥚 ${data.eggs || 0} · 🌱 ${state.unlockedCrops.length}</div>
        <div class="slot-actions">
          <button class="slot-btn continue" data-continue="${i}">Продолжить</button>
          <button class="slot-btn delete" data-delete="${i}">🗑</button>
        </div>`;
      div.querySelector('[data-continue]').addEventListener('click', () => window.__loadGame(i));
      div.querySelector('[data-delete]').addEventListener('click', () => {
        showCustomConfirm('Удаление', 'Удалить сохранение?', () => {
          deleteSave(i);
          renderSlots();
        });
      });
    } else {
      div.innerHTML = `
        <div class="slot-title">Слот ${i}</div>
        <div class="slot-info">Пусто</div>
        <div class="slot-actions">
          <button class="slot-btn new" data-new="${i}">Новая игра</button>
        </div>`;
      div.querySelector('[data-new]').addEventListener('click', () => window.__startNewGame(i));
    }
    list.appendChild(div);
  }
}

let toastTimer = null;
export function showAchievementToast(name, desc) {
  const toast = $('achievementToast');
  $('toastTitle').textContent = name;
  $('toastDesc').textContent = desc;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

export function initUI() {
  const soundToggle = $('soundToggle');
  soundToggle.checked = state.audioEnabled;
  soundToggle.addEventListener('change', (e) => {
    state.audioEnabled = e.target.checked;
    saveSettings();
  });

  $('openSaveMenuBtn').addEventListener('click', () => {
    renderSlots();
    $('saveModal').style.display = 'flex';
  });
  $('closeSaveBtn').addEventListener('click', () => $('saveModal').style.display = 'none');

  $('openSettingsBtn').addEventListener('click', () => $('settingsModal').style.display = 'flex');
  $('closeSettingsBtn').addEventListener('click', () => $('settingsModal').style.display = 'none');
  $('closeSettingsBtn2').addEventListener('click', () => $('settingsModal').style.display = 'none');

  $('shopBtn').addEventListener('click', () => {
    initAudio(); refreshShop();
    $('shopModal').style.display = 'flex';
  });
  $('closeShopBtn').addEventListener('click', () => $('shopModal').style.display = 'none');

  $('invBtn').addEventListener('click', () => {
    initAudio(); refreshInventory();
    $('invModal').style.display = 'flex';
  });
  $('closeInvBtn').addEventListener('click', () => $('invModal').style.display = 'none');

  $('marketBtn').addEventListener('click', () => {
    initAudio(); refreshMarket();
    $('marketModal').style.display = 'flex';
  });
  $('closeMarketBtn').addEventListener('click', () => $('marketModal').style.display = 'none');

  document.querySelectorAll('.market-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      $('marketSellTab').style.display = which === 'sell' ? 'block' : 'none';
      $('marketBuyTab').style.display = which === 'buy' ? 'block' : 'none';
    });
  });

  $('seedBtn').addEventListener('click', () => {
    initAudio(); refreshSeedChoices();
    $('seedModal').style.display = 'flex';
  });
  $('closeSeedBtn').addEventListener('click', () => $('seedModal').style.display = 'none');

  $('toolBtn').addEventListener('click', () => {
    state.selectedTool = state.selectedTool === 'water' ? 'seed' : 'water';
    refreshToolButtons();
    playSound('click');
  });

  // Логика поворота экрана
  $('orientationBtn').addEventListener('click', async () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        // Пытаемся заблокировать текущую ориентацию и переключить
        const isPortrait = screen.orientation.type.startsWith('portrait');
        await document.documentElement.requestFullscreen();
        await screen.orientation.lock(isPortrait ? 'landscape' : 'portrait');
      } else {
        showCustomAlert("Инфо", "Ваш браузер (или WebView) не поддерживает программный поворот экрана. Переверните телефон вручную — игра автоматически подстроится под горизонтальный режим!");
      }
    } catch (err) {
      console.warn('Orientation lock failed', err);
      showCustomAlert("Инфо", "Программный поворот заблокирован браузером. Просто переверните телефон, и игра адаптируется!");
    }
  });

  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.style.display = 'none';
    });
  });

  $('menuBtn').addEventListener('click', () => {
    saveGame();
    state.gameState = 'menu';
    $('mainMenu').style.display = 'flex';
    setTimeout(() => { $('mainMenu').style.opacity = '1'; }, 50);
    $('hud').style.opacity = '0';
    document.querySelectorAll('.top-btn').forEach(b => { b.style.display = 'none'; b.style.opacity = '0'; });
    $('seedBtn').style.display = 'none';
    $('toolBtn').style.display = 'none';
    $('actionBtn').style.display = 'none';
  });

  $('skipCutsceneBtn').addEventListener('click', () => {
    import('./game.js').then(m => m.skipCutscene());
  });

  $('actionBtn').addEventListener('click', () => {
    import('./game.js').then(m => m.doAction());
  });

  on(CONFIG.events.RESOURCE_CHANGE, () => { refreshHUD(); });
  on(CONFIG.events.HARVEST, () => { refreshInventory(); refreshMarket(); });
  on(CONFIG.events.DAY_CHANGE, () => { refreshHUD(); });
  on(CONFIG.events.WEATHER_CHANGE, () => { refreshHUD(); });
}

export function showGameUI() {
  $('mainMenu').style.display = 'none';
  $('hud').style.opacity = '1';
  document.querySelectorAll('.top-btn').forEach(b => {
    b.style.display = 'flex';
    b.style.opacity = '1';
  });
  $('seedBtn').style.display = 'flex';
  $('seedBtn').style.opacity = '1';
  $('toolBtn').style.display = 'flex';
  $('toolBtn').style.opacity = '1';
  $('actionBtn').style.display = 'none';
  refreshHUD();
  refreshShop();
  refreshInventory();
  refreshMarket();
  refreshSeedChoices();
  refreshToolButtons();
}

export function refreshAll() {
  refreshHUD();
  refreshShop();
  refreshInventory();
  refreshMarket();
  refreshSeedChoices();
}