import type { Rect, RoomId } from './types';

/**
 * El scroll nativo es una línea de tiempo espacial. Cada tramo dura `len`
 * pantallas de scroll y es de uno de tres tipos:
 *  - ext:   el exterior, con su propio progreso e (0..1)
 *  - dwell: la cámara se detiene en una sala (o la recorre si no cabe en pantalla)
 *  - move:  la cámara viaja entre salas por puertas y escaleras reales
 */
export type Seg =
  | { kind: 'ext'; len: number; e0: number; e1: number; room: RoomId }
  | { kind: 'dwell'; len: number; room: RoomId; focus: Rect; from: [number, number]; to: [number, number] }
  /**
   * Puntos de paso. `floor` encuadra como una sala apoyada en ese suelo (se
   * adapta a cada pantalla); sin `y` ni `floor` hereda la altura de la sala siguiente.
   */
  | { kind: 'move'; len: number; via: Via[]; room?: RoomId };

export interface Via {
  x: number;
  y?: number;
  floor?: number;
}

export interface CamState {
  scene: 'ext' | 'int';
  e: number;
  cx: number;
  cy: number;
  room: RoomId;
  /** Índice del tramo actual y progreso local 0..1. */
  seg: number;
  local: number;
  dwell: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);

export interface Stop {
  room: RoomId;
  seg: number;
  /** Posición de scroll (en pantallas) donde la sala queda en reposo. */
  at: number;
}

export class Timeline {
  readonly total: number;
  private starts: number[] = [];
  /**
   * Píxeles de arte que se reservan bajo el suelo de cada sala: el encuadre
   * incluye esa franja del forjado para que la cartela de texto se apoye sobre
   * piedra cortada y nunca tape objetos. Lo fija el motor según la pantalla.
   */
  floorPad = 34;

  constructor(readonly segs: Seg[]) {
    let acc = 0;
    for (const s of segs) {
      this.starts.push(acc);
      acc += s.len;
    }
    this.total = acc;
  }

  /** Cámara de una parada para el tamaño de vista actual (recorre si la sala no cabe). */
  dwellCam(s: Extract<Seg, { kind: 'dwell' }>, t: number, vw: number, vh: number): { x: number; y: number } {
    const f = { ...s.focus, h: s.focus.h + this.floorPad };
    const k = smooth(clamp((t - 0.12) / 0.76, 0, 1));
    const axis = (start: number, size: number, view: number, a: number, b: number) => {
      if (size <= view) return start + size / 2;
      const lo = start + view / 2;
      const hi = start + size - view / 2;
      const pa = lo + (hi - lo) * a;
      const pb = lo + (hi - lo) * b;
      return pa + (pb - pa) * k;
    };
    return {
      x: axis(f.x, f.w, vw, s.from[0], s.to[0]),
      y: axis(f.y, f.h, vh, s.from[1], s.to[1]),
    };
  }

  private neighborDwell(i: number, dir: -1 | 1): Extract<Seg, { kind: 'dwell' }> | null {
    for (let j = i + dir; j >= 0 && j < this.segs.length; j += dir) {
      const s = this.segs[j];
      if (s.kind === 'dwell') return s;
      if (s.kind === 'ext') return null;
    }
    return null;
  }

  evaluate(p: number, vw: number, vh: number): CamState {
    p = clamp(p, 0, this.total - 1e-6);
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > p) i--;
    const s = this.segs[i];
    const local = clamp((p - this.starts[i]) / s.len, 0, 1);

    if (s.kind === 'ext') {
      return { scene: 'ext', e: s.e0 + (s.e1 - s.e0) * local, cx: 0, cy: 0, room: s.room, seg: i, local, dwell: s.e0 === 0 };
    }
    if (s.kind === 'dwell') {
      const c = this.dwellCam(s, local, vw, vh);
      return { scene: 'int', e: 1, cx: c.x, cy: c.y, room: s.room, seg: i, local, dwell: true };
    }
    // move: recorrido por la polilínea [fin de la parada anterior, via..., inicio de la siguiente]
    const prev = this.neighborDwell(i, -1);
    const next = this.neighborDwell(i, 1);
    const pts: { x: number; y: number }[] = [];
    const startCam = prev && this.segs[i - 1]?.kind === 'dwell' ? this.dwellCam(prev, 1, vw, vh) : null;
    const endCam = next ? this.dwellCam(next, 0, vw, vh) : null;
    if (startCam) pts.push(startCam);
    const fallbackY = endCam?.y ?? startCam?.y ?? 0;
    for (const v of s.via) {
      const y = v.y ?? (v.floor !== undefined ? v.floor + this.floorPad - vh / 2 : fallbackY);
      pts.push({ x: v.x, y });
    }
    if (endCam) pts.push(endCam);
    const lens: number[] = [];
    let total = 0;
    for (let k = 1; k < pts.length; k++) {
      const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      lens.push(d);
      total += d;
    }
    let dist = ease(local) * total;
    let k = 0;
    while (k < lens.length - 1 && dist > lens[k]) {
      dist -= lens[k];
      k++;
    }
    const a = pts[k];
    const b = pts[Math.min(k + 1, pts.length - 1)];
    const f = lens[k] ? dist / lens[k] : 0;
    const room = s.room ?? (local < 0.5 ? prev?.room : next?.room) ?? 'hall';
    return { scene: 'int', e: 1, cx: a.x + (b.x - a.x) * f, cy: a.y + (b.y - a.y) * f, room, seg: i, local, dwell: false };
  }

  /** Puntos de reposo de cada sala, para el mapa. */
  stops(): Stop[] {
    const out: Stop[] = [];
    this.segs.forEach((s, i) => {
      if (s.kind === 'dwell' || (s.kind === 'ext' && s.e0 === 0)) {
        if (out.some((o) => o.room === s.room)) return;
        out.push({ room: s.room, seg: i, at: this.starts[i] + s.len * (s.kind === 'dwell' ? 0.3 : 0.1) });
      }
    });
    return out;
  }

  start(i: number): number {
    return this.starts[i];
  }
}
