import { memo } from 'react';
import type { HotspotDef } from '../world/types';

interface Props {
  defs: HotspotDef[];
  speech: { id: string; text: string; key: number; title?: string } | null;
  register: (id: string, el: HTMLElement | null) => void;
  onActivate: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * Capa HTML sobre el lienzo: cada objeto interactivo es un botón real (teclado,
 * lector de pantalla, táctil). El motor los coloca cada fotograma y oculta los
 * que están fuera de cuadro, así nunca se puede enfocar algo invisible.
 */
export const Hotspots = memo(function Hotspots({ defs, speech, register, onActivate, onHover }: Props) {
  return (
    <div className="hotspots">
      {defs.map((d) => (
        <div key={d.id} className="hotspot" ref={(el) => register(d.id, el)} hidden>
          <button
            type="button"
            aria-label={d.label}
            data-kind={d.kind}
            onClick={() => onActivate(d.id)}
            onPointerEnter={() => onHover(d.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(d.id)}
            onBlur={() => onHover(null)}
          />
          {d.kind !== 'secret' && (
            <span className="hotspot-label" aria-hidden="true">
              {d.label}
            </span>
          )}
          {speech?.id === d.id && (
            <p key={speech.key} className="speech" aria-hidden="true">
              {speech.title && <strong>{speech.title}</strong>}
              {speech.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});
