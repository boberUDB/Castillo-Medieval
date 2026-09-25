import { P } from '../engine/palette';
import {
  archFill,
  ashlar,
  bayer,
  disc,
  ellipse,
  hash,
  line,
  makeCanvas,
  px,
  rect,
  rng,
  type Ctx,
} from '../engine/pixel';

/** Piezas de decorado reutilizables entre salas. */

const cache = new Map<string, HTMLCanvasElement>();
export function cached(key: string, w: number, h: number, draw: (ctx: Ctx) => void, outlineColor: string | null = P.ink): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const pad = outlineColor ? 1 : 0;
  const { canvas, ctx } = makeCanvas(w + pad * 2, h + pad * 2);
  ctx.translate(pad, pad);
  draw(ctx);
  if (outlineColor) addOutline(canvas, outlineColor);
  cache.set(key, canvas);
  return canvas;
}

/** Contorno de 1 px en los píxeles transparentes que tocan el sprite (estilo pixel art clásico). */
export function addOutline(canvas: HTMLCanvasElement, color: string): void {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  const out: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) out.push(x, y);
    }
  }
  ctx.fillStyle = color;
  for (let i = 0; i < out.length; i += 2) ctx.fillRect(out[i], out[i + 1], 1, 1);
}

/* ------------------------------ fuego ------------------------------ */

/** Llama procedural: base en (x, y), crece hacia arriba. */
export function flame(ctx: Ctx, x: number, y: number, t: number, seed: number, size = 1): void {
  const frame = Math.floor(t * 11 + seed * 5);
  const h = Math.round((6 + hash(frame, 3, seed) * 3) * size);
  const baseW = Math.max(1, Math.round(2 * size));
  for (let j = 0; j < h; j++) {
    const k = j / h;
    const w = Math.max(0, Math.round(baseW * Math.pow(1 - k, 0.8) + (j === 1 ? 0.5 : 0)));
    const sway = Math.round(Math.sin(t * 9 + seed + j * 0.7) * k * 1.6 * size);
    const cx = x + sway;
    const yy = y - j;
    const outer = k > 0.75 ? P.fire4 : k > 0.5 ? P.fire3 : P.fire2;
    rect(ctx, cx - w, yy, w * 2 + 1, 1, outer);
    if (w >= 1 && k < 0.75) rect(ctx, cx - w + 1, yy, Math.max(1, w * 2 - 1), 1, k > 0.45 ? P.fire2 : P.fire1);
    if (k < 0.4) px(ctx, cx, yy, P.fire0);
  }
  // chispa ocasional
  if (hash(frame, 9, seed) > 0.7) px(ctx, x + Math.round((hash(frame, 1, seed) - 0.5) * 4 * size), y - h - 1 - Math.floor(hash(frame, 2, seed) * 3), P.fire1);
}

export function torchBracket(ctx: Ctx, x: number, y: number): void {
  // placa de hierro + brazo + tea de madera; la llama se dibuja arriba de (x, y-8)
  rect(ctx, x - 2, y - 1, 5, 7, P.metal0);
  rect(ctx, x - 1, y, 3, 5, P.metal1);
  px(ctx, x, y + 2, P.metal3);
  rect(ctx, x - 1, y - 7, 3, 7, P.wood2);
  rect(ctx, x - 1, y - 7, 1, 7, P.wood3);
  rect(ctx, x - 2, y - 9, 5, 3, P.metal1);
  rect(ctx, x - 2, y - 9, 5, 1, P.metal2);
  px(ctx, x - 2, y - 7, P.metal0);
  px(ctx, x + 2, y - 7, P.metal0);
}

export function candle(ctx: Ctx, x: number, y: number, h = 5): void {
  rect(ctx, x - 1, y - h, 3, h, P.parch1);
  rect(ctx, x - 1, y - h, 1, h, P.parch0);
  px(ctx, x + 1, y - h + 1, P.parch2);
  px(ctx, x, y - h - 1, P.ink);
  rect(ctx, x - 2, y, 5, 1, P.gold1);
}

