// Rules and simulation. Each tick reads { move, fire } from `input` and nothing else about the player.
import {
  applyChip,
  cycleChipNumber,
  onDeath,
  pickupInvulnSeconds,
  rollCycleSeconds,
} from './chip-rule.js';
import { PLAYFIELD, TUNABLES, weaponStats } from './tunables.js';

const W = PLAYFIELD.w;
const H = PLAYFIELD.h;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hits(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r;
  return dx * dx + dy * dy <= r * r;
}

function makeStars(rng) {
  const layers = [
    { n: 42, speed: 28, r: 0.7, a: 0.35 },
    { n: 26, speed: 62, r: 1.15, a: 0.55 },
    { n: 12, speed: 130, r: 1.7, a: 0.85 },
  ];
  const tints = ['#d5e2f5', '#c9d4ff', '#ffe6c2'];
  const stars = [];
  for (const layer of layers) {
    for (let i = 0; i < layer.n; i++) {
      stars.push({
        x: rng() * W,
        y: rng() * H,
        speed: layer.speed * (0.85 + rng() * 0.3),
        r: layer.r,
        a: layer.a,
        tint: tints[Math.floor(rng() * tints.length) % tints.length],
      });
    }
  }
  return stars;
}

function createState(rng) {
  return {
    mode: 'title',
    time: 0,
    runTime: 0,
    score: 0,
    lives: TUNABLES.lives,
    spawnIn: TUNABLES.firstWaveDelay,
    shake: 0,
    flash: 0,
    stars: makeStars(rng),
    player: {
      x: W / 2,
      y: TUNABLES.playerSpawnY,
      r: TUNABLES.playerRadius,
      weapon: null,
      level: 0,
      invuln: 0,
      mainCd: 0,
      specialCd: 0,
      alive: true,
      muzzle: 0,
    },
    enemies: [],
    bullets: [],
    beams: [],
    chips: [],
    particles: [],
    floaters: [],
  };
}

