/**
 * Manche virtuel : montre les notes sous le curseur (ou en cours de lecture)
 * et sert à la saisie à la souris — un clic écrit la frette sur la corde.
 */
import { pitchName, setCursor, setFret } from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';

const FRETS = 24;
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

export function Fretboard() {
  const s = useEditor();
  const playing = useApp((st) => st.player.playing);
  const playingBeat = useApp((st) => st.player.playingBeat);
  const track = s.song.tracks[s.cursor.track];
  if (track.kind === 'drums') return <div className="fretboard empty">Piste de batterie : saisissez la touche General MIDI au clavier (36 = grosse caisse, 38 = caisse claire, 42 = charleston).</div>;

  const ref = playing && playingBeat && playingBeat.track === s.cursor.track ? playingBeat : s.cursor;
  const beat = track.bars[ref.bar]?.voices[ref.voice]?.beats[ref.beat];
  const notes = beat?.notes ?? [];
  const strings = track.tuning.length;
  const width = 1000;
  const nut = 44;
  // Espacement des frettes proche d'une vraie guitare (règle des 17,817).
  const fretX = (n: number) => nut + (width - nut - 10) * (1 - Math.pow(2, -n / 12)) / (1 - Math.pow(2, -FRETS / 12));
  const rowH = 18;
  const height = strings * rowH + 26;
  const y = (str: number) => 12 + (str - 1) * rowH + rowH / 2;

  const click = (string: number, fret: number) => {
    const { edit } = useApp.getState();
    edit((st) => setFret(setCursor(st, { string }), fret));
  };

  return (
    <div className="fretboard" aria-label="Manche virtuel">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Notes sur le manche">
        <rect x={nut} y={12} width={width - nut - 10} height={strings * rowH} className="fb-wood" rx={3} />
        {INLAYS.map((f) => (
          <circle key={f} cx={(fretX(f - 1) + fretX(f)) / 2} cy={12 + (strings * rowH) / 2} r={5} className="fb-inlay" />
        ))}
        {[12, 24].map((f) => (
          <g key={f}>
            <circle cx={(fretX(f - 1) + fretX(f)) / 2} cy={12 + (strings * rowH) / 3} r={5} className="fb-inlay" />
            <circle cx={(fretX(f - 1) + fretX(f)) / 2} cy={12 + (2 * strings * rowH) / 3} r={5} className="fb-inlay" />
          </g>
        ))}
        {Array.from({ length: FRETS + 1 }, (_, f) => (
          <line key={f} x1={fretX(f)} x2={fretX(f)} y1={12} y2={12 + strings * rowH} className={f === 0 ? 'fb-nut' : 'fb-fret'} />
        ))}
        {track.tuning.map((p, i) => (
          <g key={i}>
            <line x1={nut} x2={width - 10} y1={y(i + 1)} y2={y(i + 1)} className={`fb-string${s.cursor.string === i + 1 ? ' current' : ''}`} strokeWidth={1 + i * 0.25} />
            <text x={nut - 10} y={y(i + 1) + 4} textAnchor="end" className="fb-label">{pitchName(p, { octave: false })}</text>
          </g>
        ))}
        {Array.from({ length: FRETS + 1 }, (_, f) =>
          f > 0 && f % 2 === 1 ? null : (
            <text key={f} x={f === 0 ? nut - 2 : (fretX(f - 1) + fretX(f)) / 2} y={height - 2} textAnchor="middle" className="fb-number">{f || ''}</text>
          ),
        )}
        {/* Zones cliquables */}
        {track.tuning.map((_, si) =>
          Array.from({ length: FRETS + 1 }, (_, f) => {
            const x0 = f === 0 ? nut - 26 : fretX(f - 1);
            const x1 = f === 0 ? nut : fretX(f);
            return (
              <rect
                key={`${si}-${f}`}
                x={x0}
                y={y(si + 1) - rowH / 2}
                width={x1 - x0}
                height={rowH}
                className="fb-hit"
                onClick={() => click(si + 1, f)}
              >
                <title>{`Corde ${si + 1}, frette ${f} (${pitchName(track.tuning[si] + track.capo + f)})`}</title>
              </rect>
            );
          }),
        )}
        {track.capo > 0 && <rect x={fretX(track.capo) - 6} y={8} width={8} height={strings * rowH + 8} rx={3} className="fb-capo" />}
        {notes.map((n) => {
          const f = n.fret + track.capo;
          const cx = f === 0 ? nut - 14 : (fretX(f - 1) + fretX(f)) / 2;
          return (
            <g key={n.string} pointerEvents="none">
              <circle cx={cx} cy={y(n.string)} r={8} className={`fb-note${n.string === s.cursor.string && !playing ? ' current' : ''}`} />
              <text x={cx} y={y(n.string) + 4} textAnchor="middle" className="fb-note-label">{n.effects.dead ? '×' : n.fret}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
