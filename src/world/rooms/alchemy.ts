import { P } from '../../engine/palette';
import { ashlar, bayer, disc, ellipse, hash, line, planks, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { GROUND, SPACE } from '../layout';
import { SECTION, groundStrip } from '../shell';
import type { FxState, SpaceDef } from '../types';
import { candle, candleFlame, doorFrame, flame, floorBand, pillar, torchBracket } from '../props';
import { bakeStair, type StairSpec } from './passages';
import type { BrewOutcome } from '../../content/texts';

const A = SPACE.alchemy;
const FLOOR = A.y + A.h; // 608
const CAULDRON = { x: 1338, y: 574 };
const PLANT = { x: 1561, y: 596 };
const BRICK = { x: 1554, y: 498 };

type BrewResult = BrewOutcome;

const LIQUID: Record<BrewResult | 'base', [string, string]> = {
  base: [P.green3, P.green4],
  eco: [P.metal3, P.metal4],
  chispas: [P.fire2, P.fire1],
  rana: [P.green2, P.green5],
  humo: [P.violet3, P.ghost1],
  eructo: [P.wood4, P.wood5],
};

/** Altura del techo abovedado en cada columna (dos tramos de bóveda de cañón). */
function vaultTop(x: number): number {
  const bays = [
    [A.x, 1424],
    [1424, A.x + A.w],
  ];
  for (const [a, b] of bays) {
    if (x >= a && x < b) {
      const half = (b - a) / 2;
      const t = (x - (a + half)) / half;
      return A.y + Math.round((1 - Math.sqrt(Math.max(0, 1 - t * t))) * 40);
    }
  }
  return A.y;
}

function flask(ctx: Ctx, x: number, base: number, type: 'round' | 'tall' | 'square', color: string): void {
  if (type === 'round') {
    disc(ctx, x + 3, base - 4, 3, P.teal4);
    disc(ctx, x + 3, base - 3, 2, color);
    rect(ctx, x + 2, base - 11, 2, 4, P.teal4);
    rect(ctx, x + 2, base - 12, 2, 1, P.wood3);
  } else if (type === 'tall') {
    rect(ctx, x + 1, base - 11, 4, 11, P.teal4);
    rect(ctx, x + 1, base - 6, 4, 6, color);
    rect(ctx, x + 2, base - 13, 2, 2, P.wood3);
  } else {
    rect(ctx, x, base - 7, 6, 7, P.teal4);
    rect(ctx, x, base - 4, 6, 4, color);
    rect(ctx, x + 1, base - 9, 4, 2, P.wood3);
  }
  px(ctx, x + 1, base - (type === 'tall' ? 10 : 6), P.star);
}

const SHELF_FLASKS: [number, number, 'round' | 'tall' | 'square', string][] = [
  [1260, 500, 'round', P.green3],
  [1269, 500, 'tall', P.red3],
  [1277, 500, 'square', P.blue2],
  [1288, 500, 'round', P.violet3],
  [1259, 532, 'tall', P.teal2],
  [1267, 532, 'round', P.gold2],
  [1278, 532, 'round', P.red2],
  [1290, 532, 'tall', P.green4],
];

const JARS: { x: number; key: string; c: string }[] = [
  { x: 1370, key: 'estrella', c: P.gold3 },
  { x: 1378, key: 'mandragora', c: P.wood4 },
  { x: 1386, key: 'triton', c: P.green2 },
  { x: 1394, key: 'dragon', c: P.red3 },
  { x: 1402, key: 'seta', c: P.teal3 },
];

function frogSprite(ctx: Ctx, x: number, y: number, jump: boolean): void {
  ellipse(ctx, x, y, 3, jump ? 1 : 2, P.green3);
  px(ctx, x - 2, y - 2, P.green4);
  px(ctx, x + 2, y - 2, P.green4);
  px(ctx, x - 2, y - 3, P.ink);
  px(ctx, x + 2, y - 3, P.ink);
  if (jump) {
    line(ctx, x - 3, y + 1, x - 5, y + 3, P.green2);
    line(ctx, x + 3, y + 1, x + 5, y + 3, P.green2);
  } else {
    rect(ctx, x - 4, y + 1, 2, 1, P.green2);
    rect(ctx, x + 3, y + 1, 2, 1, P.green2);
  }
}

function drawBrew(ctx: Ctx, t: number, fx: FxState): BrewResult | 'base' {
  let current: BrewResult | 'base' = 'base';
  let best = 1e9;
  for (const r of ['eco', 'chispas', 'rana', 'humo', 'eructo'] as BrewResult[]) {
    const s = t - fx.since(`alchemy.brew.${r}`);
    if (s >= 0 && s < 7 && s < best) {
      best = s;
      current = r;
    }
  }
  const s = best;
  const { x, y } = CAULDRON;
  if (current === 'eco') {
    // ondas de eco que se expanden
    for (let k = 0; k < 3; k++) {
      const r = Math.round(((s * 18 + k * 12) % 40) + 4);
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2;
        if ((a + k) % 3 === 0) continue;
        px(ctx, x + Math.cos(ang) * r, y - 12 + Math.sin(ang) * r * 0.5, k === 0 ? P.metal4 : P.metal3);
      }
    }
  } else if (current === 'chispas') {
    for (let k = 0; k < 26; k++) {
      const life = s * 1.4 - hash(k, 1, 7) * 0.6;
      if (life < 0 || life > 1.6) continue;
      const ang = -Math.PI / 2 + (hash(k, 2, 7) - 0.5) * 2.2;
      const sp = 30 + hash(k, 3, 7) * 40;
      const px0 = x + Math.cos(ang) * sp * life;
      const py0 = y - 8 + Math.sin(ang) * sp * life + 30 * life * life;
      px(ctx, px0, py0, [P.fire1, P.teal3, P.red3, P.gold4, P.violet3][k % 5]);
    }
  } else if (current === 'rana' && s < 3.2) {
    // la rana salta del caldero y se va dando brincos hacia la derecha
    const hop = s * 2;
    const i = Math.floor(hop);
    const f = hop - i;
    const fx0 = x + i * 16 + f * 16;
    const fy0 = (i === 0 ? y - 8 : FLOOR - 3) - Math.sin(f * Math.PI) * (i === 0 ? 14 : 8) + (i === 0 ? f * (FLOOR - 3 - (y - 8)) : 0);
    frogSprite(ctx, fx0, fy0, f > 0.1 && f < 0.9);
  } else if (current === 'humo') {
    for (let k = 0; k < 40; k++) {
      const a = hash(k, 1, 3) * Math.PI * 2;
      const r = (hash(k, 2, 3) * 18 + s * 6) * Math.min(1, s);
      const cx = x + Math.cos(a) * r;
      const cy = y - 16 - s * 6 + Math.sin(a) * r * 0.6;
      if (bayer(Math.round(cx), Math.round(cy)) < Math.max(0, 0.8 - s * 0.12)) rect(ctx, cx, cy, 2, 2, k % 3 ? P.violet3 : P.violet2);
    }
  } else if (current === 'eructo' && s < 2) {
    const r = Math.min(8, Math.round(s * 10));
    if (s < 0.9) {
      disc(ctx, x, y - 6 - r, r, P.wood4);
      px(ctx, x - Math.round(r / 2), y - 6 - r - Math.round(r / 2), P.parch0);
    } else if (s < 1.2) {
      for (let a = 0; a < 8; a++) px(ctx, x + Math.cos(a) * 10, y - 14 + Math.sin(a) * 6, P.wood5);
    }
  }
  return current;
}

