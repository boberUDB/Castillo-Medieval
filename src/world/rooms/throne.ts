import { P } from '../../engine/palette';
import { archFill, ashlar, bayer, disc, ellipse, hash, line, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { BASEMENT, SPACE, UPPER } from '../layout';
import type { FxState, SpaceDef } from '../types';
import { beam, candle, candleFlame, corbel, flame, floorBand, pillar, rug, torchBracket, webCorner } from '../props';

const T = SPACE.throne;
const FLOOR = UPPER - 12; // superficie del suelo (164)
const WINDOWS = [2190, 2390, 2590];
const THRONE = { x: 2728, y: 78, w: 44 };
const JESTER = { x: 2142 };
const GLASS = [P.red2, P.blue1, P.blue2, P.gold2, P.green2, P.violet3, P.red3, P.teal2];

function stainedGlass(ctx: Ctx, cx: number, motif: number): void {
  const w = 36;
  const h = 124;
  const x0 = cx - w / 2;
  const top = -86;
  // marco de piedra
  archFill(ctx, x0 - 3, top + h + 3, w + 6, h + 6, P.stone5);
  archFill(ctx, x0 - 1, top + h + 1, w + 2, h + 2, P.ink);
  ctx.save();
  ctx.beginPath();
  for (let j = 0; j < h; j++) {
    const y = top + h - j;
    const straight = h - w / 2;
    let half = w / 2;
    if (j > straight) half = Math.sqrt(Math.max(0, (w / 2) ** 2 - (j - straight) ** 2));
    ctx.rect(Math.round(cx - half), y, Math.round(half * 2), 1);
  }
  ctx.clip();
  // vidrios en rombos con emplomado
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const u = Math.floor((x - x0 + (y - top)) / 6);
      const v = Math.floor((x - x0 - (y - top) + 200) / 6);
      const lead = (x - x0 + (y - top)) % 6 === 0 || (x - x0 - (y - top) + 200) % 6 === 0;
      px(ctx, x, y, lead ? P.ink : GLASS[Math.floor(hash(u, v, motif) * GLASS.length)]);
    }
  }
  // motivo central
  const my = top + 50;
  if (motif === 0) {
    disc(ctx, cx, my, 9, P.gold3);
    disc(ctx, cx + 3, my - 2, 8, P.blue0);
  } else if (motif === 1) {
    rect(ctx, cx - 10, my, 20, 8, P.gold3);
    for (const dx of [-10, -4, 2, 8]) rect(ctx, cx + dx, my - 6, 3, 6, P.gold3);
    rect(ctx, cx - 10, my + 3, 20, 1, P.red3);
  } else {
    ellipse(ctx, cx, my + 2, 8, 4, P.ink);
    disc(ctx, cx + 6, my - 3, 3, P.ink);
    rect(ctx, cx + 9, my - 3, 3, 1, P.gold3);
  }
  ctx.restore();
  // alféizar
  rect(ctx, x0 - 5, top + h + 3, w + 10, 3, P.stone6);
}

function throneArt(ctx: Ctx): void {
  const { x, y, w } = THRONE;
  // dosel
  rect(ctx, x - 14, 22, w + 28, 4, P.gold1);
  for (let j = 0; j < 44; j++) {
    const inset = Math.round(Math.sin((j / 44) * Math.PI) * 4);
    rect(ctx, x - 12 + inset, 26 + j, 8, 1, j % 5 === 0 ? P.red1 : P.red2);
    rect(ctx, x + w + 4 - inset, 26 + j, 8, 1, j % 5 === 0 ? P.red1 : P.red2);
  }
  rect(ctx, x - 12, 26, w + 24, 8, P.red2);
  for (let i = x - 12; i < x + w + 12; i += 3) rect(ctx, i, 34, 1, 3, P.gold2);
  // respaldo alto
  rect(ctx, x + 4, y, w - 8, 44, P.gold1);
  rect(ctx, x + 8, y + 6, w - 16, 36, P.red2);
  rect(ctx, x + 8, y + 6, 4, 36, P.red3);
  for (const dx of [8, 16, 24, 32]) rect(ctx, x + dx, y - 6, 4, 6, P.gold2);
  rect(ctx, x + 4, y - 1, w - 8, 2, P.gold3);
  disc(ctx, x + w / 2, y + 16, 4, P.gold3);
  px(ctx, x + w / 2, y + 16, P.red3);
  // asiento y brazos
  rect(ctx, x, y + 40, w, 8, P.gold2);
  rect(ctx, x, y + 40, w, 1, P.gold4);
  rect(ctx, x + 4, y + 44, w - 8, 4, P.red2);
  rect(ctx, x, y + 32, 6, 10, P.gold1);
  rect(ctx, x + w - 6, y + 32, 6, 10, P.gold1);
  rect(ctx, x + 2, y + 48, 4, 20, P.gold1);
  rect(ctx, x + w - 6, y + 48, 4, 20, P.gold0);
  rect(ctx, x + 6, y + 48, w - 12, 6, P.gold0);
}

