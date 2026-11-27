/**
 * Menu du clic droit sur la tablature : insérer une note à droite ou à gauche,
 * effacer, copier / coller, accord, mesure. Les actions portent sur la note visée.
 */
import { useEffect, useRef } from 'react';
import { currentBeat, currentNote, DEFAULT_KEYMAP, type ActionId } from '@guitar-lab/core';
import { runAction } from '../app/actions';
import { useApp, useEditor } from '../app/store';

interface Item {
  label: string;
  action?: ActionId;
  run?: () => void;
  disabled?: boolean;
  primary?: boolean;
}

export function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useEditor();
  const keymap = useApp((st) => st.keymap);
  const clipboard = useApp((st) => st.clipboard);
  const drums = s.song.tracks[s.cursor.track].kind === 'drums';
  const beat = currentBeat(s);
  const note = currentNote(s);

  useEffect(() => {
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('mousedown', down, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('wheel', onClose, { passive: true });
    window.addEventListener('blur', onClose);
    return () => {
      window.removeEventListener('mousedown', down, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('wheel', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  // Reste entièrement visible même près du bord de la fenêtre.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) el.style.left = `${x - r.width}px`;
    if (r.bottom > window.innerHeight - 8) el.style.top = `${Math.max(8, y - r.height)}px`;
  }, [x, y]);

  const groups: Item[][] = [
    [
      { label: 'Insérer une note après (à droite)', action: 'edit.insertBeatAfter', disabled: !beat, primary: true },
      { label: 'Insérer une note avant (à gauche)', action: 'edit.insertBeat' },
    ],
    [
      { label: note ? 'Effacer la note' : 'Supprimer ce temps', action: 'edit.delete', disabled: !beat },
      { label: 'Transformer en silence', action: 'edit.rest', disabled: !beat },
    ],
    [
      { label: 'Copier', action: 'edit.copy', disabled: !beat },
      { label: 'Couper', action: 'edit.cut', disabled: !beat },
      { label: 'Coller ici', action: 'edit.paste', disabled: clipboard.length === 0 },
    ],
    [
      { label: 'Insérer un accord…', action: 'edit.chord', disabled: drums },
      { label: 'Dupliquer la mesure', action: 'bar.duplicate' },
      { label: 'Propriétés de la mesure…', run: () => useApp.getState().openDialog('bar') },
    ],
  ];

  return (
    <div className="ctx-menu" role="menu" ref={ref} style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()} onMouseDown={(e) => e.stopPropagation()}>
      {groups.map((g, gi) => (
        <div key={gi} className="ctx-group">
          {g.map((it) => {
            const key = it.action ? (keymap[it.action] ?? DEFAULT_KEYMAP[it.action] ?? [])[0] : undefined;
            return (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={it.primary ? 'primary-item' : undefined}
                disabled={it.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onClose();
                  if (it.action) runAction(it.action);
                  else it.run?.();
                }}
              >
                <span>{it.label}</span>
                {key && <kbd>{key}</kbd>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