function cauldron(ctx: Ctx, t: number, fx: FxState): void {
  const { x, y } = CAULDRON;
  const result = drawBrew(ctx, t, fx);
  const [liq, hi] = LIQUID[result];
  // fuego bajo el caldero
  for (let i = -2; i <= 2; i++) flame(ctx, x + i * 5, FLOOR - 2, t, i + 9, 0.7);
  // cuerpo de hierro
  ellipse(ctx, x, y + 2, 20, 12, P.ink);
  ellipse(ctx, x - 1, y + 1, 18, 10, P.metal0);
  rect(ctx, x - 14, y - 2, 4, 8, P.metal1);
  px(ctx, x - 13, y - 1, P.metal2);
  for (const lx of [-12, 0, 12]) rect(ctx, x + lx, y + 12, 2, FLOOR - (y + 12), P.metal0);
  // borde y líquido
  ellipse(ctx, x, y - 9, 20, 3, P.metal1);
  rect(ctx, x - 20, y - 10, 41, 1, P.metal2);
  ellipse(ctx, x, y - 8, 17, 2, liq);
  rect(ctx, x - 10, y - 9, 8, 1, hi);
  // burbujas
  const speed = fx.reduced ? 0.5 : 1.5;
  for (let k = 0; k < 6; k++) {
    const life = (t * speed + k * 0.37) % 1;
    const bx = x - 14 + Math.floor(hash(k, Math.floor(t * speed + k * 0.37), 5) * 28);
    if (life < 0.7) px(ctx, bx, y - 9 - Math.round(life * 3), hi);
    else if (life < 0.8) {
      px(ctx, bx - 1, y - 12, hi);
      px(ctx, bx + 1, y - 12, hi);
    }
  }
  // vapor
  for (let k = 0; k < 10; k++) {
    const life = (t * 0.25 + k * 0.1) % 1;
    const vx = x - 8 + hash(k, 1, 11) * 16 + Math.sin(t + k) * 3 * life;
    const vy = y - 12 - life * 36;
    if (life < 0.85 && bayer(Math.round(vx), Math.round(vy)) < 0.6 - life * 0.5) rect(ctx, vx, vy, 2, 1, result === 'base' ? P.green1 : hi);
  }
}

