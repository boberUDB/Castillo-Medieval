import { P } from '../../engine/palette';
import { ashlar, bayer, disc, hash, line, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { SPACE } from '../layout';
import { SECTION } from '../shell';
import type { FxState, SpaceDef } from '../types';
import {
  archWindow,
  bookshelf,
  candle,
  candleFlame,
  catSprite,
  corbel,
  doorFrame,
  floorBand,
  torchBracket,
  flame,
  webCorner,
} from '../props';

const L = SPACE.library;
const S1 = SPACE.stair1;

const BALCONY_Y = 216;
const BOOKS = {
  book1: { x: 718, y: 279, c: P.teal2, g: P.teal3 },
  book2: { x: 1000, y: 118, c: P.violet3, g: P.gold3 },
  book3: { x: 862, y: 170, c: P.red2, g: P.gold3 },
} as const;
const CAT = { x: 704, y: 50 };
const PORTRAIT = { x: 884, y: 248, w: 44, h: 56 };
const GLOBE = { x: 958, y: 356 };
const DESK_CANDLE = { x: 932, y: 364 };

function magicBook(ctx: Ctx, x: number, y: number, color: string, gleam: string, t: number, open: boolean): void {
  if (open) {
    // libro abierto flotando: páginas que aletean
    const flap = Math.round(Math.sin(t * 8) * 1.5);
    rect(ctx, x - 5, y + 2, 5, 6, P.parch0);
    rect(ctx, x + 1, y + 2, 5, 6, P.parch1);
    rect(ctx, x, y + 2, 1, 7, color);
    rect(ctx, x - 6, y + 7, 13, 1, color);
    line(ctx, x - 5, y + 1 + flap, x - 1, y + 2, P.parch0);
    for (let i = 0; i < 3; i++) rect(ctx, x - 4, y + 4 + i * 1, 3, 1, P.parch3);
    return;
  }
  rect(ctx, x, y, 5, 12, color);
  rect(ctx, x, y, 1, 12, gleam);
  rect(ctx, x, y + 2, 5, 1, P.gold2);
  rect(ctx, x, y + 9, 5, 1, P.gold2);
  px(ctx, x + 2, y + 5, gleam);
  px(ctx, x + 2, y + 6, P.fire0);
}

/** Retrato del rey Aldric: marco dorado, fondo nocturno, corona y barba blanca. */
function portraitBase(ctx: Ctx): void {
  const { x, y, w, h } = PORTRAIT;
  rect(ctx, x - 1, y + h + 1, w + 2, 2, P.stone1); // sombra
  rect(ctx, x, y, w, h, P.gold1);
  rect(ctx, x, y, w, 1, P.gold3);
  rect(ctx, x, y, 1, h, P.gold2);
  rect(ctx, x + w - 1, y, 1, h, P.gold0);
  rect(ctx, x, y + h - 1, w, 1, P.gold0);
  for (let i = 3; i < w - 3; i += 4) {
    px(ctx, x + i, y + 1, P.gold3);
    px(ctx, x + i, y + h - 2, P.gold2);
  }
  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = h - 8;
  for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) px(ctx, ix + i, iy + j, (j / ih) * 0.9 > bayer(i, j) ? P.violet1 : P.night2);
  const cx = ix + Math.floor(iw / 2);
  // manto rojo con armiño
  rect(ctx, ix + 3, iy + 30, iw - 6, ih - 30, P.red2);
  rect(ctx, ix + 3, iy + 30, 4, ih - 30, P.red3);
  rect(ctx, ix + 3, iy + 30, iw - 6, 3, P.parch0);
  for (let i = ix + 5; i < ix + iw - 5; i += 4) px(ctx, i, iy + 31, P.ink);
  // cara
  rect(ctx, cx - 6, iy + 12, 12, 12, P.parch1);
  rect(ctx, cx - 6, iy + 12, 3, 12, P.parch0);
  rect(ctx, cx + 4, iy + 13, 2, 10, P.parch2);
  // barba blanca
  rect(ctx, cx - 7, iy + 20, 14, 8, P.stone7);
  rect(ctx, cx - 5, iy + 28, 10, 3, P.stone6);
  rect(ctx, cx - 2, iy + 31, 4, 2, P.stone6);
  rect(ctx, cx - 3, iy + 22, 6, 1, P.red1); // boca
  // nariz y cejas
  rect(ctx, cx, iy + 17, 1, 3, P.parch2);
  rect(ctx, cx - 5, iy + 15, 4, 1, P.stone6);
  rect(ctx, cx + 2, iy + 15, 4, 1, P.stone6);
  // corona
  rect(ctx, cx - 7, iy + 8, 14, 4, P.gold2);
  rect(ctx, cx - 7, iy + 8, 14, 1, P.gold3);
  for (const dx of [-7, -3, 1, 5]) rect(ctx, cx + dx, iy + 5, 2, 3, P.gold2);
  px(ctx, cx - 1, iy + 10, P.red3);
  px(ctx, cx + 3, iy + 10, P.teal3);
  // estrellas pintadas
  px(ctx, ix + 3, iy + 4, P.gold3);
  px(ctx, ix + iw - 5, iy + 7, P.gold3);
  px(ctx, ix + iw - 8, iy + 2, P.star);
}

