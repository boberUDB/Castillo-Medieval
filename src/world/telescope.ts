import { P } from '../engine/palette';
import { bayer, disc, hash, makeCanvas, px, rect, rng, type Ctx } from '../engine/pixel';

/**
 * Lo que se ve por el telescopio del observatorio: un cielo dentro de la lente
 * (aro de latón), la luna llena de cerca y las constelaciones del castillo,
 * que se dibujan una a una.
 */

export interface Constellation {
  id: string;
  name: string;
  stars: [number, number][];
  /** Pares de índices de estrellas unidas por línea, en orden de dibujo. */
  lines: [number, number][];
  /** Dónde va la etiqueta (coordenadas 0..1 de la lente). */
  label: [number, number];
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'cuervo',
    name: 'El Cuervo y la Corona',
    stars: [
      [0.24, 0.44], // pico
      [0.29, 0.42], // cabeza
      [0.33, 0.48], // cuello
      [0.43, 0.46], // lomo
      [0.5, 0.36], // punta del ala
      [0.57, 0.53], // cola
      [0.41, 0.56], // vientre
      [0.38, 0.62], // pata
      [0.33, 0.7], // corona: base izquierda
      [0.34, 0.65],
      [0.36, 0.68],
      [0.38, 0.64],
      [0.4, 0.68],
      [0.42, 0.65],
      [0.43, 0.7], // base derecha
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
      [2, 6],
      [6, 5],
      [6, 7],
      [7, 11],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 8],
    ],
    label: [0.4, 0.76],
  },
  {
    id: 'torre',
    name: 'La Torre de Aldric',
    stars: [
      [0.2, 0.33],
      [0.2, 0.17],
      [0.22, 0.14],
      [0.24, 0.17],
      [0.26, 0.14],
      [0.28, 0.17],
      [0.28, 0.33],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
    label: [0.24, 0.38],
  },
  {
    id: 'gato',
    name: 'Bigotes (sí, en serio)',
    stars: [
      [0.63, 0.79],
      [0.65, 0.71],
      [0.68, 0.76],
      [0.71, 0.71],
      [0.73, 0.79],
      [0.75, 0.85],
      [0.64, 0.85],
      [0.81, 0.8],
      [0.82, 0.73],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [5, 7],
      [7, 8],
    ],
    label: [0.72, 0.9],
  },
];

/** Tiempos de aparición: cada constelación empieza y tarda lo mismo en trazarse. */
export const REVEAL = { first: 0.8, gap: 1.4, draw: 1.7 };

const MOON = { u: 0.71, v: 0.33, r: 0.23 };

export class TelescopeSky {
  private w = 0;
  private h = 0;
  private cx = 0;
  private cy = 0;
  private R = 0;
  private base: HTMLCanvasElement | null = null;
  private sky: HTMLCanvasElement | null = null;
  private skyCtx: Ctx | null = null;
  private mask: HTMLCanvasElement | null = null;
  private twinklers: { x: number; y: number; ph: number; sp: number }[] = [];

