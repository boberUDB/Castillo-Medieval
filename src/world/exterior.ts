import { P } from '../engine/palette';
import { bayer, hash, makeCanvas, px, rect, type Ctx } from '../engine/pixel';
import type { FxState, HotspotDef } from './types';
import { drawMoon, drawStars, fogLayer, makeStars, mountainLayer, tileX } from './sky';
import { flame, pennant, ravenSprite } from './props';
import { glowAt } from '../engine/lighting';

/**
 * Exterior en 2.5D. Cada capa tiene una profundidad dz relativa al plano del
 * portón y se proyecta con escala = 1 / (1/s + dz). Toda la geometría se vuelve
 * a rasterizar a la resolución de arte en cada cambio de cámara: al acercarse,
 * las piezas crecen pero el píxel sigue siendo del mismo tamaño y nítido.
 */

interface T {
  s: number;
  ox: number;
  oy: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const seg = (e: number, a: number, b: number) => clamp((e - a) / (b - a), 0, 1);

/** Rectángulo en unidades del castillo, sin huecos entre piezas contiguas. */
function R(ctx: Ctx, T: T, x: number, y: number, w: number, h: number, color: string): void {
  const x0 = Math.round(T.ox + x * T.s);
  const y0 = Math.round(T.oy + y * T.s);
  const x1 = Math.round(T.ox + (x + w) * T.s);
  const y1 = Math.round(T.oy + (y + h) * T.s);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

const sx = (T: T, x: number) => Math.round(T.ox + x * T.s);
const sy = (T: T, y: number) => Math.round(T.oy + y * T.s);

/** Muro de sillería. `shade(u)` da el tono (0..1) según la posición horizontal (torres cilíndricas). */
function wall(
  ctx: Ctx,
  T: T,
  x: number,
  y: number,
  w: number,
  h: number,
  vw: number,
  vh: number,
  seed: number,
  shade: (u: number) => number = () => 0.55,
  tint = 0,
): void {
  const X0 = sx(T, x);
  const X1 = sx(T, x + w);
  const Y0 = sy(T, y);
  const Y1 = sy(T, y + h);
  if (X1 < 0 || Y1 < 0 || X0 > vw || Y0 > vh) return;
  const tones = [P.stone1, P.stone2, P.stone3, P.stone4, P.stone5, P.stone6];
  const bw = 8;
  const bh = 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(X0, Y0, X1 - X0, Y1 - Y0);
  ctx.clip();
  ctx.fillStyle = P.stone1;
  ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  const rows = Math.ceil(h / bh);
  // recorte a la vista para no dibujar ladrillos invisibles
  const rStart = Math.max(0, Math.floor((-T.oy / T.s - y) / bh) - 1);
  const rEnd = Math.min(rows, Math.ceil(((vh - T.oy) / T.s - y) / bh) + 1);
  for (let r = rStart; r < rEnd; r++) {
    const off = (r & 1) * (bw / 2);
    const cStart = Math.max(-1, Math.floor((-T.ox / T.s - x - off) / bw) - 1);
    const cEnd = Math.min(Math.ceil(w / bw) + 1, Math.ceil(((vw - T.ox) / T.s - x - off) / bw) + 1);
    for (let c = cStart; c < cEnd; c++) {
      const bx = x + c * bw + off;
      const by = y + r * bh;
      const u = clamp((bx + bw / 2 - x) / w, 0, 1);
      const hv = hash(c, r, seed);
      const tone = clamp(Math.round(shade(u) * 4 + (hv - 0.5) * 1.2 - tint), 1, 4);
      const x0 = sx(T, bx);
      const y0 = sy(T, by);
      const x1 = sx(T, bx + bw);
      const y1 = sy(T, by + bh);
      ctx.fillStyle = tones[tone];
      ctx.fillRect(x0, y0, x1 - x0 - 1, y1 - y0 - 1);
      if (T.s >= 1.6) {
        ctx.fillStyle = tones[Math.min(5, tone + 1)];
        ctx.fillRect(x0, y0, x1 - x0 - 1, 1);
        ctx.fillStyle = tones[tone - 1];
        ctx.fillRect(x0, y1 - 2, x1 - x0 - 1, 1);
      }
      if (T.s >= 3 && hv > 0.8) {
        ctx.fillStyle = tones[tone - 1];
        ctx.fillRect(x0 + Math.round((x1 - x0) * 0.3), y0 + 2, 1, Math.max(1, Math.round((y1 - y0) * 0.4)));
      }
    }
  }
  ctx.restore();
}

function crenels(ctx: Ctx, T: T, x: number, y: number, w: number, vw: number, vh: number, seed: number, shade?: (u: number) => number): void {
  for (let mx = x; mx < x + w - 2; mx += 10) {
    wall(ctx, T, mx, y - 6, Math.min(6, x + w - mx), 6, vw, vh, seed + mx, shade);
    R(ctx, T, mx, y - 6, Math.min(6, x + w - mx), 0.6, P.stone6);
  }
}

/** Anillo de arco de medio punto (dovelas), base en y=bottom. */
function archShape(ctx: Ctx, T: T, cx: number, bottom: number, r: number, hStraight: number, color: string): void {
  const x0 = sx(T, cx - r);
  const x1 = sx(T, cx + r);
  const yb = sy(T, bottom);
  const ys = sy(T, bottom - hStraight);
  ctx.fillStyle = color;
  ctx.fillRect(x0, ys, x1 - x0, yb - ys);
  const rr = (x1 - x0) / 2;
  const ccx = (x0 + x1) / 2;
  const rows = Math.ceil(rr);
  for (let j = 0; j < rows; j++) {
    const dy = rows - j;
    const half = Math.sqrt(Math.max(0, rr * rr - dy * dy));
    const a = Math.round(ccx - half);
    const b = Math.round(ccx + half);
    ctx.fillRect(a, ys - rows + j, b - a, 1);
  }
}

function pineTree(ctx: Ctx, T: T, x: number, y: number, h: number, dark: string, mid: string): void {
  R(ctx, T, x - 1, y - h * 0.2, 2, h * 0.2, P.wood0);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const ty = y - h * 0.15 - i * h * 0.2;
    const tw = h * (0.34 - i * 0.07);
    const th = h * 0.32;
    const Y0 = sy(T, ty - th);
    const Y1 = sy(T, ty);
    for (let Y = Y0; Y < Y1; Y++) {
      const k = (Y - Y0) / Math.max(1, Y1 - Y0);
      const half = tw * k * T.s;
      const cx = sx(T, x);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(cx - half), Y, Math.round(half * 2) + 1, 1);
      ctx.fillStyle = mid;
      ctx.fillRect(Math.round(cx - half), Y, Math.max(1, Math.round(half * 0.5)), 1);
    }
  }
}

