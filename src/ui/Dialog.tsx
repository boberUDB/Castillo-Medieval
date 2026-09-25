import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  closeLabel?: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal de pergamino: atrapa el foco, se cierra con Escape o al pulsar
 * fuera, y devuelve el foco al elemento que lo abrió.
 */
export function Dialog({ title, kicker, onClose, children, actions, closeLabel = 'Cerrar' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // el botón que abrió el diálogo puede haberse ocultado (salió de pantalla)
      if (opener && opener.isConnected && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className="dialog parchment" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="dialog-actions">
          {actions}
          <button type="button" className="btn primary" onClick={onClose} data-autofocus>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
