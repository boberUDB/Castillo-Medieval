import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ambient } from './audio/ambient';
import {
  ACTIONS,
  BREW_CLUE,
  BREW_TEXT,
  CHEST_OPEN,
  CLUES,
  SECRETS,
  brew,
  chestLocked,
  epilogue,
  type DialogContent,
} from './content/texts';
import { Engine, type EngineView } from './engine/engine';
import { store, useSave } from './state/store';
import { Caption } from './ui/Caption';
import { Dialog } from './ui/Dialog';
import { Hotspots } from './ui/Hotspots';
import { Hud } from './ui/Hud';
import { BrewDialog, InventoryDialog, MapDialog, Toasts, iconForClue, iconForSecret, type Toast } from './ui/Panels';
import { PixelIcon } from './ui/PixelIcon';
import { EXTERIOR_HOTSPOTS } from './world/exterior';
import { ROOM_ORDER, SPACES, reducedSegments, tourSegments } from './world/tour';
import type { RoomId } from './world/types';

type Modal =
  | { kind: 'content'; content: DialogContent; clue?: string; ending?: boolean }
  | { kind: 'brew' }
  | { kind: 'map' }
  | { kind: 'inventory' }
  | { kind: 'reset' }
  | null;

type Speech = { id: string; text: string; key: number; title?: string };

const PREF_KEY = 'castillo-de-los-ecos:prefs';

function readPrefs(): { reduced?: boolean } {
  try {
    return JSON.parse(window.localStorage.getItem(PREF_KEY) ?? '{}') as { reduced?: boolean };
  } catch {
    return {};
  }
}

function writePrefs(p: { reduced?: boolean }): void {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento */
  }
}

