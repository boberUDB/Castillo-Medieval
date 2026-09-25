import { bayer, makeCanvas, type Ctx } from './pixel';

export type LightKind = 'warm' | 'candle' | 'cold' | 'green' | 'teal' | 'ghost' | 'gold';

export interface Light {
  x: number;
  y: number;
  r: number;
  kind?: LightKind;
  /** 0..1: cuánto parpadea el radio. */
  flicker?: number;
  /** 0..1: intensidad del brillo aditivo. */
  glow?: number;
  seed?: number;
}

const GLOW_COLOR: Record<LightKind, [number, number, number]> = {
  warm: [255, 150, 60],
  candle: [255, 196, 110],
  cold: [120, 150, 255],
  green: [120, 230, 90],
  teal: [90, 230, 220],
  ghost: [150, 225, 255],
  gold: [255, 210, 90],
};

const glowSprites = new Map<string, HTMLCanvasElement>();

/** Halo radial tramado (sin degradados suaves) para ventanas, antorchas y magia. */
export function glowSprite(r: number, kind: LightKind): HTMLCanvasElement {
  r = Math.max(2, Math.round(r));
  const key = `${kind}:${r}`;
  const hit = glowSprites.get(key);
  if (hit) return hit;
  const [cr, cg, cb] = GLOW_COLOR[kind];
  const size = r * 2 + 1;
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const f = Math.max(0, 1 - Math.hypot(x - r, y - r) / r);
      const lvl = Math.min(3, Math.floor(f * f * 3 + bayer(x + 1, y + 2)));
      const i = (y * size + x) * 4;
      img.data[i] = cr;
      img.data[i + 1] = cg;
      img.data[i + 2] = cb;
      img.data[i + 3] = Math.round((lvl / 3) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  glowSprites.set(key, canvas);
  return canvas;
}

export function glowAt(ctx: Ctx, x: number, y: number, r: number, kind: LightKind, alpha: number): void {
  const g = glowSprite(r, kind);
  const half = (g.width - 1) / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(g, Math.round(x - half), Math.round(y - half));
  ctx.restore();
}

/**
 * Luz con tramado ordenado: la oscuridad se "perfora" con discos cuantizados a
 * cuatro niveles y mezclados con la matriz Bayer, como en el pixel art hecho a mano.
 * Los sprites se cachean por radio, así el coste por fotograma es un drawImage por luz.
 */
export class Lighting {
  private dark: HTMLCanvasElement;
  private dctx: Ctx;
  private holes = new Map<number, HTMLCanvasElement>();

  constructor(w: number, h: number) {
    const { canvas, ctx } = makeCanvas(w, h);
    this.dark = canvas;
    this.dctx = ctx;
  }

  resize(w: number, h: number): void {
    this.dark.width = w;
    this.dark.height = h;
    this.dctx.imageSmoothingEnabled = false;
  }

  private hole(r: number): HTMLCanvasElement {
    const cached = this.holes.get(r);
    if (cached) return cached;
    const size = r * 2 + 1;
    const { canvas, ctx } = makeCanvas(size, size);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - r, y - r) / r;
        const f = Math.max(0, 1 - d);
        const v = Math.min(1, f * 1.6);
        const lvl = Math.min(3, Math.floor(v * 3 + bayer(x, y)));
        const i = (y * size + x) * 4;
        img.data[i + 3] = Math.round((lvl / 3) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    this.holes.set(r, canvas);
    return canvas;
  }

  private glow(r: number, kind: LightKind): HTMLCanvasElement {
    return glowSprite(r, kind);
  }

  /**
   * @param zones rectángulos en pantalla con su oscuridad ambiente (0..1).
   * @param base oscuridad para todo lo que no sea una zona.
   */
  render(
    ctx: Ctx,
    zones: { x: number; y: number; w: number; h: number; a: number }[],
    base: number,
    lights: Light[],
    camX: number,
    camY: number,
    t: number,
    glowAmount = 1,
  ): void {
    const d = this.dctx;
    const W = this.dark.width;
    const H = this.dark.height;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(8,5,22,${base})`;
    d.fillRect(0, 0, W, H);
    for (const z of zones) {
      d.clearRect(z.x, z.y, z.w, z.h);
      d.fillStyle = `rgba(8,5,22,${z.a})`;
      d.fillRect(z.x, z.y, z.w, z.h);
    }
    d.globalCompositeOperation = 'destination-out';
    const radii: number[] = [];
    for (const L of lights) {
      const fl = L.flicker ?? 0;
      const s = L.seed ?? L.x * 0.37 + L.y;
      const wob = fl > 0 ? Math.round((Math.sin(t * 9 + s) * 0.6 + Math.sin(t * 23 + s * 2) * 0.4) * fl * 2.2) : 0;
      const r = Math.max(4, Math.round(L.r + wob));
      radii.push(r);
      const sx = Math.round(L.x - camX);
      const sy = Math.round(L.y - camY);
      if (sx + r < 0 || sy + r < 0 || sx - r > W || sy - r > H) continue;
      d.drawImage(this.hole(r), sx - r, sy - r);
    }
    ctx.drawImage(this.dark, 0, 0);

    if (glowAmount <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((L, i) => {
      const g = (L.glow ?? 0.25) * glowAmount;
      if (g <= 0) return;
      const r = Math.max(3, Math.round(radii[i] * 0.75));
      const sx = Math.round(L.x - camX);
      const sy = Math.round(L.y - camY);
      if (sx + r < 0 || sy + r < 0 || sx - r > W || sy - r > H) return;
      ctx.globalAlpha = g;
      ctx.drawImage(this.glow(r, L.kind ?? 'warm'), sx - r, sy - r);
    });
    ctx.restore();
  }
}
