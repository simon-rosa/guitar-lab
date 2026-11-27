import { ALL_TUNINGS } from './pitch';
import { INSTRUMENT_PRESETS, TRACK_COLORS } from './instruments';
import {
  FORMAT_VERSION,
  type Bar,
  type Beat,
  type Duration,
  type MasterBar,
  type Note,
  type Song,
  type Track,
} from './model';

let counter = 0;
/** Identifiant court, unique dans la session (suffisant pour un document local). */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createBeat(duration: Duration = 4, notes: Note[] = []): Beat {
  return { id: uid('b'), duration, dots: 0, notes, effects: {} };
}

export function createRestBeat(duration: Duration = 4): Beat {
  return createBeat(duration, []);
}

export function createNote(string: number, fret: number): Note {
  return { string, fret, effects: {} };
}

export function createBar(): Bar {
  return { voices: [{ beats: [] }] };
}

export function createMasterBar(from?: MasterBar): MasterBar {
  return {
    timeSignature: from ? [...from.timeSignature] as [number, number] : [4, 4],
    keySignature: from?.keySignature ?? 0,
    keyMode: from?.keyMode ?? 'major',
  };
}

/** Canaux 1-16 en sautant le 10 (réservé à la batterie). */
function melodicChannel(index: number): number {
  const ch = (index % 15) + 1;
  return ch >= 10 ? ch + 1 : ch;
}

export interface TrackOptions {
  name?: string;
  presetId?: string;
  tuning?: number[];
  index?: number;
}

export function createTrack(barCount: number, opts: TrackOptions = {}): Track {
  const preset = INSTRUMENT_PRESETS.find((p) => p.id === (opts.presetId ?? 'eg-clean')) ?? INSTRUMENT_PRESETS[0];
  const tuning = opts.tuning ?? ALL_TUNINGS.find((t) => t.id === preset.tuningId)!.pitches;
  const isDrums = preset.kind === 'drums';
  return {
    id: uid('t'),
    name: opts.name ?? preset.name,
    color: TRACK_COLORS[(opts.index ?? 0) % TRACK_COLORS.length],
    kind: preset.kind,
    program: preset.program,
    channel: isDrums ? 10 : melodicChannel(opts.index ?? 0),
    tuning: [...tuning],
    capo: 0,
    // Guitare et basse s'écrivent une octave au-dessus du son réel.
    displayTranspose: preset.displayTranspose ?? (preset.kind === 'guitar' || preset.kind === 'bass' ? 12 : 0),
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    showTablature: preset.kind === 'guitar' || preset.kind === 'bass',
    showStandard: true,
    chords: [],
    bars: Array.from({ length: barCount }, createBar),
  };
}

export function createSong(opts: { title?: string; artist?: string; bars?: number; tempo?: number } = {}): Song {
  const bars = opts.bars ?? 4;
  return {
    formatVersion: FORMAT_VERSION,
    meta: { title: opts.title ?? 'Nouveau morceau', artist: opts.artist ?? '' },
    tempo: opts.tempo ?? 120,
    masterBars: Array.from({ length: bars }, () => createMasterBar()),
    tracks: [createTrack(bars, { name: 'Guitare', index: 0 })],
  };
}

/** Copie profonde avec de nouveaux identifiants de temps (pour coller). */
export function cloneBeatsWithNewIds(beats: Beat[]): Beat[] {
  return beats.map((b) => ({ ...structuredClone(b), id: uid('b') }));
}
