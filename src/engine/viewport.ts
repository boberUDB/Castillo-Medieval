/**
 * Estrategia de escalado: el arte se dibuja a baja resolución y cada píxel de arte
 * ocupa un número ENTERO de píxeles físicos. Así el tamaño de píxel es constante
 * y nítido en cualquier pantalla (incluidas las de densidad 1.25 o 3).
 */
export interface Viewport {
  cssW: number;
  cssH: number;
  dpr: number;
  /** Píxeles físicos por píxel de arte (entero). */
  scale: number;
  /** Resolución de arte visible. */
  w: number;
  h: number;
  portrait: boolean;
  /** Píxeles CSS por píxel de arte. */
  cssPerPx: number;
}

/** Altura de arte objetivo: la escena siempre muestra ~216 px de alto (270 en vertical). */
const TARGET_LANDSCAPE = 216;
const TARGET_PORTRAIT = 264;

export function computeViewport(): Viewport {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const physW = Math.round(cssW * dpr);
  const physH = Math.round(cssH * dpr);
  const portrait = cssH > cssW * 1.1;
  const target = portrait ? TARGET_PORTRAIT : TARGET_LANDSCAPE;
  const scale = Math.max(1, Math.round(physH / target));
  return {
    cssW,
    cssH,
    dpr,
    scale,
    w: Math.ceil(physW / scale),
    h: Math.ceil(physH / scale),
    portrait,
    cssPerPx: scale / dpr,
  };
}