export function candleFlame(ctx: Ctx, x: number, y: number, t: number, seed: number): void {
  const f = Math.floor(t * 8 + seed * 3);
  const h = 2 + Math.floor(hash(f, 1, seed) * 2);
  const s = Math.round(Math.sin(t * 5 + seed) * 0.6);
  px(ctx, x + s, y - h - 1, P.fire3);
  rect(ctx, x + s, y - h, 1, h, P.fire1);
  px(ctx, x, y - 1, P.fire0);
}

/* ------------------------------ arquitectura ------------------------------ */

/** Ventana de arco: recorta la pared (deja ver el cielo) y dibuja jamba, parteluz y rejas. */
export function archWindow(ctx: Ctx, x: number, y: number, w: number, h: number, mullion = true): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  archFill(ctx, x, y + h, w, h, '#000');
  ctx.restore();
  // jamba
  for (let j = 0; j < h; j++) {
    const yy = y + h - j;
    const straight = h - w / 2;
    let half = w / 2;
    if (j > straight) {
      const dy = j - straight;
      half = Math.sqrt(Math.max(0, (w / 2) ** 2 - dy * dy));
    }
    const x0 = Math.round(x + w / 2 - half);
    const x1 = Math.round(x + w / 2 + half);
    px(ctx, x0 - 1, yy, P.stone6);
    px(ctx, x0 - 2, yy, P.stone3);
    px(ctx, x1, yy, P.stone2);
    px(ctx, x1 + 1, yy, P.stone3);
  }
  rect(ctx, x - 3, y + h, w + 6, 2, P.stone5);
  rect(ctx, x - 3, y + h + 2, w + 6, 1, P.stone1);
  if (mullion) {
    rect(ctx, x + Math.floor(w / 2), y + 3, 1, h - 3, P.metal0);
    for (let yy = y + Math.round(w / 2) + 2; yy < y + h; yy += 7) rect(ctx, x, yy, w, 1, P.metal0);
  }
}

/** Puerta de madera abierta hacia dentro, vista de canto dentro de un arco. */
export function doorFrame(ctx: Ctx, x: number, bottom: number, w: number, h: number): void {
  // dovelas del arco
  const r = w / 2 + 4;
  for (let a = 0; a <= Math.PI; a += Math.PI / 7) {
    const cx = x + w / 2 - Math.cos(a) * (r - 2);
    const cy = bottom - h + w / 2 - Math.sin(a) * (r - 2);
    rect(ctx, cx - 2, cy - 2, 4, 4, P.stone5);
    px(ctx, cx - 2, cy - 2, P.stone6);
  }
  rect(ctx, x - 4, bottom - h + w / 2, 4, h - w / 2, P.stone4);
  rect(ctx, x + w, bottom - h + w / 2, 4, h - w / 2, P.stone3);
  rect(ctx, x - 4, bottom - h + w / 2, 1, h - w / 2, P.stone6);
}

/** Viga de madera con ménsulas. */
export function beam(ctx: Ctx, x: number, y: number, w: number): void {
  rect(ctx, x, y, w, 6, P.wood2);
  rect(ctx, x, y, w, 1, P.wood4);
  rect(ctx, x, y + 5, w, 1, P.wood0);
  for (let i = x + 3; i < x + w; i += 9) px(ctx, i, y + 2 + ((i >> 3) & 1), P.wood1);
}

export function corbel(ctx: Ctx, x: number, y: number): void {
  rect(ctx, x, y, 8, 3, P.stone5);
  rect(ctx, x + 1, y + 3, 6, 2, P.stone4);
  rect(ctx, x + 2, y + 5, 4, 2, P.stone3);
  rect(ctx, x, y, 8, 1, P.stone6);
}

