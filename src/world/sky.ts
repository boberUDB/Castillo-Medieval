import { P } from '../engine/palette';
import { bandGradient, bayer, disc, hash, makeCanvas, rect, rng, type Ctx } from '../engine/pixel';

/** Cielo nocturno compartido: estrellas, luna, cordilleras y niebla. */

export interface Star {
  x: number;
  y: number;
  b: number;
  tw: number;
}

export function makeStars(w: number, h: number, count: number, seed: number): Star[] {
  const rnd = rng(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.floor(rnd() * w), y: Math.floor(rnd() * h * rnd()), b: rnd(), tw: rnd() * 6.28 });
  }
  return stars;
}

export function drawStars(ctx: Ctx, stars: Star[], ox: number, oy: number, w: number, h: number, t: number, wrapW: number, wrapH: number): void {
  for (const s of stars) {
    let x = (s.x + ox) % wrapW;
    let y = (s.y + oy) % wrapH;
    if (x < 0) x += wrapW;
    if (y < 0) y += wrapH;
    if (x >= w || y >= h) continue;
    const tw = Math.sin(t * (1.2 + s.b) + s.tw);
    if (s.b > 0.93) {
      // estrella grande en cruz
      const c = tw > 0 ? P.star : P.starDim;
      rect(ctx, x, y, 1, 1, P.star);
      rect(ctx, x - 1, y, 1, 1, c);
      rect(ctx, x + 1, y, 1, 1, c);
      rect(ctx, x, y - 1, 1, 1, c);
      rect(ctx, x, y + 1, 1, 1, c);
    } else if (s.b > 0.6 || tw > 0.3) {
      rect(ctx, x, y, 1, 1, s.b > 0.8 ? P.star : P.starDim);
    }
  }
}

export function drawMoon(ctx: Ctx, x: number, y: number, r: number): void {
  // halo tramado
  for (let j = -r * 3; j <= r * 3; j++) {
    for (let i = -r * 3; i <= r * 3; i++) {
      const d = Math.hypot(i, j) / (r * 3);
      if (d > 1 || d < 0.3) continue;
      if ((1 - d) * 0.5 > bayer(x + i, y + j)) rect(ctx, x + i, y + j, 1, 1, P.night4);
    }
  }
  disc(ctx, x, y, r, P.moon);
  // cráteres y terminador
  disc(ctx, x + Math.round(r * 0.35), y - Math.round(r * 0.2), Math.max(1, Math.round(r * 0.22)), P.moonShade);
  disc(ctx, x - Math.round(r * 0.3), y + Math.round(r * 0.35), Math.max(1, Math.round(r * 0.15)), P.moonShade);
  for (let j = -r; j <= r; j++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
    rect(ctx, x + half - Math.max(1, Math.round(half * 0.25)), y + j, Math.max(1, Math.round(half * 0.25)), 1, P.moonShade);
  }
}

/** Cordillera: perfil de ruido 1D con nieve opcional en las cumbres. */
export function mountainLayer(width: number, height: number, seed: number, color: string, rim: string, rough: number, snow = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  const heights: number[] = [];
  for (let x = 0; x < width; x++) {
    // suma de senos periódicos para que la tesela se repita sin costura
    const u = (x / width) * Math.PI * 2;
    const v =
      Math.sin(u * 2 + seed) * 0.35 +
      Math.sin(u * 5 + seed * 2.1) * 0.22 * rough +
      Math.sin(u * 11 + seed * 0.7) * 0.1 * rough +
      Math.sin(u * 23 + seed * 1.3) * 0.04 * rough;
    heights.push(Math.round(height * (0.45 + v * 0.5)));
  }
  for (let x = 0; x < width; x++) {
    const top = height - heights[x];
    rect(ctx, x, top, 1, height - top, color);
    rect(ctx, x, top, 1, 1, rim);
    if (snow && heights[x] > height * 0.72) {
      const depth = 1 + Math.floor((heights[x] - height * 0.72) / 3);
      for (let k = 0; k < depth; k++) if (hash(x, k, seed) > 0.25 + k * 0.1) rect(ctx, x, top + k, 1, 1, P.stone6);
    }
    // laderas iluminadas por la luna (lado izquierdo de cada pico)
    if (x > 0 && heights[x] > heights[x - 1]) {
      for (let k = 1; k < 5; k++) if (0.5 > bayer(x, top + k)) rect(ctx, x, top + k, 1, 1, rim);
    }
  }
  return canvas;
}

/** Banda de niebla tramada que se repite horizontalmente. */
export function fogLayer(width: number, height: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  for (let y = 0; y < height; y++) {
    const vy = 1 - Math.abs(y / height - 0.5) * 2;
    for (let x = 0; x < width; x++) {
      const u = (x / width) * Math.PI * 2;
      const n = 0.5 + Math.sin(u * 3 + seed) * 0.25 + Math.sin(u * 7 + seed * 3) * 0.15 + Math.sin(u * 13 + y * 0.3) * 0.1;
      const d = n * vy;
      if (d > bayer(x, y) + 0.25) {
        ctx.fillStyle = d > 0.75 ? P.stone5 : P.fog;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

export function tileX(ctx: Ctx, img: HTMLCanvasElement, offsetX: number, y: number, w: number): void {
  const iw = img.width;
  let x = Math.round(offsetX % iw);
  if (x > 0) x -= iw;
  for (; x < w; x += iw) ctx.drawImage(img, x, Math.round(y));
}

/**
 * Fondo para el interior: se ve a través de ventanas, del patio y de la torre.
 * Parallax muy bajo para que el cielo se sienta lejano.
 */
export class InteriorSky {
  private stars = makeStars(640, 480, 220, 42);
  private far = mountainLayer(512, 70, 1.7, P.mount1, P.mount3, 1, true);
  private near = mountainLayer(384, 50, 4.2, P.mount0, P.mount2, 1.4);
  private grad: HTMLCanvasElement | null = null;
  private gh = 0;

  private gradient(h: number): HTMLCanvasElement {
    if (this.grad && this.gh === h) return this.grad;
    const { canvas, ctx } = makeCanvas(8, h);
    bandGradient(ctx, 0, 0, 8, h, [P.night0, P.night1, P.night2, P.night3]);
    this.grad = canvas;
    this.gh = h;
    return canvas;
  }

  draw(ctx: Ctx, camX: number, camY: number, vw: number, vh: number, t: number, groundY: number): void {
    const g = this.gradient(vh);
    for (let x = 0; x < vw; x += 8) ctx.drawImage(g, x, 0);
    drawStars(ctx, this.stars, -camX * 0.06, -camY * 0.06, vw, vh, t, 640, 480);
    const moonX = Math.round(vw * 0.78 - camX * 0.02);
    const moonY = Math.round(vh * 0.2 - camY * 0.02);
    drawMoon(ctx, ((moonX % (vw + 200)) + vw + 200) % (vw + 200) - 100, moonY, 9);
    const horizon = groundY - camY;
    tileX(ctx, this.far, -camX * 0.15, horizon * 0.85 + vh * 0.08 - 70, vw);
    tileX(ctx, this.near, -camX * 0.3, horizon * 0.92 + vh * 0.04 - 46, vw);
    const below = Math.round(horizon * 0.92 + vh * 0.04);
    if (below < vh) rect(ctx, 0, below, vw, vh - below, P.mount0);
  }
}