function portraitEyes(ctx: Ctx, t: number, fx: FxState): void {
  const ix = PORTRAIT.x + 4;
  const iy = PORTRAIT.y + 4;
  const cx = ix + Math.floor((PORTRAIT.w - 8) / 2);
  const eyes = [cx - 4, cx + 2];
  let dx = 0;
  let dy = 0;
  if (fx.pointer) {
    dx = Math.sign(Math.round((fx.pointer.x - cx) / 30));
    dy = Math.sign(Math.round((fx.pointer.y - (iy + 17)) / 40));
  } else {
    // sin puntero (táctil o teclado) mira de reojo de vez en cuando
    dx = Math.sin(t * 0.4) > 0.6 ? 1 : Math.sin(t * 0.4) < -0.6 ? -1 : 0;
  }
  const wink = t - fx.since('library.portrait') < 0.5;
  eyes.forEach((ex, i) => {
    if (wink && i === 1) {
      rect(ctx, ex, iy + 17, 3, 1, P.parch3);
      return;
    }
    rect(ctx, ex, iy + 16, 3, 2, P.parch0);
    px(ctx, ex + 1 + dx, iy + 16 + Math.max(0, dy), P.ink);
  });
}

function orbitBooks(ctx: Ctx, t: number, reduced: boolean): void {
  const speed = reduced ? 0.12 : 0.45;
  for (let i = 0; i < 3; i++) {
    const a = t * speed + (i * Math.PI * 2) / 3;
    const x = Math.round(868 + Math.cos(a) * 34);
    const y = Math.round(118 + Math.sin(a) * 12 + Math.sin(t * 2 + i) * 2);
    const flap = Math.sin(t * 9 + i * 2) > 0;
    const c = [P.blue1, P.green2, P.red1][i];
    rect(ctx, x - 1, y, 3, 4, c);
    if (flap) {
      line(ctx, x - 1, y, x - 4, y - 2, P.parch0);
      line(ctx, x + 1, y, x + 4, y - 2, P.parch1);
    } else {
      line(ctx, x - 1, y + 1, x - 4, y + 2, P.parch0);
      line(ctx, x + 1, y + 1, x + 4, y + 2, P.parch1);
    }
  }
}

/** Polvo flotando en el rayo de luna: movimiento lento y determinista. */
function dust(ctx: Ctx, t: number, reduced: boolean): void {
  const n = reduced ? 10 : 26;
  for (let i = 0; i < n; i++) {
    const baseX = 820 + hash(i, 1, 9) * 110;
    const baseY = 70 + hash(i, 2, 9) * 290;
    const x = baseX + Math.sin(t * 0.3 + i) * 8;
    const y = baseY + ((t * (2 + hash(i, 3, 9) * 3)) % 40) - 20;
    const on = Math.sin(t * 1.5 + i * 1.7) > -0.3;
    if (on) px(ctx, x, y, hash(i, 4, 9) > 0.6 ? P.stone7 : P.stone5);
  }
}

