import type { Light } from '../engine/lighting';
import type { Ctx } from '../engine/pixel';

export type RoomId =
  | 'exterior'
  | 'hall'
  | 'library'
  | 'alchemy'
  | 'armory'
  | 'throne'
  | 'treasure'
  | 'observatory';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HotspotDef {
  id: string;
  /** Rectángulo en coordenadas de mundo (píxeles de arte). */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: 'main' | 'minor' | 'secret';
}

/** Estado visible por el arte: disparadores recientes y banderas persistentes. */
export interface FxState {
  /** Tiempo (s) en que se disparó cada efecto; -Infinity si nunca. */
  since(id: string): number;
  flag(id: string): boolean;
  hovered: string | null;
  /** Puntero en coordenadas de mundo (null si no hay puntero). */
  pointer: { x: number; y: number } | null;
  quality: 'high' | 'low';
  reduced: boolean;
}

/**
 * Un espacio del corte transversal: habitación principal o pasaje (escaleras,
 * túneles). Dibuja su parte estática una vez (bake) y la animada cada fotograma.
 */
export interface SpaceDef {
  id: string;
  room?: RoomId;
  /** Interior hueco (se recorta del macizo de piedra). */
  interior: Rect;
  /** Área horneada: interior más marcos de puertas y muros propios. */
  bounds: Rect;
  /** Oscuridad ambiente 0..1 cuando la cámara está dentro. */
  ambient: number;
  bake(ctx: Ctx): void;
  draw?(ctx: Ctx, t: number, fx: FxState): void;
  /** Primer plano con parallax, en coordenadas de pantalla. */
  fore?(ctx: Ctx, camCX: number, camCY: number, vw: number, vh: number, t: number): void;
  lights?(t: number, fx: FxState): Light[];
  hotspots?: HotspotDef[];
}
