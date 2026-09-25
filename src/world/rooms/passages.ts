import { P } from '../../engine/palette';
import { ashlar, rect, type Ctx } from '../../engine/pixel';
import { SECTION } from '../shell';
import type { Rect } from '../types';

export interface StairSpec {
  bounds: Rect;
  /** Suelo al pie (x inicial) y en lo alto (x final); da igual si sube o baja. */
  from: { x: number; floor: number };
  to: { x: number; floor: number };
  steps: number;
  headroom?: number;
  /** Huecos extra que quedan abiertos (trampillas, escotillas). */
  open?: Rect[];
  /** Semilla de la mampostería de sección: debe coincidir con el macizo que atraviesa. */
  seed?: number;
}

export function stairFloor(s: StairSpec, x: number): number {
  if (x < s.from.x) return s.from.floor;
  if (x >= s.to.x) return s.to.floor;
  const stepW = (s.to.x - s.from.x) / s.steps;
  const i = Math.floor((x - s.from.x) / stepW) + 1;
  return Math.round(s.from.floor + (i * (s.to.floor - s.from.floor)) / s.steps);
}

/**
 * Escalera tallada en la roca: se rellena el área con la misma sillería del
 * corte, se excava el pasaje peldaño a peldaño y se pinta el muro de fondo.
 */
export function bakeStair(ctx: Ctx, s: StairSpec): void {
  const b = s.bounds;
  const head = s.headroom ?? 56;
  ashlar(ctx, b.x, b.y, b.w, b.h, { ...SECTION, seed: s.seed ?? 4 });
  for (let x = b.x; x < b.x + b.w; x++) {
    const fy = stairFloor(s, x);
    const top = Math.max(b.y, fy - head);
    ctx.clearRect(x, top, 1, fy - top);
  }
  for (const o of s.open ?? []) ctx.clearRect(o.x, o.y, o.w, o.h);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ashlar(ctx, b.x, b.y, b.w, b.h, { bw: 14, bh: 7, base: [P.stone2, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 41 + b.x, moss: 0.08 });
  ctx.restore();
  // aristas de los peldaños
  let prev = stairFloor(s, b.x);
  for (let x = b.x; x < b.x + b.w; x++) {
    const fy = stairFloor(s, x);
    rect(ctx, x, fy, 1, 1, P.stone5);
    rect(ctx, x, fy + 1, 1, 2, P.stone3);
    if (fy !== prev) {
      const y0 = Math.min(fy, prev);
      rect(ctx, x, y0, 1, Math.abs(fy - prev), P.stone4);
    }
    prev = fy;
  }
}
