import { useEffect, useState, type ReactNode } from 'react';
import { ROOMS } from '../content/texts';
import type { RoomId } from '../world/types';

/**
 * Cartela de la sala: aparece cuando la cámara se detiene y queda quieta
 * mientras se lee. Tras unos segundos se pliega al nombre para despejar la escena;
 * se puede volver a desplegar.
 */
export function Caption({ room, visible, actions }: { room: RoomId; visible: boolean; actions?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [shownRoom, setShownRoom] = useState(room);

  // al cambiar de sala se vuelve a desplegar (ajuste de estado durante el render)
  if (shownRoom !== room) {
    setShownRoom(room);
    setOpen(true);
  }

  const hasActions = Boolean(actions);
  useEffect(() => {
    if (!visible || !open || hasActions) return;
    const id = window.setTimeout(() => setOpen(false), 9000);
    return () => window.clearTimeout(id);
  }, [visible, open, room, hasActions]);

  const data = ROOMS[room];
  if (room === 'exterior' || !data.line) return null;

  return (
    <section className="caption" data-hidden={!visible} aria-live="polite" aria-label={`Sala: ${data.name}`} inert={!visible}>
      <div className="caption-head plaque">
        <h2>{data.name}</h2>
        <button type="button" className="chev" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Ocultar' : 'Leer'}
        </button>
      </div>
      {open && (
        <div className="caption-body parchment">
          <p>{data.line}</p>
          {actions && <div className="caption-actions">{actions}</div>}
        </div>
      )}
    </section>
  );
}
