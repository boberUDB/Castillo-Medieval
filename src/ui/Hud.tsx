import { useEffect, useRef, useState } from 'react';
import type { RoomId } from '../world/types';
import { CastlePlan } from './CastlePlan';
import { PixelIcon } from './PixelIcon';

interface Props {
  room: RoomId;
  visited: RoomId[];
  found: number;
  reduced: boolean;
  quality: 'high' | 'low';
  sound: boolean;
  soundAvailable: boolean;
  onMap: () => void;
  onInventory: () => void;
  onSound: () => void;
  onReduced: (v: boolean) => void;
  onQuality: (q: 'high' | 'low') => void;
  onReset: () => void;
}

export function Hud(p: Props) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    menuRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menu]);

  return (
    <nav className="hud" aria-label="Controles del castillo">
      <button type="button" className="minimap plaque" onClick={p.onMap} aria-label="Abrir el mapa del castillo">
        <CastlePlan current={p.room} visited={p.visited} pulse={!p.reduced} />
      </button>
      <button type="button" className="hud-btn plaque" onClick={p.onMap} aria-label="Mapa">
        <PixelIcon name="castle" size={26} />
        <span className="hud-tip" aria-hidden="true">
          Mapa
        </span>
      </button>
      <button type="button" className="hud-btn plaque" onClick={p.onInventory} aria-label={`Bolsa: ${p.found} hallazgos`}>
        <PixelIcon name="bag" size={26} />
        {p.found > 0 && (
          <span className="badge" aria-hidden="true">
            {p.found}
          </span>
        )}
        <span className="hud-tip" aria-hidden="true">
          Bolsa
        </span>
      </button>
      {p.soundAvailable && (
        <button type="button" className="hud-btn plaque" onClick={p.onSound} aria-pressed={p.sound} aria-label="Sonido ambiental">
          <PixelIcon name={p.sound ? 'soundOn' : 'soundOff'} size={26} />
          <span className="hud-tip" aria-hidden="true">
            {p.sound ? 'Silenciar' : 'Activar sonido'}
          </span>
        </button>
      )}
      <div className="hud-menu-wrap">
        <button
          ref={btnRef}
          type="button"
          className="hud-btn plaque"
          aria-expanded={menu}
          aria-controls="ajustes"
          aria-label="Ajustes"
          onClick={() => setMenu((m) => !m)}
        >
          <PixelIcon name="gear" size={24} />
          <span className="hud-tip" aria-hidden="true">
            Ajustes
          </span>
        </button>
        {menu && (
          <div ref={menuRef} id="ajustes" className="menu parchment" role="group" aria-label="Ajustes">
            <p className="menu-title">Ajustes</p>
            <button type="button" className="btn" aria-pressed={p.reduced} onClick={() => p.onReduced(!p.reduced)}>
              Movimiento reducido: {p.reduced ? 'sí' : 'no'}
            </button>
            <button type="button" className="btn" aria-pressed={p.quality === 'low'} onClick={() => p.onQuality(p.quality === 'high' ? 'low' : 'high')}>
              Calidad: {p.quality === 'high' ? 'alta' : 'baja (más fluida)'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMenu(false);
                p.onReset();
              }}
            >
              Borrar progreso…
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