  /** Geometría de la lente: centrada arriba en vertical para dejar sitio al texto. */
  resize(w: number, h: number, portrait: boolean): { cx: number; cy: number; R: number } {
    this.w = w;
    this.h = h;
    // horizontal: lente a la izquierda y texto a la derecha; vertical: lente arriba
    this.R = Math.floor(portrait ? Math.min(w * 0.44, h * 0.26) : Math.min(h * 0.43, w * 0.28));
    this.cx = Math.round(portrait ? w / 2 : w * 0.33);
    this.cy = Math.round(portrait ? h * 0.37 : h * 0.5);
    this.bakeBase();
    this.bakeMask();
    const sky = makeCanvas(w, h);
    this.sky = sky.canvas;
    this.skyCtx = sky.ctx;
    const rnd = rng(17);
    this.twinklers = [];
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * this.R * 0.95;
      this.twinklers.push({ x: Math.round(this.cx + Math.cos(a) * d), y: Math.round(this.cy + Math.sin(a) * d), ph: rnd() * 6.28, sp: 0.8 + rnd() * 2 });
    }
    return { cx: this.cx, cy: this.cy, R: this.R };
  }

  /** Pasa de coordenadas de lente (0..1) a píxeles de arte. */
  at(u: number, v: number): [number, number] {
    return [Math.round(this.cx - this.R + u * 2 * this.R), Math.round(this.cy - this.R + v * 2 * this.R)];
  }

  private inside(x: number, y: number, pad = 0): boolean {
    return Math.hypot(x - this.cx, y - this.cy) <= this.R - pad;
  }

  private bakeMask(): void {
    const { canvas, ctx } = makeCanvas(this.w, this.h);
    ctx.fillStyle = '#000';
    for (let y = this.cy - this.R; y <= this.cy + this.R; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, this.R * this.R - (y - this.cy) ** 2)));
      ctx.fillRect(this.cx - half, y, half * 2 + 1, 1);
    }
    this.mask = canvas;
  }

  /** Fondo estático: fuera de la lente, cielo con vía láctea, estrellas tenues y la luna. */
  private bakeBase(): void {
    const { w, h, cx, cy, R } = this;
    const { canvas, ctx } = makeCanvas(w, h);
    // el interior oscuro del tubo
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - cx, y - cy) / (R * 1.9);
        ctx.fillStyle = d * 0.9 > bayer(x, y) + 0.2 ? P.black : P.ink;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // cielo: degradado tramado, más claro hacia la luna
    const [mx, my] = this.at(MOON.u, MOON.v);
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!this.inside(x, y)) continue;
        const toMoon = Math.hypot(x - mx, y - my) / (R * 1.4);
        const v = Math.max(0, 1 - toMoon) * 2.2 + (y - (cy - R)) / (2 * R) * 0.6;
        const k = v + (bayer(x, y) - 0.5) * 0.5;
        ctx.fillStyle = k > 1.9 ? P.night4 : k > 1.2 ? P.night3 : k > 0.55 ? P.night2 : P.night1;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // vía láctea: banda diagonal de polvo y estrellas finas
    const rnd = rng(5);
    for (let i = 0; i < R * R * 0.9; i++) {
      const t = rnd() * 2 - 1;
      const spread = (rnd() + rnd() + rnd() - 1.5) * R * 0.22;
      const x = Math.round(cx + t * R * 1.1 + spread * 0.5);
      const y = Math.round(cy + t * R * 0.55 - R * 0.05 + spread);
      if (!this.inside(x, y, 1)) continue;
      const near = Math.abs(spread) / (R * 0.22);
      if (near < 0.6 && bayer(x, y) > 0.55 + near * 0.3) px(ctx, x, y, rnd() < 0.2 ? P.violet3 : P.night4);
      else if (rnd() < 0.05) px(ctx, x, y, P.starDim);
    }
    // estrellas tenues de fondo
    for (let i = 0; i < R * 3; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * R;
      const x = Math.round(cx + Math.cos(a) * d);
      const y = Math.round(cy + Math.sin(a) * d);
      if (this.inside(x, y, 1)) px(ctx, x, y, rnd() < 0.3 ? P.star : P.starDim);
    }
    this.drawMoon(ctx, mx, my, Math.max(8, Math.round(R * MOON.r)));
    // viñeta en el borde de la lente
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        const d = Math.hypot(x - cx, y - cy) / R;
        if (d > 1 || d < 0.78) continue;
        if ((d - 0.78) * 3.2 > bayer(x, y)) px(ctx, x, y, d > 0.93 ? P.black : P.night0);
      }
    }
    this.base = canvas;
  }

  /** Luna llena casi entera: halo, mares, cráteres y un terminador suave. */
  private drawMoon(ctx: Ctx, x: number, y: number, r: number): void {
    // halo en anillos tramados
    for (let j = -r * 3; j <= r * 3; j++) {
      for (let i = -r * 3; i <= r * 3; i++) {
        const d = Math.hypot(i, j) / r;
        if (d < 1 || d > 3) continue;
        const k = (3 - d) / 2;
        if (!this.inside(x + i, y + j, 1)) continue;
        if (k * 0.55 > bayer(x + i, y + j)) px(ctx, x + i, y + j, d < 1.5 ? P.stone5 : d < 2.1 ? P.night4 : P.night3);
      }
    }
    disc(ctx, x, y, r, P.moon);
    // mares: manchas grandes y suaves
    const maria: [number, number, number][] = [
      [-0.35, -0.3, 0.32],
      [0.1, -0.4, 0.22],
      [-0.1, 0.05, 0.28],
      [0.3, 0.2, 0.2],
      [-0.4, 0.35, 0.18],
    ];
    for (const [dx, dy, s] of maria) {
      const mr = Math.max(1, Math.round(r * s));
      const mx = x + Math.round(dx * r);
      const my = y + Math.round(dy * r);
      for (let j = -mr; j <= mr; j++) {
        for (let i = -mr; i <= mr; i++) {
          const d = Math.hypot(i, j) / mr;
          if (d > 1 || Math.hypot(mx + i - x, my + j - y) > r - 1) continue;
          if (d < 0.7 || bayer(mx + i, my + j) > (d - 0.7) * 3) px(ctx, mx + i, my + j, bayer(mx + i, my + j) > 0.82 ? P.stone7 : P.moonShade);
        }
      }
    }
    // cráteres con borde iluminado
    const rnd = rng(9);
    for (let k = 0; k < 6; k++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * 0.8;
      const cr = Math.max(1, Math.round(r * (0.05 + rnd() * 0.08)));
      const ccx = Math.round(x + Math.cos(a) * d);
      const ccy = Math.round(y + Math.sin(a) * d);
      disc(ctx, ccx, ccy, cr, P.moonShade);
      px(ctx, ccx + cr, ccy + cr, P.moon);
      px(ctx, ccx - cr, ccy - cr, P.stone7);
      px(ctx, ccx, ccy, P.stone7);
    }
    // terminador: la luna está casi llena, un poco de sombra a la izquierda
    for (let j = -r; j <= r; j++) {
      const half = Math.sqrt(Math.max(0, r * r - j * j));
      for (let i = -Math.floor(half); i <= Math.floor(half); i++) {
        const u = (i + half) / (2 * half + 0.001);
        if (u < 0.22 && bayer(x + i, y + j) > u / 0.22) px(ctx, x + i, y + j, u < 0.1 ? P.stone5 : P.moonShade);
      }
    }
    // brillo del limbo
    for (let a = -1.2; a < 0.6; a += 0.08) px(ctx, x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r), P.star);
  }

  /** Línea de carta celeste: punteada, del color del oro viejo. */
  private dotted(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, frac: number): void {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    const lim = Math.floor(n * frac);
    for (let i = 0; i <= lim; i++) {
      if (i % 3 === 2) continue;
      px(ctx, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, i % 3 === 0 ? P.gold3 : P.gold2);
    }
  }

  private star(ctx: Ctx, x: number, y: number, big: boolean, glow: number): void {
    px(ctx, x, y, P.star);
    if (!big && glow < 0.5) return;
    const c = glow > 0.8 ? P.gold4 : P.starDim;
    px(ctx, x - 1, y, c);
    px(ctx, x + 1, y, c);
    px(ctx, x, y - 1, c);
    px(ctx, x, y + 1, c);
  }

  /** @param t segundos desde que se abrió la vista. */
  render(ctx: Ctx, t: number, reduced: boolean): void {
    if (!this.base || !this.sky || !this.skyCtx || !this.mask) return;
    const s = this.skyCtx;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, this.w, this.h);
    s.drawImage(this.base, 0, 0);

    // estrellas que titilan
    for (const tw of this.twinklers) {
      const k = reduced ? 0.6 : (Math.sin(t * tw.sp + tw.ph) + 1) / 2;
      if (k > 0.75) this.star(s, tw.x, tw.y, k > 0.93, k);
      else if (k > 0.3) px(s, tw.x, tw.y, P.starDim);
    }

    // constelaciones que se trazan una a una
    CONSTELLATIONS.forEach((c, ci) => {
      const start = REVEAL.first + ci * REVEAL.gap;
      const p = reduced ? 1 : Math.max(0, Math.min(1, (t - start) / REVEAL.draw));
      if (p <= 0) return;
      const pts = c.stars.map(([u, v]) => this.at(u, v));
      const total = c.lines.length;
      c.lines.forEach(([a, b], li) => {
        const f = Math.max(0, Math.min(1, p * total - li));
        if (f > 0) this.dotted(s, pts[a][0], pts[a][1], pts[b][0], pts[b][1], f);
      });
      pts.forEach(([x, y], i) => {
        const appear = Math.max(0, Math.min(1, p * (pts.length + 2) - i));
        if (appear <= 0) return;
        const pulse = reduced ? 0.9 : (Math.sin(t * 2 + i) + 1) / 2;
        this.star(s, x, y, i === 0 || i === pts.length - 1 || appear < 1, 0.6 + pulse * 0.4);
      });
    });

    // estrella fugaz de vez en cuando
    if (!reduced) {
      const cycle = 7;
      const k = (t % cycle) / 0.7;
      const n = Math.floor(t / cycle);
      if (k < 1) {
        const sx0 = this.cx - this.R * 0.6 + hash(n, 1, 3) * this.R * 0.8;
        const sy0 = this.cy - this.R * 0.7 + hash(n, 2, 3) * this.R * 0.3;
        for (let i = 0; i < 10; i++) {
          const q = k - i * 0.03;
          if (q < 0) continue;
          px(s, sx0 + q * this.R * 0.5, sy0 + q * this.R * 0.25, i < 3 ? P.star : P.starDim);
        }
      }
    }

    // recorte a la lente (máscara de píxeles exactos, sin antialias)
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(this.mask, 0, 0);
    s.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.base, 0, 0, this.w, this.h);
    ctx.drawImage(this.sky, 0, 0);
    this.ring(ctx);
  }

  /** Aro de latón de la lente, iluminado desde arriba a la izquierda. */
  private ring(ctx: Ctx): void {
    const { cx, cy, R } = this;
    const thick = Math.max(3, Math.round(R * 0.05));
    for (let y = cy - R - thick; y <= cy + R + thick; y++) {
      for (let x = cx - R - thick; x <= cx + R + thick; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= R || d > R + thick) continue;
        const ang = Math.atan2(y - cy, x - cx);
        const light = Math.cos(ang + Math.PI * 0.75);
        const edge = d > R + thick - 1 || d < R + 1;
        let c: string = light > 0.45 ? P.gold3 : light > -0.2 ? P.gold2 : light > -0.7 ? P.gold1 : P.gold0;
        if (edge) c = P.gold0;
        if (!edge && light > 0.8 && bayer(x, y) > 0.5) c = P.gold4;
        rect(ctx, x, y, 1, 1, c);
      }
    }
    // tornillos del aro
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const x = Math.round(cx + Math.cos(a) * (R + thick / 2));
      const y = Math.round(cy + Math.sin(a) * (R + thick / 2));
      px(ctx, x, y, P.gold0);
      px(ctx, x - 1, y - 1, P.gold4);
    }
  }
}
