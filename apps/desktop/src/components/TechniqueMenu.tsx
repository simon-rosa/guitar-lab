/**
 * Boutons de techniques réglables (bend, slide) : un clic ouvre un petit menu
 * pour choisir précisément le type et l'amplitude, appliqué à la note sous le curseur.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { currentNote, setNoteEffect, type BendType, type EditorState, type SlideType } from '@guitar-lab/core';
import { getEditor, useApp, useEditor } from '../app/store';
import { player } from '../audio/player';

export function Popover({ label, active, title, children, align = 'left' }: { label: ReactNode; active: boolean; title: string; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <div className="tech-menu" ref={ref}>
      <button
        type="button"
        className={`tool text${active ? ' active' : ''}`}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        {label} <span className="caret">▾</span>
      </button>
      {open && (
        <div className={`tech-pop${align === 'right' ? ' right' : ''}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const BEND_TYPES: Array<[BendType, string, string]> = [
  ['bend', 'Bend', '↗'],
  ['bend-release', 'Bend + release', '↗↘'],
  ['pre-bend', 'Pre-bend', '↑'],
  ['pre-bend-release', 'Pre-bend + release', '↑↘'],
];

const BEND_AMOUNTS: Array<[number, string]> = [
  [0.5, '¼ ton'],
  [1, '½ ton'],
  [2, '1 ton'],
  [3, '1½ ton'],
  [4, '2 tons'],
];

const SLIDES: Array<[SlideType, string, string]> = [
  ['legato', 'Vers la note suivante, lié', 'Le doigt glisse, la note d’arrivée n’est pas rejouée.'],
  ['shift', 'Vers la note suivante, rejoué', 'Le doigt glisse, la note d’arrivée est rejouée.'],
  ['in-below', 'Entrée par le bas', 'Arrive sur la note en glissant depuis plus grave.'],
  ['in-above', 'Entrée par le haut', 'Arrive sur la note en glissant depuis plus aigu.'],
  ['out-down', 'Sortie vers le bas', 'Après la note, glisse vers le grave.'],
  ['out-up', 'Sortie vers le haut', 'Après la note, glisse vers l’aigu.'],
];

function NoNote() {
  return <p className="tech-empty">Place le curseur sur une note pour régler cette technique.</p>;
}

/** Modifie la note et la fait entendre avec son nouvel effet. */
function editNote(fn: (s: EditorState) => EditorState) {
  useApp.getState().edit(fn);
  player.audition(getEditor().cursor);
}

export function BendMenu() {
  const s = useEditor();
  const bend = currentNote(s)?.effects.bend;
  const hasNote = !!currentNote(s);
  const type = bend?.type === 'release' ? 'pre-bend-release' : bend?.type ?? 'bend';
  const amount = bend?.semitones ?? 2;
  const label = bend ? `Bend ${BEND_AMOUNTS.find(([v]) => v === bend.semitones)?.[1] ?? ''}` : 'Bend';
  return (
    <Popover label={label} active={!!bend} title="Bend : type et amplitude — raccourci B (1 ton)">
      {() =>
        !hasNote ? (
          <NoNote />
        ) : (
          <>
            <div className="tech-row">
              <span className="tech-label">Type</span>
              {BEND_TYPES.map(([t, l, g]) => (
                <button
                  key={t}
                  type="button"
                  className={`pill${bend && type === t ? ' on' : ''}`}
                  onClick={() => editNote((st) => setNoteEffect(st, 'bend', { type: t, semitones: amount }))}
                >
                  <span className="pill-glyph">{g}</span> {l}
                </button>
              ))}
            </div>
            <div className="tech-row">
              <span className="tech-label">Hauteur</span>
              {BEND_AMOUNTS.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={`pill${bend && amount === v ? ' on' : ''}`}
                  onClick={() => editNote((st) => setNoteEffect(st, 'bend', { type, semitones: v }))}
                >
                  {l}
                </button>
              ))}
            </div>
            {bend && (
              <button type="button" className="ghost small tech-remove" onClick={() => editNote((st) => setNoteEffect(st, 'bend', undefined))}>
                Retirer le bend
              </button>
            )}
          </>
        )
      }
    </Popover>
  );
}

export function SlideMenu() {
  const s = useEditor();
  const slide = currentNote(s)?.effects.slide;
  const hasNote = !!currentNote(s);
  return (
    <Popover label="Slide" active={!!slide} title="Slide : direction — raccourci S (vers la note suivante)">
      {(close) =>
        !hasNote ? (
          <NoNote />
        ) : (
          <>
            <div className="tech-list">
              {SLIDES.map(([t, l, hint]) => (
                <button
                  key={t}
                  type="button"
                  role="menuitemradio"
                  aria-checked={slide === t}
                  className={`tech-item${slide === t ? ' on' : ''}`}
                  title={hint}
                  onClick={() => {
                    editNote((st) => setNoteEffect(st, 'slide', t));
                    close();
                  }}
                >
                  <span className="check-mark">{slide === t ? '✓' : ''}</span>
                  <span>{l}</span>
                  <span className="tech-hint">{hint}</span>
                </button>
              ))}
            </div>
            {slide && (
              <button
                type="button"
                className="ghost small tech-remove"
                onClick={() => {
                  editNote((st) => setNoteEffect(st, 'slide', undefined));
                  close();
                }}
              >
                Retirer le slide
              </button>
            )}
          </>
        )
      }
    </Popover>
  );
}
