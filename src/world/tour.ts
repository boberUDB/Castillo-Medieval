import { SPACE } from './layout';
import type { Seg } from './timeline';
import type { RoomId, SpaceDef } from './types';
import { gate, hall } from './rooms/entrance';
import { library, stair1 } from './rooms/library';
import { alchemy, courtyard, stair2 } from './rooms/alchemy';
import { armory, stair3 } from './rooms/armory';
import { shaft, throne } from './rooms/throne';
import { tower, treasure } from './rooms/treasure';
import { observatory } from './rooms/observatory';

/** Todos los espacios del corte, en orden de dibujo. */
export const SPACES: SpaceDef[] = [gate, hall, library, stair1, courtyard, alchemy, stair2, armory, stair3, throne, shaft, treasure, tower, observatory];

export const ROOM_ORDER: RoomId[] = ['exterior', 'hall', 'library', 'alchemy', 'armory', 'throne', 'treasure', 'observatory'];

type DwellOpts = { len: number; from: [number, number]; to: [number, number] };
const dwell = (room: Exclude<RoomId, 'exterior'>, o: DwellOpts): Seg => ({ kind: 'dwell', room, focus: SPACE[room], ...o });

/**
 * Recorrido completo con cámara continua: cada tramo `move` sigue puertas,
 * escaleras y pasadizos reales del plano (ver layout.ts).
 */
export function tourSegments(): Seg[] {
  return [
    { kind: 'ext', len: 1.1, e0: 0, e1: 0.12, room: 'exterior' },
    { kind: 'ext', len: 1.7, e0: 0.12, e1: 0.5, room: 'exterior' },
    { kind: 'ext', len: 1.6, e0: 0.5, e1: 0.8, room: 'exterior' },
    { kind: 'ext', len: 1.1, e0: 0.8, e1: 1, room: 'exterior' },
    // túnel del portón → vestíbulo
    { kind: 'move', len: 1.1, via: [{ x: 70 }, { x: 184 }], room: 'hall' },
    dwell('hall', { len: 2.4, from: [0, 1], to: [1, 1] }),
    { kind: 'move', len: 1, via: [{ x: 664 }] },
    dwell('library', { len: 3, from: [0, 1], to: [0.5, 0] }),
    // trampilla de la biblioteca y escalera al sótano
    { kind: 'move', len: 1.7, via: [{ x: 1040, floor: 400 }, { x: 1224, floor: 608 }] },
    dwell('alchemy', { len: 2.4, from: [0, 1], to: [1, 1] }),
    // escalera arriba, escotilla y un respiro al aire libre en el patio
    { kind: 'move', len: 1.8, via: [{ x: 1620, floor: 608 }, { x: 1772, floor: 400 }, { x: 1800, floor: 400 }] },
    dwell('armory', { len: 2.4, from: [0, 1], to: [1, 1] }),
    // escalera a la planta noble
    { kind: 'move', len: 1.5, via: [{ x: 2290, floor: 400 }, { x: 2448, floor: 176 }] },
    dwell('throne', { len: 3, from: [0.48, 0.25], to: [1, 1] }),
    // puerta secreta tras el trono y descenso por el pasadizo
    { kind: 'move', len: 2, via: [{ x: 2824, floor: 176 }, { x: 2856, floor: 176 }, { x: 2856, floor: 608 }] },
    dwell('treasure', { len: 2.4, from: [0, 1], to: [1, 1] }),
    // la escalera de caracol hasta lo alto de la torre
    { kind: 'move', len: 2.8, via: [{ x: 3212, floor: 608 }, { x: 3264, floor: 608 }, { x: 3264, floor: -400 }] },
    dwell('observatory', { len: 3.2, from: [0.5, 1], to: [0.5, 1] }),
  ];
}

/**
 * Recorrido alternativo para movimiento reducido: sin acercamientos, sin
 * fijaciones largas; cada sala aparece con un corte suave y el encuadre sigue
 * al scroll 1:1, como leer una página.
 */
export function reducedSegments(): Seg[] {
  return [
    { kind: 'ext', len: 1.2, e0: 0, e1: 0.02, room: 'exterior' },
    dwell('hall', { len: 1.4, from: [0, 1], to: [1, 1] }),
    dwell('library', { len: 1.8, from: [0, 1], to: [0.5, 0] }),
    dwell('alchemy', { len: 1.4, from: [0, 1], to: [1, 1] }),
    dwell('armory', { len: 1.4, from: [0, 1], to: [1, 1] }),
    dwell('throne', { len: 1.6, from: [0.48, 0.25], to: [1, 1] }),
    dwell('treasure', { len: 1.4, from: [0, 1], to: [1, 1] }),
    dwell('observatory', { len: 1.6, from: [0.5, 1], to: [0.5, 1] }),
  ];
}
