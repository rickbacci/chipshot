import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../js/game.js';
import { pickupInvulnSeconds } from '../js/chip-rule.js';
import { PLAYFIELD, TUNABLES } from '../js/tunables.js';

function harness(read, options = {}) {
  const game = createGame(
    { read },
    { rng: options.rng ?? (() => 0.5), openingChip: false },
  );
  game.start();
  game.state.spawnIn = 1000;
  return game;
}

const idle = () => ({ move: { x: 0, y: 0 }, fire: false });

test('the ship moves only from the input source', () => {
  const game = harness(() => ({ move: { x: 1, y: 0 }, fire: false }));
  const startX = game.state.player.x;
  game.update(0.05);
  const expected = startX + TUNABLES.playerSpeed * 0.05;
  assert.ok(Math.abs(game.state.player.x - expected) < 1e-6);
  assert.equal(game.state.bullets.length, 0);
});

test('fire false holds both guns; fire true shoots main and the special', () => {
  let fire = false;
  const game = harness(() => ({ move: { x: 0, y: 0 }, fire }));
  game.state.player.weapon = 1;
  game.state.player.level = 0;
  game.update(0.05);
  assert.equal(game.state.bullets.length, 0);
  fire = true;
  game.update(0.05);
  const spread = weaponBulletCount(game, 'spread');
  const main = weaponBulletCount(game, 'main');
  assert.equal(main, 1);
  assert.equal(spread, 3);
});

test('a matching chip levels the weapon and grants pickup invulnerability', () => {
  const game = harness(idle);
  const player = game.state.player;
  player.weapon = 1;
  player.level = 2;
  game.state.chips.push(chipAt(player.x, player.y, 1));
  game.update(1 / 60);
  assert.equal(player.level, 3);
  assert.equal(player.weapon, 1);
  assert.equal(player.invuln, pickupInvulnSeconds());
  assert.equal(game.state.chips.length, 0);
});

test('a different chip switches to level 0', () => {
  const game = harness(idle);
  const player = game.state.player;
  player.weapon = 1;
  player.level = 4;
  game.state.chips.push(chipAt(player.x, player.y, 6));
  game.update(1 / 60);
  assert.equal(player.weapon, 6);
  assert.equal(player.level, 0);
});

test('a floating chip flips its number when the timer elapses', () => {
  const game = harness(idle);
  game.state.chips.push({
    ...chipAt(40, 80, 1),
    cycleIn: 0.01,
    cycleMax: 2.5,
  });
  game.update(0.05);
  assert.equal(game.state.chips[0].n, 6);
});

test('death resets the special to level 0 and spends a life', () => {
  const game = harness(idle);
  const player = game.state.player;
  player.weapon = 6;
  player.level = 4;
  game.state.enemies.push(enemyAt(player.x, player.y));
  game.update(1 / 60);
  assert.equal(game.state.lives, TUNABLES.lives - 1);
  assert.equal(player.weapon, 6);
  assert.equal(player.level, 0);
  assert.equal(game.state.mode, 'playing');
  assert.ok(player.invuln > 0);
});

test('the last life ends the run', () => {
  const game = harness(idle);
  game.state.lives = 1;
  game.state.player.weapon = 1;
  game.state.player.level = 3;
  game.state.enemies.push(enemyAt(game.state.player.x, game.state.player.y));
  game.update(1 / 60);
  assert.equal(game.state.mode, 'gameover');
  assert.equal(game.state.lives, 0);
  assert.equal(game.state.player.level, 0);
  assert.equal(game.state.player.alive, false);
});

test('invulnerability ignores a hit', () => {
  const game = harness(idle);
  game.state.player.invuln = 1;
  game.state.enemies.push(enemyAt(game.state.player.x, game.state.player.y));
  game.update(0.05);
  assert.equal(game.state.lives, TUNABLES.lives);
});

test('kills score and can drop a chip', () => {
  const game = harness(idle, { rng: () => 0 });
  game.state.enemies.push(enemyAt(80, 80));
  game.state.bullets.push({
    x: 80,
    y: 80,
    vx: 0,
    vy: 0,
    r: 4,
    friendly: true,
    dead: false,
    kind: 'main',
  });
  game.update(1 / 60);
  assert.equal(game.state.score, TUNABLES.scorePerKill);
  assert.equal(game.state.enemies.length, 0);
  assert.equal(game.state.chips.length, 1);
  assert.ok(TUNABLES.chipNumbers.includes(game.state.chips[0].n));
});

test('a level 0 laser pierces one enemy and a level 5 laser pierces the line', () => {
  const low = harness(() => ({ move: { x: 0, y: 0 }, fire: true }));
  stackColumn(low, 3);
  low.state.player.weapon = 6;
  low.state.player.level = 0;
  low.update(1 / 60);
  assert.equal(low.state.enemies.length, 2);

  const high = harness(() => ({ move: { x: 0, y: 0 }, fire: true }));
  stackColumn(high, 3);
  high.state.player.weapon = 6;
  high.state.player.level = 5;
  high.update(1 / 60);
  assert.equal(high.state.enemies.length, 0);
});

test('restart returns to a fresh run', () => {
  const game = harness(idle);
  game.state.score = 500;
  game.state.lives = 1;
  game.state.player.weapon = 1;
  game.state.player.level = 5;
  game.state.enemies.push(enemyAt(game.state.player.x, game.state.player.y));
  game.update(1 / 60);
  assert.equal(game.state.mode, 'gameover');
  game.restart();
  assert.equal(game.state.mode, 'playing');
  assert.equal(game.state.score, 0);
  assert.equal(game.state.lives, TUNABLES.lives);
  assert.equal(game.state.player.weapon, null);
  assert.equal(game.state.player.level, 0);
  assert.ok(game.state.player.x > 0 && game.state.player.x < PLAYFIELD.w);
});

function weaponBulletCount(game, kind) {
  return game.state.bullets.filter((bullet) => bullet.kind === kind).length;
}

function chipAt(x, y, n) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    r: 20,
    n,
    cycleIn: 9,
    cycleMax: 2.5,
    armIn: 0,
    flipped: 0,
    dead: false,
  };
}

function enemyAt(x, y) {
  return {
    x,
    y,
    baseX: x,
    amp: 0,
    freq: 0,
    phase: 0,
    speed: 0,
    r: TUNABLES.swarmerRadius,
    hp: 1,
    shootIn: 100,
  };
}

function stackColumn(game, count) {
  const player = game.state.player;
  for (let i = 0; i < count; i++) {
    game.state.enemies.push(enemyAt(player.x, player.y - 40 - i * 28));
  }
}