export function pillar(ctx: Ctx, x: number, top: number, bottom: number, w = 12): void {
  ashlar(ctx, x, top, w, bottom - top, { bw: w, bh: 10, base: [P.stone4, P.stone5], hi: P.stone6, lo: P.stone3, mortar: P.stone2, seed: 21 });
  rect(ctx, x - 2, top, w + 4, 4, P.stone5);
  rect(ctx, x - 2, top, w + 4, 1, P.stone7);
  rect(ctx, x - 2, bottom - 5, w + 4, 5, P.stone4);
  rect(ctx, x - 2, bottom - 5, w + 4, 1, P.stone6);
  rect(ctx, x + w - 2, top + 4, 2, bottom - top - 9, P.stone3);
}

/** Suelo de la sala: franja de losas vista casi de frente. */
export function floorBand(ctx: Ctx, x: number, y: number, w: number, h: number, seed = 1): void {
  rect(ctx, x, y, w, h, P.stone2);
  rect(ctx, x, y, w, 1, P.stone5);
  let yy = y + 1;
  let row = 0;
  while (yy < y + h) {
    const rh = 3 + row;
    const tw = 14 + row * 3;
    const off = (row & 1) * Math.floor(tw / 2);
    for (let xx = x - off; xx < x + w; xx += tw) {
      const c = hash(Math.floor((xx + 999) / tw), row, seed) > 0.5 ? P.stone4 : P.stone3;
      const x0 = Math.max(x, xx);
      const x1 = Math.min(x + w, xx + tw - 1);
      rect(ctx, x0, yy, x1 - x0, Math.min(rh - 1, y + h - yy), c);
      rect(ctx, x0, yy, x1 - x0, 1, row === 0 ? P.stone5 : P.stone4);
    }
    yy += rh;
    row++;
  }
}

/** Alfombra en el suelo, vista casi de frente. */
export function rug(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x, y, w, h, P.red1);
  rect(ctx, x, y, w, 1, P.gold1);
  rect(ctx, x, y + h - 1, w, 1, P.gold1);
  rect(ctx, x + 2, y + 2, w - 4, 1, P.red2);
  for (let i = x + 4; i < x + w - 4; i += 6) {
    px(ctx, i, y + Math.floor(h / 2), P.gold2);
    px(ctx, i + 3, y + Math.floor(h / 2) + 1, P.red3);
  }
}

/* ------------------------------ telas ------------------------------ */

export function tapestrySprite(key: string, w: number, h: number, field: string, motif: 'tree' | 'moon' | 'raven'): HTMLCanvasElement {
  return cached(`tap:${key}`, w, h + 4, (ctx) => {
    rect(ctx, 0, 0, w, h, field);
    // trama del tejido
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + y * 3) % 7 === 0 && bayer(x, y) > 0.4) px(ctx, x, y, P.red0);
    // bordes dorados
    rect(ctx, 0, 0, w, 2, P.gold1);
    rect(ctx, 0, 2, 2, h - 2, P.gold1);
    rect(ctx, w - 2, 2, 2, h - 2, P.gold1);
    rect(ctx, 3, 3, w - 6, 1, P.gold2);
    for (let y = 6; y < h - 4; y += 4) {
      px(ctx, 3, y, P.gold2);
      px(ctx, w - 4, y, P.gold2);
    }
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h * 0.45);
    if (motif === 'tree') {
      rect(ctx, cx - 1, cy, 3, 14, P.gold1);
      disc(ctx, cx, cy - 2, 6, P.gold2);
      disc(ctx, cx - 4, cy + 1, 3, P.gold2);
      disc(ctx, cx + 4, cy + 1, 3, P.gold2);
      for (let i = 0; i < 6; i++) px(ctx, cx - 4 + ((i * 5) % 9), cy - 5 + ((i * 3) % 6), P.gold3);
      rect(ctx, cx - 5, cy + 14, 11, 1, P.gold1);
    } else if (motif === 'moon') {
      disc(ctx, cx, cy, 7, P.gold2);
      disc(ctx, cx + 3, cy - 2, 6, field);
      for (let i = 0; i < 5; i++) px(ctx, cx - 7 + i * 4, cy + 11 + (i & 1), P.gold3);
    } else {
      // cuervo bordado
      ellipse(ctx, cx, cy + 2, 5, 3, P.ink);
      disc(ctx, cx + 4, cy - 2, 2, P.ink);
      rect(ctx, cx + 6, cy - 2, 2, 1, P.gold2);
      rect(ctx, cx - 7, cy + 1, 3, 2, P.ink);
      px(ctx, cx + 4, cy - 3, P.gold3);
      rect(ctx, cx - 1, cy + 5, 1, 3, P.gold1);
      rect(ctx, cx + 2, cy + 5, 1, 3, P.gold1);
    }
    // flecos
    for (let x = 1; x < w - 1; x += 2) rect(ctx, x, h, 1, 2 + (x % 4 === 1 ? 2 : 0), P.gold1);
  }, null);
}

