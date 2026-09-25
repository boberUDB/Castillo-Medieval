import { SPACE } from './layout';
import type { Seg } from './timeline';
import type { RoomId, SpaceDef } from './types';
import { gate, hall } from './rooms/entrance';
import { library, stair1 } from './rooms/library';

/** Todos los espacios del corte, en orden de dibujo. */
export const SPACES: SpaceDef[] = [gate, hall, library, stair1];

export const ROOM_ORDER: RoomId[] = ['exterior', 'hall', 'library'];

const hallFocus = SPACE.hall;
const libFocus = SPACE.library;

/** Recorrido completo con cámara continua. */
export function tourSegments(): Seg[] {
  return [
    { kind: 'ext', len: 1.1, e0: 0, e1: 0.12, room: 'exterior' },
    { kind: 'ext', len: 1.7, e0: 0.12, e1: 0.5, room: 'exterior' },
    { kind: 'ext', len: 1.6, e0: 0.5, e1: 0.8, room: 'exterior' },
    { kind: 'ext', len: 1.1, e0: 0.8, e1: 1, room: 'exterior' },
    { kind: 'move', len: 1.1, via: [{ x: 70 }, { x: 184 }], room: 'hall' },
    { kind: 'dwell', len: 2.4, room: 'hall', focus: hallFocus, from: [0, 1], to: [1, 1] },
    { kind: 'move', len: 1, via: [{ x: 664 }] },
    { kind: 'dwell', len: 3, room: 'library', focus: libFocus, from: [0, 1], to: [0.5, 0] },
  ];
}

/**
 * Recorrido alternativo para movimiento reducido: sin acercamientos ni
 * desplazamientos de cámara, cada sala aparece con un corte suave.
 */
export function reducedSegments(): Seg[] {
  return [
    { kind: 'ext', len: 1.2, e0: 0, e1: 0.02, room: 'exterior' },
    // el encuadre sigue al scroll 1:1 (como leer una página), sin inercia ni zoom
    { kind: 'dwell', len: 1.4, room: 'hall', focus: hallFocus, from: [0, 1], to: [1, 1] },
    { kind: 'dwell', len: 1.8, room: 'library', focus: libFocus, from: [0, 1], to: [0.5, 0] },
  ];
}
