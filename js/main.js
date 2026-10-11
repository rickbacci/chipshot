import { createGame } from './game.js';
import { createHumanInput } from './input.js';
import { render } from './render.js';
import { COLORS, PLAYFIELD, TUNABLES } from './tunables.js';

const canvas = document.querySelector('#game');
const overlay = document.querySelector('#overlay');
const ovKicker = document.querySelector('#ov-kicker');
const ovTitle = document.querySelector('#ov-title');
const ovScore = document.querySelector('#ov-score');
const ovBody = document.querySelector('#ov-body');
const ovBtn = document.querySelector('#ov-btn');
const ovHint = document.querySelector('#ov-hint');
const scoreEl = document.querySelector('#score');
const livesEl = document.querySelector('#lives');
const timeEl = document.querySelector('#time');
const weaponNameEl = document.querySelector('#weapon-name');
const weaponLevelEl = document.querySelector('#weapon-level');
const pipsEl = document.querySelector('#pips');
const stakesEl = document.querySelector('#stakes');

document.documentElement.style.setProperty('--amber', COLORS.spread);
document.documentElement.style.setProperty('--mint', COLORS.laser);
document.documentElement.style.setProperty('--ship', COLORS.ship);

const holder = { game: null };
const input = createHumanInput(canvas, () => holder.game.state.player);
holder.game = createGame(input);
const game = holder.game;

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

function stakesText(player) {
  if (player.weapon == null) {
    return 'No special yet. The next chip you take becomes yours at LV 0.';
  }
  const mine = TUNABLES.weapons[player.weapon].name;
  const otherId = player.weapon === 1 ? 6 : 1;
  const other = TUNABLES.weapons[otherId].name;
  const up = player.level >= TUNABLES.maxWeaponLevel
    ? `Another ${player.weapon} keeps ${mine} at LV ${player.level}.`
    : `A ${player.weapon} raises ${mine} to LV ${player.level + 1}.`;
  return `${up} A ${otherId} drops you to ${other} LV 0.`;
}

let hudKey = '';

function syncHud(state) {
  scoreEl.textContent = String(state.score).padStart(6, '0');
  timeEl.textContent = formatTime(state.runTime);
  const player = state.player;
  const key = `${player.weapon}:${player.level}:${state.lives}:${state.mode}`;
  if (key === hudKey) return;
  hudKey = key;
  const full = '▲'.repeat(Math.max(0, state.lives));
  const empty = '△'.repeat(Math.max(0, TUNABLES.lives - state.lives));
  livesEl.textContent = `${full}${empty}` || '—';
  if (player.weapon == null) {
    weaponNameEl.textContent = 'NONE';
    weaponNameEl.className = '';
    weaponLevelEl.textContent = 'LV —';
  } else {
    weaponNameEl.textContent = TUNABLES.weapons[player.weapon].name;
    weaponNameEl.className = player.weapon === 6 ? 'laser' : 'spread';
    weaponLevelEl.textContent = `LV ${player.level}`;
  }
  pipsEl.className = `pips ${player.weapon === 6 ? 'laser' : 'spread'}`;
  pipsEl.replaceChildren();
  const slots = TUNABLES.maxWeaponLevel + 1;
  for (let i = 0; i < slots; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    if (player.weapon != null && i <= player.level) pip.classList.add('on');
    pipsEl.appendChild(pip);
  }
  stakesEl.textContent = stakesText(player);
}

let overlayMode = '';

function syncOverlay(state) {
  const show = state.mode !== 'playing';
  overlay.hidden = !show;
  if (!show) {
    overlayMode = 'playing';
    return;
  }
  if (state.mode === 'title') {
    ovKicker.textContent = 'DEEP SPACE';
    ovTitle.textContent = 'CHIPSHOT';
    ovScore.textContent = '';
    ovBody.textContent = 'Same number levels the weapon up to LV 5. A different number swaps it back to LV 0. Chips flip every couple of seconds.';
    ovBtn.textContent = 'START';
    ovHint.textContent = 'Arrows, WASD, or drag. Guns fire on their own.';
  } else {
    ovKicker.textContent = 'RUN OVER';
    ovTitle.textContent = 'GAME OVER';
    ovScore.textContent = String(state.score).padStart(6, '0');
    ovBody.textContent = `You lasted ${formatTime(state.runTime)}. Each death dropped the special weapon back to LV 0.`;
    ovBtn.textContent = 'RESTART';
    ovHint.textContent = 'Enter or the button runs it again.';
  }
  if (overlayMode !== state.mode) {
    overlayMode = state.mode;
    ovBtn.focus();
  }
}

function beginFromOverlay() {
  if (game.state.mode === 'title') game.start();
  else if (game.state.mode === 'gameover') game.restart();
}

overlay.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  beginFromOverlay();
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === 'enter' || key === ' ') {
    event.preventDefault();
    beginFromOverlay();
  } else if (key === 'r' && game.state.mode !== 'title') {
    game.restart();
  }
});

function frameSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(width / PLAYFIELD.w, 0, 0, height / PLAYFIELD.h, 0, 0);
  return ctx;
}

let last = performance.now();

function loop(now) {
  const dt = document.hidden ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  const ctx = frameSize();
  render(ctx, game.state);
  syncHud(game.state);
  syncOverlay(game.state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
