// config.js — центральные константы и баланс
export const CONFIG = {
  world: {
    limit: 50,
    groundSize: 300,
    pond: { x: -15, z: -10, radius: 7 },
    plots: {
      cols: 3,
      rows: 3,
      spacing: 2.5,
      startOffsetZ: -5,
      size: 2.2,
    },
  },

  player: {
    speed: 5,
    radius: 0.5,
    startPos: { x: 0, z: 0 },
  },

  camera: {
    initialAngle: Math.PI / 4,
    initialPitch: 0.7,
    initialDist: 15,
    minDist: 5,
    maxDist: 25,
    minPitch: 0.1,
    maxPitch: 1.4,
    mouseSensitivity: 0.008,
    touchSensitivity: 0.01,
    zoomStep: 0.9,
  },

  crops: {
    corn: {
      id: 'corn', name: 'Кукуруза', icon: '🌽',
      seedPrice: 2, growTime: 5, sellPrice: 5,
      yieldMin: 1, yieldMax: 2, unlockCost: 0,
      color: 0xffd166,
    },
    strawberry: {
      id: 'strawberry', name: 'Клубника', icon: '🍓',
      seedPrice: 3, growTime: 8, sellPrice: 8,
      yieldMin: 1, yieldMax: 2, unlockCost: 25,
      color: 0xef233c,
    },
    watermelon: {
      id: 'watermelon', name: 'Арбуз', icon: '🍉',
      seedPrice: 5, growTime: 12, sellPrice: 15,
      yieldMin: 1, yieldMax: 1, unlockCost: 50,
      color: 0x2e7d32,
    },
    pumpkin: {
      id: 'pumpkin', name: 'Тыква', icon: '🎃',
      seedPrice: 8, growTime: 16, sellPrice: 25,
      yieldMin: 1, yieldMax: 1, unlockCost: 100,
      color: 0xff7518,
    },
  },

  cropOrder: ['corn', 'strawberry', 'watermelon', 'pumpkin'],

  economy: {
    startingCoins: 10,
    startingSeeds: { corn: 5, strawberry: 0, watermelon: 0, pumpkin: 0 },
    eggSellPrice: 4,
    chickenPrice: 30,
    chickenEggInterval: 25,
    chickenMaxPendingEggs: 2,
    wateringBoost: 1.6,
    plotExpandCosts: [50, 100, 150, 200, 300, 500],
    waterCanCapacity: 15,
    waterCanRefillSeconds: 3,
  },

  day: {
    durationSeconds: 120,
    startTime: 0.25,
    // фазы освещённости (0=полночь, 0.25=утро, 0.5=полдень, 0.75=вечер)
    sunMinIntensity: 0.15,
    sunMaxIntensity: 2.0,
    ambientMin: 0.25,
    ambientMax: 1.2,
  },

  weather: {
    rainChance: 0.35,
    rainCheckIntervalMin: 60,
    rainCheckIntervalMax: 140,
    rainDurationMin: 20,
    rainDurationMax: 45,
    raindropCount: 200,
  },

  achievements: [
    { id: 'firstHarvest', name: 'Первый урожай', desc: 'Соберите первый урожай',
      check: s => s.stats.totalHarvested >= 1 },
    { id: 'firstCoin', name: 'Первая монетка', desc: 'Заработайте первую монету на рынке',
      check: s => s.stats.totalEarned >= 1 },
    { id: 'tenCrops', name: 'Фермер', desc: 'Соберите 10 культур',
      check: s => s.stats.totalHarvested >= 10 },
    { id: 'richFarmer', name: 'Богач', desc: 'Накопите 100 монет',
      check: s => s.resources.coins >= 100 },
    { id: 'chickenOwner', name: 'Птицевод', desc: 'Купите первую курицу',
      check: s => s.upgrades.chickenCount >= 1 },
    { id: 'allCrops', name: 'Коллекционер', desc: 'Откройте все культуры',
      check: s => s.unlockedCrops.length >= 4 },
    { id: 'fullFarm', name: 'Полная ферма', desc: 'Откройте все 9 грядок',
      check: s => s.upgrades.plots >= 9 },
    { id: 'eggHunter', name: 'Яичный магнат', desc: 'Соберите 25 яиц',
      check: s => s.stats.totalEggsCollected >= 25 },
  ],

  events: {
    ACHIEVEMENT: 'achievement',
    HARVEST: 'harvest',
    PLANT: 'plant',
    WATER: 'water',
    RESOURCE_CHANGE: 'resourceChange',
    DAY_CHANGE: 'dayChange',
    WEATHER_CHANGE: 'weatherChange',
    UI_REFRESH: 'uiRefresh',
  },
};