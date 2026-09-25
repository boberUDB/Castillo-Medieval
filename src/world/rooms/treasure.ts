import { P } from '../../engine/palette';
import { ashlar, bayer, disc, ellipse, hash, line, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { BASEMENT, SPACE } from '../layout';
import { SECTION } from '../shell';
import type { FxState, SpaceDef } from '../types';
import { doorFrame, flame, floorBand, torchBracket, webCorner } from '../props';

const R = SPACE.treasure;
const FLOOR = BASEMENT - 12; // 596
const CHEST = { x: 3026, y: FLOOR - 28, w: 44, h: 28 };
const MIMIC = { x: 3100, y: FLOOR - 18 };
const CROWN = { x: 2990 };
const CLUES = ['leido', 'hervido', 'llorado'];

function vaultTop(x: number): number {
  const half = R.w / 2;
  const t = (x - (R.x + half)) / half;
  return R.y + Math.round((1 - Math.sqrt(Math.max(0, 1 - t * t))) * 34);
}

function coinPile(ctx: Ctx, cx: number, w: number, h: number, seed: number): void {
  for (let j = 0; j < h; j++) {
    const k = j / h;
    const half = Math.round((w / 2) * Math.sqrt(1 - k * k * 0.9));
    const y = FLOOR - j;
    for (let i = -half; i <= half; i++) {
      const n = hash(i + cx, j, seed);
      const shade = (i + half) / (2 * half + 1);
      let c: string = shade < 0.3 ? P.gold1 : shade > 0.8 ? P.gold1 : P.gold2;
      if (n > 0.8) c = P.gold3;
      if (n < 0.08) c = P.gold0;
      if (j === Math.floor(h * Math.sqrt(1 - ((i / (half + 1)) ** 2))) - 1 && bayer(i, j) > 0.5) c = P.gold4;
      px(ctx, cx + i, y, c);
    }
  }
  // monedas sueltas
  for (let k = 0; k < 8; k++) {
    const x = cx - w / 2 - 6 + hash(k, 1, seed) * (w + 12);
    rect(ctx, x, FLOOR - 1, 3, 1, P.gold3);
    px(ctx, x + 1, FLOOR - 2, P.gold2);
  }
}

function chestArt(ctx: Ctx, t: number, fx: FxState): void {
  const { x, y, w, h } = CHEST;
  const opened = fx.flag('done:treasure.opened');
  const s = t - fx.since('treasure.open');
  const lidOpen = opened ? Math.min(1, Math.max(0, s >= 0 && s < 2 ? s / 1.2 : 1)) : 0;
  // haz de luz del interior
  if (lidOpen > 0) {
    for (let j = 0; j < 60; j++) {
      const half = Math.round(8 + j * 0.4);
      for (let i = -half; i <= half; i++) if (bayer(x + w / 2 + i, y - j) < 0.3 * (1 - j / 60) * lidOpen) px(ctx, x + w / 2 + i, y - j, P.gold4);
    }
  }
  // tapa: cerrada (curva) o abierta hacia atrás
  if (lidOpen < 0.5) {
    for (let j = 0; j < 9; j++) {
      const inset = Math.round(4 - Math.sqrt(Math.max(0, 16 - (9 - j) * 1.8)));
      rect(ctx, x + inset, y - 9 + j, w - inset * 2, 1, j < 2 ? P.wood4 : P.wood3);
    }
    rect(ctx, x, y - 1, w, 2, P.gold2);
  } else {
    rect(ctx, x + 2, y - 20, w - 4, 16, P.wood2);
    rect(ctx, x + 2, y - 20, w - 4, 2, P.gold2);
    rect(ctx, x + 4, y - 16, w - 8, 10, P.wood1);
    // el corazón del rey: una caja de música dorada que flota
    const bob = fx.reduced ? 0 : Math.round(Math.sin(t * 2) * 2);
    rect(ctx, x + w / 2 - 6, y - 16 + bob, 12, 8, P.gold2);
    rect(ctx, x + w / 2 - 6, y - 16 + bob, 12, 2, P.gold3);
    disc(ctx, x + w / 2, y - 11 + bob, 2, P.red3);
    line(ctx, x + w / 2 + 6, y - 12 + bob, x + w / 2 + 9, y - 12 + bob, P.gold1);
    for (let k = 0; k < 3; k++) {
      const life = (t * 0.6 + k / 3) % 1;
      const nx = x + w / 2 + 8 + life * 14;
      const ny = y - 20 - life * 20 + Math.sin(life * 8) * 2;
      rect(ctx, nx, ny, 1, 4, P.gold4);
      rect(ctx, nx - 2, ny + 3, 2, 2, P.gold4);
    }
  }
  // cuerpo
  rect(ctx, x, y + 1, w, h - 1, P.wood2);
  for (let i = 0; i < w; i += 6) rect(ctx, x + i, y + 1, 1, h - 1, P.wood1);
  rect(ctx, x, y + 1, w, 2, P.wood4);
  for (const bx of [x + 4, x + w - 8]) rect(ctx, bx, y - 1, 4, h + 1, P.gold1);
  rect(ctx, x, y + h - 3, w, 3, P.gold1);
  // tres engastes: se iluminan con cada eco encontrado
  CLUES.forEach((c, i) => {
    const cx = x + 13 + i * 9;
    const cy = y + 12;
    disc(ctx, cx, cy, 3, P.gold0);
    const lit = fx.flag(`clue:${c}`);
    disc(ctx, cx, cy, 2, lit ? [P.parch0, P.green4, P.ghost1][i] : P.ink);
    if (lit && !fx.reduced && Math.sin(t * 3 + i) > 0.6) px(ctx, cx - 1, cy - 1, P.star);
  });
  // cerradura
  rect(ctx, x + w / 2 - 3, y + 18, 6, 6, P.gold2);
  px(ctx, x + w / 2, y + 20, P.ink);
  px(ctx, x + w / 2, y + 21, P.ink);
}

function mimic(ctx: Ctx, t: number, since: number): void {
  const { x, y } = MIMIC;
  const open = since >= 0 && since < 2 ? Math.round(Math.sin(Math.min(1, since * 3) * Math.PI * 0.5) * 8 * (since < 1.6 ? 1 : (2 - since) / 0.4)) : 0;
  const hop = since >= 0 && since < 0.6 ? Math.round(-Math.sin((since / 0.6) * Math.PI) * 4) : 0;
  const by = y + hop;
  rect(ctx, x, by + 6, 26, 12, P.wood3);
  rect(ctx, x, by + 6, 26, 1, P.wood4);
  rect(ctx, x + 2, by + 6, 2, 12, P.metal1);
  rect(ctx, x + 22, by + 6, 2, 12, P.metal1);
  if (open > 0) {
    rect(ctx, x + 1, by + 6 - open, 24, open, P.red0);
    for (let i = 2; i < 24; i += 3) {
      px(ctx, x + i, by + 6 - open, P.parch0);
      px(ctx, x + i + 1, by + 5, P.parch0);
    }
    rect(ctx, x + 8, by + 4, 10, 2, P.red3);
    px(ctx, x + 6, by + 1 - open, P.fire1);
    px(ctx, x + 19, by + 1 - open, P.fire1);
  }
  rect(ctx, x, by - open, 26, 6, P.wood3);
  rect(ctx, x, by - open, 26, 1, P.wood5);
  rect(ctx, x + 2, by - open, 2, 6, P.metal1);
  rect(ctx, x + 22, by - open, 2, 6, P.metal1);
  if (open === 0 && Math.sin(t * 0.7) > 0.97) {
    px(ctx, x + 8, by + 5, P.fire1);
    px(ctx, x + 17, by + 5, P.fire1);
  }
}

export const treasure: SpaceDef = {
  id: 'treasure',
  room: 'treasure',
  interior: R,
  bounds: { x: R.x - 16, y: R.y, w: R.w + 32, h: R.h },
  ambient: 0.7,
  bake(ctx) {
    ashlar(ctx, R.x, R.y, R.w, R.h, { bw: 14, bh: 7, base: [P.stone2, P.violet2, P.stone3], hi: P.stone4, lo: P.violet1, mortar: P.violet0, seed: 101, moss: 0.05 });
    ctx.save();
    ctx.beginPath();
    for (let x = R.x; x < R.x + R.w; x++) ctx.rect(x, R.y, 1, vaultTop(x) - R.y);
    ctx.clip();
    ashlar(ctx, R.x, R.y, R.w, 40, { ...SECTION, seed: 4 });
    ctx.restore();
    for (let x = R.x; x < R.x + R.w; x++) px(ctx, x, vaultTop(x), P.stone5);
    floorBand(ctx, R.x, FLOOR, R.w, 12, 31);
    coinPile(ctx, 2946, 72, 18, 1);
    coinPile(ctx, 3160, 60, 14, 2);
    // espada clavada en el montón
    rect(ctx, 3166, FLOOR - 34, 2, 24, P.metal3);
    rect(ctx, 3166, FLOOR - 34, 1, 24, P.metal4);
    rect(ctx, 3161, FLOOR - 37, 12, 2, P.gold2);
    rect(ctx, 3166, FLOOR - 43, 2, 6, P.wood2);
    disc(ctx, 3167, FLOOR - 44, 1, P.red3);
    // pedestal con la corona sobre un cojín
    rect(ctx, CROWN.x - 6, FLOOR - 22, 12, 22, P.stone5);
    rect(ctx, CROWN.x - 8, FLOOR - 24, 16, 3, P.stone6);
    ellipse(ctx, CROWN.x, FLOOR - 26, 7, 2, P.red2);
    rect(ctx, CROWN.x - 5, FLOOR - 32, 10, 4, P.gold2);
    for (const dx of [-5, -1, 3]) rect(ctx, CROWN.x + dx, FLOOR - 35, 2, 3, P.gold3);
    px(ctx, CROWN.x, FLOOR - 30, P.teal3);
    // estante con copas y platos
    rect(ctx, 3112, 522, 64, 3, P.wood3);
    rect(ctx, 3112, 522, 64, 1, P.wood5);
    for (const gx of [3118, 3134, 3160]) {
      rect(ctx, gx, 512, 6, 4, P.gold2);
      rect(ctx, gx + 2, 516, 2, 4, P.gold1);
      rect(ctx, gx + 1, 520, 4, 2, P.gold2);
    }
    disc(ctx, 3148, 515, 6, P.gold1);
    disc(ctx, 3148, 515, 4, P.gold2);
    torchBracket(ctx, 2926, 540);
    torchBracket(ctx, 3186, 540);
    webCorner(ctx, R.x, vaultTop(R.x), 12, false);
    doorFrame(ctx, 2880, BASEMENT, 16, 56);
    doorFrame(ctx, 3200, BASEMENT, 16, 56);
  },
  draw(ctx, t, fx) {
    // destellos en las monedas
    for (let k = 0; k < 10; k++) {
      const ph = (t * 0.8 + k * 0.23) % 1;
      if (ph > 0.25) continue;
      const pile = k % 2 ? { cx: 2946, w: 72, h: 18 } : { cx: 3160, w: 60, h: 14 };
      const gx = pile.cx - pile.w / 3 + hash(k, Math.floor(t * 0.8 + k * 0.23), 3) * (pile.w * 0.66);
      const gy = FLOOR - 2 - hash(k, 7, 3) * pile.h * 0.7;
      px(ctx, gx, gy, P.star);
      if (ph < 0.12) {
        px(ctx, gx - 1, gy, P.gold4);
        px(ctx, gx + 1, gy, P.gold4);
        px(ctx, gx, gy - 1, P.gold4);
        px(ctx, gx, gy + 1, P.gold4);
      }
    }
    // monedas que ruedan al tocar el montón
    const cs = t - fx.since('treasure.coins');
    if (cs >= 0 && cs < 2.5) {
      for (let k = 0; k < 9; k++) {
        const dir = k % 2 ? 1 : -1;
        const sp = 14 + hash(k, 1, 5) * 26;
        const x = 2946 + dir * (10 + cs * sp);
        const bounce = Math.abs(Math.sin(cs * 6 + k)) * 6 * Math.max(0, 1 - cs / 1.5);
        rect(ctx, x, FLOOR - 1 - bounce, 2, 1, k % 3 ? P.gold3 : P.gold4);
      }
    }
    const cr = t - fx.since('treasure.crown');
    if (cr >= 0 && cr < 1.2) {
      const k = Math.floor(cr * 8) % 4;
      px(ctx, CROWN.x - 6 + k * 4, FLOOR - 36, P.star);
    }
    chestArt(ctx, t, fx);
    mimic(ctx, t, t - fx.since('treasure.mimic'));
    flame(ctx, 2926, 531, t, 71);
    flame(ctx, 3186, 531, t, 72);
  },
  lights(_t, fx) {
    const L: Light[] = [
      { x: 2926, y: 528, r: 50, flicker: 1, glow: 0.3 },
      { x: 3186, y: 528, r: 50, flicker: 1, glow: 0.3, seed: 4 },
      { x: 2946, y: 588, r: 40, kind: 'gold', glow: 0.25 },
      { x: 3160, y: 590, r: 34, kind: 'gold', glow: 0.22 },
      { x: CHEST.x + 22, y: CHEST.y + 12, r: 26, kind: 'gold', glow: 0.2 },
    ];
    if (fx.flag('done:treasure.opened')) L.push({ x: CHEST.x + 22, y: CHEST.y - 20, r: 70, kind: 'gold', glow: 0.45, flicker: 0.3 });
    return L;
  },
  hotspots: [
    { id: 'treasure.chest', x: CHEST.x - 4, y: CHEST.y - 12, w: CHEST.w + 8, h: CHEST.h + 12, label: 'Examinar el cofre del rey', kind: 'main' },
    { id: 'treasure.coins', x: 2912, y: FLOOR - 20, w: 70, h: 22, label: 'Hundir las manos en las monedas', kind: 'minor' },
    { id: 'treasure.mimic', x: MIMIC.x - 2, y: MIMIC.y - 4, w: 30, h: 24, label: 'Abrir el cofre pequeño', kind: 'minor' },
    { id: 'treasure.crown', x: CROWN.x - 10, y: FLOOR - 38, w: 20, h: 38, label: 'Mirar la corona', kind: 'minor' },
  ],
};

/* ================================ torre (escalera de caracol) ================================ */

const TW = SPACE.tower;
const NEWEL = 3264;
const TOWER_TORCHES: [number, number][] = [
  [3300, 470],
  [3230, 210],
  [3300, -50],
  [3230, -300],
];

function spiral(ctx: Ctx, front: boolean): void {
  for (let y = BASEMENT - 6; y > TW.y + 8; y -= 6) {
    const phase = (y / 60) * Math.PI;
    const isFront = Math.cos(phase) > 0;
    if (isFront !== front) continue;
    const sx = Math.round(NEWEL + Math.sin(phase) * 30);
    const w = isFront ? 18 : 14;
    rect(ctx, sx - w / 2, y, w, 3, isFront ? P.stone5 : P.stone3);
    rect(ctx, sx - w / 2, y, w, 1, isFront ? P.stone7 : P.stone4);
    rect(ctx, sx - w / 2, y + 3, w, 1, P.stone1);
  }
}

export const tower: SpaceDef = {
  id: 'tower',
  interior: TW,
  bounds: { x: TW.x - 16, y: TW.y, w: TW.w + 16, h: TW.h },
  ambient: 0.76,
  bake(ctx) {
    ashlar(ctx, TW.x, TW.y, TW.w, TW.h, { bw: 12, bh: 6, base: [P.stone2, P.stone3, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 111, moss: 0.06 });
    // aspilleras que dejan ver el cielo
    for (let y = 520, i = 0; y > TW.y + 60; y -= 130, i++) {
      const x = i % 2 ? 3290 : 3228;
      ctx.clearRect(x, y - 22, 5, 22);
      rect(ctx, x - 1, y - 23, 7, 1, P.stone5);
      rect(ctx, x - 1, y, 7, 2, P.stone6);
      rect(ctx, x - 1, y - 22, 1, 22, P.stone5);
      rect(ctx, x + 5, y - 22, 1, 22, P.stone2);
    }
    spiral(ctx, false);
    rect(ctx, NEWEL - 5, TW.y, 10, TW.h, P.stone4);
    rect(ctx, NEWEL - 5, TW.y, 2, TW.h, P.stone6);
    rect(ctx, NEWEL + 3, TW.y, 2, TW.h, P.stone2);
    spiral(ctx, true);
    TOWER_TORCHES.forEach(([x, y]) => torchBracket(ctx, x, y));
    doorFrame(ctx, 3200, BASEMENT, 16, 56);
  },
  draw(ctx, t) {
    TOWER_TORCHES.forEach(([x, y], i) => flame(ctx, x, y - 9, t, 80 + i));
  },
  lights: () => TOWER_TORCHES.map(([x, y], i) => ({ x, y: y - 12, r: 48, flicker: 1, glow: 0.28, seed: i })),
};

