// Chip rule, isolated from rendering so it can be tested and reused by an AI pilot.
import { TUNABLES } from './tunables.js';

export function applyChip(current, chipNumber) {
  const weapon = current?.weapon ?? null;
  const level = current?.level ?? 0;
  const numbers = TUNABLES.chipNumbers;
  if (!numbers.includes(chipNumber)) {
    return { weapon, level, action: 'ignore' };
  }
  if (weapon != null && weapon === chipNumber) {
    const nextLevel = Math.min(TUNABLES.maxWeaponLevel, level + 1);
    return {
      weapon,
      level: nextLevel,
      action: nextLevel === level ? 'maxed' : 'levelup',
    };
  }
  return { weapon: chipNumber, level: 0, action: 'switch' };
}

export function onDeath(current) {
  return {
    weapon: current?.weapon ?? null,
    level: 0,
  };
}

export function cycleChipNumber(current) {
  const numbers = TUNABLES.chipNumbers;
  const index = numbers.indexOf(current);
  return numbers[(index + 1) % numbers.length];
}

export function rollCycleSeconds(rng = Math.random) {
  const min = TUNABLES.chipCycleMin;
  const max = TUNABLES.chipCycleMax;
  return min + rng() * (max - min);
}

export function pickupInvulnSeconds() {
  return TUNABLES.pickupInvuln;
}
