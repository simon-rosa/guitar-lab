/**
 * Palette d'outils : saisie à la souris des durées, techniques et voix.
 * Chaque bouton indique son raccourci clavier.
 */
import { currentBeat, currentNote, DEFAULT_KEYMAP, type ActionId, type Duration } from '@guitar-lab/core';
import { runAction } from '../app/actions';
import { useApp, useEditor } from '../app/store';

const DURATIONS: Array<{ d: Duration; label: string; glyph: string }> = [
  { d: 1, label: 'Ronde', glyph: '𝅝' },
  { d: 2, label: 'Blanche', glyph: '𝅗𝅥' },
  { d: 4, label: 'Noire', glyph: '♩' },
  { d: 8, label: 'Croche', glyph: '♪' },
  { d: 16, label: 'Double croche', glyph: '𝅘𝅥𝅯' },
  { d: 32, label: 'Triple croche', glyph: '𝅘𝅥𝅰' },
];

function useShortcut(id: ActionId): string {
  const keymap = useApp((s) => s.keymap);
  return (keymap[id] ?? DEFAULT_KEYMAP[id] ?? [])[0] ?? '';
}

function Btn({ action, label, text, active, wide }: { action: ActionId; label: string; text: string; active?: boolean; wide?: boolean }) {
  const key = useShortcut(action);
  return (
    <button
      type="button"
      className={`tool${active ? ' active' : ''}${wide ? ' wide' : ''}`}
      title={key ? `${label} (${key})` : label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => runAction(action)}
    >
      {text}
    </button>
  );
}

export function Toolbar() {
  const s = useEditor();
  const beat = currentBeat(s);
  const note = currentNote(s);
  const fx = note?.effects ?? {};
  const duration = beat?.duration ?? s.inputDuration;
  const canUndo = useApp((st) => st.history.past.length > 0);
  const canRedo = useApp((st) => st.history.future.length > 0);

  return (
    <div className="toolbar" role="toolbar" aria-label="Outils d’édition">
      <div className="tool-group">
        <button type="button" className="tool" title="Annuler (Ctrl+Z)" disabled={!canUndo} onClick={() => runAction('edit.undo')}>↶</button>
        <button type="button" className="tool" title="Rétablir (Ctrl+Y)" disabled={!canRedo} onClick={() => runAction('edit.redo')}>↷</button>
      </div>

      <div className="tool-group" aria-label="Durée">
        {DURATIONS.map(({ d, label, glyph }) => (
          <Btn key={d} action={`duration.${d}` as ActionId} label={label} text={glyph} active={duration === d} />
        ))}
        <Btn action="beat.dot" label="Point" text={beat?.dots === 2 ? '··' : '·'} active={!!beat?.dots} />
        <Btn action="beat.triplet" label="Triolet" text="3" active={beat?.tuplet === 3} />
        <Btn action="edit.rest" label="Silence" text="𝄽" active={!!beat && beat.notes.length === 0} />
      </div>

      <div className="tool-group" aria-label="Techniques">
        <Btn action="note.tie" label="Liaison" text="⌒" active={!!note?.tie} />
        <Btn action="note.hammer" label="Hammer-on / pull-off" text="H" active={!!fx.hammerPull} />
        <Btn action="note.slide" label="Slide" text="/" active={!!fx.slide} />
        <Btn action="note.bend" label="Bend" text="⤴" active={!!fx.bend} />
        <Btn action="note.vibrato" label="Vibrato" text="〰" active={!!fx.vibrato} />
        <Btn action="note.palmMute" label="Palm mute" text="PM" active={!!fx.palmMute} />
        <Btn action="note.dead" label="Note étouffée" text="✕" active={!!fx.dead} />
        <Btn action="note.letRing" label="Let ring" text="LR" active={!!fx.letRing} />
        <Btn action="note.harmonic" label="Harmonique" text="◇" active={!!fx.harmonic} />
        <Btn action="note.ghost" label="Note fantôme" text="( )" active={!!fx.ghost} />
        <Btn action="note.accent" label="Accent" text=">" active={!!fx.accent} />
        <Btn action="note.staccato" label="Staccato" text="•" active={!!fx.staccato} />
        <Btn action="note.tap" label="Tapping" text="T" active={!!fx.tap} />
        <Btn action="beat.pickDown" label="Coup descendant" text="⊓" active={beat?.effects.pickStroke === 'down'} />
        <Btn action="beat.pickUp" label="Coup montant" text="∨" active={beat?.effects.pickStroke === 'up'} />
      </div>

      <div className="tool-group" aria-label="Voix">
        {[1, 2, 3, 4].map((v) => (
          <Btn key={v} action={`voice.${v}` as ActionId} label={`Voix ${v}`} text={`V${v}`} active={s.cursor.voice === v - 1} />
        ))}
      </div>

      <div className="tool-group" aria-label="Mesures">
        <Btn action="bar.insert" label="Insérer une mesure" text="+▭" wide />
        <Btn action="bar.delete" label="Supprimer la mesure" text="−▭" wide />
        <Btn action="bar.fill" label="Compléter avec des silences" text="▭𝄽" wide />
        <button type="button" className="tool wide" title="Propriétés de la mesure (signature, tempo, reprises…)" onClick={() => useApp.getState().openDialog('bar')}>
          4/4…
        </button>
      </div>
    </div>
  );
}