export const library: SpaceDef = {
  id: 'library',
  room: 'library',
  interior: L,
  bounds: { x: L.x - 16, y: L.y, w: L.w + 16, h: L.h + 16 },
  ambient: 0.66,
  bake(ctx) {
    ashlar(ctx, L.x, L.y, L.w, L.h, { bw: 20, bh: 10, base: [P.stone2, P.stone3, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 31 });
    // haz de luna tramado desde la ventana hacia el balcón
    for (let y = 150; y < BALCONY_Y; y++) {
      const k = (y - 150) / (BALCONY_Y - 150);
      const x0 = Math.round(840 - k * 40);
      const x1 = Math.round(896 - k * 40);
      for (let x = x0; x < x1; x++) if (0.28 * (1 - k * 0.5) > bayer(x, y)) px(ctx, x, y, P.stone5);
    }
    archWindow(ctx, 836, 56, 64, 136);
    bookshelf(ctx, 680, 60, 124, 142, 11);
    bookshelf(ctx, 932, 60, 132, 142, 12);
    webCorner(ctx, L.x, L.y, 16, false);
    webCorner(ctx, L.x + L.w - 1, L.y, 12, true);

    // balcón: forjado, ménsulas y barandilla
    for (let x = L.x + 8; x < L.x + L.w; x += 48) corbel(ctx, x, BALCONY_Y + 8);
    rect(ctx, L.x, BALCONY_Y, L.w, 8, P.wood2);
    rect(ctx, L.x, BALCONY_Y, L.w, 1, P.wood4);
    rect(ctx, L.x, BALCONY_Y + 7, L.w, 1, P.wood0);
    for (let x = L.x; x < L.x + L.w; x += 24) px(ctx, x + 3, BALCONY_Y + 3, P.wood1);
    for (let x = L.x; x < L.x + L.w; x++) {
      if (x >= 772 && x < 792) continue; // hueco de la escalera de mano
      if (x % 6 === 0) rect(ctx, x, 204, 2, 12, P.wood2);
    }
    rect(ctx, L.x, 202, 100, 2, P.wood4);
    rect(ctx, 792, 202, L.x + L.w - 792, 2, P.wood4);
    rect(ctx, L.x, 202, 100, 1, P.wood5);
    rect(ctx, 792, 202, L.x + L.w - 792, 1, P.wood5);

    // planta baja: estanterías, escalera de mano, escritorio y globo
    bookshelf(ctx, 680, 236, 88, 152, 13, 19);
    bookshelf(ctx, 800, 236, 64, 152, 14, 19);
    for (let j = 0; j < 172; j += 1) {
      const y = 388 - j;
      const x = Math.round(772 + (j / 172) * 8);
      px(ctx, x, y, P.wood3);
      px(ctx, x + 12, y, P.wood2);
      if (j % 7 === 3) rect(ctx, x + 1, y, 11, 1, P.wood3);
    }
    portraitBase(ctx);
    // escritorio
    rect(ctx, 874, 364, 68, 4, P.wood3);
    rect(ctx, 874, 364, 68, 1, P.wood5);
    rect(ctx, 878, 368, 4, 20, P.wood2);
    rect(ctx, 934, 368, 4, 20, P.wood2);
    rect(ctx, 882, 372, 52, 2, P.wood1);
    rect(ctx, 896, 360, 8, 4, P.parch0);
    rect(ctx, 905, 360, 8, 4, P.parch1);
    rect(ctx, 904, 359, 1, 5, P.wood1);
    for (let i = 0; i < 3; i++) {
      rect(ctx, 897, 361 + i, 6, 1, i === 1 ? P.parch2 : P.parch0);
      rect(ctx, 906, 361 + i, 6, 1, i === 1 ? P.parch2 : P.parch1);
    }
    rect(ctx, 884, 360, 4, 4, P.ink);
    line(ctx, 886, 359, 891, 352, P.parch0);
    candle(ctx, DESK_CANDLE.x, DESK_CANDLE.y, 6);
    // pie del globo
    rect(ctx, GLOBE.x - 1, GLOBE.y + 7, 3, 20, P.wood3);
    rect(ctx, GLOBE.x - 6, 386, 13, 2, P.wood2);
    // cartel junto a la trampilla
    rect(ctx, 1018, 346, 2, 42, P.wood2);
    rect(ctx, 1004, 340, 30, 12, P.wood3);
    rect(ctx, 1004, 340, 30, 1, P.wood4);
    rect(ctx, 1007, 344, 18, 1, P.ink);
    rect(ctx, 1007, 347, 12, 1, P.ink);
    rect(ctx, 1027, 343, 3, 5, P.ink);
    px(ctx, 1028, 348, P.ink);
    torchBracket(ctx, 1056, 300);

    // suelo con la trampilla abierta hacia el sótano
    floorBand(ctx, L.x, 388, L.w, 12, 9);
    rect(ctx, 1008, 388, 64, 12, P.ink);
    for (let i = 0; i < 3; i++) rect(ctx, 1008 + i * 8, 392 + i * 4, 64 - i * 8, 1, P.stone3);
    // tapa de la trampilla apoyada en el muro
    rect(ctx, 1062, 340, 6, 48, P.wood2);
    rect(ctx, 1062, 340, 1, 48, P.wood4);
    rect(ctx, 1063, 350, 4, 1, P.metal1);
    rect(ctx, 1063, 376, 4, 1, P.metal1);
    doorFrame(ctx, 656, 400, 16, 80);
  },
  draw(ctx, t, fx) {
    dust(ctx, t, fx.reduced);
    portraitEyes(ctx, t, fx);
    orbitBooks(ctx, t, fx.reduced);
    // velas del balcón
    rect(ctx, 1038, 200, 16, 2, P.gold1);
    rect(ctx, 1045, 190, 2, 10, P.gold1);
    for (const [i, x] of [1040, 1046, 1052].entries()) {
      candle(ctx, x, 196 - (i === 1 ? 4 : 0), 4);
      candleFlame(ctx, x, 191 - (i === 1 ? 4 : 0), t, i + 7);
    }
    // vela del escritorio: se apaga al soplar y vuelve a encenderse sola
    const blown = t - fx.since('library.candle');
    if (!(blown >= 0 && blown < 6)) candleFlame(ctx, DESK_CANDLE.x, DESK_CANDLE.y - 7, t, 2);
    else if (blown < 2.5) {
      // humo
      for (let k = 0; k < 4; k++) px(ctx, DESK_CANDLE.x + Math.round(Math.sin(blown * 3 + k) * 1.5), DESK_CANDLE.y - 9 - k * 2 - Math.round(blown * 4), P.stone5);
    }
    // globo terráqueo que gira
    const spin = t - fx.since('library.globe');
    const rot = t * 3 + (spin < 3 ? (1 - Math.exp(-spin * 1.5)) * 60 : 60);
    disc(ctx, GLOBE.x, GLOBE.y, 6, P.blue1);
    for (let j = -5; j <= 5; j++) {
      for (let i = -5; i <= 5; i++) {
        if (i * i + j * j > 30) continue;
        const u = Math.floor((i + rot) / 3);
        if (hash(u, j >> 1, 5) > 0.55) px(ctx, GLOBE.x + i, GLOBE.y + j, P.green3);
      }
    }
    px(ctx, GLOBE.x - 3, GLOBE.y - 3, P.blue3);
    line(ctx, GLOBE.x - 7, GLOBE.y - 5, GLOBE.x + 6, GLOBE.y + 7, P.gold1);

    // libros mágicos
    for (const [id, b] of Object.entries(BOOKS)) {
      const hot = fx.hovered === `library.${id}`;
      const opened = t - fx.since(`library.${id}`) < 1.2;
      const floating = id === 'book3';
      const bob = floating ? Math.round(Math.sin(t * 1.8) * 2) : hot || opened ? -2 : 0;
      magicBook(ctx, b.x, b.y + bob, b.c, b.g, t, floating);
      if (!fx.flag(`done:library.${id}`) || hot) {
        const ph = (t * 2 + b.x) % 2.4;
        if (ph < 1.2) px(ctx, b.x + 2 + Math.round(Math.sin(ph * 5) * 3), b.y - 2 + bob - Math.round(ph * 4), b.g);
      }
    }

    // gato durmiendo sobre la estantería
    const woke = t - fx.since('library.cat') < 4 || fx.flag('secret:gato');
    ctx.drawImage(catSprite(woke), CAT.x, CAT.y);
    if (!woke) {
      const z = (t * 0.6) % 3;
      if (z < 2) {
        const zx = CAT.x + 3 + Math.round(z * 2);
        const zy = CAT.y - 2 - Math.round(z * 4);
        rect(ctx, zx, zy, 3, 1, P.stone6);
        px(ctx, zx + 1, zy + 1, P.stone6);
        rect(ctx, zx, zy + 2, 3, 1, P.stone6);
      }
    }
    flame(ctx, 1056, 291, t, 5);
  },
  lights(t, fx: FxState) {
    const lit = !(t - fx.since('library.candle') >= 0 && t - fx.since('library.candle') < 6);
    const Ls: Light[] = [
      { x: 868, y: 120, r: 86, kind: 'cold', glow: 0.14 },
      { x: 1046, y: 188, r: 42, kind: 'candle', flicker: 0.6, glow: 0.22 },
      { x: 1056, y: 286, r: 44, flicker: 1, glow: 0.28 },
      { x: 720, y: 285, r: 18, kind: 'teal', glow: 0.35 },
      { x: 1002, y: 124, r: 18, kind: 'gold', glow: 0.3 },
      { x: 864, y: 176, r: 26, kind: 'gold', glow: 0.35, flicker: 0.3 },
    ];
    if (lit) Ls.push({ x: DESK_CANDLE.x, y: DESK_CANDLE.y - 8, r: 38, kind: 'candle', flicker: 0.6, glow: 0.25 });
    return Ls;
  },
  hotspots: [
    { id: 'library.book3', x: 852, y: 160, w: 22, h: 24, label: 'Abrir el libro que flota junto a la ventana', kind: 'main' },
    { id: 'library.book1', x: 712, y: 273, w: 16, h: 24, label: 'Abrir el libro que brilla en la estantería baja', kind: 'main' },
    { id: 'library.book2', x: 994, y: 112, w: 16, h: 24, label: 'Abrir el libro dorado del balcón', kind: 'main' },
    { id: 'library.portrait', x: PORTRAIT.x, y: PORTRAIT.y, w: PORTRAIT.w, h: PORTRAIT.h, label: 'Mirar el retrato del rey Aldric', kind: 'minor' },
    { id: 'library.candle', x: 925, y: 350, w: 14, h: 16, label: 'Soplar la vela del escritorio', kind: 'minor' },
    { id: 'library.globe', x: 948, y: 346, w: 20, h: 20, label: 'Girar el globo terráqueo', kind: 'minor' },
    { id: 'library.sign', x: 1002, y: 338, w: 34, h: 16, label: 'Leer el cartel de la trampilla', kind: 'minor' },
    { id: 'library.cat', x: CAT.x - 2, y: CAT.y - 4, w: 22, h: 16, label: 'Acariciar al gato', kind: 'secret' },
  ],
};

/* ================================ escalera al sótano ================================ */

const stepY = (x: number) => Math.min(608, 400 + (Math.floor((x - 1008) / 8) + 1) * 8);

export const stair1: SpaceDef = {
  id: 'stair1',
  interior: S1,
  bounds: { x: 1000, y: 400, w: 248, h: 208 },
  ambient: 0.74,
  bake(ctx) {
    ashlar(ctx, 1000, 400, 248, 208, { ...SECTION, seed: 4 });
    for (let x = 1008; x < 1248; x++) {
      const fy = x >= 1216 ? 608 : stepY(x);
      const ceil = x < 1072 ? 400 : Math.max(416, fy - 56);
      ctx.clearRect(x, ceil, 1, fy - ceil);
    }
    // muro de fondo del pasaje y peldaños
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ashlar(ctx, 1000, 400, 248, 208, { bw: 14, bh: 7, base: [P.stone2, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 41, moss: 0.1 });
    ctx.restore();
    for (let i = 0; i < 26; i++) {
      const x = 1008 + i * 8;
      const y = 400 + (i + 1) * 8;
      rect(ctx, x, y, 8, 1, P.stone5);
      rect(ctx, x, y + 1, 8, 2, P.stone3);
      rect(ctx, x, y - 8, 1, 8, P.stone4);
    }
    rect(ctx, 1216, 607, 32, 1, P.stone5);
    torchBracket(ctx, 1128, 478);
    torchBracket(ctx, 1196, 546);
  },
  draw(ctx, t) {
    flame(ctx, 1128, 469, t, 11);
    flame(ctx, 1196, 537, t, 12);
  },
  lights: () => [
    { x: 1128, y: 466, r: 40, flicker: 1, glow: 0.28 },
    { x: 1196, y: 534, r: 40, flicker: 1, glow: 0.28, seed: 9 },
  ],
};