/** Dibuja un tapiz con balanceo: cada fila se desplaza según su altura. */
export function drawSwaying(ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, amount: number): void {
  for (let row = 0; row < img.height; row++) {
    const off = Math.round(amount * (row / img.height) ** 1.5);
    ctx.drawImage(img, 0, row, img.width, 1, Math.round(x + off), Math.round(y + row), img.width, 1);
  }
  // varilla
  rect(ctx, x - 3, y - 2, img.width + 6, 2, P.wood1);
  px(ctx, x - 3, y - 2, P.gold2);
  px(ctx, x + img.width + 2, y - 2, P.gold2);
}

/** Estandarte que ondea al viento (bandera horizontal). */
export function pennant(ctx: Ctx, x: number, y: number, len: number, hgt: number, t: number, seed: number, color: string, trim: string): void {
  for (let i = 0; i < len; i++) {
    const k = i / len;
    const wave = Math.round(Math.sin(t * 4 + seed - i * 0.45) * (1 + k * 2));
    const hh = Math.max(1, Math.round(hgt * (1 - k * 0.55)));
    const top = y + wave + Math.round(k * 1.5);
    const shade = Math.sin(t * 4 + seed - i * 0.45 + 0.9) > 0.4 ? P.red1 : color;
    rect(ctx, x + i, top, 1, hh, shade);
    px(ctx, x + i, top, trim);
    if (i === len - 1 || (i > len - 4 && (i & 1))) px(ctx, x + i, top + hh - 1, P.red0);
  }
}

/* ------------------------------ biblioteca ------------------------------ */

const BOOK_COLORS = [P.red1, P.red2, P.blue0, P.blue1, P.green1, P.green2, P.wood3, P.violet2, P.violet3, P.teal1, P.parch2, P.red3];

