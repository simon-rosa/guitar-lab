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

const NOTATION_MODES: Array<[NotationMode, string]> = [
  ['tab', 'Tab'],
  ['both', 'Tab + partition'],
  ['score', 'Partition'],
];

export function Toolbar() {
  const s = useEditor();
  const beat = currentBeat(s);
  const note = currentNote(s);
  const fx = note?.effects ?? {};
  const duration = beat?.duration ?? s.inputDuration;
  const canUndo = useApp((st) => st.history.past.length > 0);
  const canRedo = useApp((st) => st.history.future.length > 0);
  const notation = useApp((st) => st.notation);
  const zoom = useApp((st) => st.zoom);
  const ts = s.song.masterBars[s.cursor.bar].timeSignature;
  const tsKey = ts.join('/');
  const knownTs = TIME_SIGNATURES.some(([a, b]) => `${a}/${b}` === tsKey);

  return (
    <div className="toolbar" role="toolbar" aria-label="Outils d’édition">
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
          <button type="button" className="tool text" title="Reprises, section, tempo, armure…" onClick={() => useApp.getState().openDialog('bar')}>
            Plus…
          </button>
        </div>

        <div className="tool-group view-group" aria-label="Affichage">
          <div className="segmented" role="radiogroup" aria-label="Portées affichées">
            {NOTATION_MODES.map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={notation === mode}
                className={notation === mode ? 'on' : ''}
                onClick={() => useApp.getState().setPrefs({ notation: mode })}
              >
                {label}
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
        <span className="group-label">Techniques</span>
        <Btn action="note.hammer" label="Hammer-on / pull-off" active={!!fx.hammerPull} className="text">Hammer / Pull</Btn>
        <Btn action="note.slide" label="Slide" active={!!fx.slide} className="text">Slide</Btn>
        <Btn action="note.bend" label="Bend d’un ton" active={!!fx.bend} className="text">Bend</Btn>
        <Btn action="note.vibrato" label="Vibrato" active={!!fx.vibrato} className="text">Vibrato</Btn>
        <Btn action="note.palmMute" label="Palm mute" active={!!fx.palmMute} className="text">Palm mute</Btn>
        <Btn action="note.dead" label="Note étouffée (x)" active={!!fx.dead} className="text">Étouffée ✕</Btn>
        <Btn action="note.letRing" label="Laisser sonner" active={!!fx.letRing} className="text">Let ring</Btn>
        <Btn action="note.harmonic" label="Harmonique naturelle" active={!!fx.harmonic} className="text">Harmonique</Btn>
        <Btn action="note.tie" label="Liaison de prolongation" active={!!note?.tie} className="text">Liée</Btn>
        <Btn action="note.ghost" label="Note fantôme" active={!!fx.ghost} className="text">Fantôme</Btn>
        <Btn action="note.accent" label="Accent" active={!!fx.accent} className="text">Accent</Btn>
        <Btn action="note.staccato" label="Staccato" active={!!fx.staccato} className="text">Staccato</Btn>
        <Btn action="note.tap" label="Tapping" active={!!fx.tap} className="text">Tapping</Btn>
        <Btn action="beat.pickDown" label="Coup de médiator descendant" active={beat?.effects.pickStroke === 'down'} className="text">Coup ↓</Btn>
        <Btn action="beat.pickUp" label="Coup de médiator montant" active={beat?.effects.pickStroke === 'up'} className="text">Coup ↑</Btn>
        <span className="spacer" />
        <span className="group-label">Voix</span>
        {[1, 2, 3, 4].map((v) => (
          <Btn key={v} action={`voice.${v}` as ActionId} label={`Voix ${v} (plusieurs lignes mélodiques sur la même portée)`} active={s.cursor.voice === v - 1}>
            {v}
          </Btn>
        ))}
      </div>
    </div>
  );
}