function plant(ctx: Ctx, t: number, fx: FxState): void {
  const { x, y } = PLANT;
  // maceta
  rect(ctx, x - 7, y - 12, 14, 12, P.fire4);
  rect(ctx, x - 8, y - 13, 16, 3, P.fire3);
  rect(ctx, x - 7, y - 12, 3, 12, P.fire3);
  const snap = t - fx.since('alchemy.plant');
  const lunge = snap >= 0 && snap < 0.9 ? Math.sin((snap / 0.9) * Math.PI) : 0;
  const sway = fx.reduced ? 0 : Math.sin(t * 1.3) * 1.5;
  const hx = Math.round(x - 2 + sway - lunge * 10);
  const hy = Math.round(y - 30 + lunge * 2);
  // tallo
  for (let j = 0; j < 17; j++) {
    const k = j / 17;
    px(ctx, Math.round(x + (hx + 2 - x) * k + Math.sin(k * 3) * 2), y - 13 - j, P.green2);
  }
  rect(ctx, x + 2, y - 20, 5, 2, P.green3);
  rect(ctx, x - 6, y - 17, 4, 2, P.green3);
  // cabeza con boca
  const open = snap >= 0 && snap < 0.25 ? 4 : snap >= 0.25 && snap < 0.9 ? 0 : Math.sin(t * 2) > 0.8 ? 2 : 1;
  ellipse(ctx, hx, hy - 3, 6, 3, P.green3);
  ellipse(ctx, hx, hy + 3 + open, 6, 2, P.green2);
  rect(ctx, hx - 5, hy, 10, open + 2, P.red1);
  for (let i = -4; i <= 4; i += 2) {
    px(ctx, hx + i, hy, P.parch0);
    px(ctx, hx + i + 1, hy + open + 1, P.parch0);
  }
  for (let i = -4; i <= 4; i += 3) px(ctx, hx + i, hy - 5, P.red3);
}