/** Objetos interactivos del exterior (su posición la calcula la proyección cada fotograma). */
export const EXTERIOR_HOTSPOTS: HotspotDef[] = [
  { id: 'ext.letter', x: 0, y: 0, w: 0, h: 0, label: 'Leer el pergamino clavado en el poste', kind: 'main' },
  { id: 'ext.window', x: 0, y: 0, w: 0, h: 0, label: 'Llamar a la ventana iluminada', kind: 'minor' },
  { id: 'ext.raven', x: 0, y: 0, w: 0, h: 0, label: 'Molestar al cuervo', kind: 'secret' },
];

export interface ExtHotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

type Cam = ReturnType<Exterior['camera']>;
type Proj = (dz: number) => T | null;

export class Exterior {
  private stars = makeStars(900, 500, 320, 7);
  private far = mountainLayer(512, 90, 2.3, P.mount1, P.mount3, 1, true);
  private mid = mountainLayer(420, 70, 5.1, P.mount0, P.mount2, 1.3);
  private fog = fogLayer(384, 22, 3);
  private fog2 = fogLayer(320, 16, 8);
  private castleCache: { key: string; canvas: HTMLCanvasElement } | null = null;
  private spots: ExtHotspot[] = [];
  private sky: HTMLCanvasElement | null = null;

