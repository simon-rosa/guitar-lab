/** Hauteurs, noms de notes et accordages prédéfinis. */

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FR_NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

/** 'E2' → 40, 'C#4' → 61, 'Bb3' → 58. Octave scientifique (C4 = 60). */
export function parsePitch(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Hauteur invalide : ${name}`);
  const base = SHARP_NAMES.indexOf(m[1].toUpperCase());
  const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + alt;
}

export function pitchName(midi: number, opts: { flats?: boolean; octave?: boolean; french?: boolean } = {}): string {
  const names = opts.french ? FR_NAMES : opts.flats ? FLAT_NAMES : SHARP_NAMES;
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return names[pc] + (opts.octave === false ? '' : String(octave));
}

export interface TuningPreset {
  id: string;
  name: string;
  /** Corde 1 (aiguë) → corde N (grave). */
  pitches: number[];
}

const t = (id: string, name: string, notes: string): TuningPreset => ({
  id,
  name,
  pitches: notes.split(' ').map(parsePitch),
});

export const GUITAR_TUNINGS: TuningPreset[] = [
  t('standard', 'Standard (EADGBE)', 'E4 B3 G3 D3 A2 E2'),
  t('half-down', 'Demi-ton en dessous (Eb)', 'Eb4 Bb3 Gb3 Db3 Ab2 Eb2'),
  t('full-down', 'Un ton en dessous (D)', 'D4 A3 F3 C3 G2 D2'),
  t('drop-d', 'Drop D', 'E4 B3 G3 D3 A2 D2'),
  t('drop-c#', 'Drop C#', 'Eb4 Bb3 Gb3 Db3 Ab2 Db2'),
  t('drop-c', 'Drop C', 'D4 A3 F3 C3 G2 C2'),
  t('drop-b', 'Drop B', 'C#4 G#3 E3 B2 F#2 B1'),
  t('open-g', 'Open G', 'D4 B3 G3 D3 G2 D2'),
  t('open-d', 'Open D', 'D4 A3 F#3 D3 A2 D2'),
  t('open-e', 'Open E', 'E4 B3 G#3 E3 B2 E2'),
  t('open-c', 'Open C', 'E4 C4 G3 C3 G2 C2'),
  t('dadgad', 'DADGAD', 'D4 A3 G3 D3 A2 D2'),
  t('7-standard', '7 cordes standard (B)', 'E4 B3 G3 D3 A2 E2 B1'),
  t('7-drop-a', '7 cordes Drop A', 'E4 B3 G3 D3 A2 E2 A1'),
  t('8-standard', '8 cordes standard (F#)', 'E4 B3 G3 D3 A2 E2 B1 F#1'),
  t('9-standard', '9 cordes standard (C#)', 'E4 B3 G3 D3 A2 E2 B1 F#1 C#1'),
  t('12-nashville', 'Nashville (octaves hautes)', 'E4 B3 G4 D4 A3 E3'),
];

export const BASS_TUNINGS: TuningPreset[] = [
  t('bass-4', 'Basse 4 cordes (EADG)', 'G2 D2 A1 E1'),
  t('bass-4-drop-d', 'Basse 4 Drop D', 'G2 D2 A1 D1'),
  t('bass-5', 'Basse 5 cordes (BEADG)', 'G2 D2 A1 E1 B0'),
  t('bass-6', 'Basse 6 cordes (BEADGC)', 'C3 G2 D2 A1 E1 B0'),
];

export const OTHER_TUNINGS: TuningPreset[] = [
  t('ukulele', 'Ukulélé (GCEA)', 'A4 E4 C4 G4'),
  t('mandolin', 'Mandoline (GDAE)', 'E5 A4 D4 G3'),
  t('banjo', 'Banjo 5 cordes (open G)', 'D4 B3 G3 D3 G4'),
  t('violin', 'Violon', 'E5 A4 D4 G3'),
];

export const ALL_TUNINGS = [...GUITAR_TUNINGS, ...BASS_TUNINGS, ...OTHER_TUNINGS];

export function findTuningPreset(pitches: number[]): TuningPreset | undefined {
  return ALL_TUNINGS.find((p) => p.pitches.length === pitches.length && p.pitches.every((v, i) => v === pitches[i]));
}

export function tuningLabel(pitches: number[]): string {
  return findTuningPreset(pitches)?.name ?? pitches.map((p) => pitchName(p, { octave: false })).reverse().join(' ');
}

/** Hauteur MIDI sonnante d'une note. */
export function notePitch(tuning: number[], capo: number, string: number, fret: number): number {
  return tuning[string - 1] + capo + fret;
}
