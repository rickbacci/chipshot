import { COLORS, PLAYFIELD, TUNABLES } from './tunables.js';

const W = PLAYFIELD.w;
const H = PLAYFIELD.h;

function drawShip(ctx, x, y, muzzle, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#06202a';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-13, 13);
  ctx.lineTo(0, 7);
  ctx.lineTo(13, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(-11, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(11, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#dff8ff';
  ctx.fillRect(-1.4, -6, 2.8, 8);
  const flame = 5 + Math.sin(time * 28) * 2;
  ctx.fillStyle = muzzle > 0 ? '#fff4c8' : '#ffb020';
  ctx.beginPath();
  ctx.moveTo(-3.5, 10);
  ctx.lineTo(0, 10 + flame);
  ctx.lineTo(3.5, 10);
  ctx.closePath();
  ctx.fill();
  if (muzzle > 0) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-4, -10);
    ctx.lineTo(4, -10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSwarmer(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = '#3a1020';
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.lineTo(-12, -8);
  ctx.lineTo(0, -3);
  ctx.lineTo(12, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.enemy;
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.lineTo(-10, -7);
  ctx.lineTo(0, -2);
  ctx.lineTo(10, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd0da';
  ctx.fillRect(-1.5, -2, 3, 6);
  ctx.restore();
}

function drawChip(ctx, chip) {
  const color = chip.n === 6 ? COLORS.laser : COLORS.spread;
  const arm = Math.max(0, chip.armIn ?? 0);
  const arming = arm > 0;
  const scale = arming ? 0.55 + 0.45 * (1 - arm / TUNABLES.chipArm) : 1;
  const urgent = !arming && chip.cycleIn < 0.4;
  const pulse = urgent ? 1 + Math.sin(chip.cycleIn * 46) * 0.07 : 1;
  ctx.save();
  ctx.translate(chip.x, chip.y);
  ctx.scale(scale * pulse, scale * pulse);
  ctx.globalAlpha = arming ? 0.55 : 1;
  ctx.beginPath();
  ctx.arc(0, 0, chip.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 10, 16, 0.94)';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = chip.flipped > 0 ? '#ffffff' : color;
  ctx.stroke();
  if (!arming && chip.cycleMax) {
    const frac = Math.max(0, Math.min(1, chip.cycleIn / chip.cycleMax));
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.arc(0, 0, chip.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = '#061018';
  ctx.lineWidth = 5;
  ctx.font = `700 ${Math.round(chip.r * 1.35)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(String(chip.n), 0, 1);
  ctx.fillText(String(chip.n), 0, 1);
  ctx.restore();
}

function drawReadout(ctx, player) {
  const y = Math.max(18, player.y - 28);
  ctx.font = '700 16px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (player.weapon == null) {
    ctx.fillStyle = 'rgba(230, 237, 247, 0.4)';
    ctx.fillText('—', player.x, y);
    return;
  }
  const color = player.weapon === 6 ? COLORS.laser : COLORS.spread;
  ctx.fillStyle = color;
  ctx.fillText(`${player.weapon}  LV ${player.level}`, player.x, y);
}

export function render(ctx, state) {
  const mag = state.shake;
  const ox = Math.sin(state.time * 73) * mag;
  const oy = Math.cos(state.time * 59) * mag;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(-24, -24, W + 48, H + 48);

  for (const star of state.stars) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = star.tint;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const beam of state.beams) {
    const fade = Math.max(0, 1 - beam.age / beam.maxAge);
    ctx.globalAlpha = fade * 0.85;
    ctx.fillStyle = COLORS.laser;
    ctx.fillRect(beam.x - beam.width / 2, beam.y - beam.length, beam.width, beam.length);
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#f4fffc';
    ctx.fillRect(beam.x - 1.4, beam.y - beam.length, 2.8, beam.length);
  }
  ctx.globalAlpha = 1;

  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.kind === 'spread'
      ? COLORS.spread
      : bullet.kind === 'enemy'
        ? COLORS.enemyBullet
        : COLORS.main;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const enemy of state.enemies) drawSwarmer(ctx, enemy);
  for (const chip of state.chips) drawChip(ctx, chip);

  const player = state.player;
  const blink = player.invuln > 0 && Math.floor(state.time * 16) % 2 === 0;
  if (player.alive) {
    if (!blink) {
      const bob = state.mode === 'title' ? Math.sin(state.time * 2.2) * 4 : 0;
      drawShip(ctx, player.x, player.y + bob, player.muzzle, state.time);
    }
    if (state.mode === 'playing') drawReadout(ctx, player);
  }

  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  for (const item of state.floaters) {
    ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
    ctx.fillStyle = item.color;
    ctx.font = '700 18px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 70, 90, ${Math.min(0.35, state.flash)})`;
    ctx.fillRect(-24, -24, W + 48, H + 48);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, H);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
  vignette.addColorStop(0.18, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
