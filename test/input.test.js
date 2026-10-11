import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveFromKeys, moveToward } from '../js/input.js';

test('WASD and arrows share a move vector', () => {
  assert.deepEqual(moveFromKeys(new Set(['a'])), { x: -1, y: 0 });
  const diagonal = moveFromKeys(new Set(['arrowright', 'arrowup']));
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(diagonal.y + Math.SQRT1_2) < 1e-9);
});

test('opposite keys cancel and diagonals stay unit length', () => {
  assert.deepEqual(moveFromKeys(new Set(['a', 'd'])), { x: 0, y: 0 });
  const diagonal = moveFromKeys(new Set(['arrowleft', 'w']));
  assert.ok(Math.abs(diagonal.x + Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(diagonal.y + Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
});

test('a drag move reaches a nearby point without overshooting', () => {
  const close = moveToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 200, 0.1);
  assert.ok(Math.abs(close.x - 0.5) < 1e-9);
  assert.equal(close.y, 0);
  const far = moveToward({ x: 0, y: 0 }, { x: 1000, y: 0 }, 200, 0.1);
  assert.ok(Math.abs(far.x - 1) < 1e-9);
});
