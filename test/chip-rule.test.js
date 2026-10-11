import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyChip,
  cycleChipNumber,
  onDeath,
  pickupInvulnSeconds,
  rollCycleSeconds,
} from '../js/chip-rule.js';
import { TUNABLES, weaponStats } from '../js/tunables.js';

test('a different number switches to that weapon at level 0', () => {
  const current = { weapon: 1, level: 4 };
  const next = applyChip(current, 6);
  assert.deepEqual(next, { weapon: 6, level: 0, action: 'switch' });
  assert.equal(current.level, 4);
});

test('the same number levels the special up', () => {
  assert.deepEqual(applyChip({ weapon: 1, level: 0 }, 1), {
    weapon: 1,
    level: 1,
    action: 'levelup',
  });
  assert.deepEqual(applyChip({ weapon: 6, level: 4 }, 6), {
    weapon: 6,
    level: 5,
    action: 'levelup',
  });
});

test('level stops at 5', () => {
  assert.deepEqual(applyChip({ weapon: 6, level: 5 }, 6), {
    weapon: 6,
    level: 5,
    action: 'maxed',
  });
});

test('the first chip switches you onto it at level 0', () => {
  assert.deepEqual(applyChip({ weapon: null, level: 0 }, 1), {
    weapon: 1,
    level: 0,
    action: 'switch',
  });
});

test('prototype chips are only 1 and 6', () => {
  assert.deepEqual(TUNABLES.chipNumbers, [1, 6]);
  assert.equal(applyChip({ weapon: 1, level: 2 }, 4).action, 'ignore');
});

test('death resets the special to level 0 and keeps the weapon', () => {
  assert.deepEqual(onDeath({ weapon: 6, level: 4 }), { weapon: 6, level: 0 });
  assert.deepEqual(onDeath({ weapon: null, level: 3 }), { weapon: null, level: 0 });
});

test('chips cycle between 1 and 6 every 2–3 seconds', () => {
  assert.equal(TUNABLES.chipCycleMin, 2);
  assert.equal(TUNABLES.chipCycleMax, 3);
  assert.equal(cycleChipNumber(1), 6);
  assert.equal(cycleChipNumber(6), 1);
  assert.equal(cycleChipNumber(cycleChipNumber(1)), 1);
  assert.equal(rollCycleSeconds(() => 0), 2);
  assert.equal(rollCycleSeconds(() => 1), 3);
  const mid = rollCycleSeconds(() => 0.25);
  assert.ok(mid >= 2 && mid <= 3);
});

test('pickup invulnerability is about a second', () => {
  assert.equal(pickupInvulnSeconds(), 1);
});

test('spread opens 3-way and finishes 7-way and faster', () => {
  const low = weaponStats(1, 0);
  const high = weaponStats(1, 5);
  assert.equal(low.ways, 3);
  assert.equal(high.ways, 7);
  assert.ok(high.fireMs < low.fireMs);
});

test('laser starts short with one pierce and ends long enough to pierce a column', () => {
  const low = weaponStats(6, 0);
  const high = weaponStats(6, 5);
  assert.equal(low.pierce, 1);
  assert.ok(high.pierce >= 99);
  assert.ok(high.length > low.length * 2);
  assert.ok(high.fireMs < low.fireMs);
});
