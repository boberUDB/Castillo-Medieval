import { P } from '../../engine/palette';
import { ashlar, disc, ellipse, hash, line, planks, px, rect, type Ctx } from '../../engine/pixel';
import type { Light } from '../../engine/lighting';
import { SPACE } from '../layout';
import type { SpaceDef } from '../types';
import {
  armorSprite,
  beam,
  candle,
  candleFlame,
  corbel,
  crestSprite,
  doorFrame,
  drawSwaying,
  flame,
  floorBand,
  pillar,
  rug,
  tapestrySprite,
  torchBracket,
  archWindow,
  webCorner,
} from '../props';

const G = SPACE.gate;
const H = SPACE.hall;

const BACK = { bw: 24, bh: 12, base: [P.stone3, P.stone4, P.stone4, P.stone3], hi: P.stone5, lo: P.stone2, mortar: P.stone2 };

/* ================================ túnel del portón ================================ */

export const gate: SpaceDef = {
  id: 'gate',
  interior: G,
  bounds: { x: G.x - 16, y: G.y - 8, w: G.w + 32, h: G.h + 8 },
  ambient: 0.72,
  bake(ctx) {
    ashlar(ctx, G.x, G.y, G.w, G.h, { ...BACK, base: [P.stone2, P.stone3, P.stone3], hi: P.stone4, lo: P.stone1, mortar: P.stone1, seed: 3, moss: 0.08 });
    // bóveda: nervios transversales
    for (const x of [60, 124]) {
      pillar(ctx, x, G.y + 6, G.y + G.h - 8, 8);
      rect(ctx, x - 4, G.y, 16, 6, P.stone4);
      rect(ctx, x - 4, G.y + 5, 16, 1, P.stone2);
    }
    // ranura del rastrillo y rastrillo alzado
    rect(ctx, G.x, G.y, 14, 4, P.ink);
    for (let x = G.x + 1; x < G.x + 13; x += 3) {
      rect(ctx, x, G.y, 1, 26, P.metal1);
      rect(ctx, x, G.y + 26, 1, 2, P.metal2);
    }
    for (let y = G.y + 4; y < G.y + 26; y += 5) rect(ctx, G.x, y, 13, 1, P.metal0);
    // torno del rastrillo con cadena
    disc(ctx, 42, 344, 8, P.wood2);
    disc(ctx, 42, 344, 6, P.wood3);
    for (let a = 0; a < 6; a++) line(ctx, 42, 344, 42 + Math.cos(a) * 7, 344 + Math.sin(a) * 7, P.wood1);
    disc(ctx, 42, 344, 2, P.metal1);
    for (let y = G.y; y < 336; y += 3) px(ctx, 36, y, P.metal2);
    // buhera (agujero de defensa) en el techo
    rect(ctx, 92, G.y, 8, 3, P.ink);
    // suelo de adoquines
    floorBand(ctx, G.x, G.y + G.h - 10, G.w, 10, 7);
    torchBracket(ctx, 96, 362);
    webCorner(ctx, G.x + G.w - 1, G.y, 10, true);
    doorFrame(ctx, 176, 400, 16, 64);
  },
  draw(ctx, t) {
    flame(ctx, 96, 352, t, 1);
  },
  lights: () => [{ x: 96, y: 348, r: 44, flicker: 1, glow: 0.3 }],
};

/* ================================ gran vestíbulo ================================ */

const FIRE = { x: 400, y: 342, w: 56, h: 44 };
const plainArmorPos = { x: 338, y: 340 };
const potArmorPos = { x: 494, y: 340 };
const tapL = { x: 220, y: 214 };
const tapR = { x: 604, y: 214 };

