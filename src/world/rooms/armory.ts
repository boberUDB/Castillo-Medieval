import { P } from '../../engine/palette';
import { ashlar, bayer, disc, ellipse, hash, line, planks, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { GROUND, SPACE, UPPER } from '../layout';
import type { SpaceDef } from '../types';
import { armorSprite, beam, corbel, doorFrame, flame, floorBand, pillar, torchBracket } from '../props';
import { bakeStair, type StairSpec } from './passages';

const M = SPACE.armory;
const LEGEND = { x: 2064, y: 318 };
const DUMMY = { x: 2178, y: GROUND - 12 };
const WHEEL = { x: 2232, y: 368 };

function sword(ctx: Ctx, x: number, top: number, len: number, hilt: string): void {
  rect(ctx, x, top, 2, len, P.metal3);
  rect(ctx, x, top, 1, len, P.metal4);
  px(ctx, x, top - 1, P.metal3);
  rect(ctx, x - 3, top + len, 8, 2, hilt);
  rect(ctx, x, top + len + 2, 2, 6, P.wood2);
  disc(ctx, x + 1, top + len + 9, 1, hilt);
}

function spear(ctx: Ctx, x: number, top: number, len: number): void {
  rect(ctx, x, top + 6, 1, len, P.wood3);
  rect(ctx, x - 1, top, 3, 6, P.metal3);
  px(ctx, x, top - 1, P.metal4);
  rect(ctx, x - 1, top + 6, 3, 1, P.red2);
}

function heater(ctx: Ctx, x: number, y: number, a: string, b: string, charge: 'bar' | 'star' | 'dragon' | 'cross' | 'bend'): void {
  for (let j = 0; j < 22; j++) {
    const k = j / 21;
    const half = k < 0.5 ? 8 : Math.round(8 * Math.sqrt(Math.max(0, 1 - ((k - 0.5) / 0.5) ** 2)));
    for (let i = -half; i < half; i++) {
      let c = i < 0 ? a : b;
      if (charge === 'bend') c = i + 8 > j * 0.8 ? a : b;
      if (i === -half || i === half - 1 || j === 0) c = P.metal2;
      px(ctx, x + i, y + j, c);
    }
  }
  if (charge === 'bar') rect(ctx, x - 7, y + 8, 14, 3, P.gold2);
  else if (charge === 'star') {
    rect(ctx, x - 1, y + 5, 2, 8, P.gold3);
    rect(ctx, x - 4, y + 8, 8, 2, P.gold3);
  } else if (charge === 'cross') {
    rect(ctx, x - 1, y + 3, 2, 14, P.parch0);
    rect(ctx, x - 5, y + 7, 10, 2, P.parch0);
  } else if (charge === 'dragon') {
    ellipse(ctx, x, y + 10, 4, 3, P.green4);
    rect(ctx, x + 3, y + 6, 3, 3, P.green4);
    px(ctx, x + 5, y + 7, P.red3);
    line(ctx, x - 4, y + 11, x - 6, y + 15, P.green4);
    line(ctx, x - 2, y + 8, x - 5, y + 4, P.green3);
  }
  rect(ctx, x - 6, y + 1, 5, 1, P.metal4);
}

function dummy(ctx: Ctx, t: number, since: number, reduced: boolean): void {
  const hit = since >= 0 && since < 1.6 ? Math.sin(since * 14) * Math.exp(-since * 2.6) : 0;
  const idle = reduced ? 0 : Math.sin(t * 0.9) * 0.05;
  const ang = hit * 0.5 + idle;
  const { x, y } = DUMMY;
  // poste
  rect(ctx, x - 1, y - 12, 3, 12, P.wood2);
  rect(ctx, x - 8, y, 17, 3, P.wood1);
  const at = (dx: number, dy: number) => ({ x: x + dx * Math.cos(ang) - dy * Math.sin(ang), y: y - 12 + dx * Math.sin(ang) + dy * Math.cos(ang) });
  // cuerpo de paja
  for (let j = 0; j < 26; j++) {
    const w = j < 4 ? 7 : j > 20 ? 6 : 9;
    for (let i = -w; i <= w; i++) {
      const p = at(i * 0.6, -j);
      px(ctx, p.x, p.y, (i + j) % 5 === 0 ? P.gold1 : (i * 3 + j) % 7 === 0 ? P.gold3 : P.gold2);
    }
  }
  // cuerda en la cintura y brazos de palo
  for (let i = -6; i <= 6; i++) {
    const p = at(i * 0.6, -8);
    px(ctx, p.x, p.y, P.wood1);
  }
  for (let i = -12; i <= 12; i++) {
    const p = at(i, -20);
    px(ctx, p.x, p.y, P.wood3);
  }
  // cabeza de saco con cara pintada
  for (let j = 0; j < 11; j++) {
    for (let i = -5; i <= 5; i++) {
      if (i * i + (j - 5) * (j - 5) > 30) continue;
      const p = at(i, -27 - j);
      px(ctx, p.x, p.y, P.parch2);
    }
  }
  const e1 = at(-2, -33);
  const e2 = at(2, -33);
  const m = at(0, -30);
  if (since >= 0 && since < 1.2) {
    // ojos en cruz
    px(ctx, e1.x, e1.y, P.ink);
    px(ctx, e1.x - 1, e1.y - 1, P.ink);
    px(ctx, e1.x + 1, e1.y + 1, P.ink);
    px(ctx, e2.x, e2.y, P.ink);
    px(ctx, e2.x - 1, e2.y + 1, P.ink);
    px(ctx, e2.x + 1, e2.y - 1, P.ink);
  } else {
    px(ctx, e1.x, e1.y, P.ink);
    px(ctx, e2.x, e2.y, P.ink);
  }
  rect(ctx, m.x - 2, m.y, 4, 1, P.red1);
  // paja que sale volando al golpearlo
  if (since >= 0 && since < 1.5) {
    for (let k = 0; k < 12; k++) {
      const a = hash(k, 1, 31) * Math.PI - Math.PI;
      const d = since * (20 + hash(k, 2, 31) * 20);
      px(ctx, x + Math.cos(a) * d, y - 24 + Math.sin(a) * d + since * since * 20, P.gold3);
    }
  }
}

function grindstone(ctx: Ctx, t: number, since: number): void {
  const { x, y } = WHEEL;
  const spinning = since >= 0 && since < 3;
  const rot = t * (spinning ? 14 * (1 - since / 3) + 0.3 : 0.3);
  rect(ctx, x - 12, y + 10, 24, 3, P.wood2);
  rect(ctx, x - 10, y + 13, 3, GROUND - y - 13, P.wood2);
  rect(ctx, x + 8, y + 13, 3, GROUND - y - 13, P.wood2);
  disc(ctx, x, y, 10, P.stone4);
  disc(ctx, x, y, 8, P.stone5);
  for (let k = 0; k < 4; k++) {
    const a = rot + (k * Math.PI) / 2;
    line(ctx, x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 8, P.stone3);
  }
  disc(ctx, x, y, 2, P.metal1);
  line(ctx, x, y, x + Math.cos(rot * 0.5) * 14, y + Math.sin(rot * 0.5) * 14, P.wood3);
  if (spinning && since < 2) {
    for (let k = 0; k < 6; k++) {
      const life = (t * 3 + k * 0.17) % 1;
      px(ctx, x - 10 - life * 14, y - 2 - life * 10 + life * life * 16, life < 0.5 ? P.fire1 : P.fire3);
    }
  }
}

export const armory: SpaceDef = {
  id: 'armory',
  room: 'armory',
  interior: M,
  bounds: { x: M.x - 16, y: M.y, w: M.w + 32, h: M.h },
  ambient: 0.62,
  bake(ctx) {
    ashlar(ctx, M.x, M.y, M.w, M.h, { bw: 22, bh: 11, base: [P.stone3, P.stone4, P.stone3], hi: P.stone5, lo: P.stone2, mortar: P.stone2, seed: 71, cracks: 0.05 });
    beam(ctx, M.x, M.y, M.w);
    for (let x = M.x + 24; x < M.x + M.w; x += 64) corbel(ctx, x, M.y + 6);
    pillar(ctx, 2002, 198, 388, 10);
    pillar(ctx, 2146, 198, 388, 10);
    floorBand(ctx, M.x, 388, M.w, 12, 23);

    // armero: espadas y lanzas
    planks(ctx, 1854, 382, 80, 4, false, 4, [P.wood3], 3);
    rect(ctx, 1854, 318, 80, 3, P.wood3);
    rect(ctx, 1854, 318, 80, 1, P.wood5);
    rect(ctx, 1856, 321, 3, 61, P.wood2);
    rect(ctx, 1929, 321, 3, 61, P.wood2);
    for (const [i, x] of [1866, 1878, 1890, 1902, 1914].entries()) sword(ctx, x, 322, 40 + (i % 2) * 6, [P.gold2, P.metal2, P.red2, P.gold2, P.metal3][i]);
    spear(ctx, 1862, 240, 120);
    spear(ctx, 1924, 236, 124);
    // hachas cruzadas sobre el armero
    line(ctx, 1878, 250, 1908, 290, P.wood3);
    line(ctx, 1908, 250, 1878, 290, P.wood3);
    for (const [hx, hy, d] of [
      [1876, 248, 1],
      [1906, 248, -1],
    ]) {
      rect(ctx, hx - 2, hy - 2, 7, 8, P.metal3);
      rect(ctx, hx + (d > 0 ? -3 : 5), hy - 3, 1, 10, P.metal4);
    }
    // pared de escudos
    heater(ctx, 1958, 230, P.red2, P.red1, 'bar');
    heater(ctx, 1982, 230, P.blue1, P.blue0, 'star');
    heater(ctx, 1958, 262, P.green2, P.green1, 'dragon');
    heater(ctx, 1982, 262, P.parch2, P.parch3, 'cross');
    heater(ctx, 1970, 296, P.violet3, P.gold1, 'bend');
    // pedestal de la armadura legendaria con escalones
    rect(ctx, 2046, 382, 52, 6, P.stone5);
    rect(ctx, 2046, 382, 52, 1, P.stone7);
    rect(ctx, 2052, 376, 40, 6, P.stone5);
    rect(ctx, 2052, 376, 40, 1, P.stone7);
    // estandarte sobre ella
    rect(ctx, 2056, 210, 32, 2, P.wood2);
    for (let j = 0; j < 60; j++) rect(ctx, 2058, 212 + j, 28 - (j > 52 ? (j - 52) * 2 : 0), 1, j % 9 === 0 ? P.red1 : P.red2);
    rect(ctx, 2058, 212, 2, 52, P.gold2);
    rect(ctx, 2084, 212, 2, 52, P.gold2);
    disc(ctx, 2072, 236, 7, P.gold2);
    disc(ctx, 2072, 236, 5, P.red2);
    rect(ctx, 2068, 234, 8, 1, P.gold3);
    rect(ctx, 2071, 230, 2, 11, P.gold3);
    // yunque
    rect(ctx, 2108, 372, 22, 5, P.metal1);
    rect(ctx, 2104, 372, 6, 3, P.metal1);
    rect(ctx, 2108, 372, 22, 1, P.metal3);
    rect(ctx, 2114, 377, 10, 5, P.metal0);
    rect(ctx, 2110, 382, 18, 6, P.wood2);
    // brasero
    rect(ctx, 2254, 376, 12, 6, P.metal1);
    rect(ctx, 2252, 374, 16, 2, P.metal2);
    rect(ctx, 2257, 382, 2, 6, P.metal0);
    rect(ctx, 2262, 382, 2, 6, P.metal0);
    torchBracket(ctx, 1946, 300);
    torchBracket(ctx, 2160, 300);
    doorFrame(ctx, 1824, GROUND, 16, 64);
    doorFrame(ctx, 2272, GROUND, 16, 64);
  },
  draw(ctx, t, fx) {
    flame(ctx, 1946, 291, t, 31);
    flame(ctx, 2160, 291, t, 32);
    for (let i = 0; i < 3; i++) flame(ctx, 2256 + i * 4, 374, t, 33 + i, 0.9);

    // armadura legendaria: aura y saludo al tocarla
    const s = t - fx.since('armory.legend');
    const salute = s >= 0 && s < 3;
    const aura = fx.reduced ? 0.5 : (Math.sin(t * 2) + 1) / 2;
    for (let k = 0; k < 14; k++) {
      const life = (t * 0.4 + k / 14) % 1;
      const ax = LEGEND.x + 4 + hash(k, 1, 41) * 18;
      const ay = LEGEND.y + 44 - life * (salute ? 70 : 44);
      if (bayer(Math.round(ax), Math.round(ay)) < 0.8 - life * 0.6) px(ctx, ax, ay, salute ? P.teal4 : P.teal3);
    }
    const lift = salute ? Math.round(-Math.sin(Math.min(1, s * 2) * Math.PI * 0.5) * 2) : 0;
    ctx.drawImage(armorSprite('legend'), LEGEND.x, LEGEND.y + lift);
    if (salute || aura > 0.7) {
      px(ctx, LEGEND.x + 9, LEGEND.y + 8 + lift, P.teal4);
      px(ctx, LEGEND.x + 13, LEGEND.y + 8 + lift, P.teal4);
    }
    if (salute && s < 1.5) {
      // la espada se alza en saludo
      rect(ctx, LEGEND.x + 19, LEGEND.y + 2 + lift, 2, 22, P.metal4);
      rect(ctx, LEGEND.x + 16, LEGEND.y + 22 + lift, 8, 2, P.gold2);
    }

    // espadas que tintinean
    const sw = t - fx.since('armory.sword');
    if (sw >= 0 && sw < 0.8) for (const x of [1866, 1878, 1890, 1902, 1914]) px(ctx, x + Math.round(Math.sin(sw * 40 + x) * 1), 330, P.metal4);
    // escudo que destella
    const sh = t - fx.since('armory.shield');
    if (sh >= 0 && sh < 0.6) {
      const k = Math.floor(sh * 10);
      line(ctx, 1950 + k * 4, 230, 1942 + k * 4, 316, P.metal4);
    }
    dummy(ctx, t, t - fx.since('armory.dummy'), fx.reduced);
    grindstone(ctx, t, t - fx.since('armory.grindstone'));
  },
  lights(t, fx) {
    const L: Light[] = [
      { x: 1946, y: 288, r: 50, flicker: 1, glow: 0.3 },
      { x: 2160, y: 288, r: 50, flicker: 1, glow: 0.3, seed: 5 },
      { x: 2260, y: 368, r: 46, flicker: 1.5, glow: 0.35 },
      { x: LEGEND.x + 12, y: LEGEND.y + 20, r: 40, kind: 'teal', glow: 0.3, flicker: 0.3 },
    ];
    if (t - fx.since('armory.legend') < 3) L.push({ x: LEGEND.x + 12, y: LEGEND.y + 10, r: 70, kind: 'teal', glow: 0.5 });
    return L;
  },
  hotspots: [
    { id: 'armory.legend', x: LEGEND.x - 4, y: LEGEND.y - 4, w: 32, h: 70, label: 'Examinar la armadura legendaria', kind: 'main' },
    { id: 'armory.sword', x: 1856, y: 316, w: 76, h: 70, label: 'Examinar el armero de espadas', kind: 'minor' },
    { id: 'armory.shield', x: 1948, y: 228, w: 44, h: 92, label: 'Examinar la pared de escudos', kind: 'minor' },
    { id: 'armory.dummy', x: DUMMY.x - 14, y: DUMMY.y - 50, w: 28, h: 52, label: 'Golpear al muñeco de entrenamiento', kind: 'minor' },
    { id: 'armory.grindstone', x: WHEEL.x - 14, y: WHEEL.y - 12, w: 28, h: 32, label: 'Girar la piedra de afilar', kind: 'minor' },
  ],
};

/* ================================ escalera al salón del trono ================================ */

const S3 = SPACE.stair3;
export const STAIR3: StairSpec = {
  bounds: { x: S3.x, y: UPPER, w: S3.w, h: GROUND - UPPER },
  from: { x: 2296, floor: GROUND },
  to: { x: 2440, floor: UPPER },
  steps: 18,
  headroom: 60,
  open: [{ x: 2432, y: UPPER, w: 32, h: 16 }],
  seed: 2,
};

export const stair3: SpaceDef = {
  id: 'stair3',
  interior: S3,
  bounds: STAIR3.bounds,
  ambient: 0.72,
  bake(ctx) {
    bakeStair(ctx, STAIR3);
    torchBracket(ctx, 2352, 316);
    torchBracket(ctx, 2410, 240);
  },
  draw(ctx, t) {
    flame(ctx, 2352, 307, t, 41);
    flame(ctx, 2410, 231, t, 42);
  },
  lights: () => [
    { x: 2352, y: 304, r: 42, flicker: 1, glow: 0.28 },
    { x: 2410, y: 228, r: 42, flicker: 1, glow: 0.28, seed: 2 },
  ],
};
