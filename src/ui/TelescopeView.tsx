import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { epilogue } from '../content/texts';
import { computeViewport } from '../engine/viewport';
import { CONSTELLATIONS, REVEAL, TelescopeSky } from '../world/telescope';
import { useModalFocus } from './Dialog';

interface Props {
  clues: number;
  secrets: number;
  reduced: boolean;
  onExplore: () => void;
  onClose: () => void;
}

interface Geo {
  cx: number;
  cy: number;
  R: number;
  k: number; // px CSS por píxel de arte
}

/**
 * El final: mirar por el telescopio. El cielo se pinta en su propio lienzo con
 * la misma escala entera que el castillo; los nombres de las constelaciones y
 * el epílogo son HTML para que se lean bien y sean accesibles.
 */
export function TelescopeView({ clues, secrets, reduced, onExplore, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const titleId = useId();
  const text = epilogue(clues, secrets);
  useModalFocus(ref, onClose);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const sky = new TelescopeSky();
    const t0 = performance.now();
    let raf = 0;

    const resize = () => {
      const vp = computeViewport();
      canvas.width = vp.w;
      canvas.height = vp.h;
      canvas.style.width = `${vp.w * vp.cssPerPx}px`;
      canvas.style.height = `${vp.h * vp.cssPerPx}px`;
      ctx.imageSmoothingEnabled = false;
      const g = sky.resize(vp.w, vp.h, vp.portrait);
      setGeo({ ...g, k: vp.cssPerPx });
    };
    const loop = (now: number) => {
      sky.render(ctx, (now - t0) / 1000, reduced);
      raf = requestAnimationFrame(loop);
    };
    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  const place = (u: number, v: number): CSSProperties => {
    if (!geo) return { display: 'none' };
    return {
      left: `${(geo.cx - geo.R + u * 2 * geo.R) * geo.k}px`,
      top: `${(geo.cy - geo.R + v * 2 * geo.R) * geo.k}px`,
    };
  };

  return (
    <div ref={ref} className="telescope" role="dialog" aria-modal="true" aria-labelledby={titleId} data-reduced={reduced}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="sr-only">
        Por la lente del telescopio se ve un cielo lleno de estrellas, la vía láctea y una luna casi llena. Poco a poco se dibujan tres
        constelaciones: {CONSTELLATIONS.map((c) => c.name).join(', ')}.
      </p>

      {CONSTELLATIONS.map((c, i) => (
        <span
          key={c.id}
          className="star-label"
          aria-hidden="true"
          style={{ ...place(c.label[0], c.label[1]), animationDelay: `${REVEAL.first + i * REVEAL.gap + REVEAL.draw}s` }}
        >
          {c.name}
        </span>
      ))}

      <section className="telescope-text parchment">
        <p className="kicker">{text.kicker}</p>
        <h2 id={titleId}>{text.title}</h2>
        {text.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {text.signature && <p className="signature">{text.signature}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onExplore}>
            Volver a explorar
          </button>
          <button type="button" className="btn primary" onClick={onClose} data-autofocus>
            Cerrar
          </button>
        </div>
      </section>

      <p className="credit">
        <span>Roberto Miranda</span>
        <small>creador</small>
      </p>
    </div>
  );
}