/** Estantería llena de libros; `seed` cambia la distribución. Devuelve alturas de baldas. */
export function bookshelf(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, shelfH = 18): void {
  const rnd = rng(seed);
  rect(ctx, x, y, w, h, P.wood1);
  rect(ctx, x, y, 3, h, P.wood3);
  rect(ctx, x + w - 3, y, 3, h, P.wood2);
  rect(ctx, x, y, w, 3, P.wood3);
  rect(ctx, x, y, w, 1, P.wood4);
  for (let sy = y + 3; sy + shelfH <= y + h; sy += shelfH) {
    // fondo de la balda
    rect(ctx, x + 3, sy, w - 6, shelfH - 3, P.wood0);
    let bx = x + 4;
    while (bx < x + w - 5) {
      const r = rnd();
      if (r < 0.06) {
        bx += 3 + Math.floor(rnd() * 5); // hueco
        continue;
      }
      if (r < 0.1 && bx < x + w - 12) {
        // pequeño objeto: calavera o frasco
        if (rnd() < 0.5) {
          rect(ctx, bx, sy + shelfH - 9, 5, 4, P.parch0);
          rect(ctx, bx + 1, sy + shelfH - 5, 3, 2, P.parch1);
          px(ctx, bx + 1, sy + shelfH - 8, P.ink);
          px(ctx, bx + 3, sy + shelfH - 8, P.ink);
        } else {
          rect(ctx, bx, sy + shelfH - 8, 4, 5, P.teal1);
          rect(ctx, bx + 1, sy + shelfH - 10, 2, 2, P.teal2);
          px(ctx, bx, sy + shelfH - 8, P.teal3);
        }
        bx += 7;
        continue;
      }
      const bw = 2 + Math.floor(rnd() * 3);
      const bh = shelfH - 5 - Math.floor(rnd() * 5);
      const c = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)];
      const lean = rnd() < 0.08 && bx < x + w - 12;
      if (lean) {
        for (let k = 0; k < bh; k++) rect(ctx, bx + Math.floor(k / 3), sy + shelfH - 3 - k, bw, 1, c);
        bx += bw + Math.floor(bh / 3) + 1;
        continue;
      }
      const top = sy + shelfH - 3 - bh;
      rect(ctx, bx, top, bw, bh, c);
      px(ctx, bx, top, P.parch1);
      if (bh > 8) {
        rect(ctx, bx, top + 2, bw, 1, P.gold1);
        rect(ctx, bx, top + bh - 3, bw, 1, P.gold1);
      }
      rect(ctx, bx + bw - 1, top + 1, 1, bh - 1, P.ink);
      bx += bw;
    }
    // tabla de la balda
    rect(ctx, x + 2, sy + shelfH - 3, w - 4, 3, P.wood3);
    rect(ctx, x + 2, sy + shelfH - 3, w - 4, 1, P.wood4);
  }
}

/* ------------------------------ armaduras ------------------------------ */

