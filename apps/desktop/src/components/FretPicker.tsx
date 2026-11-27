/**
 * Sélecteur de frette : s'ouvre sous le curseur quand on clique sur la tablature.
 * Un clic sur une frette écrit la note ; avec « avancer », le curseur passe au
 * temps suivant et le sélecteur le suit, pour saisir une mélodie à la souris.
 */
import {
  currentBeat,
  currentNote,
  deleteAtCursor,
  makeRest,
  moveRight,
  pitchName,
  setDuration,
  setFret,
  toggleDeadNote,
  toggleDot,
  toggleTuplet,
  type Duration,
} from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';
import { DURATION_INFO } from './durations';

const DRUM_KIT: Array<{ key: number; name: string }> = [
  { key: 36, name: 'Grosse caisse' },
  { key: 38, name: 'Caisse claire' },
  { key: 37, name: 'Rimshot' },
  { key: 39, name: 'Clap' },
  { key: 42, name: 'Charley fermé' },
  { key: 46, name: 'Charley ouvert' },
  { key: 44, name: 'Charley pied' },
  { key: 50, name: 'Tom aigu' },
  { key: 47, name: 'Tom médium' },
  { key: 45, name: 'Tom grave' },
  { key: 43, name: 'Tom basse' },
  { key: 49, name: 'Crash' },
  { key: 57, name: 'Crash 2' },
  { key: 51, name: 'Ride' },
  { key: 53, name: 'Cloche ride' },
  { key: 52, name: 'China' },
  { key: 55, name: 'Splash' },
  { key: 56, name: 'Cloche' },
];

export function FretPicker({ left, top }: { left: number; top: number }) {
  const s = useEditor();
  const autoAdvance = useApp((st) => st.autoAdvance);
  const track = s.song.tracks[s.cursor.track];
  const beat = currentBeat(s);
  const note = currentNote(s);
  const drums = track.kind === 'drums';
  const open = track.tuning[s.cursor.string - 1] + track.capo;
  const duration = beat?.duration ?? s.inputDuration;

  const write = (fret: number) => {
    const { edit } = useApp.getState();
    edit((st) => {
      const next = setFret(st, fret);
      return autoAdvance ? moveRight(next) : next;
    });
  };
  const close = () => useApp.getState().setPicker(false);
  const edit = useApp.getState().edit;

  return (
    <div
      className="fret-picker"
      style={{ left, top }}
      role="dialog"
      aria-label="Choisir une frette"
      onMouseDown={(e) => {
        // Le clic dans le sélecteur ne doit ni déplacer le curseur ni voler le clavier.
        e.stopPropagation();
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
      }}
    >
      <header>
        <strong>
          {drums ? 'Batterie' : `Corde ${s.cursor.string} (${pitchName(track.tuning[s.cursor.string - 1], { octave: false })})`}
        </strong>
        <span className="where">
          mesure {s.cursor.bar + 1} · temps {s.cursor.beat + 1}
        </span>
        <button type="button" className="ghost small" aria-label="Fermer le sélecteur" onClick={close}>
          ✕
        </button>
      </header>

      {drums ? (
        <div className="drum-grid">
          {DRUM_KIT.map((d) => (
            <button key={d.key} type="button" className={beat?.notes.some((n) => n.fret === d.key) ? 'on' : ''} onClick={() => write(d.key)}>
              {d.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="fret-grid">
          {Array.from({ length: 25 }, (_, f) => (
            <button
              key={f}
              type="button"
              className={note && !note.effects.dead && note.fret === f ? 'on' : ''}
              title={`Frette ${f} — ${pitchName(open + f)}`}
              onClick={() => write(f)}
            >
              <span className="fret">{f}</span>
              <span className="pitch">{pitchName(open + f, { octave: false })}</span>
            </button>
          ))}
        </div>
      )}

      <div className="picker-row">
        {!drums && (
          <button type="button" className={note?.effects.dead ? 'on' : ''} onClick={() => edit(toggleDeadNote)} title="Note étouffée (x)">
            ✕ Étouffée
          </button>
        )}
        <button type="button" className={beat && beat.notes.length === 0 ? 'on' : ''} onClick={() => edit(makeRest)} title="Transformer le temps en silence (r)">
          𝄽 Silence
        </button>
        <button type="button" onClick={() => edit(deleteAtCursor)} title="Effacer la note, puis le temps (Suppr)">
          ⌫ Effacer
        </button>
      </div>

      <div className="picker-row durations" aria-label="Durée">
        {DURATION_INFO.filter((d) => d.d <= 32).map((d) => (
          <button
            key={d.d}
            type="button"
            className={duration === d.d ? 'on' : ''}
            title={d.label}
            aria-label={d.label}
            onClick={() => edit((st) => setDuration(st, d.d as Duration))}
          >
            <span className="glyph">{d.glyph}</span>
          </button>
        ))}
        <button type="button" className={beat?.dots ? 'on' : ''} title="Pointée" onClick={() => edit(toggleDot)}>
          ·
        </button>
        <button type="button" className={beat?.tuplet === 3 ? 'on' : ''} title="Triolet" onClick={() => edit((st) => toggleTuplet(st, 3))}>
          3
        </button>
      </div>

      <label className="check compact advance">
        <input type="checkbox" checked={autoAdvance} onChange={(e) => useApp.getState().setPrefs({ autoAdvance: e.target.checked })} />
        Passer au temps suivant après chaque note
      </label>
    </div>
  );
}
