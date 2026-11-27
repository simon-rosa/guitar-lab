/**
 * Barre d'outils en deux rangées :
 *  1. Rythme (durées nommées, point, triolet, silence), mesure, affichage ;
 *  2. Techniques de jeu, en toutes lettres.
 * Chaque bouton rappelle son raccourci clavier dans son info-bulle.
 */
import { currentBeat, currentNote, DEFAULT_KEYMAP, updateMasterBar, type ActionId } from '@guitar-lab/core';
import { runAction } from '../app/actions';
import { useApp, useEditor, type NotationMode } from '../app/store';
import { DURATION_INFO } from './durations';
import { BendMenu, Popover, SlideMenu } from './TechniqueMenu';
import { useEffect, useRef, useState } from 'react';

function useShortcut(id: ActionId): string {
  const keymap = useApp((s) => s.keymap);
  return (keymap[id] ?? DEFAULT_KEYMAP[id] ?? [])[0] ?? '';
}

function Btn({ action, label, children, active, className }: { action: ActionId; label: string; children: React.ReactNode; active?: boolean; className?: string }) {
  const key = useShortcut(action);
  return (
    <button
      type="button"
      className={`tool${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      title={key ? `${label} — raccourci : ${key}` : label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => runAction(action)}
    >
      {children}
    </button>
  );
}

const TIME_SIGNATURES: Array<[number, number]> = [[4, 4], [3, 4], [2, 4], [6, 8], [12, 8], [5, 4], [7, 8], [9, 8], [2, 2]];

const NOTATION_MODES: Array<[NotationMode, string, string]> = [
  ['tab', 'Tab', 'Tab'],
  ['both', 'Tab + partition', 'Tab+Part.'],
  ['score', 'Partition', 'Part.'],
];

/**
 * Niveau de compacité selon la largeur disponible :
 * 0 = tout en clair ; 1 = durées sans leur nom, libellés courts ;
 * 2 = techniques rares regroupées dans « Autres ▾ » ; 3 = encore plus serré.
 */
function useCompactLevel(ref: React.RefObject<HTMLDivElement | null>): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setLevel(w >= 1400 ? 0 : w >= 1310 ? 1 : w >= 1090 ? 2 : 3);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return level;
}

/** Techniques moins fréquentes : rangées dans « Autres ▾ » quand la place manque. */
const RARE_TECHNIQUES: Array<{ action: ActionId; label: string; text: string }> = [
  { action: 'note.harmonic', label: 'Harmonique naturelle', text: 'Harmonique' },
  { action: 'note.ghost', label: 'Note fantôme', text: 'Fantôme' },
  { action: 'note.accent', label: 'Accent', text: 'Accent' },
  { action: 'note.staccato', label: 'Staccato', text: 'Staccato' },
  { action: 'note.tap', label: 'Tapping', text: 'Tapping' },
  { action: 'beat.pickDown', label: 'Coup de médiator descendant', text: 'Coup ↓' },
  { action: 'beat.pickUp', label: 'Coup de médiator montant', text: 'Coup ↑' },
];

export function Toolbar() {
  const ref = useRef<HTMLDivElement>(null);
  const level = useCompactLevel(ref);
  const s = useEditor();
  const beat = currentBeat(s);
  const note = currentNote(s);
  const fx = note?.effects ?? {};
  const duration = beat?.duration ?? s.inputDuration;
  const canUndo = useApp((st) => st.history.past.length > 0);
  const canRedo = useApp((st) => st.history.future.length > 0);
  const notation = useApp((st) => st.notation);
  const zoom = useApp((st) => st.zoom);
  const rareActive = (a: ActionId): boolean =>
    ({
      'note.harmonic': !!fx.harmonic,
      'note.ghost': !!fx.ghost,
      'note.accent': !!fx.accent,
      'note.staccato': !!fx.staccato,
      'note.tap': !!fx.tap,
      'beat.pickDown': beat?.effects.pickStroke === 'down',
      'beat.pickUp': beat?.effects.pickStroke === 'up',
    })[a as string] ?? false;
  const ts = s.song.masterBars[s.cursor.bar].timeSignature;
  const tsKey = ts.join('/');
  const knownTs = TIME_SIGNATURES.some(([a, b]) => `${a}/${b}` === tsKey);

  return (
    <div className={`toolbar compact-${level}`} role="toolbar" aria-label="Outils d’édition" ref={ref}>
      <div className="toolbar-row">
        <div className="tool-group">
          <button type="button" className="tool" title="Annuler — Ctrl+Z" aria-label="Annuler" disabled={!canUndo} onClick={() => runAction('edit.undo')}>↶</button>
          <button type="button" className="tool" title="Rétablir — Ctrl+Y" aria-label="Rétablir" disabled={!canRedo} onClick={() => runAction('edit.redo')}>↷</button>
        </div>

        <div className="tool-group" aria-label="Durée de la note">
          <span className="group-label">Durée</span>
          {DURATION_INFO.filter((d) => d.d <= 32).map((d) => (
            <Btn key={d.d} action={`duration.${d.d}` as ActionId} label={`${d.label} (${d.beats})`} active={duration === d.d} className="duration">
              <span className="glyph">{d.glyph}</span>
              <span className="name">{d.short}</span>
            </Btn>
          ))}
          <Btn action="beat.dot" label="Pointée (×1,5)" active={!!beat?.dots} className="duration">
            <span className="glyph">{beat?.dots === 2 ? '··' : '·'}</span>
            <span className="name">Pointée</span>
          </Btn>
          <Btn action="beat.triplet" label="Triolet" active={beat?.tuplet === 3} className="duration">
            <span className="glyph">3</span>
            <span className="name">Triolet</span>
          </Btn>
          <Btn action="edit.rest" label="Silence" active={!!beat && beat.notes.length === 0} className="duration">
            <span className="glyph">𝄽</span>
            <span className="name">Silence</span>
          </Btn>
        </div>

        <div className="tool-group" aria-label="Mesure">
          <span className="group-label">Mesure</span>
          <select
            className="ts-select"
            value={knownTs ? tsKey : 'autre'}
            title="Signature rythmique, à partir de cette mesure"
            aria-label="Signature rythmique"
            onChange={(e) => {
              if (e.target.value === 'autre') return useApp.getState().openDialog('bar');
              const [a, b] = e.target.value.split('/').map(Number);
              useApp.getState().edit((st) => updateMasterBar(st, st.cursor.bar, { timeSignature: [a, b] }, true));
            }}
          >
            {TIME_SIGNATURES.map(([a, b]) => (
              <option key={`${a}/${b}`} value={`${a}/${b}`}>{a}/{b}</option>
            ))}
            <option value="autre">{knownTs ? 'Autre…' : `${tsKey} (autre…)`}</option>
          </select>
          <Btn action="bar.insert" label="Insérer une mesure après celle-ci" className="text">+ Mesure</Btn>
          <Btn action="bar.duplicate" label="Dupliquer la mesure (ou les mesures sélectionnées) juste après" className="text">Dupliquer</Btn>
          <button type="button" className="tool text" title="Reprises, section, tempo, armure…" onClick={() => useApp.getState().openDialog('bar')}>
            Plus…
          </button>
        </div>

        <div className="tool-group view-group" aria-label="Affichage">
          <div className="segmented" role="radiogroup" aria-label="Portées affichées">
            {NOTATION_MODES.map(([mode, label, short]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={notation === mode}
                className={notation === mode ? 'on' : ''}
                title={label}
                onClick={() => useApp.getState().setPrefs({ notation: mode })}
              >
                {level >= 1 ? short : label}
              </button>
            ))}
          </div>
          <button type="button" className="tool" title="Zoom arrière — Ctrl+−" aria-label="Zoom arrière" onClick={() => runAction('view.zoomOut')}>−</button>
          <span className="zoom-value">{Math.round(zoom * 100)} %</span>
          <button type="button" className="tool" title="Zoom avant — Ctrl+=" aria-label="Zoom avant" onClick={() => runAction('view.zoomIn')}>+</button>
          <button type="button" className="tool help-btn" title="Aide — F1" aria-label="Aide" onClick={() => useApp.getState().openDialog('help')}>?</button>
        </div>
      </div>

      <div className="toolbar-row techniques" aria-label="Techniques de jeu">
        <Btn action="edit.chord" label="Insérer un accord depuis la bibliothèque" className="text accent-outline">Accord…</Btn>
        <span className="group-label">Techniques</span>
        <Btn action="note.hammer" label="Hammer-on / pull-off" active={!!fx.hammerPull} className="text">Hammer / Pull</Btn>
        <SlideMenu />
        <BendMenu />
        <Btn action="note.vibrato" label="Vibrato" active={!!fx.vibrato} className="text">Vibrato</Btn>
        <Btn action="note.palmMute" label="Palm mute" active={!!fx.palmMute} className="text">Palm mute</Btn>
        <Btn action="note.dead" label="Note étouffée (x)" active={!!fx.dead} className="text">Étouffée ✕</Btn>
        <Btn action="note.letRing" label="Laisser sonner" active={!!fx.letRing} className="text">Let ring</Btn>
        {level < 2 ? (
          RARE_TECHNIQUES.map((t) => (
            <Btn key={t.action} action={t.action} label={t.label} active={rareActive(t.action)} className="text">{t.text}</Btn>
          ))
        ) : (
          <Popover label="Autres" active={RARE_TECHNIQUES.some((t) => rareActive(t.action))} title="Autres techniques" align="right">
            {(close) => (
              <div className="tech-list">
                {RARE_TECHNIQUES.map((t) => (
                  <button
                    key={t.action}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={rareActive(t.action)}
                    className={`tech-item${rareActive(t.action) ? ' on' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      runAction(t.action);
                      close();
                    }}
                  >
                    <span className="check-mark">{rareActive(t.action) ? '✓' : ''}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </Popover>
        )}
        <span className="spacer" />
        <span className="voice-group">
          <span className="group-label">Voix</span>
          {[1, 2, 3, 4].map((v) => (
            <Btn key={v} action={`voice.${v}` as ActionId} label={`Voix ${v} (plusieurs lignes mélodiques sur la même portée)`} active={s.cursor.voice === v - 1}>
              {v}
            </Btn>
          ))}
        </span>
      </div>
    </div>
  );
}
