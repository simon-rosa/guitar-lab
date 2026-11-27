/**
 * Bibliothèque d'accords : choisir la fondamentale, le type, puis cliquer un
 * doigté pour poser l'accord entier sur le temps du curseur. La fenêtre reste
 * ouverte et le curseur avance : on écrit une grille d'accords d'affilée.
 */
import { useMemo, useState } from 'react';
import {
  applyChord,
  CHORD_QUALITIES,
  CHORD_ROOTS,
  chordName,
  currentBeat,
  findVoicings,
  moveRightFree,
  setDuration,
  voicingLabel,
  type ChordRoot,
  type ChordVoicing,
  type Duration,
} from '@guitar-lab/core';
import { getEditor, useApp, useEditor } from '../app/store';
import { player } from '../audio/player';
import { DURATION_INFO } from './durations';
import { Modal } from './Modal';

const ROOT_LABELS: Record<ChordRoot, string> = {
  C: 'Do · C', 'C#': 'Do♯ · C♯', D: 'Ré · D', Eb: 'Mi♭ · E♭', E: 'Mi · E', F: 'Fa · F',
  'F#': 'Fa♯ · F♯', G: 'Sol · G', Ab: 'La♭ · A♭', A: 'La · A', Bb: 'Si♭ · B♭', B: 'Si · B',
};

/** Retrouve fondamentale et type depuis un nom (« F#m7 ») pour rouvrir sur l'accord courant. */
function parseName(name: string | undefined): { root: ChordRoot; quality: string } | null {
  if (!name) return null;
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(name);
  if (!m) return null;
  const alias: Record<string, ChordRoot> = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
  const root = (alias[m[1]] ?? m[1]) as ChordRoot;
  const q = CHORD_QUALITIES.find((x) => x.suffix === m[2]);
  return CHORD_ROOTS.includes(root) && q ? { root, quality: q.id } : null;
}

function Diagram({ v, strings }: { v: ChordVoicing; strings: number }) {
  // Cordes de gauche (grave) à droite (aiguë), 5 cases.
  const frets = [...v.frets].reverse();
  const rows = 5;
  const w = 28 + (strings - 1) * 16 + 14;
  const h = 26 + rows * 18 + 6;
  const x0 = 28;
  const y0 = 22;
  const dx = 16;
  const dy = 18;
  const start = v.baseFret <= 2 && v.frets.every((f) => f <= 5) ? 1 : v.baseFret;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {start === 1 ? (
        <rect x={x0 - 1} y={y0 - 3} width={(strings - 1) * dx + 2} height={4} fill="currentColor" />
      ) : (
        <text x={x0 - 10} y={y0 + dy * 0.7} fontSize="10" textAnchor="end" fill="currentColor">{start}</text>
      )}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line key={`f${r}`} x1={x0} x2={x0 + (strings - 1) * dx} y1={y0 + r * dy} y2={y0 + r * dy} stroke="currentColor" strokeOpacity={0.45} />
      ))}
      {Array.from({ length: strings }, (_, s) => (
        <line key={`s${s}`} x1={x0 + s * dx} x2={x0 + s * dx} y1={y0} y2={y0 + rows * dy} stroke="currentColor" strokeOpacity={0.7} />
      ))}
      {frets.map((f, s) => {
        const x = x0 + s * dx;
        if (f < 0) return <text key={s} x={x} y={y0 - 8} fontSize="11" textAnchor="middle" fill="currentColor" opacity={0.7}>×</text>;
        if (f === 0) return <circle key={s} cx={x} cy={y0 - 11} r={4} fill="none" stroke="currentColor" />;
        const row = f - start;
        return <circle key={s} cx={x} cy={y0 + row * dy + dy / 2} r={6} className="dot" />;
      })}
    </svg>
  );
}

export function ChordDialog() {
  const s = useEditor();
  const track = s.song.tracks[s.cursor.track];
  const initial = parseName(currentBeat(s)?.effects.chord);
  const [root, setRoot] = useState<ChordRoot>(initial?.root ?? 'C');
  const [qualityId, setQualityId] = useState(initial?.quality ?? 'maj');
  const [showName, setShowName] = useState(true);
  const [advance, setAdvance] = useState(true);
  const [duration, setDur] = useState<Duration>(currentBeat(s)?.duration ?? s.inputDuration);
  const [last, setLast] = useState<string | null>(null);
  const quality = CHORD_QUALITIES.find((q) => q.id === qualityId)!;
  const name = chordName(root, quality);
  const voicings = useMemo(() => findVoicings(track.tuning, root, quality, track.capo), [track.tuning, track.capo, root, quality]);

  const insert = (v: ChordVoicing) => {
    const { edit } = useApp.getState();
    const before = getEditor().cursor;
    edit((st) => setDuration(applyChord(st, v.frets, showName ? name : undefined), duration));
    player.auditionBeat({ ...getEditor().cursor });
    setLast(`${name} posé en mesure ${before.bar + 1}, temps ${before.beat + 1}.`);
    if (advance) edit((st) => moveRightFree(st));
  };

  return (
    <Modal
      title="Insérer un accord"
      wide
      footer={
        <>
          <span className="chord-status" aria-live="polite">{last ?? 'Clique un doigté pour le poser au curseur.'}</span>
          <button type="button" className="primary" onClick={() => useApp.getState().openDialog(null)}>Terminé</button>
        </>
      }
    >
      <div className="chord-roots" role="radiogroup" aria-label="Fondamentale">
        {CHORD_ROOTS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={root === r} className={`pill${root === r ? ' on' : ''}`} onClick={() => setRoot(r)}>
            {ROOT_LABELS[r]}
          </button>
        ))}
      </div>
      <div className="chord-qualities" role="radiogroup" aria-label="Type d’accord">
        {CHORD_QUALITIES.map((q) => (
          <button key={q.id} type="button" role="radio" aria-checked={qualityId === q.id} className={`pill${qualityId === q.id ? ' on' : ''}`} onClick={() => setQualityId(q.id)}>
            {q.label}
          </button>
        ))}
      </div>
      <h3 className="chord-title">
        {name}
        <span className="chord-sub">
          {track.tuningName ?? `${track.tuning.length} cordes`}
          {track.capo ? ` · capo ${track.capo}` : ''}
        </span>
      </h3>
      {voicings.length === 0 ? (
        <p className="muted">Aucun doigté jouable trouvé pour cet accordage.</p>
      ) : (
        <div className="chord-grid">
          {voicings.map((v, i) => (
            <button key={v.frets.join(',')} type="button" className="chord-card" title={`Poser ${name} (${voicingLabel(v.frets)})`} onClick={() => insert(v)}>
              <Diagram v={v} strings={track.tuning.length} />
              <span className="chord-label">{voicingLabel(v.frets)}</span>
              {i === 0 && <span className="chord-badge">le plus joué</span>}
            </button>
          ))}
        </div>
      )}
      <div className="chord-options">
        <label className="field-inline">
          Durée
          <select value={duration} onChange={(e) => setDur(Number(e.target.value) as Duration)}>
            {DURATION_INFO.filter((d) => d.d <= 16).map((d) => (
              <option key={d.d} value={d.d}>{d.label} ({d.beats})</option>
            ))}
          </select>
        </label>
        <label className="check compact"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> Afficher le nom au-dessus</label>
        <label className="check compact"><input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} /> Avancer après chaque accord</label>
      </div>
    </Modal>
  );
}
