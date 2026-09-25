import { useState, type CSSProperties } from 'react';
import { CLUES, CLUE_ORDER, INGREDIENTS, ROOMS, SECRETS, SECRET_ORDER } from '../content/texts';
import type { SaveData } from '../state/store';
import type { RoomId } from '../world/types';
import { CastlePlan } from './CastlePlan';
import { Dialog } from './Dialog';
import { PixelIcon, type IconName } from './PixelIcon';

const CLUE_ICON: Record<string, IconName> = { leido: 'page', hervido: 'flask', llorado: 'tear' };
const SECRET_ICON: Record<string, IconName> = { pluma: 'feather', gato: 'cat', ladrillo: 'brick' };

export function InventoryDialog({ save, onClose }: { save: SaveData; onClose: () => void }) {
  return (
    <Dialog title="Tu bolsa" kicker="Inventario" onClose={onClose}>
      <div className="inv-section">
        <h3>
          Ecos · {save.clues.length} de {CLUE_ORDER.length}
        </h3>
        <ul className="inv-grid">
          {CLUE_ORDER.map((id) => {
            const found = save.clues.includes(id);
            return (
              <li key={id} className="inv-item" data-found={found}>
                <span className="slot">
                  <PixelIcon name={found ? CLUE_ICON[id] : 'unknown'} size={found ? 26 : 16} />
                </span>
                <div>
                  <strong>{found ? CLUES[id].name : 'Eco sin descubrir'}</strong>
                  <span>{found ? CLUES[id].text : 'Algo en el castillo todavía lo guarda.'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="inv-section">
        <h3>
          Secretos · {save.secrets.length} de {SECRET_ORDER.length}
        </h3>
        <ul className="inv-grid">
          {SECRET_ORDER.map((id) => {
            const found = save.secrets.includes(id);
            return (
              <li key={id} className="inv-item" data-found={found}>
                <span className="slot">
                  <PixelIcon name={found ? SECRET_ICON[id] : 'unknown'} size={found ? 26 : 16} />
                </span>
                <div>
                  <strong>{found ? SECRETS[id].name : 'Secreto oculto'}</strong>
                  <span>{found ? SECRETS[id].text : 'Quizá haya que tocar donde nadie toca.'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

export function MapDialog({
  room,
  rooms,
  visited,
  reduced,
  onGo,
  onClose,
}: {
  room: RoomId;
  rooms: RoomId[];
  visited: RoomId[];
  reduced: boolean;
  onGo: (r: RoomId) => void;
  onClose: () => void;
}) {
  return (
    <Dialog title="Plano del castillo" kicker="Mapa" onClose={onClose}>
      <div className="map-wrap plaque">
        <CastlePlan current={room} visited={visited} pulse={!reduced} title={`Plano del castillo. Estás en: ${ROOMS[room].name}`} />
      </div>
      <p className="map-note">Puedes volver a cualquier sala que ya hayas visitado.</p>
      <ul className="map-list">
        {rooms.map((r) => {
          const seen = visited.includes(r) || r === room;
          return (
            <li key={r}>
              <button type="button" className="btn" disabled={!seen} aria-current={r === room} onClick={() => onGo(r)}>
                {seen ? ROOMS[r].name : 'Sala sin explorar'}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

const INGREDIENT_COLOR: Record<string, string> = {
  estrella: '#e8c565',
  mandragora: '#7a4c2c',
  triton: '#4e9148',
  dragon: '#b43b45',
  seta: '#68ddd3',
};

/** Mesa del alquimista: se eligen dos ingredientes y se echan al caldero. */
export function BrewDialog({ onBrew, onClose }: { onBrew: (a: string, b: string) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]));
  return (
    <Dialog
      title="El caldero"
      kicker="Sala de alquimia"
      closeLabel="Mejor no"
      onClose={onClose}
      actions={
        <button type="button" className="btn" disabled={picked.length < 2} onClick={() => onBrew(picked[0], picked[1])}>
          Echar al caldero
        </button>
      }
    >
      <p>Elige dos ingredientes de la mesa. El caldero no acepta devoluciones.</p>
      <ul className="ingredients" aria-label="Ingredientes">
        {INGREDIENTS.map((ing) => {
          const on = picked.includes(ing.id);
          return (
            <li key={ing.id}>
              <button type="button" className="ingredient" aria-pressed={on} onClick={() => toggle(ing.id)}>
                <span className="jar" style={{ '--jar': INGREDIENT_COLOR[ing.id] } as CSSProperties} aria-hidden="true" />
                <span>
                  <strong>{ing.name}</strong>
                  <small>{ing.hint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="brew-status" aria-live="polite">
        {picked.length === 0 && 'Aún no has elegido nada.'}
        {picked.length === 1 && `${INGREDIENTS.find((i) => i.id === picked[0])?.name}… y falta otro.`}
        {picked.length === 2 && `${picked.map((id) => INGREDIENTS.find((i) => i.id === id)?.name).join(' y ')}. ¿Seguro?`}
      </p>
    </Dialog>
  );
}

export interface Toast {
  id: number;
  kind: 'clue' | 'secret';
  name: string;
  icon: IconName;
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast plaque">
          <span className="slot">
            <PixelIcon name={t.icon} size={24} />
          </span>
          <span>
            <strong>{t.kind === 'clue' ? 'Eco hallado' : 'Secreto descubierto'}</strong>
            {t.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export const iconForClue = (id: string): IconName => CLUE_ICON[id] ?? 'page';
export const iconForSecret = (id: string): IconName => SECRET_ICON[id] ?? 'feather';