function herbs(ctx: Ctx, t: number, reduced: boolean): void {
  for (const [i, x] of [1268, 1296, 1458, 1498, 1580].entries()) {
    const top = vaultTop(x);
    const sw = reduced ? 0 : Math.round(Math.sin(t * 0.8 + i) * 1);
    line(ctx, x, top, x + sw, top + 8, P.wood2);
    for (let k = 0; k < 6; k++) {
      const hx = x + sw - 2 + (k % 3) * 2;
      rect(ctx, hx, top + 8 + (k >> 1), 1, 6 + (k % 2) * 2, k % 2 ? P.green2 : P.wood4);
    }
    rect(ctx, x + sw - 3, top + 8, 7, 1, P.red2);
  }
}

export const alchemy: SpaceDef = {
  id: 'alchemy',
  room: 'alchemy',
  interior: A,
  bounds: { x: A.x - 16, y: A.y, w: A.w + 32, h: A.h },
  ambient: 0.72,
  bake(ctx) {
    ashlar(ctx, A.x, A.y, A.w, A.h, { bw: 12, bh: 6, base: [P.violet2, P.stone2, P.stone3, P.stone2], hi: P.stone4, lo: P.violet1, mortar: P.violet0, seed: 51, moss: 0.12 });
    // bóveda: la sillería de sección rellena el trasdós de los arcos
    ctx.save();
    ctx.beginPath();
    for (let x = A.x; x < A.x + A.w; x++) ctx.rect(x, A.y, 1, vaultTop(x) - A.y);
    ctx.clip();
    ashlar(ctx, A.x, A.y, A.w, 44, { ...SECTION, seed: 4 });
    ctx.restore();
    for (let x = A.x; x < A.x + A.w; x++) {
      const y = vaultTop(x);
      px(ctx, x, y, P.stone5);
      px(ctx, x, y + 1, P.stone3);
    }
    pillar(ctx, 1418, 470, 596, 12);
    floorBand(ctx, A.x, 596, A.w, 12, 17);

    // estantería de frascos (izquierda)
    for (const y of [500, 532]) {
      planks(ctx, 1254, y, 50, 3, false, 3, [P.wood3], 7);
      rect(ctx, 1256, y + 3, 2, 4, P.wood1);
      rect(ctx, 1298, y + 3, 2, 4, P.wood1);
    }
    // mesa de ingredientes con cinco tarros
    rect(ctx, 1366, 574, 48, 3, P.wood3);
    rect(ctx, 1366, 574, 48, 1, P.wood5);
    rect(ctx, 1368, 577, 3, 19, P.wood2);
    rect(ctx, 1409, 577, 3, 19, P.wood2);
    for (const j of JARS) {
      rect(ctx, j.x, 564, 6, 10, P.teal4);
      rect(ctx, j.x + 1, 567, 4, 7, j.c);
      rect(ctx, j.x, 562, 6, 2, P.wood3);
      rect(ctx, j.x + 1, 569, 4, 2, P.parch0);
      px(ctx, j.x + 1, 565, P.star);
    }
    // mesa del alquimista con alambique
    rect(ctx, 1446, 566, 92, 4, P.wood3);
    rect(ctx, 1446, 566, 92, 1, P.wood5);
    rect(ctx, 1450, 570, 4, 26, P.wood2);
    rect(ctx, 1530, 570, 4, 26, P.wood2);
    disc(ctx, 1466, 554, 7, P.teal4);
    disc(ctx, 1466, 556, 5, P.violet3);
    rect(ctx, 1464, 540, 4, 8, P.teal4);
    line(ctx, 1467, 540, 1490, 532, P.metal2);
    for (let i = 0; i < 4; i++) ellipse(ctx, 1494, 536 + i * 5, 4, 1, P.gold1);
    line(ctx, 1494, 554, 1506, 556, P.metal2);
    rect(ctx, 1504, 556, 8, 10, P.teal4);
    rect(ctx, 1505, 561, 6, 5, P.violet3);
    rect(ctx, 1460, 562, 12, 4, P.metal1);
    // nota clavada en la pared
    rect(ctx, 1476, 514, 18, 14, P.parch0);
    rect(ctx, 1476, 527, 18, 1, P.parch2);
    for (let i = 0; i < 4; i++) rect(ctx, 1478, 517 + i * 3, 10 + ((i * 3) % 5), 1, P.parch3);
    px(ctx, 1485, 515, P.metal2);
    // ladrillo suelto (se ve si se mira bien: sobresale un poco)
    rect(ctx, BRICK.x, BRICK.y, 12, 6, P.stone4);
    rect(ctx, BRICK.x, BRICK.y, 12, 1, P.stone6);
    rect(ctx, BRICK.x + 12, BRICK.y + 1, 1, 6, P.violet0);
    rect(ctx, BRICK.x + 1, BRICK.y + 6, 12, 1, P.violet0);
    // setas luminosas
    for (const [mx, h] of [
      [1582, 5],
      [1587, 7],
      [1592, 4],
    ]) {
      rect(ctx, mx, 596 - h, 1, h, P.parch1);
      rect(ctx, mx - 2, 596 - h - 2, 5, 2, P.teal3);
      px(ctx, mx - 1, 596 - h - 2, P.teal4);
    }
    torchBracket(ctx, 1424, 540);
    candle(ctx, 1524, 566, 5);
    doorFrame(ctx, 1232, FLOOR, 16, 56);
    doorFrame(ctx, 1600, FLOOR, 16, 56);
  },
  draw(ctx, t, fx) {
    herbs(ctx, t, fx.reduced);
    cauldron(ctx, t, fx);
    plant(ctx, t, fx);
    // frascos que tintinean al tocarlos
    const clink = t - fx.since('alchemy.shelf');
    SHELF_FLASKS.forEach(([x, y, type, c], i) => {
      const j = clink >= 0 && clink < 1 ? Math.round(Math.sin(clink * 30 + i) * (1 - clink)) : 0;
      flask(ctx, x + j, y, type, c);
    });
    // goteo del alambique
    const drip = (t * 0.7) % 1;
    if (drip < 0.6) px(ctx, 1508, 557 + Math.round(drip * 8), P.violet3);
    // secreto: el ladrillo sale y deja ver una receta enrollada
    if (fx.flag('secret:ladrillo')) {
      rect(ctx, BRICK.x, BRICK.y, 12, 6, P.ink);
      rect(ctx, BRICK.x + 3, BRICK.y + 2, 6, 3, P.parch1);
      px(ctx, BRICK.x + 5, BRICK.y + 3, P.red2);
      rect(ctx, BRICK.x - 2, 594, 12, 2, P.stone4);
    }
    candleFlame(ctx, 1524, 560, t, 4);
    flame(ctx, 1424, 531, t, 6);
  },
  lights(t, fx) {
    const L: Light[] = [
      { x: CAULDRON.x, y: 588, r: 58, flicker: 1.4, glow: 0.35 },
      { x: CAULDRON.x, y: 562, r: 40, kind: 'green', glow: 0.35, flicker: 0.4 },
      { x: 1276, y: 506, r: 20, kind: 'teal', glow: 0.25 },
      { x: 1424, y: 528, r: 46, flicker: 1, glow: 0.28 },
      { x: 1524, y: 558, r: 30, kind: 'candle', flicker: 0.6, glow: 0.22 },
      { x: 1587, y: 588, r: 20, kind: 'teal', glow: 0.35 },
      { x: 1466, y: 556, r: 16, kind: 'ghost', glow: 0.25 },
    ];
    if (t - fx.since('alchemy.brew.eco') < 7) L.push({ x: CAULDRON.x, y: 560, r: 60, kind: 'ghost', glow: 0.45 });
    if (t - fx.since('alchemy.brew.chispas') < 3) L.push({ x: CAULDRON.x, y: 540, r: 70, kind: 'gold', glow: 0.5, flicker: 2 });
    return L;
  },
  hotspots: [
    { id: 'alchemy.brew', x: 1312, y: 548, w: 104, h: 50, label: 'Preparar una poción en el caldero', kind: 'main' },
    { id: 'alchemy.shelf', x: 1254, y: 484, w: 50, h: 52, label: 'Hacer tintinear los frascos', kind: 'minor' },
    { id: 'alchemy.plant', x: 1548, y: 552, w: 26, h: 44, label: 'Dar de comer a la planta', kind: 'minor' },
    { id: 'alchemy.note', x: 1474, y: 510, w: 22, h: 20, label: 'Leer la nota clavada en la pared', kind: 'minor' },
    { id: 'alchemy.brick', x: BRICK.x - 2, y: BRICK.y - 3, w: 16, h: 12, label: 'Empujar un ladrillo que sobresale', kind: 'secret' },
  ],
};

