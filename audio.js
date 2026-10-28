// audio.js — звуки через Web Audio API
import { state } from './state.js';

export function initAudio() {
  if (!state.audioCtx) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new Ctor();
    } catch (e) {
      console.warn('Web Audio недоступен', e);
      return;
    }
  }
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
}

const RECIPES = {
  plant(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(300, now);
    o.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    o.start(now); o.stop(now + 0.12);
  },
  water(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(850, now);
    o.frequency.exponentialRampToValueAtTime(420, now + 0.35);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    o.start(now); o.stop(now + 0.35);
  },
  harvest(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'triangle';
    o.frequency.setValueAtTime(780, now);
    o.frequency.setValueAtTime(1180, now + 0.08);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    o.start(now); o.stop(now + 0.2);
  },
  buy(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'square';
    o.frequency.setValueAtTime(620, now);
    o.frequency.setValueAtTime(920, now + 0.05);
    o.frequency.setValueAtTime(1220, now + 0.1);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    o.start(now); o.stop(now + 0.18);
  },
  sell(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, now);
    o.frequency.exponentialRampToValueAtTime(820, now + 0.14);
    o.frequency.exponentialRampToValueAtTime(620, now + 0.28);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    o.start(now); o.stop(now + 0.28);
  },
  egg(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(1450, now);
    o.frequency.exponentialRampToValueAtTime(820, now + 0.16);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    o.start(now); o.stop(now + 0.16);
  },
  error(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(210, now);
    o.frequency.exponentialRampToValueAtTime(100, now + 0.22);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    o.start(now); o.stop(now + 0.22);
  },
  achievement(ctx, now) {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      const t = now + i * 0.09;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      o.start(t); o.stop(t + 0.25);
    });
  },
  unlock(ctx, now) {
    [420, 620, 840].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      const t = now + i * 0.08;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      o.start(t); o.stop(t + 0.2);
    });
  },
  click(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'square';
    o.frequency.setValueAtTime(700, now);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    o.start(now); o.stop(now + 0.05);
  },
};

export function playSound(name) {
  if (!state.audioCtx || !state.audioEnabled) return;
  const fn = RECIPES[name];
  if (!fn) return;
  try { fn(state.audioCtx, state.audioCtx.currentTime); }
  catch (e) { console.warn('playSound', name, e); }
}