  private skyGradient(vw: number, vh: number): HTMLCanvasElement {
    if (this.sky && this.sky.width === vw && this.sky.height === vh) return this.sky;
    const { canvas, ctx } = makeCanvas(vw, vh);
    for (let y = 0; y < vh; y++) {
      const k = y / vh;
      for (let x = 0; x < vw; x++) {
        const v = k * 3 + bayer(x, y) - 0.5;
        ctx.fillStyle = v < 0.6 ? P.night0 : v < 1.4 ? P.night1 : v < 2.3 ? P.night2 : P.night3;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.sky = canvas;
    return canvas;
  }

  /** Parámetros de cámara derivados del progreso e (0..1) del exterior. */
  camera(e: number, vw: number, vh: number) {
    // escala inicial con ladrillos de tamaño entero (8×4 u → 6×3 o 4×2 px)
    const s0 = vw >= 300 ? 0.75 : 0.5;
    const s1 = Math.min((vh * 0.8) / 80, (vw * 0.9) / 36);
    const approach = smooth(seg(e, 0.12, 0.5));
    const hold = seg(e, 0.5, 0.8);
    const fly = seg(e, 0.8, 1);
    let s = s0 + (s1 - s0) * approach;
    s *= 1 + hold * 0.15;
    if (fly > 0) s = s / (1 - 0.955 * Math.pow(fly, 1.6));
    const camY = -88 + (88 - 16) * approach + hold * 2 - fly * 4;
    return { s, camX: 0, camY, bridge: smooth(seg(e, 0.5, 0.64)), port: smooth(seg(e, 0.64, 0.8)), fly };
  }

  hotspots(): ExtHotspot[] {
    return this.spots;
  }

  render(ctx: Ctx, vw: number, vh: number, e: number, t: number, fx: FxState): void {
    const cam = this.camera(e, vw, vh);
    const proj: Proj = (dz) => {
      const d = 1 / cam.s + dz;
      if (d <= 0.012) return null;
      const s = 1 / d;
      return { s, ox: vw / 2 - cam.camX * s, oy: vh * 0.5 - cam.camY * s };
    };
    this.spots = [];

    // --- cielo, estrellas y luna
    ctx.drawImage(this.skyGradient(vw, vh), 0, 0);
    drawStars(ctx, this.stars, 0, Math.round(-cam.camY * 0.1), vw, vh, fx.reduced ? 0 : t, 900, 500);
    const moonX = Math.round(vw * 0.86);
    const moonY = Math.round(vh * 0.3 + (cam.camY + 88) * 0.12);
    drawMoon(ctx, moonX, moonY, Math.max(6, Math.round(vh / 28)));

    // --- cordilleras lejanas (casi no cambian de escala: solo se desplazan)
    const Tf = proj(3);
    const Tm = proj(1.2);
    if (Tf) tileX(ctx, this.far, vw / 2 - 256, sy(Tf, 30) - 88, vw);
    if (Tm) {
      tileX(ctx, this.mid, vw / 2 - 210, sy(Tm, 24) - 66, vw);
      const hillTop = sy(Tm, 24) - 4;
      if (hillTop < vh) rect(ctx, 0, hillTop, vw, vh - hillTop, P.mount0);
      ctx.globalAlpha = 0.5;
      tileX(ctx, this.fog2, fx.reduced ? 0 : -t * 3, sy(Tm, 10) - 10, vw);
      ctx.globalAlpha = 1;
    }

    // --- castillo (cacheado mientras la cámara no se mueve)
    const key = `${vw}x${vh}:${cam.s.toFixed(4)}:${cam.camY.toFixed(3)}:${cam.bridge.toFixed(3)}:${cam.port.toFixed(3)}`;
    if (!this.castleCache || this.castleCache.key !== key) {
      const c = this.castleCache?.canvas ?? makeCanvas(vw, vh).canvas;
      if (c.width !== vw || c.height !== vh) {
        c.width = vw;
        c.height = vh;
      }
      const cc = c.getContext('2d')!;
      cc.imageSmoothingEnabled = false;
      cc.clearRect(0, 0, vw, vh);
      this.drawCastle(cc, proj, cam, vw, vh);
      this.castleCache = { key, canvas: c };
    }
    ctx.drawImage(this.castleCache.canvas, 0, 0);

    this.drawAnimated(ctx, proj, cam, vw, t, fx, moonX);

    // --- niebla baja que cruza delante del foso
    const Tn = proj(-0.12);
    if (Tn) {
      ctx.globalAlpha = 0.38 * (1 - cam.fly);
      tileX(ctx, this.fog, fx.reduced ? 0 : t * 5, sy(Tn, 14) - 8, vw);
      ctx.globalAlpha = 1;
    }

    this.drawForeground(ctx, proj, fx, e, t);

    // oscuridad al final del túnel
    if (cam.fly > 0.82) {
      ctx.fillStyle = P.black;
      ctx.globalAlpha = smooth(seg(cam.fly, 0.82, 1));
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
  }

  private drawCastle(ctx: Ctx, proj: Proj, cam: Cam, vw: number, vh: number): void {
    // la luna ilumina desde la derecha
    const cyl = (u: number) => 0.25 + u * 0.65;
    const flat = (u: number) => 0.45 + u * 0.1;

    // torre del observatorio (lejana)
    const To = proj(0.35);
    if (To) {
      wall(ctx, To, 66, -175, 26, 150, vw, vh, 31, cyl, 1);
      const cx = sx(To, 79);
      const top = sy(To, -175);
      const r = Math.max(2, Math.round(16 * To.s));
      for (let j = 0; j < r; j++) {
        const half = Math.round(Math.sqrt(r * r - (r - j) * (r - j)));
        rect(ctx, cx - half, top - r + j, half * 2, 1, (j & 3) === 0 ? P.teal1 : P.teal0);
        rect(ctx, cx + Math.round(half * 0.3), top - r + j, Math.max(1, Math.round(half * 0.5)), 1, P.teal1);
      }
      rect(ctx, cx - 1, top - r - Math.round(6 * To.s), 2, Math.round(6 * To.s), P.gold1);
      // ranura del telescopio
      rect(ctx, cx - 1, top - r + 1, Math.max(1, Math.round(2 * To.s)), Math.round(r * 0.8), P.night0);
    }
    // torreón del homenaje
    const Tk = proj(0.22);
    if (Tk) {
      wall(ctx, Tk, -72, -128, 104, 110, vw, vh, 17, flat, 1);
      crenels(ctx, Tk, -72, -128, 104, vw, vh, 3, flat);
      const ap = sy(Tk, -168);
      const base = sy(Tk, -134);
      for (let Y = ap; Y < base; Y++) {
        const k = (Y - ap) / Math.max(1, base - ap);
        const half = k * 44 * Tk.s;
        const cx = sx(Tk, -20);
        rect(ctx, Math.round(cx - half), Y, Math.round(half * 2), 1, (Y & 3) === 0 ? P.night1 : P.blue0);
        rect(ctx, Math.round(cx), Y, Math.max(1, Math.round(half * 0.9)), 1, (Y & 3) === 0 ? P.night2 : P.night4);
      }
    }
    // capilla
    const Tc = proj(0.28);
    if (Tc) {
      wall(ctx, Tc, 32, -96, 36, 70, vw, vh, 23, flat, 1);
      const ap = sy(Tc, -118);
      const base = sy(Tc, -96);
      for (let Y = ap; Y < base; Y++) {
        const k = (Y - ap) / Math.max(1, base - ap);
        const half = k * 20 * Tc.s;
        rect(ctx, Math.round(sx(Tc, 50) - half), Y, Math.round(half * 2), 1, (Y & 3) === 0 ? P.night1 : P.night4);
      }
      R(ctx, Tc, 48, -84, 4, 10, P.violet3);
      R(ctx, Tc, 49, -83, 2, 8, P.blue2);
    }

    // muralla
    const Tw = proj(0);
    if (!Tw) return;
    wall(ctx, Tw, -130, -56, 260, 56, vw, vh, 5, flat);
    crenels(ctx, Tw, -130, -56, 260, vw, vh, 7, flat);
    R(ctx, Tw, -130, -56, 260, 1, P.stone5);
    // sombra al pie del muro
    R(ctx, Tw, -130, -3, 260, 3, P.stone1);

    // torres de las esquinas
    const Tt = proj(-0.015);
    if (Tt) {
      for (const [x, top, roof] of [
        [-144, -104, -142],
        [118, -96, -130],
      ] as const) {
        wall(ctx, Tt, x, top, 26, -top, vw, vh, 11 + x, cyl);
        for (let i = 0; i < 26; i += 4) R(ctx, Tt, x - 2 + i, top - 1, 3, 3, P.stone3);
        R(ctx, Tt, x - 2, top - 3, 30, 3, P.stone4);
        R(ctx, Tt, x - 2, top - 3, 30, 1, P.stone6);
        const ap = sy(Tt, roof);
        const base = sy(Tt, top - 3);
        for (let Y = ap; Y < base; Y++) {
          const k = (Y - ap) / Math.max(1, base - ap);
          const half = k * 16 * Tt.s;
          const cx = sx(Tt, x + 13);
          const x0 = Math.round(cx - half);
          const wdt = Math.round(half * 2) + 1;
          rect(ctx, x0, Y, wdt, 1, (Y & 3) === 0 ? P.night1 : P.blue0);
          rect(ctx, x0 + Math.round(wdt * 0.55), Y, Math.max(1, Math.round(wdt * 0.45)), 1, (Y & 3) === 0 ? P.night2 : P.blue1);
        }
      }
      // torres del portón
      for (const x of [-40, 22]) {
        wall(ctx, Tt, x, -92, 18, 92, vw, vh, 40 + x, cyl);
        crenels(ctx, Tt, x - 1, -92, 20, vw, vh, 60 + x, cyl);
        R(ctx, Tt, x - 1, -93, 20, 1, P.stone6);
        R(ctx, Tt, x + 8, -70, 2, 9, P.ink);
      }
    }
    // cuerpo del portón
    wall(ctx, Tw, -22, -80, 44, 80, vw, vh, 9, flat);
    crenels(ctx, Tw, -22, -80, 44, vw, vh, 12, flat);

    this.drawGate(ctx, proj, Tw, cam);

    // foso (el agua se anima aparte) y orilla con camino
    const Tb = proj(-0.03);
    if (Tb) {
      const y0 = sy(Tb, 0);
      const y1 = sy(Tb, 12);
      for (let Y = y0; Y < y1; Y++) {
        const k = (Y - y0) / Math.max(1, y1 - y0);
        for (let X = 0; X < vw; X++) {
          ctx.fillStyle = k * 1.6 + (bayer(X, Y) - 0.5) * 0.6 > 0.7 ? P.night2 : P.night1;
          ctx.fillRect(X, Y, 1, 1);
        }
      }
      // reflejo oscuro del muro
      R(ctx, Tb, -130, 0, 260, 2, P.night0);
    }
    const Tg = proj(-0.06);
    if (Tg) {
      const bottom = vh;
      // borde de piedra de la orilla
      R(ctx, Tg, -400, 12, 800, 1.6, P.stone3);
      R(ctx, Tg, -400, 12, 800, 0.5, P.stone5);
      const gy = sy(Tg, 13.6);
      // hierba: celdas pequeñas mezcladas con tramado para que no se vea a cuadros
      const cw = Math.max(2, Math.round(Tg.s * 1.6));
      const ch = Math.max(1, Math.round(Tg.s * 0.8));
      for (let Y = gy; Y < bottom; Y++) {
        for (let X = 0; X < vw; X++) {
          const n = hash(Math.floor((X - Tg.ox) / cw), Math.floor((Y - Tg.oy) / ch), 12);
          const d = bayer(X, Y);
          ctx.fillStyle = n > 0.78 && d > 0.3 ? P.green1 : n < 0.1 && d > 0.4 ? P.violet1 : n > 0.97 ? P.green2 : P.green0;
          ctx.fillRect(X, Y, 1, 1);
        }
      }
      // camino de tierra con piedras
      const roadTop = gy;
      const k60 = Math.max(1, sy(Tg, 60) - roadTop);
      for (let Y = roadTop; Y < bottom; Y++) {
        const k = (Y - roadTop) / k60;
        const half = (13 + k * 26) * Tg.s;
        const cx = sx(Tg, 0);
        const x0 = Math.round(cx - half);
        const x1 = Math.round(cx + half);
        rect(ctx, x0, Y, x1 - x0, 1, P.wood1);
        rect(ctx, x0, Y, 1, 1, P.wood0);
        rect(ctx, x1 - 1, Y, 1, 1, P.wood0);
        for (let X = x0 + 1; X < x1 - 1; X++) {
          if (hash(Math.floor(X / 3), Math.floor(Y / 2), 44) > 0.86) px(ctx, X, Y, hash(X, Y, 3) > 0.5 ? P.stone3 : P.wood2);
        }
      }
      // matas de hierba y rocas en la orilla
      for (let i = 0; i < 46; i++) {
        const gx = -210 + i * 9.3 + hash(i, 1, 3) * 6;
        if (Math.abs(gx) < 30) continue;
        const gyy = 14 + hash(i, 2, 3) * 26;
        R(ctx, Tg, gx, gyy, 1, 2.2, P.green2);
        R(ctx, Tg, gx + 1, gyy + 0.6, 1, 1.6, P.green1);
        if (hash(i, 4, 3) > 0.75) {
          R(ctx, Tg, gx + 3, gyy + 1, 4, 2, P.stone2);
          R(ctx, Tg, gx + 3, gyy + 1, 3, 0.7, P.stone4);
        }
      }
    }

    this.drawBridge(ctx, proj, Tw, cam);
  }

  private drawGate(ctx: Ctx, proj: Proj, Tw: T, cam: Cam): void {
    archShape(ctx, Tw, 0, 0, 12, 22, P.black);
    if (cam.fly > 0 || cam.port > 0.2) {
      const Tx = proj(0.5);
      if (Tx) {
        archShape(ctx, Tx, 0, 0, 12, 22, P.fire3);
        archShape(ctx, Tx, 0, 0, 9, 19, P.fire2);
        archShape(ctx, Tx, 0, -2, 5, 12, P.fire1);
        R(ctx, Tx, -3, -20, 2, 20, P.fire4);
      }
      for (let i = 6; i >= 1; i--) {
        const Ti = proj(i * 0.07);
        if (!Ti) continue;
        const tone = i > 4 ? P.violet1 : i > 2 ? P.stone1 : P.stone2;
        const x0 = sx(Ti, -12);
        const x1 = sx(Ti, 12);
        const thick = Math.max(1, Math.round(1.6 * Ti.s));
        const yb = sy(Ti, 0);
        const ys = sy(Ti, -22);
        rect(ctx, x0, ys, thick, yb - ys, tone);
        rect(ctx, x1 - thick, ys, thick, yb - ys, tone);
        const rr = (x1 - x0) / 2;
        const cx = (x0 + x1) / 2;
        for (let j = 0; j < Math.ceil(rr); j++) {
          const dy = Math.ceil(rr) - j;
          const half = Math.sqrt(Math.max(0, rr * rr - dy * dy));
          const inner = Math.sqrt(Math.max(0, (rr - thick) * (rr - thick) - dy * dy));
          const y = ys - Math.ceil(rr) + j;
          rect(ctx, Math.round(cx - half), y, Math.max(1, Math.round(half - inner)), 1, tone);
          rect(ctx, Math.round(cx + inner), y, Math.max(1, Math.round(half - inner)), 1, tone);
        }
        // antorchas del túnel: reflejos en el anillo
        if (i === 2 || i === 4) {
          rect(ctx, x0, sy(Ti, -16), thick, Math.max(1, Math.round(4 * Ti.s)), P.fire4);
          rect(ctx, x1 - thick, sy(Ti, -16), thick, Math.max(1, Math.round(4 * Ti.s)), P.fire4);
        }
      }
    }
    // dovelas
    for (let a = 0; a <= 12; a++) {
      const ang = Math.PI - (a / 12) * Math.PI;
      const cx = Math.cos(ang) * 14.5;
      const cy = -22 - Math.sin(ang) * 14.5;
      R(ctx, Tw, cx - 2, cy - 2, 4, 4, a % 2 ? P.stone5 : P.stone4);
      R(ctx, Tw, cx - 2, cy - 2, 4, 0.6, P.stone6);
    }
    R(ctx, Tw, -16, -22, 3, 22, P.stone3);
    R(ctx, Tw, 13, -22, 3, 22, P.stone4);
    R(ctx, Tw, 15, -22, 1, 22, P.stone6);
    // clave con el escudo
    R(ctx, Tw, -3, -40, 6, 6, P.stone5);
    R(ctx, Tw, -2, -39, 2, 4, P.blue1);
    R(ctx, Tw, 0, -39, 2, 4, P.red2);

    // rastrillo (sube con el scroll), recortado por el arco
    const lift = cam.port * 30;
    ctx.save();
    ctx.beginPath();
    const ax0 = sx(Tw, -12);
    const ax1 = sx(Tw, 12);
    ctx.rect(ax0, sy(Tw, -34), ax1 - ax0, sy(Tw, 0) - sy(Tw, -34));
    ctx.clip();
    for (let bx = -11; bx <= 11; bx += 3.6) R(ctx, Tw, bx, -40 - lift, 1.1, 40, P.metal1);
    for (let by = -36; by < 0; by += 5) R(ctx, Tw, -12, by - lift, 24, 1, P.metal0);
    for (let bx = -11; bx <= 11; bx += 3.6) R(ctx, Tw, bx - 0.2, -2 - lift, 1.5, 2, P.metal2);
    ctx.restore();
  }

  /** Puente levadizo: de vertical (cerrado) a tendido sobre el foso. */
  private drawBridge(ctx: Ctx, proj: Proj, Tw: T, cam: Cam): void {
    const Tb = proj(-0.02);
    if (!Tb) return;
    const ang = (1 - cam.bridge) * (Math.PI / 2);
    const L = 20;
    const above = Math.sin(ang) * L;
    const below = Math.cos(ang) * L * 0.62;
    const flat = below > above;
    const topY = sy(Tb, -above);
    const botY = sy(Tb, below);
    const hingeY = sy(Tb, 0);
    const Y0 = Math.min(topY, hingeY);
    const Y1 = Math.max(botY, hingeY + 1);
    const cx = sx(Tb, 0);
    const plankH = Math.max(2, Math.round(3 * Tb.s * (flat ? 0.62 : 1)));
    for (let Y = Y0; Y < Y1; Y++) {
      const k = Y1 === Y0 ? 0 : (Y - Y0) / (Y1 - Y0);
      const half = 12.5 * (flat ? 1 + k * 0.28 : 1) * Tb.s;
      const x0 = Math.round(cx - half);
      const w = Math.round(half * 2);
      rect(ctx, x0, Y, w, 1, (Y - Y0) % plankH === 0 ? P.wood1 : P.wood3);
      if (flat) for (let q = -3; q <= 3; q++) px(ctx, Math.round(cx + q * half * 0.28), Y, P.wood2);
      rect(ctx, x0, Y, 1, 1, P.wood1);
      rect(ctx, x0 + w - 1, Y, 1, 1, P.wood4);
    }
    // herrajes
    const hbY = sy(Tb, flat ? below * 0.5 : -above * 0.5);
    rect(ctx, sx(Tb, -12), hbY, Math.round(24 * Tb.s), Math.max(1, Math.round(Tb.s)), P.metal1);
    // cadenas hacia las troneras
    const ex = flat ? 12.5 * 1.28 : 12.5;
    const ey = flat ? below : -above;
    for (const side of [-1, 1]) {
      const x0 = sx(Tw, side * 15);
      const y0 = sy(Tw, -40);
      const x1 = sx(Tb, side * ex);
      const y1 = sy(Tb, ey);
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const sag = Math.sin(k * Math.PI) * 2 * Tw.s * cam.bridge;
        px(ctx, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + sag, i % 2 ? P.metal1 : P.metal3);
      }
      R(ctx, Tw, side * 15 - 1.5, -41.5, 3, 3, P.ink);
    }
  }

  private drawAnimated(ctx: Ctx, proj: Proj, cam: Cam, vw: number, t: number, fx: FxState, moonX: number): void {
    const Tt = proj(-0.015);
    const Tw = proj(0);
    const Tk = proj(0.22);
    const To = proj(0.35);
    const Tb = proj(-0.03);
    const spots = this.spots;
    const tt = fx.reduced ? 0 : t;

    // agua del foso: ondas y reflejo de la luna
    if (Tb) {
      const y0 = sy(Tb, 0);
      const y1 = sy(Tb, 12);
      // reflejo de la luna: franjas rotas que titilan
      const phase = Math.floor(tt * 4);
      for (let Y = y0 + 1; Y < y1; Y++) {
        const k = (Y - y0) / Math.max(1, y1 - y0);
        const wob = Math.round(Math.sin(tt * 1.5 + Y * 0.9) * (1 + k * 2));
        const half = Math.round(1 + k * 4);
        for (let X = -half; X <= half; X++) {
          if (hash(X + wob, Y, phase) > 0.55 - (1 - Math.abs(X) / (half + 1)) * 0.3) continue;
          px(ctx, moonX + X + wob, Y, Math.abs(X) < half * 0.4 ? P.moon : P.moonShade);
        }
      }
      for (let i = 0; i < 16; i++) {
        const X = Math.round(((i * 53 + tt * (6 + (i % 3) * 2)) % (vw + 40)) - 20);
        const Y = Math.round(y0 + 2 + hash(i, 1, 6) * (y1 - y0 - 3));
        rect(ctx, X, Y, 3 + (i % 3), 1, P.night4);
      }
    }

    const win = (T: T | null, x: number, y: number, w: number, h: number, seed: number, kind: 'warm' | 'teal' = 'warm') => {
      if (!T) return;
      const on = Math.sin(tt * 1.3 + seed) > -0.92;
      const c0 = kind === 'teal' ? P.teal2 : on ? P.fire2 : P.fire3;
      const c1 = kind === 'teal' ? P.teal3 : on ? P.fire1 : P.fire2;
      R(ctx, T, x, y, w, h, c0);
      R(ctx, T, x, y + h * 0.5, w, h * 0.5, c1);
      R(ctx, T, x + w / 2 - 0.3, y, 0.6, h, P.wood1);
      glowAt(ctx, sx(T, x + w / 2), sy(T, y + h / 2), Math.max(4, h * T.s * 1.1), kind === 'teal' ? 'teal' : 'warm', 0.35);
    };
    if (Tk) {
      win(Tk, -56, -110, 4, 8, 1);
      win(Tk, -30, -110, 4, 8, 2);
      win(Tk, 4, -104, 4, 8, 3);
    }
    if (To) win(To, 76, -150, 6, 10, 4, 'teal');
    if (Tt) {
      win(Tt, -136, -80, 4, 7, 5);
      win(Tt, -128, -50, 4, 7, 6);
      // la ventana de la broma: se asoma alguien con gorro de dormir y apaga la luz
      const since = t - fx.since('ext.window');
      const gag = since >= 0 && since < 5;
      if (gag && since < 1.6) {
        win(Tt, 128, -70, 5, 8, 7);
        R(ctx, Tt, 129, -67, 3, 5, P.ink);
        R(ctx, Tt, 129.5, -69, 2, 2, P.ink);
        R(ctx, Tt, 131.5, -70, 1.5, 1.5, P.ink);
      } else if (gag) {
        R(ctx, Tt, 128, -70, 5, 8, P.ink);
        R(ctx, Tt, 130.3, -70, 0.6, 8, P.wood1);
      } else {
        win(Tt, 128, -70, 5, 8, 7);
      }
      spots.push({ id: 'ext.window', x: sx(Tt, 124), y: sy(Tt, -74), w: Math.max(12, Math.round(13 * Tt.s)), h: Math.max(12, Math.round(16 * Tt.s)), visible: cam.s < 1.6 });

      // estandartes en los mástiles
      for (const [x, top, seed, c] of [
        [-131, -142, 1, P.red2],
        [130, -130, 2, P.red2],
        [-31, -99, 3, P.blue1],
        [31, -99, 4, P.blue1],
      ] as const) {
        const X = sx(Tt, x);
        const Y = sy(Tt, top);
        const poleH = Math.max(4, Math.round(12 * Tt.s));
        rect(ctx, X, Y - poleH, 1, poleH, P.wood3);
        px(ctx, X, Y - poleH - 1, P.gold3);
        pennant(ctx, X + 1, Y - poleH, Math.max(5, Math.round(12 * Tt.s)), Math.max(3, Math.round(5 * Tt.s)), tt, seed, c, P.gold2);
      }

      // cuervo en la almena
      const cawing = t - fx.since('ext.raven') < 0.7;
      const rv = ravenSprite(cawing ? 1 : 0);
      const scale = Tt.s >= 2.2 ? 2 : 1;
      const rx = sx(Tt, -33);
      const ry = sy(Tt, -98) - rv.height * scale;
      ctx.drawImage(rv, rx, ry, rv.width * scale, rv.height * scale);
      spots.push({ id: 'ext.raven', x: rx - 4, y: ry - 4, w: rv.width * scale + 8, h: rv.height * scale + 8, visible: cam.s < 1.8 });
      const fs = t - fx.since('ext.feather');
      if (fs >= 0 && fs < 3) {
        const fy = ry + 8 + fs * 18;
        const fxp = rx + 4 + Math.sin(fs * 4) * 5;
        rect(ctx, fxp, fy, 1, 3, P.violet3);
        px(ctx, fxp + 1, fy + 1, P.ink);
      }
    }
    if (Tw) {
      // antorchas a los lados del portón
      for (const x of [-19, 19]) {
        const X = sx(Tw, x);
        const Y = sy(Tw, -24);
        rect(ctx, X - 1, Y, 2, Math.max(2, Math.round(4 * Tw.s)), P.metal1);
        flame(ctx, X, Y, tt, x, Math.max(0.6, Tw.s * 0.55));
        glowAt(ctx, X, Y - 2, 12 * Tw.s, 'warm', 0.4);
      }
      // estandartes colgantes del portón
      for (const [x, seed] of [
        [-19, 1],
        [13, 2],
      ] as const) {
        const X0 = sx(Tw, x);
        const Y0 = sy(Tw, -76);
        const W = Math.max(3, Math.round(6 * Tw.s));
        const H = Math.round(26 * Tw.s);
        for (let j = 0; j < H; j++) {
          const sw = Math.round(Math.sin(tt * 1.5 + seed + j * 0.08) * (j / H) * Tw.s * 0.8);
          rect(ctx, X0 + sw, Y0 + j, W, 1, j < H - 2 ? P.red2 : P.red1);
          px(ctx, X0 + sw + W - 1, Y0 + j, P.red3);
          px(ctx, X0 + sw, Y0 + j, P.red1);
        }
        const mx = sx(Tw, x + 3);
        const my = sy(Tw, -64);
        rect(ctx, mx - Math.round(Tw.s), my, Math.max(1, Math.round(2 * Tw.s)), Math.max(1, Math.round(3 * Tw.s)), P.gold2);
      }
    }
  }

  private drawForeground(ctx: Ctx, proj: Proj, fx: FxState, e: number, t: number): void {
    // pinos y rocas en primer plano: pasan junto a la cámara al acercarse
    const Tf = proj(-0.5);
    if (Tf && Tf.s < 14) {
      const sway = fx.reduced ? 0 : Math.sin(t * 0.7) * 0.6;
      pineTree(ctx, Tf, -104 + sway, 40, 88, P.ink, P.violet1);
      pineTree(ctx, Tf, -84, 46, 60, P.ink, P.violet1);
      pineTree(ctx, Tf, 104 - sway, 42, 94, P.ink, P.violet1);
      pineTree(ctx, Tf, 122, 50, 66, P.ink, P.violet1);
      // rocas
      for (const [x, y, w, h] of [
        [-150, 34, 70, 30],
        [-96, 42, 30, 20],
        [84, 40, 80, 30],
      ] as const) {
        R(ctx, Tf, x, y, w, h, P.ink);
        R(ctx, Tf, x + 3, y, w * 0.4, 1.2, P.violet1);
      }
    }
    const Ts = proj(-0.4);
    if (Ts && Ts.s < 10) {
      // poste con el pergamino clavado
      R(ctx, Ts, -44, 8, 2.5, 26, P.wood2);
      R(ctx, Ts, -42.5, 8, 1, 26, P.wood3);
      R(ctx, Ts, -52, 6, 18, 9, P.wood3);
      R(ctx, Ts, -52, 6, 18, 1, P.wood4);
      R(ctx, Ts, -52, 14, 18, 1, P.wood1);
      const read = fx.flag('done:ext.letter');
      R(ctx, Ts, -48, 7.5, 9, 6, read ? P.parch1 : P.parch0);
      R(ctx, Ts, -47, 9, 6, 0.6, P.parch3);
      R(ctx, Ts, -47, 11, 5, 0.6, P.parch3);
      R(ctx, Ts, -44, 7, 1, 1, P.red2);
      this.spots.push({ id: 'ext.letter', x: sx(Ts, -54), y: sy(Ts, 4), w: Math.round(22 * Ts.s), h: Math.round(14 * Ts.s), visible: e < 0.2 });
    }
  }
}