/* ================================ escalera al patio ================================ */

const S2 = SPACE.stair2;
export const STAIR2: StairSpec = {
  bounds: { x: S2.x, y: GROUND, w: S2.w, h: FLOOR - GROUND },
  from: { x: 1624, floor: FLOOR },
  to: { x: 1768, floor: GROUND },
  steps: 16,
  open: [{ x: 1768, y: GROUND, w: 40, h: 16 }],
};

export const stair2: SpaceDef = {
  id: 'stair2',
  interior: S2,
  bounds: STAIR2.bounds,
  ambient: 0.74,
  bake(ctx) {
    bakeStair(ctx, STAIR2);
    groundStrip(ctx, S2.x, 1768); // el patio sigue por encima de la escalera
    torchBracket(ctx, 1690, 556);
    // escotilla abierta hacia el patio
    rect(ctx, 1766, GROUND - 12, 3, 14, P.wood2);
    rect(ctx, 1766, GROUND - 12, 1, 14, P.wood4);
  },
  draw(ctx, t) {
    flame(ctx, 1690, 547, t, 21);
  },
  lights: () => [{ x: 1690, y: 544, r: 42, flicker: 1, glow: 0.28 }],
};

/* ================================ patio ================================ */

const C = SPACE.courtyard;

function well(ctx: Ctx, x: number): void {
  ashlar(ctx, x - 16, GROUND - 20, 32, 20, { bw: 8, bh: 5, base: [P.stone4, P.stone5], hi: P.stone6, lo: P.stone3, mortar: P.stone2, seed: 5 });
  rect(ctx, x - 17, GROUND - 22, 34, 3, P.stone6);
  rect(ctx, x - 14, GROUND - 52, 3, 30, P.wood2);
  rect(ctx, x + 11, GROUND - 52, 3, 30, P.wood2);
  for (let j = 0; j < 12; j++) rect(ctx, x - 20 + j, GROUND - 52 - j, 42 - j * 2, 1, j % 3 ? P.wood3 : P.wood1);
  rect(ctx, x - 10, GROUND - 40, 20, 2, P.wood4);
  line(ctx, x, GROUND - 40, x, GROUND - 30, P.parch2);
  rect(ctx, x - 3, GROUND - 30, 7, 6, P.wood3);
  rect(ctx, x - 3, GROUND - 30, 7, 1, P.metal2);
}

