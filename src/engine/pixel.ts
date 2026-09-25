import { P } from './palette';

/** Utilidades de dibujo a nivel de píxel. Todo trabaja en coordenadas enteras de arte. */

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Hash determinista 0..1 para texturas estables (el mismo píxel siempre da lo mismo). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

export function bayer(x: number, y: number): number {
  return BAYER4[y & 3][x & 3];
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Rellena con dos colores mezclados por tramado ordenado: ratio 0 = todo a, 1 = todo b. */
export function ditherRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  ratio: number | ((lx: number, ly: number) => number),
): void {
  x = Math.round(x);
  y = Math.round(y);
  rect(ctx, x, y, w, h, a);
  ctx.fillStyle = b;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const r = typeof ratio === 'number' ? ratio : ratio(i, j);
      if (r > bayer(x + i, y + j)) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

/** Bandas verticales tramadas entre una lista de colores (cielos, degradados de luz). */
export function bandGradient(ctx: Ctx, x: number, y: number, w: number, h: number, colors: string[]): void {
  const n = colors.length - 1;
  for (let j = 0; j < h; j++) {
    const t = (j / Math.max(1, h - 1)) * n;
    const i0 = Math.min(n - 1, Math.floor(t));
    const f = t - i0;
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = f > bayer(x + i, y + j) ? colors[i0 + 1] : colors[i0];
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

/** Línea de Bresenham, píxel a píxel. */
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const r2 = r * r + r * 0.8;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r2 - y * y)));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.4) * (ry + 0.4)))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/** Arco de medio punto relleno: base en (x, y) con ancho w y altura total h. */
export function archFill(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  const r = w / 2;
  const straight = Math.max(0, h - r);
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y - straight), Math.round(w), Math.round(straight));
  for (let j = 0; j < r; j++) {
    const dy = r - j;
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    const x0 = Math.round(x + r - half);
    const x1 = Math.round(x + r + half);
    ctx.fillRect(x0, Math.round(y - straight - r + j), x1 - x0, 1);
  }
}

/* ------------------------------------------------------------------ */
/* Sprites de mapa de caracteres                                        */
/* ------------------------------------------------------------------ */

export type SpriteMap = Record<string, string>;
const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Convierte una cuadrícula de caracteres en un sprite. '.' y ' ' son transparentes.
 * Se cachea por clave para no reconstruirlo cada fotograma.
 */