function ghost(ctx: Ctx, t: number, fx: FxState): void {
  const s = t - fx.since('throne.throne');
  const summoned = s >= 0 && s < 14;
  const known = fx.flag('done:throne.throne');
  if (!summoned && !known) return;
  // aparece de abajo arriba; si ya se le conoce, queda como un rastro tenue
  const appear = summoned ? Math.min(1, s / 1.2) : 1;
  const density = summoned ? 0.85 : 0.35;
  const bob = fx.reduced ? 0 : Math.round(Math.sin(t * 1.4) * 2);
  const cx = THRONE.x + THRONE.w / 2;
  const top = 50 + bob;
  const H = 58;
  for (let j = 0; j < H * appear; j++) {
    const y = top + H - j;
    const k = 1 - j / H;
    let half: number;
    if (k < 0.2) half = 6 * Math.sqrt(k / 0.2);
    else if (k < 0.3) half = 5;
    else half = 5 + (k - 0.3) * 18 - (k > 0.85 ? (k - 0.85) * 60 : 0);
    const wave = fx.reduced ? 0 : Math.round(Math.sin(t * 3 + j * 0.3) * (k > 0.7 ? 2 : 0));
    for (let i = -Math.round(half); i <= Math.round(half); i++) {
      if (bayer(cx + i + wave, y) > density) continue;
      const edge = Math.abs(i) >= Math.round(half) - 1;
      px(ctx, cx + i + wave, y, edge ? P.ghost0 : k > 0.3 && k < 0.45 && Math.abs(i) < 4 ? P.ghost2 : P.ghost1);
    }
  }
  if (appear < 1) return;
  // cara, barba y corona
  const fy = top + 5;
  px(ctx, cx - 2, fy, P.ink);
  px(ctx, cx + 2, fy, P.ink);
  rect(ctx, cx - 3, fy + 4, 7, 5, P.ghost2);
  rect(ctx, cx - 2, fy + 9, 5, 2, P.ghost2);
  for (const dx of [-5, -2, 1, 4]) rect(ctx, cx + dx, top - 5, 2, 3, P.gold3);
  rect(ctx, cx - 5, top - 2, 11, 2, P.gold3);
  // lágrima que cae
  if (summoned && s > 2 && s < 5) {
    const d = (s - 2) / 3;
    const ty = fy + 1 + d * (FLOOR - fy - 1);
    px(ctx, cx + 2, ty, P.ghost2);
    px(ctx, cx + 2, ty + 1, P.ghost1);
  }
  if (fx.flag('clue:llorado')) {
    px(ctx, cx + 2, FLOOR - 1, P.ghost2);
    px(ctx, cx + 3, FLOOR - 1, P.ghost1);
  }
}

