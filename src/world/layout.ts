import type { Rect } from './types';

/**
 * Plano del castillo en corte transversal (coordenadas de mundo en píxeles de arte,
 * y crece hacia abajo). Todas las salas viven en el mismo espacio, así el
 * recorrido es físicamente continuo: puertas, escaleras y muros reales.
 *
 *   planta alta  (suelo y=176):  ─────────── salón del trono ─┐     observatorio
 *   planta baja  (suelo y=400):  túnel · vestíbulo · biblioteca · patio · armería · escalera  │ torre
 *   sótano       (suelo y=608):          escalera ↘ alquimia ↗ escalera        pasadizo ↘ tesoro │
 */
export const GROUND = 400;
export const BASEMENT = 608;
export const UPPER = 176;

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const SPACE = {
  gate: r(16, 312, 160, 88),
  hall: r(192, 168, 464, 232),
  library: r(672, 40, 400, 360),
  stair1: r(1000, 416, 232, 192),
  alchemy: r(1248, 432, 352, 176),
  stair2: r(1616, 416, 192, 192),
  courtyard: r(1088, 176, 736, 224),
  armory: r(1840, 192, 432, 208),
  stair3: r(2288, 192, 176, 208),
  throne: r(2096, -112, 720, 288),
  shaft: r(2832, 112, 48, 496),
  treasure: r(2896, 432, 304, 176),
  tower: r(3216, -400, 96, 1008),
  observatory: r(3168, -576, 192, 176),
} as const;

/** Macizos de piedra que forman el edificio (el corte se ve como mampostería). */
export const MASSES: Rect[] = [
  r(0, 136, 672, 280), // puerta y vestíbulo
  r(656, 16, 432, 400), // biblioteca
  r(1824, 176, 1072, 240), // armería y escalera
  r(2080, -128, 816, 304), // salón del trono
  r(2880, 256, 336, 160), // almacenes sobre el tesoro
  r(3200, -400, 128, 816), // torre
  r(3152, -592, 224, 192), // observatorio
];

/** Cimientos bajo el suelo (sillería en vez de tierra). */
export const FOUNDATION = r(0, 416, 3376, 224);

/** Huecos de paso a través de muros y forjados. */
export const OPENINGS: Rect[] = [
  r(0, 328, 16, 72), // portón exterior
  r(176, 336, 16, 64), // túnel → vestíbulo
  r(656, 320, 16, 80), // vestíbulo → biblioteca
  r(1008, 400, 64, 16), // trampilla de la biblioteca → escalera
  r(1232, 552, 16, 56), // escalera → alquimia
  r(1600, 552, 16, 56), // alquimia → escalera
  r(1768, 400, 40, 16), // escotilla al patio
  r(1824, 336, 16, 64), // patio → armería
  r(2272, 336, 16, 64), // armería → escalera
  r(2432, 176, 32, 16), // escalera → salón del trono
  r(2816, 112, 16, 64), // trono → pasadizo
  r(2880, 552, 16, 56), // pasadizo → tesoro
  r(3200, 552, 16, 56), // tesoro → torre
  r(3284, -416, 24, 16), // torre → observatorio
];

/** Foso frente al portón. */
export const MOAT = r(-120, 400, 104, 48);

export const WORLD = r(-600, -760, 4400, 1500);

export function inside(p: { x: number; y: number }, rc: Rect): boolean {
  return p.x >= rc.x && p.y >= rc.y && p.x < rc.x + rc.w && p.y < rc.y + rc.h;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
