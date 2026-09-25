import { P } from '../engine/palette';
import { ashlar, bayer, hash, makeCanvas, rect, type Ctx } from '../engine/pixel';
import { FOUNDATION, GROUND, MASSES, MOAT, OPENINGS, SPACE, overlaps } from './layout';
import type { Rect } from './types';

/**
 * El "caparazón": la mampostería cortada entre salas, la tierra, las almenas y
 * los tejados. Se hornea por teselas bajo demanda, así nunca se dibuja entero.
 */
const TILE = 256;

export const SECTION = {
  base: [P.stone1, P.stone2, P.stone2, P.stone3],
  mortar: P.stone0,
  hi: P.stone3,
  lo: P.stone0,
  bw: 20,
  bh: 10,
};

const HOLES: Rect[] = [
  ...Object.entries(SPACE)
    .filter(([k]) => k !== 'courtyard')
    .map(([, v]) => v),
  ...OPENINGS,
];

function drawEarth(ctx: Ctx, area: Rect): void {
  const top = GROUND + 16;
  const y0 = Math.max(area.y, top);
  const y1 = area.y + area.h;
  if (y1 <= y0) return;
  for (let y = y0; y < y1; y++) {
    const depth = (y - top) / 300;
    for (let x = area.x; x < area.x + area.w; x++) {
      const n = hash(x >> 2, y >> 2, 71);
      let c: string = depth + n * 0.3 > 0.8 ? P.violet0 : n > 0.55 ? P.violet1 : '#1a1226';
      if (hash(x >> 3, y >> 3, 5) > 0.93 && hash(x, y, 2) > 0.3) c = P.stone2; // guijarros
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Franja de hierba entre x0 y x1 (la usan también las escaleras que pasan bajo el patio). */
export function groundStrip(ctx: Ctx, x0: number, x1: number): void {
  for (let x = x0; x < x1; x++) {
    const h = 3 + Math.floor(hash(x, 1, 9) * 3);
    rect(ctx, x, GROUND, 1, 16, '#1a1226');
    rect(ctx, x, GROUND, 1, h, hash(x, 2, 9) > 0.5 ? P.green1 : P.green0);
    if (hash(x, 3, 9) > 0.7) rect(ctx, x, GROUND - 1 - Math.floor(hash(x, 4, 9) * 3), 1, 2, P.green1);
    if (hash(x, 5, 9) > 0.9) rect(ctx, x, GROUND - 2, 1, 1, P.green2);
  }
}

/** Suelo exterior (orilla del foso y patio) con hierba. */
function drawGroundSurface(ctx: Ctx, area: Rect): void {
  const surfaces: Rect[] = [
    { x: -3000, y: GROUND, w: 3000 + MOAT.x, h: 16 },
    { x: MOAT.x + MOAT.w, y: GROUND, w: -MOAT.x - MOAT.w, h: 16 },
    { x: SPACE.courtyard.x, y: GROUND, w: SPACE.courtyard.w, h: 16 },
    { x: 3376, y: GROUND, w: 3000, h: 16 },
  ];
  for (const s of surfaces) {
    if (!overlaps(s, area)) continue;
    groundStrip(ctx, Math.max(s.x, area.x), Math.min(s.x + s.w, area.x + area.w));
  }
}

function drawMoat(ctx: Ctx, area: Rect): void {
  if (!overlaps(MOAT, area)) return;
  rect(ctx, MOAT.x, MOAT.y, MOAT.w, MOAT.h, P.violet0);
  ashlar(ctx, MOAT.x, MOAT.y + 2, 6, MOAT.h - 2, { ...SECTION, bw: 6, bh: 6 });
  ashlar(ctx, MOAT.x + MOAT.w - 6, MOAT.y + 2, 6, MOAT.h - 2, { ...SECTION, bw: 6, bh: 6 });
  // agua: franjas oscuras con reflejo de luna
  for (let y = MOAT.y + 22; y < MOAT.y + MOAT.h; y++) {
    for (let x = MOAT.x + 6; x < MOAT.x + MOAT.w - 6; x++) {
      const band = (y - MOAT.y - 22) / 26;
      ctx.fillStyle = band + (bayer(x, y) - 0.5) * 0.3 > 0.45 ? P.night1 : P.night3;
      if (y % 4 === 0 && hash(x >> 2, y, 3) > 0.7) ctx.fillStyle = P.stone5;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function merlons(ctx: Ctx, x: number, y: number, w: number): void {
  // almenas sobre un macizo: bloques de 10 con huecos de 6
  for (let mx = x; mx < x + w - 4; mx += 16) {
    const mw = Math.min(10, x + w - mx);
    ashlar(ctx, mx, y - 12, mw, 12, { ...SECTION, bw: 10, bh: 6 });
    rect(ctx, mx, y - 12, mw, 1, P.stone4);
  }
}

function slateRoof(ctx: Ctx, cx: number, baseY: number, halfW: number, h: number, seed: number): void {
  for (let j = 0; j < h; j++) {
    const half = Math.round(halfW * (1 - j / h));
    const y = baseY - j;
    for (let x = cx - half; x <= cx + half; x++) {
      const row = Math.floor(j / 4);
      const col = Math.floor((x + (row & 1) * 3) / 6);
      let c: string = hash(col, row, seed) > 0.5 ? P.blue0 : P.night4;
      if (j % 4 === 0) c = P.night1;
      else if ((x + (row & 1) * 3) % 6 === 0) c = P.night2;
      if (x === cx - half || x === cx + half) c = P.stone1;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // remate
  rect(ctx, cx, baseY - h - 8, 1, 8, P.gold1);
  rect(ctx, cx - 1, baseY - h - 6, 3, 1, P.gold2);
}

function drawRoofs(ctx: Ctx, area: Rect): void {
  const roofs: Rect[] = [
    { x: 0, y: 100, w: 672, h: 40 },
    { x: 640, y: -120, w: 470, h: 140 },
    { x: 1824, y: 140, w: 260, h: 40 },
    { x: 2060, y: -300, w: 860, h: 180 },
    { x: 2880, y: 200, w: 340, h: 60 },
    { x: 3130, y: -800, w: 270, h: 210 },
  ];
  if (!roofs.some((rf) => overlaps(rf, area))) return;
  merlons(ctx, 0, 136, 656);
  slateRoof(ctx, 872, 16, 232, 132, 3);
  merlons(ctx, 1824, 176, 256);
  slateRoof(ctx, 2488, -128, 424, 170, 5);
  merlons(ctx, 2880, 256, 320);
  // cúpula del observatorio
  for (let j = 0; j < 72; j++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - (j / 72) ** 2)) * 112);
    const y = -592 - j;
    for (let x = 3264 - half; x <= 3264 + half; x++) {
      const rib = (x - 3264 + 200) % 28 === 0;
      ctx.fillStyle = rib ? P.gold1 : j > 64 ? P.teal1 : hash(x >> 1, j >> 1, 4) > 0.5 ? P.teal0 : P.blue0;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // ranura del telescopio
  rect(ctx, 3272, -660, 10, 60, P.night1);
}

/** Línea de corte alrededor de cada hueco: el borde claro de la sección. */
function drawCutEdges(ctx: Ctx, area: Rect): void {
  for (const h of HOLES) {
    if (!overlaps({ x: h.x - 2, y: h.y - 2, w: h.w + 4, h: h.h + 4 }, area)) continue;
    rect(ctx, h.x - 1, h.y - 1, h.w + 2, 1, P.stone4);
    rect(ctx, h.x - 1, h.y + h.h, h.w + 2, 1, P.stone5);
    rect(ctx, h.x - 1, h.y, 1, h.h, P.stone4);
    rect(ctx, h.x + h.w, h.y, 1, h.h, P.stone4);
  }
}

export class Shell {
  private tiles = new Map<string, HTMLCanvasElement>();

  private bakeTile(tx: number, ty: number): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    const area: Rect = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
    ctx.translate(-area.x, -area.y);
    drawEarth(ctx, area);
    if (overlaps(FOUNDATION, area)) ashlar(ctx, FOUNDATION.x, FOUNDATION.y, FOUNDATION.w, FOUNDATION.h, { ...SECTION, seed: 4 });
    for (const m of MASSES) if (overlaps(m, area)) ashlar(ctx, m.x, m.y, m.w, m.h, { ...SECTION, seed: 2 });
    drawRoofs(ctx, area);
    drawGroundSurface(ctx, area);
    drawMoat(ctx, area);
    for (const h of HOLES) if (overlaps(h, area)) ctx.clearRect(h.x, h.y, h.w, h.h);
    drawCutEdges(ctx, area);
    for (const h of HOLES) if (overlaps(h, area)) ctx.clearRect(h.x, h.y, h.w, h.h);
    return canvas;
  }

  draw(ctx: Ctx, camX: number, camY: number, vw: number, vh: number): void {
    const tx0 = Math.floor(camX / TILE);
    const ty0 = Math.floor(camY / TILE);
    const tx1 = Math.floor((camX + vw) / TILE);
    const ty1 = Math.floor((camY + vh) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${tx},${ty}`;
        let tile = this.tiles.get(key);
        if (!tile) {
          tile = this.bakeTile(tx, ty);
          this.tiles.set(key, tile);
        }
        ctx.drawImage(tile, tx * TILE - camX, ty * TILE - camY);
      }
    }
  }

  /** Hornea por adelantado las teselas alrededor de un punto (carga progresiva). */
  prefetch(cx: number, cy: number, radius: number): void {
    const tx0 = Math.floor((cx - radius) / TILE);
    const ty0 = Math.floor((cy - radius) / TILE);
    const tx1 = Math.floor((cx + radius) / TILE);
    const ty1 = Math.floor((cy + radius) / TILE);
    let budget = 2; // como máximo dos teselas por fotograma
    for (let ty = ty0; ty <= ty1 && budget > 0; ty++) {
      for (let tx = tx0; tx <= tx1 && budget > 0; tx++) {
        const key = `${tx},${ty}`;
        if (this.tiles.has(key)) continue;
        this.tiles.set(key, this.bakeTile(tx, ty));
        budget--;
      }
    }
  }
}
