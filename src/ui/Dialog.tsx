import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento de modal: atrapa el foco, cierra con Escape y devuelve el
 * foco al elemento que lo abrió (si sigue visible).
 */
export function useModalFocus(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });

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
      if (opener && opener.isConnected && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
    };
  }, [ref]);
}

interface Props {
  title: string;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  closeLabel?: string;
}

/** Diálogo modal de pergamino. Se cierra con Escape o al pulsar fuera. */
export function Dialog({ title, kicker, onClose, children, actions, closeLabel = 'Cerrar' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(ref, onClose);

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
