import { useSyncExternalStore } from 'react';
import type { RoomId } from '../world/types';

/**
 * Progreso del visitante. Persiste en localStorage, pero la experiencia funciona
 * igual si el almacenamiento no está disponible (modo privado, bloqueos).
 */
export interface SaveData {
  clues: string[];
  secrets: string[];
  visited: RoomId[];
  done: string[];
  counters: Record<string, number>;
}

const KEY = 'castillo-de-los-ecos:v1';

const empty = (): SaveData => ({ clues: [], secrets: [], visited: [], done: [], counters: {} });

function load(): SaveData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      clues: Array.isArray(data.clues) ? data.clues : [],
      secrets: Array.isArray(data.secrets) ? data.secrets : [],
      visited: Array.isArray(data.visited) ? data.visited : [],
      done: Array.isArray(data.done) ? data.done : [],
      counters: data.counters && typeof data.counters === 'object' ? data.counters : {},
    };
  } catch {
    return empty();
  }
}

let state: SaveData = load();
const listeners = new Set<() => void>();

function commit(next: SaveData): void {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento: el progreso dura lo que la pestaña */
  }
  listeners.forEach((l) => l());
}

const add = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export const store = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Devuelve true si la pista es nueva. */
  addClue(id: string): boolean {
    if (state.clues.includes(id)) return false;
    commit({ ...state, clues: add(state.clues, id) });
    return true;
  },
  addSecret(id: string): boolean {
    if (state.secrets.includes(id)) return false;
    commit({ ...state, secrets: add(state.secrets, id) });
    return true;
  },
  visit(room: RoomId): void {
    if (state.visited.includes(room)) return;
    commit({ ...state, visited: [...state.visited, room] });
  },
  markDone(id: string): void {
    if (state.done.includes(id)) return;
    commit({ ...state, done: add(state.done, id) });
  },
  bump(id: string): number {
    const n = (state.counters[id] ?? 0) + 1;
    commit({ ...state, counters: { ...state.counters, [id]: n } });
    return n;
  },
  reset(): void {
    commit(empty());
  },
  /** Banderas legibles por el arte: done:<id>, secret:<id>, clue:<id>. */
  flag(id: string): boolean {
    const [kind, key] = id.split(':');
    if (kind === 'done') return state.done.includes(key);
    if (kind === 'secret') return state.secrets.includes(key);
    if (kind === 'clue') return state.clues.includes(key);
    return false;
  },
};

export function useSave(): SaveData {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