export const throne: SpaceDef = {
  id: 'throne',
  room: 'throne',
  interior: T,
  bounds: { x: T.x - 16, y: T.y, w: T.w + 32, h: T.h },
  ambient: 0.64,
  bake(ctx) {
    ashlar(ctx, T.x, T.y, T.w, T.h, { bw: 26, bh: 13, base: [P.stone3, P.stone4, P.stone4, P.stone3], hi: P.stone5, lo: P.stone2, mortar: P.stone2, seed: 81 });
    // friso de terciopelo en la parte baja del muro
    for (let x = T.x; x < T.x + T.w; x++) {
      const fold = (x % 10) < 5;
      rect(ctx, x, 104, 1, 60, fold ? P.red1 : P.red0);
      if (x % 10 === 0) rect(ctx, x, 104, 1, 60, P.red2);
    }
    rect(ctx, T.x, 102, T.w, 3, P.gold1);
    rect(ctx, T.x, 102, T.w, 1, P.gold3);
    beam(ctx, T.x, T.y, T.w);
    for (let x = T.x + 30; x < T.x + T.w; x += 70) corbel(ctx, x, T.y + 6);
    WINDOWS.forEach((cx, i) => stainedGlass(ctx, cx, i));
    for (const x of [2290, 2490, 2660]) pillar(ctx, x, -104, FLOOR, 12);
    floorBand(ctx, T.x, FLOOR, T.w, 12, 29);
    rug(ctx, 2150, FLOOR + 2, 540, 6);
    // estrado de tres escalones
    for (let k = 0; k < 3; k++) {
      rect(ctx, 2688 + k * 10, FLOOR - (k + 1) * 5, 128 - k * 10, 5, k % 2 ? P.stone5 : P.stone4);
      rect(ctx, 2688 + k * 10, FLOOR - (k + 1) * 5, 128 - k * 10, 1, P.stone7);
    }
    throneArt(ctx);
    // sombrero de bufón en su soporte
    rect(ctx, JESTER.x, 124, 2, 40, P.wood2);
    rect(ctx, JESTER.x - 6, FLOOR - 2, 14, 2, P.wood1);
    torchBracket(ctx, 2226, 60);
    torchBracket(ctx, 2556, 60);
    webCorner(ctx, T.x, T.y + 6, 18, false);
  },
  draw(ctx, t, fx) {
    // manchas de luz de los vitrales sobre el suelo
    const glint = t - fx.since('throne.window');
    WINDOWS.forEach((cx, wi) => {
      for (let y = FLOOR - 16; y < FLOOR + 6; y++) {
        for (let x = cx - 40; x < cx + 10; x++) {
          const k = (y - (FLOOR - 16)) / 22;
          const lx = x + (1 - k) * 18;
          if (lx < cx - 34 || lx > cx - 6) continue;
          const boost = glint >= 0 && glint < 1.5 && wi === 1 ? 0.3 : 0;
          if (bayer(x, y) < 0.16 + boost) px(ctx, x, y, GLASS[Math.floor(hash(Math.floor(x / 5), Math.floor(y / 4), wi) * GLASS.length)]);
        }
      }
    });
    if (glint >= 0 && glint < 0.8) {
      const k = Math.floor(glint * 20);
      line(ctx, 2372 + k * 2, -86, 2372 + k * 2 - 10, 38, P.star);
    }
    // estandartes sobre las columnas
    const bk = t - fx.since('throne.banner');
    [2290, 2490].forEach((x, i) => {
      const kick = i === 0 && bk >= 0 && bk < 3 ? Math.sin(bk * 6) * Math.exp(-bk * 1.5) * 5 : 0;
      for (let j = 0; j < 84; j++) {
        const sw = Math.round((fx.reduced ? 0 : Math.sin(t * 0.9 + i + j * 0.05)) * (j / 84) * 1.5 + kick * (j / 84));
        const w = j > 76 ? 22 - (j - 76) * 2 : 22;
        const x0 = x - 5 + sw + (22 - w) / 2;
        rect(ctx, x0, -96 + j, w, 1, i ? P.blue1 : P.red2);
        px(ctx, x0, -96 + j, P.gold1);
        px(ctx, x0 + w - 1, -96 + j, P.gold1);
      }
      const cx = x + 6;
      rect(ctx, cx - 5, -60, 10, 6, P.gold2);
      for (const dx of [-5, -1, 3]) rect(ctx, cx + dx, -64, 2, 4, P.gold2);
      rect(ctx, x - 7, -98, 26, 2, P.wood2);
    });
    // lámparas colgantes
    for (const [i, cx] of WINDOWS.filter((_, k) => k !== 1).entries()) {
      const sw = fx.reduced ? 0 : Math.round(Math.sin(t * 0.6 + i) * 1);
      for (let y = T.y + 6; y < 52; y += 3) px(ctx, cx + Math.round((sw * (y - T.y)) / 160), y, P.metal2);
      ellipse(ctx, cx + sw, 56, 14, 2, P.metal1);
      for (let k = -2; k <= 2; k++) {
        candle(ctx, cx + sw + k * 6, 54, 4);
        candleFlame(ctx, cx + sw + k * 6, 49, t, k + i * 5);
      }
    }
    // sombrero de bufón: cascabeles que se agitan
    const js = t - fx.since('throne.jester');
    const jig = js >= 0 && js < 1.5 ? Math.round(Math.sin(js * 25) * 2 * (1 - js / 1.5)) : 0;
    const hx = JESTER.x + 1 + jig;
    rect(ctx, hx - 6, 116, 14, 8, P.violet3);
    rect(ctx, hx - 6, 116, 7, 8, P.gold2);
    for (const [dx, dy, c] of [
      [-12, 106, P.violet3],
      [0, 102, P.gold2],
      [12, 106, P.violet3],
    ] as const) {
      line(ctx, hx + dx * 0.4, 116, hx + dx, dy, c);
      disc(ctx, hx + dx, dy - 1, 1, P.gold4);
    }
    // puerta secreta tras el trono: se alza cuando la cámara se acerca
    const open = Math.max(0, Math.min(1, (fx.cam.x - 2700) / 90));
    const rise = Math.round(open * 64);
    rect(ctx, 2816, 176 - rise, 16, rise, P.ink);
    if (rise < 64) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(2816, 112, 16, 64 - rise);
      ctx.clip();
      ashlar(ctx, 2816, 112 - rise, 16, 64, { bw: 8, bh: 8, base: [P.stone3, P.stone4], hi: P.stone6, lo: P.stone2, mortar: P.stone1, seed: 3 }, 2816, 112);
      ctx.restore();
      rect(ctx, 2816, 176 - rise - 1, 16, 1, P.stone2);
    }
    ghost(ctx, t, fx);
    flame(ctx, 2226, 51, t, 51);
    flame(ctx, 2556, 51, t, 52);
  },
  lights(t, fx) {
    const L: Light[] = [
      { x: 2226, y: 48, r: 54, flicker: 1, glow: 0.3 },
      { x: 2556, y: 48, r: 54, flicker: 1, glow: 0.3, seed: 7 },
      { x: 2190, y: 50, r: 40, kind: 'candle', flicker: 0.5, glow: 0.2 },
      { x: 2590, y: 50, r: 40, kind: 'candle', flicker: 0.5, glow: 0.2 },
      { x: THRONE.x + 22, y: 110, r: 48, kind: 'gold', glow: 0.2 },
      ...WINDOWS.map((x) => ({ x, y: -30, r: 44, kind: 'cold' as const, glow: 0.12 })),
    ];
    const s = t - fx.since('throne.throne');
    if ((s >= 0 && s < 14) || fx.flag('done:throne.throne')) L.push({ x: THRONE.x + 22, y: 80, r: s < 14 ? 64 : 36, kind: 'ghost', glow: s < 14 ? 0.45 : 0.2, flicker: 0.4 });
    return L;
  },
  hotspots: [
    { id: 'throne.throne', x: THRONE.x - 2, y: THRONE.y - 8, w: THRONE.w + 4, h: 78, label: 'Acercarse al trono vacío', kind: 'main' },
    { id: 'throne.window', x: 2372, y: -86, w: 36, h: 124, label: 'Contemplar el vitral de la corona', kind: 'minor' },
    { id: 'throne.banner', x: 2285, y: -96, w: 22, h: 84, label: 'Tocar el estandarte rojo', kind: 'minor' },
    { id: 'throne.jester', x: JESTER.x - 14, y: 96, w: 30, h: 68, label: 'Agitar el sombrero de bufón', kind: 'minor' },
  ],
};

