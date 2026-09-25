import { P } from '../../engine/palette';
import { archFill, ashlar, disc, ellipse, hash, line, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { SPACE } from '../layout';
import { SECTION } from '../shell';
import type { FxState, SpaceDef } from '../types';
import { candle, candleFlame, catSprite, floorBand } from '../props';

const O = SPACE.observatory;
const FLOOR = O.y + O.h - 12; // -412
const CX = 3264;
const ORRERY = { x: 3199, y: -446 };
const WIN = { x: 3316, y: -520, w: 28, h: 56 };

function domeTop(x: number): number {
  const t = (x - CX) / (O.w / 2);
  return O.y + Math.round((1 - Math.sqrt(Math.max(0, 1 - t * t))) * 64);
}

function telescope(ctx: Ctx, t: number, fx: FxState): void {
  const s = t - fx.since('observatory.telescope');
  const swivel = s >= 0 && s < 2 ? Math.sin(s * 3) * (1 - s / 2) * 0.08 : 0;
  const ang = -1.25 + swivel;
  const bx = 3252;
  const by = -440;
  // trípode
  line(ctx, bx, by, bx - 14, FLOOR, P.wood2);
  line(ctx, bx, by, bx + 14, FLOOR, P.wood2);
  line(ctx, bx, by, bx + 2, FLOOR, P.wood1);
  disc(ctx, bx, by, 3, P.gold1);
  // tubo de latón
  const len = 104;
  const x1 = bx + Math.cos(ang) * len * 0.72;
  const y1 = by + Math.sin(ang) * len * 0.72;
  const x0 = bx - Math.cos(ang) * len * 0.28;
  const y0 = by - Math.sin(ang) * len * 0.28;
  for (let k = -3; k <= 3; k++) {
    const ox = Math.round(-Math.sin(ang) * k * 0.9);
    const oy = Math.round(Math.cos(ang) * k * 0.9);
    const w = 1 - (k + 3) / 7;
    line(ctx, x0 + ox, y0 + oy, x1 + ox * (0.8 + w * 0.2), y1 + oy, k < -1 ? P.gold3 : k > 1 ? P.gold0 : P.gold2);
  }
  for (const f of [0.1, 0.45, 0.8]) {
    const rx = x0 + (x1 - x0) * f;
    const ry = y0 + (y1 - y0) * f;
    line(ctx, rx - Math.sin(ang) * 4, ry + Math.cos(ang) * 4, rx + Math.sin(ang) * 4, ry - Math.cos(ang) * 4, P.gold4);
  }
  // ocular y lente
  rect(ctx, x0 - 2, y0 - 1, 4, 3, P.metal1);
  disc(ctx, x1, y1, 3, P.gold1);
  disc(ctx, x1, y1, 2, P.teal3);
  if (!fx.reduced && Math.sin(t * 1.7) > 0.8) px(ctx, x1 - 1, y1 - 1, P.star);
}

function orrery(ctx: Ctx, t: number, fx: FxState): void {
  const s = t - fx.since('observatory.orrery');
  const boost = s >= 0 && s < 3 ? 8 * (1 - s / 3) : 0;
  const speed = fx.reduced ? 0.1 : 0.4;
  const { x, y } = ORRERY;
  // órbitas
  for (const r of [9, 15, 21]) {
    for (let a = 0; a < 48; a++) {
      if (a % 2) continue;
      const ang = (a / 48) * Math.PI * 2;
      px(ctx, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.35, P.gold0);
    }
  }
  // sol
  disc(ctx, x, y, 3, P.gold3);
  px(ctx, x - 1, y - 1, P.gold4);
  // planetas
  const planets: [number, number, string][] = [
    [9, 2.3, P.red3],
    [15, 1.4, P.teal3],
    [21, 0.8, P.violet3],
  ];
  planets.forEach(([r, sp, c], i) => {
    const a = t * speed * sp + i * 2 + boost * sp * s;
    const px0 = x + Math.cos(a) * r;
    const py0 = y + Math.sin(a) * r * 0.35;
    disc(ctx, px0, py0, i === 2 ? 2 : 1, c);
    if (i === 1) px(ctx, px0 + 3, py0 - 1, P.metal3);
  });
  rect(ctx, x - 1, y + 3, 2, 12, P.gold1);
}

export const observatory: SpaceDef = {
  id: 'observatory',
  room: 'observatory',
  interior: O,
  bounds: { x: O.x, y: O.y, w: O.w, h: O.h + 16 },
  ambient: 0.62,
  bake(ctx) {
    ashlar(ctx, O.x, O.y, O.w, O.h, { bw: 16, bh: 8, base: [P.stone2, P.blue0, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.night1, seed: 121 });
    // cúpula: el trasdós es mampostería cortada
    ctx.save();
    ctx.beginPath();
    for (let x = O.x; x < O.x + O.w; x++) ctx.rect(x, O.y, 1, domeTop(x) - O.y);
    ctx.clip();
    ashlar(ctx, O.x, O.y, O.w, 70, { ...SECTION, seed: 2 });
    ctx.restore();
    for (let x = O.x; x < O.x + O.w; x++) {
      px(ctx, x, domeTop(x), P.gold1);
      px(ctx, x, domeTop(x) + 1, P.stone3);
    }
    // nervios de la cúpula
    for (const x of [3200, 3232, 3296, 3328]) {
      for (let y = domeTop(x) + 2; y < FLOOR; y += 1) if ((y & 7) < 6) px(ctx, x, y, P.stone3);
    }
    // ranura abierta al cielo
    ctx.clearRect(3258, O.y, 14, 44);
    rect(ctx, 3257, O.y, 1, 44, P.gold1);
    rect(ctx, 3272, O.y, 1, 44, P.gold1);
    rect(ctx, 3257, O.y + 44, 16, 2, P.gold1);
    // ventana con vista al valle
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    archFill(ctx, WIN.x, WIN.y + WIN.h, WIN.w, WIN.h, '#000');
    ctx.restore();
    for (let x = WIN.x; x < WIN.x + WIN.w; x++) {
      const m1 = Math.round(18 + Math.sin(x * 0.35) * 5 + Math.sin(x * 0.9) * 2);
      const m2 = Math.round(8 + Math.sin(x * 0.5 + 2) * 3);
      rect(ctx, x, WIN.y + WIN.h - m1, 1, m1 - m2, P.mount2);
      px(ctx, x, WIN.y + WIN.h - m1, P.stone5);
      rect(ctx, x, WIN.y + WIN.h - m2, 1, m2, P.mount0);
    }
    for (const [vx, vy] of [
      [3322, -468],
      [3327, -467],
      [3336, -469],
    ]) px(ctx, vx, vy, P.fire1);
    rect(ctx, WIN.x - 3, WIN.y + WIN.h, WIN.w + 6, 3, P.stone6);
    rect(ctx, WIN.x - 2, WIN.y + 12, 2, WIN.h - 12, P.stone5);
    rect(ctx, WIN.x + WIN.w, WIN.y + 12, 2, WIN.h - 12, P.stone3);
    // cartas celestes
    rect(ctx, 3174, -530, 24, 30, P.parch1);
    rect(ctx, 3174, -530, 24, 1, P.parch0);
    const stars: [number, number][] = [
      [3178, -524],
      [3184, -520],
      [3190, -524],
      [3186, -514],
      [3180, -508],
      [3192, -506],
    ];
    for (let i = 1; i < stars.length; i++) line(ctx, stars[i - 1][0], stars[i - 1][1], stars[i][0], stars[i][1], P.parch2);
    for (const [sx, sy] of stars) px(ctx, sx, sy, P.blue1);
    rect(ctx, 3202, -520, 14, 18, P.parch0);
    disc(ctx, 3209, -511, 5, P.parch2);
    disc(ctx, 3209, -511, 3, P.parch0);
    // mesa del planetario
    rect(ctx, 3176, -430, 46, 3, P.wood3);
    rect(ctx, 3176, -430, 46, 1, P.wood5);
    rect(ctx, 3179, -427, 3, 15, P.wood2);
    rect(ctx, 3216, -427, 3, 15, P.wood2);
    ellipse(ctx, ORRERY.x, -432, 8, 1, P.gold1);
    candle(ctx, 3214, -430, 5);
    // suelo con rosa de los vientos
    floorBand(ctx, O.x, FLOOR, O.w, 12, 41);
    const rose = 3226;
    ellipse(ctx, rose, FLOOR + 6, 22, 4, P.gold0);
    ellipse(ctx, rose, FLOOR + 6, 20, 3, P.stone3);
    line(ctx, rose - 22, FLOOR + 6, rose + 22, FLOOR + 6, P.gold1);
    line(ctx, rose, FLOOR + 2, rose, FLOOR + 10, P.gold1);
    for (let k = 0; k < 10; k++) px(ctx, rose - 18 + hash(k, 1, 5) * 36, FLOOR + 3 + hash(k, 2, 5) * 6, P.gold2);
    // trampilla por la que se llega desde la escalera de caracol
    rect(ctx, 3284, FLOOR, 24, 12, P.ink);
    for (let i = 0; i < 3; i++) rect(ctx, 3284 + i * 6, FLOOR + 3 + i * 3, 24 - i * 6, 1, P.stone3);
    rect(ctx, 3282, FLOOR - 10, 2, 10, P.gold1);
    rect(ctx, 3282, FLOOR - 10, 8, 1, P.gold1);
  },
  draw(ctx, t, fx) {
    telescope(ctx, t, fx);
    orrery(ctx, t, fx);
    candleFlame(ctx, 3214, -436, t, 91);
    candle(ctx, WIN.x + 22, WIN.y + WIN.h, 4);
    candleFlame(ctx, WIN.x + 22, WIN.y + WIN.h - 5, t, 92);
    // Bigotes llegó antes que tú (nadie sabe cómo)
    ctx.drawImage(catSprite(t - fx.since('observatory.cat') < 3), WIN.x - 2, WIN.y + WIN.h - 10);
    // estrella fugaz por la ranura de vez en cuando
    const cyc = (t * 0.15) % 1;
    if (!fx.reduced && cyc < 0.06) {
      const k = cyc / 0.06;
      line(ctx, 3270 - k * 12, O.y + 4 + k * 20, 3272 - k * 12 + 3, O.y + 2 + k * 20, P.star);
    }
    const tel = t - fx.since('observatory.telescope');
    if (tel >= 0 && tel < 2.5) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + tel;
        const r = tel * 22;
        px(ctx, 3290 + Math.cos(a) * r, -540 + Math.sin(a) * r * 0.6, k % 2 ? P.gold4 : P.teal3);
      }
    }
  },
  lights(t, fx) {
    const L: Light[] = [
      { x: 3214, y: -440, r: 38, kind: 'candle', flicker: 0.6, glow: 0.25 },
      { x: WIN.x + 22, y: WIN.y + WIN.h - 8, r: 32, kind: 'candle', flicker: 0.6, glow: 0.2 },
      { x: 3265, y: O.y + 30, r: 70, kind: 'cold', glow: 0.14 },
      { x: WIN.x + 14, y: WIN.y + 30, r: 40, kind: 'cold', glow: 0.1 },
      { x: 3288, y: -540, r: 18, kind: 'teal', glow: 0.35 },
      { x: ORRERY.x, y: ORRERY.y, r: 22, kind: 'gold', glow: 0.25 },
    ];
    if (t - fx.since('observatory.telescope') < 2.5) L.push({ x: 3288, y: -540, r: 70, kind: 'gold', glow: 0.45 });
    return L;
  },
  hotspots: [
    { id: 'observatory.telescope', x: 3236, y: -548, w: 60, h: 110, label: 'Mirar por el telescopio', kind: 'main' },
    { id: 'observatory.orrery', x: 3178, y: -470, w: 42, h: 40, label: 'Hacer girar el planetario', kind: 'minor' },
    { id: 'observatory.chart', x: 3172, y: -532, w: 46, h: 34, label: 'Leer las cartas celestes', kind: 'minor' },
    { id: 'observatory.cat', x: WIN.x - 4, y: WIN.y + WIN.h - 14, w: 22, h: 14, label: 'Saludar a Bigotes', kind: 'minor' },
  ],
};
