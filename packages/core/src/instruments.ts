import type { InstrumentKind } from './model';

/** Les 128 programmes General MIDI (noms courts, en anglais comme le standard). */
export const GM_PROGRAMS = [
  'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano', 'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet',
  'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
  'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
  'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)', 'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
  'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
  'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
  'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Choir', 'Orchestra Hit',
  'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
  'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
  'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
  'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)', 'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
  'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)', 'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
  'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)', 'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
  'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
  'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
  'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot',
] as const;

export interface InstrumentPreset {
  id: string;
  name: string;
  kind: InstrumentKind;
  program: number;
  tuningId: string;
  /** Transposition d'écriture (instruments transpositeurs), en demi-tons. */
  displayTranspose?: number;
}

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  { id: 'eg-clean', name: 'Guitare électrique (clean)', kind: 'guitar', program: 27, tuningId: 'standard' },
  { id: 'eg-drive', name: 'Guitare électrique (saturée)', kind: 'guitar', program: 29, tuningId: 'standard' },
  { id: 'eg-dist', name: 'Guitare électrique (distorsion)', kind: 'guitar', program: 30, tuningId: 'standard' },
  { id: 'ag-steel', name: 'Guitare folk (acier)', kind: 'guitar', program: 25, tuningId: 'standard' },
  { id: 'ag-nylon', name: 'Guitare classique (nylon)', kind: 'guitar', program: 24, tuningId: 'standard' },
  { id: 'eg-7', name: 'Guitare 7 cordes', kind: 'guitar', program: 30, tuningId: '7-standard' },
  { id: 'eg-8', name: 'Guitare 8 cordes', kind: 'guitar', program: 30, tuningId: '8-standard' },
  { id: 'bass-finger', name: 'Basse (doigts)', kind: 'bass', program: 33, tuningId: 'bass-4' },
  { id: 'bass-pick', name: 'Basse (médiator)', kind: 'bass', program: 34, tuningId: 'bass-4' },
  { id: 'bass-5', name: 'Basse 5 cordes', kind: 'bass', program: 33, tuningId: 'bass-5' },
  { id: 'bass-slap', name: 'Basse slap', kind: 'bass', program: 36, tuningId: 'bass-4' },
  { id: 'drums', name: 'Batterie', kind: 'drums', program: 0, tuningId: 'standard' },
  { id: 'piano', name: 'Piano', kind: 'keys', program: 0, tuningId: 'standard' },
  { id: 'voice', name: 'Voix', kind: 'voice', program: 53, tuningId: 'standard' },
  { id: 'strings', name: 'Cordes (ensemble)', kind: 'strings', program: 48, tuningId: 'standard' },
  { id: 'trumpet', name: 'Trompette en Si♭', kind: 'brass', program: 56, tuningId: 'standard', displayTranspose: 2 },
  { id: 'alto-sax', name: 'Saxophone alto en Mi♭', kind: 'brass', program: 65, tuningId: 'standard', displayTranspose: 9 },
  { id: 'tenor-sax', name: 'Saxophone ténor en Si♭', kind: 'brass', program: 66, tuningId: 'standard', displayTranspose: 14 },
  { id: 'ukulele', name: 'Ukulélé', kind: 'guitar', program: 24, tuningId: 'ukulele', displayTranspose: 0 },
];

/** Couleurs de pistes par défaut (cycle). */
export const TRACK_COLORS = ['#e0663a', '#3a8ee0', '#4caf50', '#b05fd6', '#e0b13a', '#2fb5a8', '#d64f7c', '#7a8a99'];

export function instrumentKindFromProgram(program: number, isPercussion: boolean): InstrumentKind {
  if (isPercussion) return 'drums';
  if (program >= 24 && program <= 31) return 'guitar';
  if (program >= 32 && program <= 39) return 'bass';
  if (program <= 23) return 'keys';
  if (program >= 40 && program <= 51) return 'strings';
  if (program >= 52 && program <= 54) return 'voice';
  if (program >= 56 && program <= 71) return 'brass';
  return 'other';
}
