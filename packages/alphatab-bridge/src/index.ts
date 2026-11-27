/**
 * Passerelle entre le modèle Guitar Lab et alphaTab :
 *  - Song → Score alphaTab (via alphaTex) pour le rendu et la lecture ;
 *  - Score alphaTab → Song pour l'import Guitar Pro 3-8, MusicXML, Capella ;
 *  - Song → fichier .gp (Guitar Pro 7/8) via l'exporteur d'alphaTab.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  createBar,
  createMasterBar,
  FORMAT_VERSION,
  instrumentKindFromProgram,
  songToAlphaTex,
  TRACK_COLORS,
  uid,
  type Bar,
  type Beat,
  type Cursor,
  type Direction,
  type Duration,
  type Dynamic,
  type Finger,
  type MasterBar,
  type Note,
  type NoteEffects,
  type Song,
  type Track,
  type Tuplet,
} from '@guitar-lab/core';

export { alphaTab };

type ATScore = alphaTab.model.Score;
type ATBeat = alphaTab.model.Beat;
type ATNote = alphaTab.model.Note;

export class AlphaTexError extends Error {
  constructor(
    message: string,
    readonly diagnostics: string[],
    readonly tex: string,
  ) {
    super(message);
  }
}

/** Convertit le modèle Guitar Lab en Score alphaTab prêt à dessiner. */
export function toAlphaTabScore(song: Song, settings: alphaTab.Settings = new alphaTab.Settings()): ATScore {
  const tex = songToAlphaTex(song);
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.logErrors = false;
  importer.initFromString(tex, settings);
  try {
    return importer.readScore();
  } catch (e) {
    const diags: string[] = [];
    for (const bag of [importer.lexerDiagnostics, importer.parserDiagnostics, importer.semanticDiagnostics])
      for (const d of bag?.items ?? []) if (d.severity >= 2) diags.push(`${d.start ? `l.${d.start.line}:${d.start.col} ` : ''}${d.message}`);
    throw new AlphaTexError((e as Error).message, diags, tex);
  }
}

/** Retrouve le temps alphaTab correspondant au curseur (après rendu). */
export function findAlphaTabBeat(score: ATScore, c: Cursor): ATBeat | undefined {
  const voice = score.tracks[c.track]?.staves[0]?.bars[c.bar]?.voices[c.voice];
  if (!voice) return undefined;
  return voice.beats[Math.min(c.beat, voice.beats.length - 1)];
}

/** Indices Guitar Lab d'un temps alphaTab (clic dans la partition). */
export function cursorFromAlphaTabBeat(beat: ATBeat): Omit<Cursor, 'string'> {
  return {
    track: beat.voice.bar.staff.track.index,
    bar: beat.voice.bar.index,
    voice: beat.voice.index,
    beat: beat.index,
  };
}

/** Corde Guitar Lab (1 = aiguë) d'une note alphaTab (1 = grave). */
export function stringFromAlphaTabNote(note: ATNote): number {
  return note.beat.voice.bar.staff.tuning.length - note.string + 1;
}

// ------------------------------------------------------------------ import

const DYNAMICS: Dynamic[] = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];
const LEFT: Finger[] = ['T', '1', '2', '3', '4'];
const RIGHT: Finger[] = ['p', 'i', 'm', 'a', 'c'];

function duration(d: number): Duration {
  return (d >= 1 && d <= 64 ? d : 1) as Duration;
}

