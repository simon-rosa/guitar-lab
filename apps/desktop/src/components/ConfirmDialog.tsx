/** Confirmation dans l'interface (window.confirm est bloqué dans l'aperçu web). */
import { useEffect, useRef } from 'react';
import { useApp } from '../app/store';

export function ConfirmDialog() {
  const req = useApp((s) => s.confirmRequest);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => okRef.current?.focus(), [req]);
  if (!req) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && req.resolve(false)}>
      <div
        className="modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmation"
        onKeyDown={(e) => {
          if (e.key === 'Escape') req.resolve(false);
        }}
      >
        <div className="modal-body">
          <p>{req.message}</p>
        </div>
        <footer>
          <button type="button" className="ghost" onClick={() => req.resolve(false)}>
            Annuler
          </button>
          <button type="button" ref={okRef} className={req.danger ? 'primary danger' : 'primary'} onClick={() => req.resolve(true)}>
            {req.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
