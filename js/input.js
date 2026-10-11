// Human controls. The game only reads { move, fire } — an AI pilot can return the same shape later.
import { PLAYFIELD, TUNABLES } from './tunables.js';

const LEFT = new Set(['arrowleft', 'a']);
const RIGHT = new Set(['arrowright', 'd']);
const UP = new Set(['arrowup', 'w']);
const DOWN = new Set(['arrowdown', 's']);
const MOVE_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);

export function moveFromKeys(pressed) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  for (const key of pressed) {
    if (LEFT.has(key)) left = true;
    if (RIGHT.has(key)) right = true;
    if (UP.has(key)) up = true;
    if (DOWN.has(key)) down = true;
  }
  let x = 0;
  let y = 0;
  if (left) x -= 1;
  if (right) x += 1;
  if (up) y -= 1;
  if (down) y += 1;
  const mag = Math.hypot(x, y);
  if (mag > 1) return { x: x / mag, y: y / mag };
  return { x, y };
}

// Analog move that reaches `to` this frame without overshooting.
// The game integrates with the same speed and dt: position += move * speed * dt.
export function moveToward(from, to, speed, dt) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const maxStep = speed * dt;
  if (dist < 1e-6 || maxStep <= 0) return { x: 0, y: 0 };
  const scale = Math.min(1, dist / maxStep) / dist;
  return { x: dx * scale, y: dy * scale };
}

export function createHumanInput(canvas, getShip) {
  const pressed = new Set();
  let drag = null;

  function playPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    return {
      x: ((event.clientX - rect.left) / width) * PLAYFIELD.w,
      y: ((event.clientY - rect.top) / height) * PLAYFIELD.h,
    };
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (!MOVE_KEYS.has(key)) return;
    pressed.add(key);
    event.preventDefault();
  }

  function onKeyUp(event) {
    pressed.delete(event.key.toLowerCase());
  }

  function onPointerDown(event) {
    const ship = getShip?.();
    if (!ship?.alive) return;
    const point = playPoint(event);
    drag = {
      pointerId: event.pointerId,
      offsetX: ship.x - point.x,
      offsetY: ship.y - point.y,
      x: point.x,
      y: point.y,
    };
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const point = playPoint(event);
    drag.x = point.x;
    drag.y = point.y;
  }

  function endDrag(event) {
    if (drag && event.pointerId === drag.pointerId) drag = null;
  }

  function onBlur() {
    pressed.clear();
    drag = null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return {
    read(frame) {
      const keys = moveFromKeys(pressed);
      const keyHeld = keys.x !== 0 || keys.y !== 0;
      if (!keyHeld && drag && frame?.ship) {
        const target = { x: drag.x + drag.offsetX, y: drag.y + drag.offsetY };
        const speed = frame.speed ?? TUNABLES.playerSpeed;
        const dt = frame.dt || 1 / 60;
        return { move: moveToward(frame.ship, target, speed, dt), fire: true };
      }
      return { move: keys, fire: true };
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
    },
  };
}