export function createGame(input, options = {}) {
  const rng = options.rng ?? Math.random;
  const spawnOpening = options.openingChip !== false;
  let state = createState(rng);

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng() * 0.2;
      const vel = speed * (0.45 + rng() * 0.7);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: 0.28 + rng() * 0.28,
        maxLife: 0.5,
        color,
        size: 1.5 + rng() * 2.2,
      });
    }
    if (state.particles.length > 120) {
      state.particles.splice(0, state.particles.length - 120);
    }
  }

  function floater(text, x, y, color) {
    state.floaters.push({
      text,
      x,
      y,
      vy: -38,
      life: 0.9,
      maxLife: 0.9,
      color,
    });
    if (state.floaters.length > 8) state.floaters.shift();
  }

  function spawnChip(x, y) {
    const numbers = TUNABLES.chipNumbers;
    const index = Math.min(numbers.length - 1, Math.floor(rng() * numbers.length));
    const cycleMax = rollCycleSeconds(rng);
    state.chips.push({
      x,
      y,
      vx: (rng() * 2 - 1) * TUNABLES.chipDrift,
      vy: TUNABLES.chipFallSpeed,
      r: TUNABLES.chipRadius,
      n: numbers[index],
      cycleIn: cycleMax,
      cycleMax,
      armIn: TUNABLES.chipArm,
      flipped: 0,
      dead: false,
    });
  }

  function pressure() {
    return Math.min(1, state.runTime / TUNABLES.rampSeconds);
  }

  function spawnWave() {
    const amp = TUNABLES.swarmerAmp * (0.75 + rng() * 0.45);
    const margin = amp + TUNABLES.swarmerRadius + 8;
    const baseX = margin + rng() * (W - margin * 2);
    const freq = TUNABLES.swarmerFreq * (0.85 + rng() * 0.35);
    const speed = TUNABLES.swarmerSpeed * (1 + (TUNABLES.swarmerSpeedRamp - 1) * pressure());
    for (let i = 0; i < 5; i++) {
      state.enemies.push({
        baseX,
        amp,
        freq,
        phase: i * 0.8,
        x: baseX,
        y: -24 - i * TUNABLES.swarmerGap,
        speed,
        r: TUNABLES.swarmerRadius,
        hp: 1,
        shootIn: TUNABLES.enemyShotEvery * (0.35 + rng() * 0.5) + i * 0.18,
      });
    }
  }

  function fireMain() {
    const gun = TUNABLES.mainGun;
    state.bullets.push({
      x: state.player.x,
      y: state.player.y - 16,
      vx: 0,
      vy: -gun.speed,
      r: gun.radius,
      friendly: true,
      dead: false,
      kind: 'main',
    });
    state.player.mainCd = gun.fireMs / 1000;
    state.player.muzzle = 0.05;
  }

  function fireSpread(stats) {
    const ways = stats.ways;
    const mid = (ways - 1) / 2;
    for (let i = 0; i < ways; i++) {
      const deg = (i - mid) * stats.stepDeg;
      const rad = -Math.PI / 2 + (deg * Math.PI) / 180;
      state.bullets.push({
        x: state.player.x,
        y: state.player.y - 12,
        vx: Math.cos(rad) * stats.bulletSpeed,
        vy: Math.sin(rad) * stats.bulletSpeed,
        r: 3.2,
        friendly: true,
        dead: false,
        kind: 'spread',
      });
    }
    state.player.specialCd = stats.fireMs / 1000;
  }

  function fireLaser(stats) {
    state.beams.push({
      x: state.player.x,
      y: state.player.y - 10,
      length: stats.length,
      width: stats.width,
      pierce: stats.pierce,
      age: 0,
      maxAge: 0.1,
      applied: false,
    });
    state.player.specialCd = stats.fireMs / 1000;
    state.player.muzzle = 0.06;
  }

  function fireEnemy(enemy) {
    const nudge = clamp((state.player.x - enemy.x) * 0.45, -70, 70);
    state.bullets.push({
      x: enemy.x,
      y: enemy.y + enemy.r,
      vx: nudge,
      vy: TUNABLES.enemyBulletSpeed,
      r: 3.4,
      friendly: false,
      dead: false,
      kind: 'enemy',
    });
  }

  function killEnemy(enemy) {
    if (enemy.hp > 0 || enemy.scored) return;
    enemy.scored = true;
    state.score += TUNABLES.scorePerKill;
    burst(enemy.x, enemy.y, '#ff8aa0', 7, 110);
    if (rng() < TUNABLES.chipDropChance) spawnChip(enemy.x, enemy.y);
  }

  function beamHits(enemy, beam) {
    const top = beam.y - beam.length;
    const bottom = beam.y;
    if (enemy.y + enemy.r < top || enemy.y - enemy.r > bottom) return false;
    return Math.abs(enemy.x - beam.x) <= beam.width / 2 + enemy.r * 0.55;
  }

  function weaponLabel(next) {
    const table = TUNABLES.weapons[next.weapon];
    const name = table ? table.name : String(next.weapon);
    if (next.action === 'switch') return `${name} LV 0`;
    if (next.action === 'maxed') return `${name} MAX`;
    return `${name} LV ${next.level}`;
  }

  function hurtPlayer() {
    const reset = onDeath(state.player);
    state.player.weapon = reset.weapon;
    state.player.level = reset.level;
    state.lives -= 1;
    burst(state.player.x, state.player.y, '#8ae7ff', 16, 160);
    state.shake = 9;
    state.flash = 0.22;
    state.bullets = state.bullets.filter((bullet) => bullet.friendly);
    if (state.lives <= 0) {
      state.mode = 'gameover';
      state.player.alive = false;
      return;
    }
    state.player.x = W / 2;
    state.player.y = TUNABLES.playerSpawnY;
    state.player.invuln = TUNABLES.respawnInvuln;
    state.player.mainCd = 0.25;
    state.player.specialCd = 0.25;
    floater('LV 0', state.player.x, state.player.y - 30, '#e7eef8');
  }

  function beginRun() {
    state.mode = 'playing';
    if (spawnOpening) spawnChip(W * (0.32 + rng() * 0.36), -36);
  }

  function update(rawDt) {
    const dt = Math.min(0.05, Math.max(0, rawDt));
    state.time += dt;
    if (state.mode === 'playing') state.runTime += dt;

    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > H) {
        star.y -= H;
        star.x = rng() * W;
      }
    }
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - Math.min(1, dt * 1.5);
      particle.vy *= 1 - Math.min(1, dt * 1.5);
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    for (const item of state.floaters) {
      item.life -= dt;
      item.y += item.vy * dt;
    }
    state.floaters = state.floaters.filter((item) => item.life > 0);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.flash = Math.max(0, state.flash - dt);
    if (state.player.muzzle > 0) state.player.muzzle = Math.max(0, state.player.muzzle - dt);

    if (state.mode !== 'playing') return;

    const sample = input.read({
      ship: state.player,
      dt,
      speed: TUNABLES.playerSpeed,
      playfield: PLAYFIELD,
    }) || { move: { x: 0, y: 0 }, fire: false };
    const move = sample.move || { x: 0, y: 0 };
    const fire = Boolean(sample.fire);
    const margin = TUNABLES.playerMargin;
    state.player.x = clamp(
      state.player.x + clamp(move.x || 0, -1, 1) * TUNABLES.playerSpeed * dt,
      margin,
      W - margin,
    );
    state.player.y = clamp(
      state.player.y + clamp(move.y || 0, -1, 1) * TUNABLES.playerSpeed * dt,
      margin,
      H - margin,
    );
    if (state.player.invuln > 0) state.player.invuln = Math.max(0, state.player.invuln - dt);
    state.player.mainCd -= dt;
    state.player.specialCd -= dt;

    if (fire && state.player.alive && state.player.mainCd <= 0) fireMain();
    if (fire && state.player.alive && state.player.weapon != null && state.player.specialCd <= 0) {
      const stats = weaponStats(state.player.weapon, state.player.level);
      if (stats?.kind === 'spread') fireSpread(stats);
      else if (stats?.kind === 'laser') fireLaser(stats);
    }

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      if (state.enemies.length < TUNABLES.maxEnemies) spawnWave();
      const every = TUNABLES.spawnEvery + (TUNABLES.spawnEveryMin - TUNABLES.spawnEvery) * pressure();
      state.spawnIn = every;
    }

    for (const enemy of state.enemies) {
      enemy.y += enemy.speed * dt;
      const amp = enemy.amp ?? 0;
      enemy.x = (enemy.baseX ?? enemy.x) + Math.sin(state.time * (enemy.freq ?? 0) + (enemy.phase ?? 0)) * amp;
      if (typeof enemy.shootIn === 'number') {
        enemy.shootIn -= dt;
        if (
          enemy.shootIn <= 0 &&
          state.runTime > TUNABLES.graceSeconds &&
          enemy.y < state.player.y - 20
        ) {
          fireEnemy(enemy);
          enemy.shootIn = TUNABLES.enemyShotEvery;
        }
      }
    }

    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
    for (const beam of state.beams) beam.age += dt;

    for (const chip of state.chips) {
      chip.x += chip.vx * dt;
      chip.y += chip.vy * dt;
      if (chip.x < chip.r) {
        chip.x = chip.r;
        chip.vx = Math.abs(chip.vx);
      } else if (chip.x > W - chip.r) {
        chip.x = W - chip.r;
        chip.vx = -Math.abs(chip.vx);
      }
      if (chip.flipped > 0) chip.flipped = Math.max(0, chip.flipped - dt);
      if ((chip.armIn ?? 0) > 0) {
        chip.armIn -= dt;
        continue;
      }
      chip.cycleIn -= dt;
      if (chip.cycleIn <= 0) {
        chip.n = cycleChipNumber(chip.n);
        chip.cycleMax = rollCycleSeconds(rng);
        chip.cycleIn += chip.cycleMax;
        chip.flipped = 0.18;
      }
    }

    for (const bullet of state.bullets) {
      if (!bullet.friendly || bullet.dead) continue;
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        if (hits(bullet, enemy)) {
          enemy.hp -= 1;
          bullet.dead = true;
          break;
        }
      }
    }

    for (const beam of state.beams) {
      if (beam.applied) continue;
      const struck = state.enemies.filter((enemy) => enemy.hp > 0 && beamHits(enemy, beam));
      struck.sort((a, b) => b.y - a.y);
      const count = Math.min(beam.pierce, struck.length);
      for (let i = 0; i < count; i++) struck[i].hp -= 1;
      beam.applied = true;
    }

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) killEnemy(enemy);
    }

    for (const chip of state.chips) {
      if (chip.dead || (chip.armIn ?? 0) > 0) continue;
      if (!hits(state.player, chip)) continue;
      const next = applyChip(state.player, chip.n);
      if (next.action === 'ignore') continue;
      state.player.weapon = next.weapon;
      state.player.level = next.level;
      state.player.invuln = Math.max(state.player.invuln, pickupInvulnSeconds());
      chip.dead = true;
      const table = TUNABLES.weapons[next.weapon];
      const color = table?.kind === 'laser' ? '#3ef0d2' : '#ffb020';
      floater(weaponLabel(next), chip.x, chip.y, color);
      burst(chip.x, chip.y, color, 8, 90);
    }

    if (state.player.alive && state.player.invuln <= 0) {
      let hit = false;
      for (const enemy of state.enemies) {
        if (enemy.hp > 0 && hits(state.player, enemy)) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const bullet of state.bullets) {
          if (!bullet.friendly && !bullet.dead && hits(state.player, bullet)) {
            hit = true;
            bullet.dead = true;
            break;
          }
        }
      }
      if (hit) hurtPlayer();
    }

    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0 && enemy.y < H + 48);
    state.bullets = state.bullets.filter(
      (bullet) => !bullet.dead && bullet.x > -30 && bullet.x < W + 30 && bullet.y > -40 && bullet.y < H + 40,
    );
    state.chips = state.chips.filter((chip) => !chip.dead && chip.y < H + 40);
    state.beams = state.beams.filter((beam) => beam.age < beam.maxAge);
  }

  return {
    get state() {
      return state;
    },
    start() {
      if (state.mode !== 'title') return;
      beginRun();
    },
    restart() {
      state = createState(rng);
      beginRun();
    },
    update,
  };
}