function drawFireplace(ctx: Ctx): void {
  const cx = 428;
  // campana de la chimenea (trapecio de sillería)
  for (let y = 250; y < 330; y++) {
    const k = (y - 250) / 80;
    const half = Math.round(20 + k * 18);
    ashlar(ctx, cx - half, y, half * 2, 1, { bw: 14, bh: 7, base: [P.stone4, P.stone5, P.stone5], hi: P.stone6, lo: P.stone3, mortar: P.stone3, seed: 8 }, cx - half, y);
    px(ctx, cx - half, y, P.stone6);
    px(ctx, cx + half - 1, y, P.stone2);
  }
  rect(ctx, cx - 22, 246, 44, 4, P.stone5);
  rect(ctx, cx - 22, 246, 44, 1, P.stone7);
  // repisa
  rect(ctx, cx - 44, 330, 88, 6, P.stone5);
  rect(ctx, cx - 44, 330, 88, 1, P.stone7);
  rect(ctx, cx - 44, 335, 88, 1, P.stone2);
  for (let x = cx - 40; x < cx + 40; x += 10) corbel(ctx, x, 336);
  // jambas
  rect(ctx, FIRE.x - 8, 336, 8, 50, P.stone4);
  rect(ctx, FIRE.x - 8, 336, 1, 50, P.stone6);
  rect(ctx, FIRE.x + FIRE.w, 336, 8, 50, P.stone3);
  // hogar
  rect(ctx, FIRE.x, FIRE.y, FIRE.w, FIRE.h, P.violet0);
  for (let y = FIRE.y; y < FIRE.y + FIRE.h; y += 4) {
    for (let x = FIRE.x + ((y >> 2) & 1) * 4; x < FIRE.x + FIRE.w; x += 8) rect(ctx, x, y, 7, 3, y > FIRE.y + 24 ? P.fire5 : P.violet1);
  }
  // morillos y leños
  rect(ctx, FIRE.x + 8, FIRE.y + 36, 2, 8, P.metal1);
  rect(ctx, FIRE.x + FIRE.w - 10, FIRE.y + 36, 2, 8, P.metal1);
  rect(ctx, FIRE.x + 6, FIRE.y + 38, 44, 3, P.wood2);
  rect(ctx, FIRE.x + 10, FIRE.y + 35, 36, 3, P.wood3);
  rect(ctx, FIRE.x + 10, FIRE.y + 35, 36, 1, P.wood4);
  rect(ctx, FIRE.x + 4, FIRE.y + 42, FIRE.w - 8, 2, P.fire4);
}

function drawPlaque(ctx: Ctx): void {
  rect(ctx, 408, 310, 40, 14, P.gold0);
  rect(ctx, 409, 311, 38, 12, P.gold1);
  rect(ctx, 409, 311, 38, 1, P.gold3);
  rect(ctx, 409, 322, 38, 1, P.gold0);
  // "texto" grabado
  for (let row = 0; row < 3; row++) {
    let x = 412;
    while (x < 444) {
      const w = 2 + Math.floor(hash(x, row, 4) * 4);
      rect(ctx, x, 314 + row * 3, Math.min(w, 444 - x), 1, P.gold0);
      x += w + 2;
    }
  }
  for (const [x, y] of [
    [410, 312],
    [445, 312],
    [410, 321],
    [445, 321],
  ]) px(ctx, x, y, P.gold3);
}

function chandelier(ctx: Ctx, t: number): { x: number; y: number } {
  const sway = Math.sin(t * 0.7) * 1.2;
  const cx = 428 + Math.round(sway);
  const y = 228;
  for (let yy = 176; yy < y; yy += 3) {
    px(ctx, Math.round(428 + (sway * (yy - 176)) / (y - 176)), yy, P.metal2);
    px(ctx, Math.round(428 + (sway * (yy - 176)) / (y - 176)), yy + 1, P.metal0);
  }
  ellipse(ctx, cx, y + 4, 18, 2, P.metal1);
  ellipse(ctx, cx, y + 4, 16, 1, P.metal0);
  rect(ctx, cx - 18, y + 3, 37, 1, P.metal2);
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * 8;
    candle(ctx, x, y + 2, 5);
    candleFlame(ctx, x, y - 4, t, i + 3);
  }
  return { x: cx, y: y - 4 };
}