export function sprite(key: string, rows: string[], map: SpriteMap): HTMLCanvasElement {
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const w = Math.max(...rows.map((r) => r.length));
  const { canvas, ctx } = makeCanvas(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      const color = map[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  spriteCache.set(key, canvas);
  return canvas;
}

/** Versión reflejada horizontalmente de un sprite (cacheada). */
export function flipped(key: string, src: HTMLCanvasElement): HTMLCanvasElement {
  const k = key + ':flip';
  const cached = spriteCache.get(k);
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  spriteCache.set(k, canvas);
  return canvas;
}

/** Silueta de un sprite en un color (para contornos de resaltado). */
export function silhouette(key: string, src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const k = `${key}:sil:${color}`;
  const cached = spriteCache.get(k);
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  spriteCache.set(k, canvas);
  return canvas;
}

export function blit(ctx: Ctx, img: CanvasImageSource, x: number, y: number): void {
  ctx.drawImage(img, Math.round(x), Math.round(y));
}

/** Dibuja un contorno de 1 px alrededor del sprite (resaltado de objetos interactivos). */
export function outline(ctx: Ctx, key: string, img: HTMLCanvasElement, x: number, y: number, color: string): void {
  const s = silhouette(key, img, color);
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.drawImage(s, rx - 1, ry);
  ctx.drawImage(s, rx + 1, ry);
  ctx.drawImage(s, rx, ry - 1);
  ctx.drawImage(s, rx, ry + 1);
}

/* ------------------------------------------------------------------ */
/* Materiales                                                          */
/* ------------------------------------------------------------------ */

export interface StoneOpts {
  seed?: number;
  bw?: number;
  bh?: number;
  base?: string[]; // colores de bloque, de oscuro a claro
  mortar?: string;
  hi?: string;
  lo?: string;
  moss?: number; // probabilidad de musgo 0..1
  cracks?: number; // probabilidad de grieta 0..1
}

/**
 * Sillería: bloques de piedra con junta, bisel claro arriba y sombra abajo.
 * Las coordenadas de mundo alimentan el hash, así la textura es continua entre lienzos.
 */
export function ashlar(ctx: Ctx, x: number, y: number, w: number, h: number, o: StoneOpts = {}, wx = x, wy = y): void {
  const bw = o.bw ?? 16;
  const bh = o.bh ?? 8;
  const base = o.base ?? [P.stone3, P.stone4, P.stone4, P.stone5];
  const mortar = o.mortar ?? P.stone1;
  const hi = o.hi ?? P.stone6;
  const lo = o.lo ?? P.stone2;
  const seed = o.seed ?? 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  rect(ctx, x, y, w, h, mortar);
  const row0 = Math.floor(wy / bh) - 1;
  const row1 = Math.ceil((wy + h) / bh) + 1;
  for (let r = row0; r <= row1; r++) {
    const off = (r & 1) * (bw / 2) + Math.floor(hash(r, 7, seed) * 3);
    const col0 = Math.floor((wx - off) / bw) - 1;
    const col1 = Math.ceil((wx + w - off) / bw) + 1;
    for (let c = col0; c <= col1; c++) {
      const bx = x + (c * bw + off - wx);
      const by = y + (r * bh - wy);
      const hv = hash(c, r, seed);
      const color = base[Math.floor(hv * base.length)];
      const ww = bw - 1;
      const hh = bh - 1;
      rect(ctx, bx, by, ww, hh, color);
      rect(ctx, bx, by, ww, 1, hi);
      rect(ctx, bx, by, 1, hh, hi);
      rect(ctx, bx, by + hh - 1, ww, 1, lo);
      rect(ctx, bx + ww - 1, by + 1, 1, hh - 1, lo);
      // desgaste: píxeles sueltos
      for (let k = 0; k < 3; k++) {
        const hx = hash(c * 5 + k, r * 3, seed + 11);
        const hy = hash(c * 7, r * 5 + k, seed + 13);
        px(ctx, bx + 1 + Math.floor(hx * (ww - 2)), by + 1 + Math.floor(hy * (hh - 2)), k === 0 ? lo : hi);
      }
      if (o.cracks && hash(c, r, seed + 3) < o.cracks) {
        let cx = bx + 2 + Math.floor(hash(c, r, seed + 5) * (ww - 4));
        for (let j = 1; j < hh - 1; j++) {
          px(ctx, cx, by + j, mortar);
          cx += hash(c + j, r, seed) < 0.5 ? -1 : 1;
        }
      }
      if (o.moss && hash(c, r, seed + 9) < o.moss) {
        const mw = 2 + Math.floor(hash(c, r, seed + 10) * (ww - 3));
        rect(ctx, bx + 1, by + hh - 2, mw, 1, P.green1);
        px(ctx, bx + 1 + Math.floor(mw / 2), by + hh - 3, P.green2);
      }
    }
  }
  ctx.restore();
}

/** Tablones de madera horizontales o verticales con vetas y clavos. */
export function planks(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  vertical = false,
  size = 6,
  colors: string[] = [P.wood2, P.wood3, P.wood3],
  seed = 3,
): void {
  rect(ctx, x, y, w, h, P.wood1);
  const n = Math.ceil((vertical ? w : h) / size);
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(hash(i, 1, seed) * colors.length)];
    if (vertical) {
      const px0 = x + i * size;
      const pw = Math.min(size - 1, x + w - px0);
      rect(ctx, px0, y, pw, h, c);
      rect(ctx, px0, y, 1, h, P.wood4);
      for (let k = 0; k < h / 5; k++) {
        const gy = y + Math.floor(hash(i, k, seed + 1) * h);
        rect(ctx, px0 + 1 + Math.floor(hash(i, k, seed + 2) * Math.max(1, pw - 2)), gy, 1, 2 + Math.floor(hash(k, i, seed) * 3), P.wood1);
      }
    } else {
      const py0 = y + i * size;
      const ph = Math.min(size - 1, y + h - py0);
      rect(ctx, x, py0, w, ph, c);
      rect(ctx, x, py0, w, 1, P.wood4);
      for (let k = 0; k < w / 6; k++) {
        const gx = x + Math.floor(hash(i, k, seed + 1) * w);
        rect(ctx, gx, py0 + 1 + Math.floor(hash(i, k, seed + 2) * Math.max(1, ph - 2)), 2 + Math.floor(hash(k, i, seed) * 4), 1, P.wood1);
      }
    }
  }
}

/** Suelo de losas en damero con perspectiva mínima (líneas de profundidad). */
export function flagstones(ctx: Ctx, x: number, y: number, w: number, h: number, seed = 5, a: string = P.stone4, b: string = P.stone3): void {
  rect(ctx, x, y, w, h, P.stone1);
  const rows = Math.max(1, Math.round(h / 4));
  let yy = y;
  for (let r = 0; r < rows; r++) {
    const rh = Math.max(2, Math.round((h / rows) * (0.7 + (r / rows) * 0.6)));
    const tw = 12 + r * 2;
    const off = (r & 1) * (tw / 2);
    for (let xx = x - tw + off; xx < x + w; xx += tw) {
      const c = hash(Math.floor(xx / tw), r, seed) > 0.5 ? a : b;
      rect(ctx, Math.max(x, xx), yy, Math.min(tw - 1, x + w - xx, xx + tw - 1 - x), rh - 1, c);
      rect(ctx, Math.max(x, xx), yy, Math.min(tw - 1, x + w - xx), 1, P.stone5);
    }
    yy += rh;
    if (yy >= y + h) break;
  }
}