/* ================================ pasadizo secreto ================================ */

const SH = SPACE.shaft;

export const shaft: SpaceDef = {
  id: 'shaft',
  interior: SH,
  bounds: { x: SH.x, y: SH.y, w: SH.w + 16, h: SH.h },
  ambient: 0.8,
  bake(ctx) {
    ashlar(ctx, SH.x, SH.y, SH.w, SH.h, { bw: 10, bh: 6, base: [P.violet1, P.stone2, P.stone2], hi: P.stone3, lo: P.violet0, mortar: P.violet0, seed: 91, moss: 0.15, cracks: 0.08 });
    // escalera de mano
    rect(ctx, 2848, SH.y, 2, SH.h, P.wood2);
    rect(ctx, 2862, SH.y, 2, SH.h, P.wood2);
    for (let y = SH.y + 4; y < BASEMENT; y += 7) rect(ctx, 2848, y, 16, 1, P.wood3);
    // hornacinas con velas
    for (const y of [250, 470]) {
      rect(ctx, 2836, y - 10, 8, 10, P.ink);
      candle(ctx, 2840, y, 4);
    }
    // repisa con un esqueleto que tampoco encontró la salida
    rect(ctx, 2864, 360, 16, 3, P.stone4);
    rect(ctx, 2866, 344, 5, 5, P.parch0);
    px(ctx, 2867, 346, P.ink);
    px(ctx, 2869, 346, P.ink);
    rect(ctx, 2867, 349, 3, 7, P.parch1);
    for (let k = 0; k < 3; k++) rect(ctx, 2866, 350 + k * 2, 5, 1, P.parch0);
    line(ctx, 2868, 356, 2874, 359, P.parch1);
    line(ctx, 2870, 351, 2876, 346, P.parch1);
    rect(ctx, 2874, 340, 6, 5, P.wood3);
    rect(ctx, 2875, 342, 4, 1, P.ink);
    webCorner(ctx, SH.x, SH.y, 12, false);
    webCorner(ctx, SH.x + SH.w - 1, 420, 10, true);
  },
  draw(ctx, t) {
    candleFlame(ctx, 2840, 245, t, 61);
    candleFlame(ctx, 2840, 465, t, 62);
    // gota de agua
    const d = (t * 0.5) % 1;
    px(ctx, 2872, 180 + d * 420, P.teal3);
  },
  lights: () => [
    { x: 2840, y: 242, r: 32, kind: 'candle', flicker: 0.6, glow: 0.2 },
    { x: 2840, y: 462, r: 32, kind: 'candle', flicker: 0.6, glow: 0.2 },
  ],
  hotspots: [{ id: 'shaft.skeleton', x: 2862, y: 336, w: 20, h: 26, label: 'Leer el cartel del esqueleto', kind: 'minor' }],
};