export function armorSprite(variant: 'plain' | 'pot' | 'legend'): HTMLCanvasElement {
  return cached(`armor:${variant}`, 22, 46, (ctx) => {
    const trim = variant === 'legend' ? P.gold2 : P.metal2;
    const m = variant === 'legend' ? [P.metal1, P.metal2, P.metal3, P.metal4] : [P.metal0, P.metal1, P.metal2, P.metal3];
    // pedestal
    rect(ctx, 3, 41, 16, 5, P.stone4);
    rect(ctx, 3, 41, 16, 1, P.stone6);
    rect(ctx, 3, 45, 16, 1, P.stone2);
    // piernas
    for (const lx of [6, 12]) {
      rect(ctx, lx, 29, 4, 11, m[1]);
      rect(ctx, lx, 29, 1, 11, m[2]);
      rect(ctx, lx - 1, 31, 6, 3, m[2]);
      rect(ctx, lx - 1, 31, 6, 1, m[3]);
      rect(ctx, lx - 1, 39, 6, 2, m[1]);
      rect(ctx, lx - 1, 39, 3, 1, m[2]);
    }
    // faldar
    for (let j = 0; j < 5; j++) {
      rect(ctx, 5 - (j >> 1), 24 + j, 12 + (j >> 1) * 2, 1, j % 2 ? m[1] : m[2]);
    }
    // peto
    for (let j = 0; j < 11; j++) {
      const inset = j < 2 ? 1 : j > 8 ? 1 : 0;
      rect(ctx, 5 + inset, 13 + j, 12 - inset * 2, 1, m[1]);
      rect(ctx, 5 + inset, 13 + j, 4, 1, m[2]);
      px(ctx, 10, 13 + j, m[3]);
      px(ctx, 9, 13 + j, m[2]);
    }
    rect(ctx, 5, 23, 12, 1, P.wood2);
    rect(ctx, 10, 23, 2, 1, P.gold2);
    // hombreras
    ellipse(ctx, 4, 15, 3, 2, m[2]);
    ellipse(ctx, 17, 15, 3, 2, m[1]);
    rect(ctx, 2, 14, 4, 1, m[3]);
    rect(ctx, 1, 17, 6, 1, m[0]);
    rect(ctx, 15, 17, 6, 1, m[0]);
    // brazos
    rect(ctx, 2, 18, 3, 8, m[1]);
    rect(ctx, 2, 18, 1, 8, m[2]);
    rect(ctx, 17, 18, 3, 8, m[1]);
    rect(ctx, 1, 25, 5, 3, m[0]);
    rect(ctx, 16, 25, 5, 3, m[0]);
    // yelmo
    rect(ctx, 7, 3, 8, 10, m[1]);
    rect(ctx, 8, 2, 6, 1, m[1]);
    rect(ctx, 7, 3, 3, 10, m[2]);
    px(ctx, 8, 3, m[3]);
    rect(ctx, 7, 7, 8, 1, P.ink);
    rect(ctx, 10, 9, 1, 3, m[0]);
    px(ctx, 12, 9, m[0]);
    px(ctx, 12, 11, m[0]);
    rect(ctx, 6, 12, 10, 1, trim);
    if (variant === 'pot') {
      // una olla de cocina a modo de casco
      rect(ctx, 5, 0, 12, 5, P.stone3);
      rect(ctx, 5, 0, 12, 1, P.stone5);
      rect(ctx, 4, 4, 14, 1, P.stone2);
      rect(ctx, 17, 1, 4, 1, P.wood2);
      px(ctx, 7, 2, P.stone6);
    } else {
      // penacho
      const plume = variant === 'legend' ? P.teal2 : P.red2;
      rect(ctx, 10, 0, 2, 3, plume);
      rect(ctx, 12, 0, 3, 1, plume);
      rect(ctx, 14, 1, 2, 2, variant === 'legend' ? P.teal1 : P.red1);
      px(ctx, 10, 0, variant === 'legend' ? P.teal3 : P.red3);
    }
    if (variant === 'legend') {
      rect(ctx, 5, 13, 12, 1, P.gold2);
      disc(ctx, 11, 18, 2, P.gold2);
      px(ctx, 11, 18, P.teal3);
    }
  });
}

/* ------------------------------ heráldica ------------------------------ */

/** Escudo de la familia de los Ecos: torre de plata partida entre noche y sangre. */
export function crestSprite(): HTMLCanvasElement {
  return cached('crest', 20, 24, (ctx) => {
    for (let j = 0; j < 24; j++) {
      const k = j / 23;
      const half = k < 0.55 ? 10 : Math.round(10 * Math.sqrt(Math.max(0, 1 - ((k - 0.55) / 0.45) ** 2)));
      for (let i = 10 - half; i < 10 + half; i++) {
        let c: string = i < 10 ? P.blue1 : P.red2;
        if (i === 10 - half || i === 10 + half - 1 || j === 0) c = P.gold2;
        ctx.fillStyle = c;
        ctx.fillRect(i, j, 1, 1);
      }
    }
    // torre de plata
    rect(ctx, 7, 7, 6, 10, P.metal3);
    rect(ctx, 6, 5, 8, 3, P.metal3);
    px(ctx, 7, 4, P.metal3);
    px(ctx, 9, 4, P.metal3);
    px(ctx, 11, 4, P.metal3);
    px(ctx, 12, 4, P.metal3);
    rect(ctx, 9, 13, 2, 4, P.ink);
    px(ctx, 9, 9, P.ink);
    rect(ctx, 12, 7, 1, 10, P.metal2);
    // estrellas
    px(ctx, 3, 3, P.gold3);
    px(ctx, 16, 3, P.gold3);
    // brillo del borde
    rect(ctx, 1, 1, 8, 1, P.gold3);
  });
}

/* ------------------------------ criaturas ------------------------------ */