function colorToHex(c: alphaTab.model.Color | undefined, fallback: string): string {
  if (!c) return fallback;
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function noteEffects(n: ATNote): NoteEffects {
  const fx: NoteEffects = {};
  if (n.isHammerPullOrigin) fx.hammerPull = true;
  const slideOut = ['', 'shift', 'legato', 'out-up', 'out-down'][n.slideOutType] as NoteEffects['slide'] | '';
  const slideIn = ['', 'in-below', 'in-above'][n.slideInType] as NoteEffects['slide'] | '';
  if (slideOut) fx.slide = slideOut;
  else if (slideIn) fx.slide = slideIn;
  if (n.hasBend && n.bendPoints && n.bendPoints.length) {
    const max = Math.max(...n.bendPoints.map((p) => p.value));
    const first = n.bendPoints[0].value;
    const last = n.bendPoints[n.bendPoints.length - 1].value;
    const type =
      first > 0 ? (last < first ? 'pre-bend-release' : 'pre-bend')
      : last < max ? 'bend-release'
      : 'bend';
    fx.bend = { type, semitones: max / 2 };
  }
  if (n.vibrato) fx.vibrato = n.vibrato === 2 ? 'wide' : 'slight';
  if (n.isDead) fx.dead = true;
  if (n.isPalmMute) fx.palmMute = true;
  if (n.isLetRing) fx.letRing = true;
  const harm = ['', 'natural', 'artificial', 'pinch', 'tap', 'semi'][n.harmonicType] as NoteEffects['harmonic'] | '';
  if (harm) fx.harmonic = harm;
  if (n.isGhost) fx.ghost = true;
  if (n.accentuated) fx.accent = n.accentuated === 2 ? 'heavy' : 'normal';
  if (n.isStaccato) fx.staccato = true;
  if (n.leftHandFinger >= 0 && LEFT[n.leftHandFinger]) fx.leftFinger = LEFT[n.leftHandFinger];
  if (n.rightHandFinger >= 0 && RIGHT[n.rightHandFinger]) fx.rightFinger = RIGHT[n.rightHandFinger];
  if (n.beat.tap) fx.tap = true;
  if (n.beat.slap) fx.slap = true;
  if (n.beat.pop) fx.pop = true;
  return fx;
}

function convertBeat(b: ATBeat, staff: alphaTab.model.Staff, prevDynamic: number): Beat {
  const beat: Beat = { id: uid('b'), duration: duration(b.duration), dots: Math.min(2, b.dots) as 0 | 1 | 2, notes: [], effects: {} };
  if (b.hasTuplet && b.tupletNumerator > 1) beat.tuplet = b.tupletNumerator as Tuplet;
  const e = beat.effects;
  if (b.pickStroke) e.pickStroke = b.pickStroke === 1 ? 'up' : 'down';
  const brush = ['', 'up', 'down', 'arpeggio-up', 'arpeggio-down'][b.brushType] as typeof e.brush | '';
  if (brush) e.brush = brush;
  if (b.tremoloSpeed) e.tremoloPicking = b.tremoloSpeed as 8 | 16 | 32;
  if (b.dynamics !== prevDynamic && DYNAMICS[b.dynamics]) e.dynamic = DYNAMICS[b.dynamics];
  if (b.crescendo) e.crescendo = b.crescendo === 1 ? 'crescendo' : 'decrescendo';
  if (b.text) e.text = b.text;
  if (b.chordId && staff.chords?.has(b.chordId)) e.chord = staff.chords.get(b.chordId)!.name;
  if (b.graceType === 1) e.graceNote = 'on-beat';
  else if (b.graceType) e.graceNote = 'before';
  if (b.fadeIn) e.fadeIn = true;
  if (b.lyrics?.length) e.lyrics = [...b.lyrics];
  if (b.hasWhammyBar && b.whammyBarPoints?.length) {
    const vals = b.whammyBarPoints.map((p) => p.value);
    const extreme = vals.reduce((a, v) => (Math.abs(v) > Math.abs(a) ? v : a), 0);
    e.whammy = { type: vals[vals.length - 1] === 0 && vals[0] === 0 ? 'dip' : vals[0] !== 0 ? 'hold' : 'dive', semitones: extreme / 2 };
  }
  if (!b.isRest) {
    const stringCount = staff.tuning.length;
    for (const n of b.notes) {
      let note: Note;
      if (staff.isPercussion) {
        const art = staff.track.percussionArticulations[n.percussionArticulation];
        note = { string: 1, fret: art?.outputMidiNumber ?? n.percussionArticulation, effects: {} };
      } else {
        if (n.string < 1 || n.fret < 0) continue;
        note = { string: stringCount - n.string + 1, fret: n.fret, effects: noteEffects(n) };
      }
      if (n.isTieDestination) {
        note.tie = true;
        note.fret = n.tieOrigin?.fret ?? note.fret;
      }
      beat.notes.push(note);
    }
    beat.notes.sort((a, z) => a.string - z.string);
  }
  return beat;
}

/** Valeurs de `alphaTab.model.Direction` → repères Guitar Lab (les doubles codas sont ignorées). */
const DIRECTION_FROM_AT: Record<number, Direction> = {
  0: 'fine', 1: 'segno', 3: 'coda',
  5: 'da-capo', 6: 'da-capo-al-coda', 8: 'da-capo-al-fine',
  9: 'dal-segno', 10: 'dal-segno-al-coda', 12: 'dal-segno-al-fine',
  17: 'to-coda',
};

function convertMasterBar(mb: alphaTab.model.MasterBar): MasterBar {
  const out = createMasterBar();
  out.timeSignature = [mb.timeSignatureNumerator, mb.timeSignatureDenominator];
  const bar0 = mb.score.tracks[0]?.staves[0]?.bars[mb.index] as unknown as { keySignature?: number; keySignatureType?: number } | undefined;
  const ks = (mb as unknown as { keySignature?: number }).keySignature ?? bar0?.keySignature ?? 0;
  const kt = (mb as unknown as { keySignatureType?: number }).keySignatureType ?? bar0?.keySignatureType ?? 0;
  out.keySignature = Math.max(-7, Math.min(7, Number(ks) || 0));
  out.keyMode = kt === 1 ? 'minor' : 'major';
  if (mb.isRepeatStart || mb.repeatCount > 0 || mb.alternateEndings) {
    out.repeat = {};
    if (mb.isRepeatStart) out.repeat.start = true;
    if (mb.repeatCount > 0) out.repeat.endCount = mb.repeatCount;
    if (mb.alternateEndings) {
      const endings: number[] = [];
      for (let i = 0; i < 16; i++) if (mb.alternateEndings & (1 << i)) endings.push(i + 1);
      out.repeat.alternateEndings = endings;
    }
  }
  if (mb.section) out.section = { marker: mb.section.marker ?? '', text: mb.section.text ?? '' };
  const tempo = mb.tempoAutomations?.[0]?.value;
  if (tempo && mb.index > 0) out.tempo = Math.round(tempo);
  if (mb.tripletFeel === 1) out.tripletFeel = 'eighth';
  else if (mb.tripletFeel === 2) out.tripletFeel = 'sixteenth';
  if (mb.isAnacrusis) out.anacrusis = true;
  const dirs = [...(mb.directions ?? [])].map((d) => DIRECTION_FROM_AT[d as number]).filter(Boolean);
  if (dirs.length) out.directions = dirs;
  return out;
}

/**
 * Les fichiers Guitar Pro stockent un volume par note : les accents y font alterner
 * fff / f d'une note à l'autre, ce qui couvrirait la partition de nuances. On ne garde
 * une nuance que si elle change vraiment et dure au moins deux notes.
 */
function stabilizeDynamics(seqs: Array<Array<{ beat: Beat; dyn: number }>>) {
  for (const seq of seqs) {
    if (!seq) continue;
    let current = 5; // f, la nuance par défaut d'alphaTab
    seq.forEach(({ beat, dyn }, i) => {
      delete beat.effects.dynamic;
      const lasting = i === seq.length - 1 || seq[i + 1].dyn === dyn;
      if (dyn !== current && lasting && DYNAMICS[dyn]) {
        beat.effects.dynamic = DYNAMICS[dyn];
        current = dyn;
      }
    });
  }
}

/** Convertit un Score alphaTab (issu d'un fichier GP, MusicXML…) en Song. */
export function fromAlphaTabScore(score: ATScore): Song {
  const masterBars = score.masterBars.map(convertMasterBar);
  const tracks: Track[] = score.tracks.map((t, ti) => {
    const staff = t.staves[0];
    const isPerc = staff.isPercussion;
    const pi = t.playbackInfo;
    // Nuance de chaque temps, par voix, pour ne garder que les vrais changements (voir plus bas).
    const dynSeq: Array<Array<{ beat: Beat; dyn: number }>> = [];
    const bars: Bar[] = staff.bars.map((bar) => {
      let prevDyn = 5;
      return {
        voices: bar.voices
          .filter((v, vi) => vi === 0 || !v.isEmpty)
          .slice(0, 4)
          .map((v, vi) => ({
            beats: v.beats.map((b) => {
              const beat = convertBeat(b, staff, prevDyn);
              prevDyn = b.dynamics;
              if (!b.isRest) (dynSeq[vi] ??= []).push({ beat, dyn: b.dynamics });
              return beat;
            }),
          })),
      };
    });
    stabilizeDynamics(dynSeq);
    while (bars.length < masterBars.length) bars.push(createBar());
    const chords = staff.chords
      ? [...staff.chords.values()].map((c) => ({
          name: c.name,
          frets: [...c.strings],
          firstFret: c.firstFret,
        }))
      : [];
    return {
      id: uid('t'),
      name: t.name || `Piste ${ti + 1}`,
      shortName: t.shortName || undefined,
      color: colorToHex(t.color, TRACK_COLORS[ti % TRACK_COLORS.length]),
      kind: instrumentKindFromProgram(pi.program, isPerc),
      program: pi.program,
      channel: isPerc ? 10 : pi.primaryChannel + 1,
      tuning: isPerc ? [64, 59, 55, 50, 45, 40] : [...staff.tuning],
      capo: staff.capo,
      displayTranspose: -(staff.displayTranspositionPitch ?? 0),
      volume: Math.min(1, pi.volume / 16),
      pan: (pi.balance - 8) / 8,
      mute: pi.isMute,
      solo: pi.isSolo,
      showTablature: !isPerc && staff.showTablature,
      showStandard: staff.showStandardNotation || isPerc,
      chords,
      bars,
    } satisfies Track;
  });
  return {
    formatVersion: FORMAT_VERSION,
    meta: {
      title: score.title || 'Sans titre',
      subtitle: score.subTitle || undefined,
      artist: score.artist || '',
      album: score.album || undefined,
      words: score.words || undefined,
      music: score.music || undefined,
      tab: score.tab || undefined,
      copyright: score.copyright || undefined,
      notes: score.notices || undefined,
    },
    tempo: Math.round(score.tempo) || 120,
    masterBars,
    tracks,
  };
}

/** Import d'un fichier binaire ou texte reconnu par alphaTab (GP3-8, MusicXML, CAP). */
export function importScoreFile(bytes: Uint8Array, settings: alphaTab.Settings = new alphaTab.Settings()): Song {
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, settings);
  return fromAlphaTabScore(score);
}

/** Export Guitar Pro 7/8 (.gp). */
export function exportGp(song: Song, settings: alphaTab.Settings = new alphaTab.Settings()): Uint8Array {
  const score = toAlphaTabScore(song, settings);
  return new alphaTab.exporter.Gp7Exporter().export(score, settings);
}

export const SUPPORTED_IMPORT_EXTENSIONS = ['gp3', 'gp4', 'gp5', 'gpx', 'gp', 'musicxml', 'xml', 'mxl', 'cap'];