export const hall: SpaceDef = {
  id: 'hall',
  room: 'hall',
  interior: H,
  bounds: { x: H.x - 16, y: H.y, w: H.w + 32, h: H.h },
  ambient: 0.6,
  bake(ctx) {
    ashlar(ctx, H.x, H.y, H.w, H.h, { ...BACK, seed: 12, cracks: 0.04 });
    // zócalo de madera
    planks(ctx, H.x, 352, H.w, 34, true, 8, [P.wood2, P.wood3], 4);
    rect(ctx, H.x, 350, H.w, 3, P.wood4);
    rect(ctx, H.x, 350, H.w, 1, P.wood5);
    // techo de vigas
    beam(ctx, H.x, H.y, H.w);
    for (let x = H.x + 20; x < H.x + H.w; x += 58) {
      rect(ctx, x, H.y + 6, 5, 10, P.wood2);
      rect(ctx, x, H.y + 6, 1, 10, P.wood4);
      corbel(ctx, x - 1, H.y + 16);
    }
    pillar(ctx, 312, 176, 388);
    pillar(ctx, 532, 176, 388);
    archWindow(ctx, 272, 204, 14, 34);
    archWindow(ctx, 566, 204, 14, 34);
    drawFireplace(ctx);
    const crest = crestSprite();
    ctx.drawImage(crest, 417, 270);
    drawPlaque(ctx);
    // banco de madera
    planks(ctx, 226, 372, 70, 4, false, 4, [P.wood3], 2);
    rect(ctx, 230, 376, 3, 10, P.wood2);
    rect(ctx, 288, 376, 3, 10, P.wood2);
    // agujero de ratón
    rect(ctx, 640, 380, 7, 6, P.ink);
    rect(ctx, 641, 379, 5, 1, P.ink);
    floorBand(ctx, H.x, 386, H.w, 14, 3);
    rug(ctx, 250, 390, 356, 6);
    torchBracket(ctx, 318, 300);
    torchBracket(ctx, 538, 300);
    doorFrame(ctx, 656, 400, 16, 80);
    webCorner(ctx, H.x, H.y + 6, 14, false);
  },
  draw(ctx, t, fx) {
    // fuego del hogar: se aviva al tocarlo
    const stoke = Math.max(0, 1 - (t - fx.since('hall.fire')) / 2.5);
    for (let i = 0; i < 6; i++) flame(ctx, FIRE.x + 10 + i * 7, FIRE.y + 38, t, i * 1.7, 1.25 + stoke * 0.9 + (i % 2) * 0.2);
    if (stoke > 0) {
      for (let k = 0; k < 10; k++) {
        const life = (t * 1.5 + k * 0.37) % 1;
        const x = FIRE.x + 12 + hash(k, 1, 4) * 32 + Math.sin(t * 3 + k) * 3;
        const y = FIRE.y + 30 - life * 40 * stoke;
        px(ctx, x, y, life < 0.5 ? P.fire1 : P.fire3);
      }
    }
    flame(ctx, 318, 291, t, 2);
    flame(ctx, 538, 291, t, 3);
    chandelier(ctx, t);

    // tapices con balanceo (y un empujón al tocarlos)
    const tk = t - fx.since('hall.tapestry');
    const kick = tk < 3 ? Math.sin(tk * 7) * Math.exp(-tk * 1.6) * 6 : 0;
    drawSwaying(ctx, tapestrySprite('hall-l', 30, 66, P.red2, 'raven'), tapL.x, tapL.y, Math.sin(t * 0.8) * 1.2 + kick);
    drawSwaying(ctx, tapestrySprite('hall-r', 30, 66, P.blue1, 'moon'), tapR.x, tapR.y, Math.sin(t * 0.8 + 1) * 1.2);

    // armadura que protesta
    const ak = t - fx.since('hall.armor');
    const shake = ak < 1 ? Math.round(Math.sin(ak * 50) * Math.exp(-ak * 4) * 2) : 0;
    ctx.drawImage(armorSprite('plain'), plainArmorPos.x + shake, plainArmorPos.y);
    if (ak < 2.2) {
      // ojos brillando dentro del visor
      px(ctx, plainArmorPos.x + shake + 9, plainArmorPos.y + 8, P.fire1);
      px(ctx, plainArmorPos.x + shake + 13, plainArmorPos.y + 8, P.fire1);
    }
    // armadura con olla: la olla salta al tocarla
    const pk = t - fx.since('hall.pot');
    const hop = pk < 0.9 ? Math.round(-Math.sin((pk / 0.9) * Math.PI) * 6) : 0;
    const armor = armorSprite('plain');
    ctx.drawImage(armor, 0, 5, armor.width, armor.height - 5, potArmorPos.x, potArmorPos.y + 5, armor.width, armor.height - 5);
    const pot = armorSprite('pot');
    ctx.drawImage(pot, 0, 0, pot.width, 6, potArmorPos.x, potArmorPos.y + hop, pot.width, 6);
    // ratón que se asoma de vez en cuando
    const cyc = (t + 3) % 11;
    if (cyc < 2.4) {
      const out = Math.min(1, cyc * 3, (2.4 - cyc) * 3);
      const mx = 640 - Math.round(out * 4);
      rect(ctx, mx, 382, 5, 3, P.stone5);
      px(ctx, mx, 381, P.stone6);
      px(ctx, mx + 1, 382, P.ink);
      px(ctx, mx - 1, 383, P.red3);
    }
  },
  fore(ctx, camCX, camCY, vw, vh, t) {
    // cadenas y un farol colgando en primer plano (se mueven más rápido que la sala)
    const f = 1.3;
    for (const wx of [262, 606]) {
      const x = Math.round((wx - camCX) * f + vw / 2);
      const top = Math.round((H.y - camCY) * f + vh / 2);
      if (x < -20 || x > vw + 20) continue;
      const len = 44;
      const sw = Math.sin(t * 0.9 + wx) * 1.5;
      for (let j = 0; j < len; j += 3) rect(ctx, Math.round(x + (sw * j) / len), top + j, 1, 2, P.black);
      const lx = Math.round(x + sw);
      rect(ctx, lx - 4, top + len, 9, 11, P.black);
      rect(ctx, lx - 2, top + len + 3, 5, 5, P.fire2);
      px(ctx, lx, top + len + 5, P.fire0);
    }
  },
  lights(t, fx) {
    const stoke = Math.max(0, 1 - (t - fx.since('hall.fire')) / 2.5);
    const L: Light[] = [
      { x: 318, y: 286, r: 48, flicker: 1, glow: 0.3 },
      { x: 538, y: 286, r: 48, flicker: 1, glow: 0.3, seed: 3 },
      { x: 428, y: 368, r: Math.round(70 + stoke * 22), flicker: 1.6, glow: 0.4 },
      { x: 428, y: 226, r: 40, kind: 'candle', flicker: 0.5, glow: 0.2 },
      { x: 279, y: 224, r: 20, kind: 'cold', glow: 0.12 },
      { x: 573, y: 224, r: 20, kind: 'cold', glow: 0.12 },
    ];
    if (t - fx.since('hall.armor') < 2.2) L.push({ x: plainArmorPos.x + 11, y: plainArmorPos.y + 8, r: 10, kind: 'gold', glow: 0.5 });
    return L;
  },
  hotspots: [
    { id: 'hall.inscription', x: 404, y: 266, w: 48, h: 60, label: 'Leer la inscripción bajo el escudo', kind: 'main' },
    { id: 'hall.armor', x: plainArmorPos.x, y: plainArmorPos.y, w: 24, h: 48, label: 'Tocar la armadura', kind: 'minor' },
    { id: 'hall.pot', x: potArmorPos.x, y: potArmorPos.y - 2, w: 24, h: 50, label: 'Tocar la armadura con olla', kind: 'minor' },
    { id: 'hall.fire', x: FIRE.x, y: FIRE.y, w: FIRE.w, h: FIRE.h, label: 'Avivar el fuego', kind: 'minor' },
    { id: 'hall.tapestry', x: tapL.x, y: tapL.y, w: 30, h: 70, label: 'Apartar el tapiz del cuervo', kind: 'minor' },
  ],
};