export function ravenSprite(frame: 0 | 1): HTMLCanvasElement {
  return cached(`raven:${frame}`, 13, 12, (ctx) => {
    const k = P.ink;
    const v = P.violet2;
    const b = P.stone3;
    // cuerpo
    ellipse(ctx, 5, 7, 4, 2, k);
    rect(ctx, 2, 6, 6, 2, v);
    px(ctx, 4, 6, b);
    px(ctx, 5, 7, b);
    // cola
    rect(ctx, 0, 8, 3, 1, k);
    px(ctx, 0, 9, k);
    // cabeza
    if (frame === 0) {
      disc(ctx, 8, 3, 2, k);
      px(ctx, 9, 2, P.gold3);
      rect(ctx, 10, 3, 2, 1, P.stone4);
      px(ctx, 12, 3, P.stone3);
    } else {
      disc(ctx, 8, 2, 2, k);
      px(ctx, 9, 1, P.gold3);
      rect(ctx, 10, 1, 2, 1, P.stone4);
      rect(ctx, 10, 3, 2, 1, P.stone4);
      px(ctx, 12, 0, P.stone3);
    }
    rect(ctx, 6, 4, 2, 2, k);
    // patas
    px(ctx, 4, 10, P.stone4);
    px(ctx, 6, 10, P.stone4);
    rect(ctx, 3, 11, 2, 1, P.stone4);
    rect(ctx, 6, 11, 2, 1, P.stone4);
  }, null);
}

export function catSprite(awake: boolean): HTMLCanvasElement {
  return cached(`cat:${awake}`, 16, 9, (ctx) => {
    const c = P.stone5;
    const d = P.stone4;
    const l = P.stone6;
    ellipse(ctx, 8, 6, 6, 2, c);
    rect(ctx, 3, 7, 11, 1, d);
    // cola enroscada
    rect(ctx, 13, 7, 3, 1, c);
    px(ctx, 15, 6, c);
    // cabeza
    disc(ctx, 3, 5, 2, c);
    px(ctx, 1, 2, c);
    px(ctx, 2, 3, c);
    px(ctx, 4, 2, c);
    px(ctx, 5, 3, c);
    px(ctx, 1, 3, P.red3);
    px(ctx, 5, 2, l);
    rect(ctx, 6, 4, 4, 1, l);
    if (awake) {
      px(ctx, 2, 5, P.green4);
      px(ctx, 4, 5, P.green4);
    } else {
      px(ctx, 2, 5, P.ink);
      px(ctx, 4, 5, P.ink);
    }
    px(ctx, 3, 6, P.red3);
  });
}

/* ------------------------------ utilidades ------------------------------ */

/** Chispa de resaltado para objetos interactivos: cruz de 5 px que titila. */
export function sparkle(ctx: Ctx, x: number, y: number, t: number, seed: number, strong = false): void {
  const ph = (t * 1.6 + seed) % 3;
  if (ph > 1.4 && !strong) return;
  const big = strong || ph < 0.5;
  const c = P.gold4;
  px(ctx, x, y, P.fire0);
  if (big) {
    px(ctx, x - 1, y, c);
    px(ctx, x + 1, y, c);
    px(ctx, x, y - 1, c);
    px(ctx, x, y + 1, c);
  }
  if (strong) {
    px(ctx, x - 2, y, P.gold2);
    px(ctx, x + 2, y, P.gold2);
    px(ctx, x, y - 2, P.gold2);
    px(ctx, x, y + 2, P.gold2);
  }
}

export function chain(ctx: Ctx, x: number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y += 3) {
    px(ctx, x, y, P.metal2);
    px(ctx, x, y + 1, P.metal1);
  }
}

export function webCorner(ctx: Ctx, x: number, y: number, size: number, flip: boolean): void {
  const dir = flip ? -1 : 1;
  for (let i = 0; i < size; i += 3) {
    line(ctx, x, y + i, x + dir * (size - i), y, P.stone5);
  }
  line(ctx, x, y, x + dir * size * 0.7, y + size * 0.7, P.stone5);
}