/** Movimiento reducido: la preferencia del sistema, salvo que el visitante la cambie. */
function useReducedMotion(): [boolean, (v: boolean) => void] {
  const query = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), []);
  const [override, setOverride] = useState<boolean | undefined>(() => readPrefs().reduced);
  const [system, setSystem] = useState(query.matches);
  useEffect(() => {
    const on = () => setSystem(query.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, [query]);
  const set = useCallback((v: boolean) => {
    setOverride(v);
    writePrefs({ reduced: v });
  }, []);
  return [override ?? system, set];
}

const HOTSPOT_DEFS = [...EXTERIOR_HOTSPOTS, ...SPACES.flatMap((s) => s.hotspots ?? [])];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const hotspotEls = useRef(new Map<string, HTMLElement>());
  const audio = useMemo(() => new Ambient(), []);
  const save = useSave();
  const [reduced, setReduced] = useReducedMotion();
  const reducedRef = useRef(reduced);
  const [view, setView] = useState<EngineView>({ room: 'exterior', scene: 'ext', caption: false, title: true });
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [sound, setSound] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announce, setAnnounce] = useState('');

  /* ------------------------------ motor ------------------------------ */

  useEffect(() => {
    const engine = new Engine(canvasRef.current!, trackRef.current!, {
      spaces: SPACES,
      segments: (r) => (r ? reducedSegments() : tourSegments()),
      reduced: reducedRef.current,
      flag: (id) => store.flag(id),
      onView: setView,
      onQuality: setQuality,
    });
    hotspotEls.current.forEach((el, id) => engine.registerHotspot(id, el));
    engineRef.current = engine;
    engine.start();
    if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => () => audio.disable(), [audio]);

  useEffect(() => {
    reducedRef.current = reduced;
    engineRef.current?.setReduced(reduced);
    document.documentElement.dataset.reduced = String(reduced);
  }, [reduced]);

  useEffect(() => {
    if (view.caption || view.title) store.visit(view.room);
    audio.setRoom(view.room);
  }, [view, audio]);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) hotspotEls.current.set(id, el);
    else hotspotEls.current.delete(id);
    engineRef.current?.registerHotspot(id, el);
  }, []);

  const onHover = useCallback((id: string | null) => {
    if (engineRef.current) engineRef.current.hovered = id;
  }, []);

  /* ------------------------------ recompensas ------------------------------ */

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { ...t, id }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4800);
  }, []);

  const say = useCallback((s: Omit<Speech, 'key'>) => {
    setSpeech({ ...s, key: Date.now() });
    setAnnounce(s.title ? `${s.title}. ${s.text}` : s.text);
  }, []);

  useEffect(() => {
    if (!speech) return;
    const id = window.setTimeout(() => setSpeech(null), speech.title ? 6500 : 4500);
    return () => window.clearTimeout(id);
  }, [speech]);

  const grantClue = useCallback(
    (clue: string): boolean => {
      const isNew = store.addClue(clue);
      if (isNew) {
        pushToast({ kind: 'clue', name: CLUES[clue].name, icon: iconForClue(clue) });
        audio.sfx('clue');
      }
      return isNew;
    },
    [pushToast, audio],
  );

  const onActivate = useCallback(
    (id: string) => {
      const action = ACTIONS[id];
      const engine = engineRef.current;
      engine?.trigger(id);
      if (!action) return;
      audio.sfx('tap');
      switch (action.type) {
        case 'dialog': {
          store.markDone(id);
          const isNew = action.clue ? grantClue(action.clue) : false;
          setModal({ kind: 'content', content: action.dialog, clue: isNew ? action.clue : undefined });
          return;
        }
        case 'brew':
          setModal({ kind: 'brew' });
          return;
        case 'chest': {
          store.markDone(id);
          const found = store.get().clues.length;
          if (found >= 3) {
            if (!store.flag('done:treasure.opened')) {
              store.markDone('treasure.opened');
              engine?.trigger('treasure.open');
              audio.sfx('open');
            }
            setModal({ kind: 'content', content: CHEST_OPEN });
          } else setModal({ kind: 'content', content: chestLocked(found) });
          return;
        }
        case 'ending': {
          store.markDone(id);
          const s = store.get();
          setModal({ kind: 'content', content: epilogue(s.clues.length, s.secrets.length), ending: true });
          return;
        }
        case 'plaque':
          store.markDone(id);
          say({ id, title: action.title, text: action.text });
          return;
        case 'speech': {
          const n = store.bump(id);
          store.markDone(id);
          say({ id, text: action.lines[(n - 1) % action.lines.length] });
          return;
        }
        case 'secret': {
          const n = store.bump(id);
          store.markDone(id);
          say({ id, text: action.lines[Math.min(n - 1, action.lines.length - 1)] });
          if (n >= (action.after ?? 1) && store.addSecret(action.secret)) {
            if (action.secret === 'pluma') engine?.trigger('ext.feather');
            pushToast({ kind: 'secret', name: SECRETS[action.secret].name, icon: iconForSecret(action.secret) });
            audio.sfx('secret');
          }
        }
      }
    },
    [pushToast, grantClue, say, audio],
  );

  const onBrew = useCallback(
    (a: string, b: string) => {
      setModal(null);
      const outcome = brew(a, b);
      engineRef.current?.trigger(`alchemy.brew.${outcome}`);
      store.markDone('alchemy.brew');
      audio.sfx('brew');
      // la reacción se ve primero en el caldero; el texto llega después
      window.setTimeout(() => {
        if (outcome === 'eco') {
          const isNew = grantClue('hervido');
          setModal({ kind: 'content', content: BREW_CLUE, clue: isNew ? 'hervido' : undefined });
        } else say({ id: 'alchemy.brew', text: BREW_TEXT[outcome] });
      }, 1300);
    },
    [grantClue, say, audio],
  );

  const goTo = useCallback((room: RoomId) => {
    setModal(null);
    engineRef.current?.goTo(room);
  }, []);

  const toggleSound = useCallback(() => {
    if (audio.enabled) audio.disable();
    else {
      audio.enable();
      audio.setRoom(view.room);
    }
    setSound(audio.enabled);
  }, [audio, view.room]);

  const found = save.clues.length + save.secrets.length;
  const observatoryActions =
    view.room === 'observatory' ? (
      <>
        <button type="button" className="btn primary" onClick={() => onActivate('observatory.telescope')}>
          Mirar por el telescopio
        </button>
        <button type="button" className="btn" onClick={() => goTo('exterior')}>
          Volver a explorar
        </button>
      </>
    ) : undefined;

  return (
    <>
      <div id="lvh-probe" className="lvh-probe" aria-hidden="true" />
      <a className="skip-link" href="#contenido">
        Saltar al texto de la sala
      </a>

      <Hud
        room={view.room}
        visited={save.visited}
        found={found}
        reduced={reduced}
        quality={quality}
        sound={sound}
        soundAvailable={typeof window.AudioContext !== 'undefined'}
        onMap={() => setModal({ kind: 'map' })}
        onInventory={() => setModal({ kind: 'inventory' })}
        onSound={toggleSound}
        onReduced={setReduced}
        onQuality={(q) => engineRef.current?.setQuality(q)}
        onReset={() => setModal({ kind: 'reset' })}
      />

      <div className="stage">
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <div ref={trackRef} className="track" />

      <header className="title" data-hidden={!view.title} aria-hidden={!view.title}>
        <h1>El Castillo de los Ecos</h1>
        <p>Una exploración nocturna. Desliza hacia abajo para acercarte al portón.</p>
      </header>
      <div className="scroll-cue" data-hidden={!view.title} aria-hidden="true">
        <span>Desliza</span>
        <PixelIcon name="arrow" size={18} />
      </div>

      <main id="contenido">
        <Caption room={view.room} visible={view.caption} actions={observatoryActions} />
      </main>

      <Hotspots defs={HOTSPOT_DEFS} speech={speech} register={register} onActivate={onActivate} onHover={onHover} />

      <Toasts items={toasts} />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {modal?.kind === 'content' && (
        <Dialog
          title={modal.content.title}
          kicker={modal.content.kicker}
          onClose={() => setModal(null)}
          actions={
            modal.ending ? (
              <button type="button" className="btn" onClick={() => goTo('exterior')}>
                Volver a explorar
              </button>
            ) : undefined
          }
        >
          {modal.content.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {modal.content.signature && <p className="signature">{modal.content.signature}</p>}
          {modal.clue && (
            <p className="reward">
              <PixelIcon name={iconForClue(modal.clue)} size={24} />
              Has encontrado un eco: {CLUES[modal.clue].name}
            </p>
          )}
        </Dialog>
      )}
      {modal?.kind === 'brew' && <BrewDialog onBrew={onBrew} onClose={() => setModal(null)} />}
      {modal?.kind === 'inventory' && <InventoryDialog save={save} onClose={() => setModal(null)} />}
      {modal?.kind === 'map' && (
        <MapDialog room={view.room} rooms={ROOM_ORDER} visited={save.visited} reduced={reduced} onGo={goTo} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'reset' && (
        <Dialog
          title="¿Olvidar todo?"
          kicker="Borrar progreso"
          closeLabel="Cancelar"
          onClose={() => setModal(null)}
          actions={
            <button
              type="button"
              className="btn"
              onClick={() => {
                store.reset();
                setModal(null);
                engineRef.current?.goTo('exterior', true);
              }}
            >
              Sí, empezar de nuevo
            </button>
          }
        >
          <p>Se borrarán los ecos, los secretos y las salas visitadas. El castillo, como siempre, lo recordará igual.</p>
        </Dialog>
      )}
    </>
  );
}