function tree(ctx: Ctx, x: number): void {
  for (let j = 0; j < 40; j++) rect(ctx, x - 2 + Math.round(Math.sin(j * 0.15) * 2), GROUND - j, 4 - (j > 30 ? 1 : 0), 1, P.wood1);
  line(ctx, x, GROUND - 30, x - 14, GROUND - 44, P.wood1);
  line(ctx, x + 1, GROUND - 26, x + 16, GROUND - 40, P.wood1);
  for (let k = 0; k < 60; k++) {
    const a = hash(k, 1, 77) * Math.PI * 2;
    const r = hash(k, 2, 77) * 18;
    const lx = x + Math.cos(a) * r * 1.3;
    const ly = GROUND - 50 + Math.sin(a) * r * 0.7;
    rect(ctx, lx, ly, 3, 2, k % 4 === 0 ? P.green2 : k % 2 ? P.green1 : P.green0);
  }
}

export const courtyard: SpaceDef = {
  id: 'courtyard',
  interior: C,
  bounds: { x: C.x, y: C.y, w: C.w, h: C.h },
  ambient: 0.42,
  bake(ctx) {
    // muralla del fondo con almenas: más allá, el cielo y las montañas
    const top = GROUND - 88;
    ashlar(ctx, C.x, top, C.w, 88, { bw: 18, bh: 9, base: [P.stone2, P.stone3, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 61, moss: 0.1 });
    for (let x = C.x; x < C.x + C.w - 8; x += 18) {
      ashlar(ctx, x, top - 10, 11, 10, { bw: 11, bh: 5, base: [P.stone3], hi: P.stone5, lo: P.stone1, mortar: P.stone1, seed: 62 });
      rect(ctx, x, top - 10, 11, 1, P.stone5);
    }
    rect(ctx, C.x, top, C.w, 1, P.stone5);
    // enredadera
    for (let k = 0; k < 90; k++) {
      const vx = C.x + 40 + hash(k, 1, 3) * 200;
      const vy = top + hash(k, 2, 3) * 70;
      px(ctx, vx, vy, k % 3 ? P.green1 : P.green2);
    }
    tree(ctx, 1250);
    // carro con heno
    rect(ctx, 1380, GROUND - 16, 44, 8, P.wood3);
    rect(ctx, 1380, GROUND - 16, 44, 1, P.wood5);
    for (let k = 0; k < 30; k++) rect(ctx, 1382 + hash(k, 1, 9) * 40, GROUND - 24 + hash(k, 2, 9) * 8, 3, 2, k % 2 ? P.gold2 : P.gold1);
    disc(ctx, 1390, GROUND - 6, 5, P.wood1);
    disc(ctx, 1390, GROUND - 6, 3, P.wood3);
    disc(ctx, 1414, GROUND - 6, 5, P.wood1);
    disc(ctx, 1414, GROUND - 6, 3, P.wood3);
    well(ctx, 1690);
    // farol en su poste
    rect(ctx, 1604, GROUND - 60, 3, 60, P.wood1);
    rect(ctx, 1600, GROUND - 60, 11, 2, P.metal1);
    rect(ctx, 1601, GROUND - 58, 9, 10, P.metal0);
    rect(ctx, 1603, GROUND - 56, 5, 6, P.fire1);
    px(ctx, 1605, GROUND - 54, P.fire0);
    doorFrame(ctx, 1824, GROUND, 16, 64);
  },
  draw(ctx, t, fx) {
    // luciérnagas
    const n = fx.reduced ? 5 : 12;
    for (let k = 0; k < n; k++) {
      const x = C.x + 60 + hash(k, 1, 13) * (C.w - 120) + Math.sin(t * 0.7 + k) * 10;
      const y = GROUND - 20 - hash(k, 2, 13) * 60 + Math.sin(t * 1.1 + k * 2) * 6;
      if (Math.sin(t * 2 + k * 1.3) > 0) px(ctx, x, y, P.green5);
    }
  },
  lights: () => [
    { x: 1605, y: GROUND - 53, r: 52, kind: 'candle', flicker: 0.6, glow: 0.3 },
    { x: 1690, y: GROUND - 60, r: 90, kind: 'cold', glow: 0.05 },
  ],
};
