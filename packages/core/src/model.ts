/**
 * Modèle de données de Guitar Lab.
 *
 * Hiérarchie : Song → Track → Bar → Voice → Beat → Note (+ effets).
 * Les propriétés communes à toutes les pistes pour une mesure donnée
 * (signature, armure, tempo, reprises, sections) vivent dans `MasterBar`.
 *
 * Conventions :
 *  - les cordes sont numérotées comme en tablature : 1 = corde la plus aiguë ;
 *  - `tuning` liste les hauteurs MIDI à vide de la corde 1 à la corde N ;
 *  - une note jouée = MIDI(tuning[string-1]) + capo + fret.
 */

export const FORMAT_VERSION = 1;

/** Valeur rythmique : 1 = ronde, 2 = blanche, 4 = noire … 64 = quadruple croche. */
export type Duration = 1 | 2 | 4 | 8 | 16 | 32 | 64;
export const DURATIONS: Duration[] = [1, 2, 4, 8, 16, 32, 64];

/** n-olets supportés : nombre de notes jouées « dans le temps » de 2 (ou 4 / 8). */
export type Tuplet = 3 | 5 | 6 | 7 | 9 | 10 | 11 | 12;

export type SlideType =
  | 'shift' // slide entre deux notes, seconde note rejouée
  | 'legato' // slide lié, seconde note non rejouée
  | 'in-below'
  | 'in-above'
  | 'out-down'
  | 'out-up';

export type HarmonicType = 'natural' | 'artificial' | 'pinch' | 'tap' | 'semi';
export type VibratoType = 'slight' | 'wide';
export type BendType = 'bend' | 'release' | 'bend-release' | 'pre-bend' | 'pre-bend-release';
export type Dynamic = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff';
export type PickStroke = 'up' | 'down';
export type Finger = 'p' | 'i' | 'm' | 'a' | 'c' | 'T' | '1' | '2' | '3' | '4';

export interface Bend {
  type: BendType;
  /** Amplitude en demi-tons (0.5 = ¼ de ton, 1 = ½ ton, 2 = 1 ton, 3 = 1½ ton). */
  semitones: number;
}

export interface NoteEffects {
  hammerPull?: boolean;
  slide?: SlideType;
  bend?: Bend;
  vibrato?: VibratoType;
  dead?: boolean;
  palmMute?: boolean;
  letRing?: boolean;
  harmonic?: HarmonicType;
  ghost?: boolean;
  accent?: 'normal' | 'heavy';
  staccato?: boolean;
  /** Tapping main droite. */
  tap?: boolean;
  /** Note fantôme slap/pop (basse). */
  slap?: boolean;
  pop?: boolean;
  leftFinger?: Finger;
  rightFinger?: Finger;
}

export interface Note {
  /** 1 = corde la plus aiguë. */
  string: number;
  fret: number;
  /** Liaison de prolongation depuis la note précédente sur la même corde. */
  tie?: boolean;
  effects: NoteEffects;
}

export interface BeatEffects {
  pickStroke?: PickStroke;
  /** Arpège / rasgueado. */
  brush?: 'up' | 'down' | 'arpeggio-up' | 'arpeggio-down';
  tremoloPicking?: 8 | 16 | 32;
  whammy?: { type: 'dive' | 'dip' | 'hold'; semitones: number };
  graceNote?: 'before' | 'on-beat';
  dynamic?: Dynamic;
  crescendo?: 'crescendo' | 'decrescendo';
  text?: string;
  /** Nom d'un accord défini dans `Track.chords`. */
  chord?: string;
  lyrics?: string[];
  fadeIn?: boolean;
}

export interface Beat {
  id: string;
  duration: Duration;
  dots: 0 | 1 | 2;
  tuplet?: Tuplet;
  /** Un temps sans note est un silence. */
  notes: Note[];
  effects: BeatEffects;
}

export interface Voice {
  beats: Beat[];
}

export interface Bar {
  /** Jusqu'à 4 voix ; la voix 0 est toujours présente. */
  voices: Voice[];
}

export interface Repeat {
  start?: boolean;
  /** Nombre total de passages si la mesure ferme une reprise. */
  endCount?: number;
  /** Numéros de passage (1re fois, 2e fois…) pour les fins alternatives. */
  alternateEndings?: number[];
}

export type Direction = 'segno' | 'coda' | 'fine' | 'da-capo' | 'dal-segno' | 'to-coda' | 'da-capo-al-fine' | 'dal-segno-al-coda';

export interface MasterBar {
  timeSignature: [number, number];
  /** Armure : -7 (7 bémols) … +7 (7 dièses). */
  keySignature: number;
  keyMode?: 'major' | 'minor';
  /** Changement de tempo au début de la mesure (BPM). */
  tempo?: number;
  repeat?: Repeat;
  section?: { marker: string; text: string };
  directions?: Direction[];
  tripletFeel?: 'none' | 'eighth' | 'sixteenth';
  /** Anacrouse : la mesure peut être incomplète sans avertissement. */
  anacrusis?: boolean;
}

export type InstrumentKind = 'guitar' | 'bass' | 'drums' | 'keys' | 'voice' | 'strings' | 'brass' | 'other';

export interface ChordDiagram {
  name: string;
  /** Frette par corde (1 = aiguë), -1 = corde non jouée. */
  frets: number[];
  firstFret: number;
  barre?: { fret: number; fromString: number; toString: number };
}

export interface Track {
  id: string;
  name: string;
  shortName?: string;
  color: string;
  kind: InstrumentKind;
  /** Programme General MIDI (0-127). */
  program: number;
  /** Canal MIDI 1-16 (10 = batterie). */
  channel: number;
  /** Hauteurs MIDI à vide, corde 1 (aiguë) → corde N (grave). */
  tuning: number[];
  tuningName?: string;
  capo: number;
  /** Transposition d'affichage pour les instruments transpositeurs (demi-tons). */
  displayTranspose: number;
  volume: number; // 0..1
  pan: number; // -1..1
  mute: boolean;
  solo: boolean;
  showTablature: boolean;
  showStandard: boolean;
  chords: ChordDiagram[];
  bars: Bar[];
}

export interface SongMeta {
  title: string;
  subtitle?: string;
  artist: string;
  album?: string;
  words?: string;
  music?: string;
  /** Transcripteur. */
  tab?: string;
  copyright?: string;
  notes?: string;
}

export interface Song {
  formatVersion: number;
  meta: SongMeta;
  /** Tempo initial (BPM). */
  tempo: number;
  masterBars: MasterBar[];
  tracks: Track[];
}
