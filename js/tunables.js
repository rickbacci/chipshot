// Playtest knobs. Poke these after a run; the match/switch rule stays in chip-rule.js.
// Weapon arrays are indexed by level: [LV0, LV1, LV2, LV3, LV4, LV5].

export const COLORS = {
  spread: '#ffb020',
  laser: '#3ef0d2',
  ship: '#8ae7ff',
  enemy: '#ff5d78',
  main: '#ffe566',
  enemyBullet: '#ff9aac',
  bg: '#05070c',
};

export const TUNABLES = {
  playfield: { w: 360, h: 640 },
  maxWeaponLevel: 5,
  chipNumbers: [1, 6],
  // Floating chips flip between those numbers on this interval (seconds).
  chipCycleMin: 2,
  chipCycleMax: 3,
  // Invulnerability granted on every chip pickup, including a maxed weapon.
  pickupInvuln: 1,
  chipDropChance: 0.28,
  chipFallSpeed: 72,
  chipRadius: 26,
  chipArm: 0.4,
  // Minimum sideways speed is about half of this, so drops leave the shot column.
  chipDrift: 78,
  maxChips: 3,
  lives: 3,
  scorePerKill: 100,
  playerSpeed: 250,
  playerRadius: 9,
  playerSpawnY: 568,
  playerMargin: 16,
  respawnInvuln: 1.5,
  mainGun: { fireMs: 170, speed: 500, radius: 2.6 },
  firstWaveDelay: 0.55,
  spawnEvery: 2.5,
  spawnEveryMin: 1.45,
  rampSeconds: 90,
  maxEnemies: 10,
  swarmerSpeed: 68,
  swarmerSpeedRamp: 1.4,
  swarmerRadius: 13,
  swarmerAmp: 58,
  swarmerFreq: 1.7,
  swarmerGap: 34,
  enemyShotEvery: 3.4,
  enemyBulletSpeed: 145,
  graceSeconds: 2.2,
  weapons: {
    1: {
      kind: 'spread',
      name: 'SPREAD',
      ways: [3, 3, 5, 5, 7, 7],
      stepDeg: [20, 22, 16, 18, 12, 13],
      fireMs: [360, 320, 280, 230, 190, 140],
      bulletSpeed: [360, 380, 400, 430, 460, 510],
    },
    6: {
      kind: 'laser',
      name: 'LASER',
      // LV 5 pierce 99 means every enemy in the beam. No terrain in this prototype.
      length: [96, 140, 190, 260, 360, 540],
      pierce: [1, 1, 2, 3, 8, 99],
      fireMs: [480, 420, 350, 290, 230, 170],
      width: [6, 7, 8, 8, 10, 12],
    },
  },
};

export const PLAYFIELD = TUNABLES.playfield;

export function weaponStats(id, level) {
  const table = TUNABLES.weapons[id];
  if (!table) return null;
  const max = TUNABLES.maxWeaponLevel;
  const i = Math.max(0, Math.min(max, level | 0));
  if (table.kind === 'spread') {
    return {
      kind: 'spread',
      name: table.name,
      ways: table.ways[i],
      fireMs: table.fireMs[i],
      stepDeg: table.stepDeg[i],
      bulletSpeed: table.bulletSpeed[i],
    };
  }
  return {
    kind: 'laser',
    name: table.name,
    length: table.length[i],
    pierce: table.pierce[i],
    fireMs: table.fireMs[i],
    width: table.width[i],
  };
}
