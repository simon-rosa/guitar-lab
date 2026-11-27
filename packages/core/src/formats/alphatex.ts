/**
 * Export vers alphaTex (format texte d'alphaTab, version 1.9).
 * C'est la passerelle de rendu : le modèle Guitar Lab est la source de vérité,
 * alphaTex sert à le faire dessiner et jouer par alphaTab.
 */
import type { Beat, Finger, MasterBar, Note, Song, Track } from '../model';
import { pitchName } from '../pitch';
import { barCapacityTicks, ticksToDurations } from '../timing';

const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const LEFT_FINGER: Record<string, number> = { T: 1, '1': 2, '2': 3, '3': 4, '4': 5 };
const RIGHT_FINGER: Record<string, number> = { p: 1, i: 2, m: 3, a: 4, c: 5 };

const KEY_NAMES_MAJOR: Record<number, string> = {
  [-7]: 'Cb', [-6]: 'Gb', [-5]: 'Db', [-4]: 'Ab', [-3]: 'Eb', [-2]: 'Bb', [-1]: 'F',
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};
const KEY_NAMES_MINOR: Record<number, string> = {
  [-7]: 'Abminor', [-6]: 'Ebminor', [-5]: 'Bbminor', [-4]: 'Fminor', [-3]: 'Cminor', [-2]: 'Gminor', [-1]: 'Dminor',
  0: 'Aminor', 1: 'Eminor', 2: 'Bminor', 3: 'F#minor', 4: 'C#minor', 5: 'G#minor', 6: 'D#minor', 7: 'A#minor',
};

function tuningTex(t: Track): string {
  // alphaTex attend des noms en dièses (E4 B3 …).
  return `(${t.tuning.map((p) => pitchName(p)).join(' ')})`;
}

function noteEffects(n: Note): string[] {
  const e = n.effects;
  const fx: string[] = [];
  if (n.tie) fx.push('-');
  if (e.dead) fx.push('x');
  if (e.hammerPull) fx.push('h');
  switch (e.slide) {
    case 'shift': fx.push('ss'); break;
    case 'legato': fx.push('sl'); break;
    case 'in-below': fx.push('sib'); break;
    case 'in-above': fx.push('sia'); break;
    case 'out-down': fx.push('sod'); break;
    case 'out-up': fx.push('sou'); break;
  }
  if (e.bend) {
    const v = Math.round(e.bend.semitones * 2); // quarts de ton
    const pts =
      e.bend.type === 'bend' ? [0, v]
      : e.bend.type === 'release' ? [v, 0]
      : e.bend.type === 'bend-release' ? [0, v, v, 0]
      : e.bend.type === 'pre-bend' ? [v, v]
      : [v, 0];
    fx.push(`b (${pts.join(' ')})`);
  }
  if (e.vibrato) fx.push(e.vibrato === 'wide' ? 'vw' : 'v');
  if (e.harmonic) fx.push({ natural: 'nh', artificial: 'ah', pinch: 'ph', tap: 'th', semi: 'sh' }[e.harmonic]);
  if (e.palmMute) fx.push('pm');
  if (e.letRing) fx.push('lr');
  if (e.ghost) fx.push('g');
  if (e.accent) fx.push(e.accent === 'heavy' ? 'hac' : 'ac');
  if (e.staccato) fx.push('st');
  if (e.leftFinger && LEFT_FINGER[e.leftFinger]) fx.push(`lf ${LEFT_FINGER[e.leftFinger]}`);
  if (e.rightFinger && RIGHT_FINGER[e.rightFinger]) fx.push(`rf ${RIGHT_FINGER[e.rightFinger]}`);
  return fx;
}

function beatEffects(b: Beat, chordIds: Map<string, string>): string[] {
  const fx: string[] = [];
  const e = b.effects;
  if (b.dots === 1) fx.push('d');
  if (b.dots === 2) fx.push('dd');
  if (b.tuplet) fx.push(`tu ${b.tuplet}`);
  if (e.pickStroke) fx.push(e.pickStroke === 'up' ? 'su' : 'sd');
  if (e.brush) fx.push({ up: 'bu', down: 'bd', 'arpeggio-up': 'au', 'arpeggio-down': 'ad' }[e.brush]);
  if (e.tremoloPicking) fx.push(`tp ${e.tremoloPicking}`);
  if (e.dynamic) fx.push(`dy ${e.dynamic}`);
  if (e.crescendo) fx.push(e.crescendo === 'crescendo' ? 'cre' : 'dec');
  if (e.text) fx.push(`txt ${q(e.text)}`);
  if (e.chord && chordIds.has(e.chord)) fx.push(`ch ${q(e.chord)}`);
  if (e.graceNote) fx.push(e.graceNote === 'on-beat' ? 'gr ob' : 'gr');
  if (e.fadeIn) fx.push('f');
  if (e.whammy) {
    const v = Math.round(e.whammy.semitones * 2);
    fx.push(`tb (${e.whammy.type === 'dip' ? `0 ${v} 0` : e.whammy.type === 'hold' ? `${v} ${v}` : `0 ${v}`})`);
  }
  if (b.notes.some((n) => n.effects.tap)) fx.push('tt');
  if (b.notes.some((n) => n.effects.slap)) fx.push('s');
  if (b.notes.some((n) => n.effects.pop)) fx.push('p');
  return fx;
}

function wrap(fx: string[]): string {
  return fx.length ? `{${fx.join(' ')}}` : '';
}

function fretTex(n: Note): string {
  return `${n.fret}.${n.string}${wrap(noteEffects(n))}`;
}

function beatTex(b: Beat, track: Track, chordIds: Map<string, string>): string {
  const bfx = wrap(beatEffects(b, chordIds));
  if (track.kind === 'drums') {
    // Batterie : la « frette » porte la touche GM de percussion.
    // Une touche hors de la table de percussions d'alphaTab (ex. le « 3 » tapé avant « 36 ») est ignorée au rendu.
    const keys = b.notes.filter((n) => isPercussionKey(n.fret)).map((n) => String(n.fret));
    if (keys.length === 0) return `:${b.duration} r${bfx}`;
    return `:${b.duration} ${keys.length === 1 ? keys[0] : `(${keys.join(' ')})`}${bfx}`;
  }
  if (b.notes.length === 0) return `r.${b.duration}${bfx}`;
  const notes = b.notes.length === 1 ? fretTex(b.notes[0]) : `(${b.notes.map(fretTex).join(' ')})`;
  return `${notes}.${b.duration}${bfx}`;
}

/** Touches General MIDI que la table de percussions d'alphaTab 1.9 sait dessiner. */
export function isPercussionKey(k: number): boolean {
  return (k >= 29 && k <= 31) || (k >= 33 && k <= 87) || (k >= 91 && k <= 127 && k !== 121);
}

function restsFor(mb: MasterBar, drums: boolean): string {
  return ticksToDurations(barCapacityTicks(mb))
    .map((d) => (drums ? `:${d.duration} r` : `r.${d.duration}`) + (d.dots ? '{d}' : ''))
    .join(' ');
}

function masterBarTex(mb: MasterBar, prev: MasterBar | undefined, index: number): string {
  const out: string[] = [];
  if (index === 0 || !prev || prev.timeSignature[0] !== mb.timeSignature[0] || prev.timeSignature[1] !== mb.timeSignature[1])
    out.push(`\\ts (${mb.timeSignature[0]} ${mb.timeSignature[1]})`);
  if (index === 0 || !prev || prev.keySignature !== mb.keySignature || prev.keyMode !== mb.keyMode) {
    const names = mb.keyMode === 'minor' ? KEY_NAMES_MINOR : KEY_NAMES_MAJOR;
    out.push(`\\ks ${names[mb.keySignature] ?? 'C'}`);
  }
  if (mb.tempo) out.push(`\\tempo ${mb.tempo}`);
  if (mb.section) out.push(mb.section.marker ? `\\section ${q(mb.section.marker)} ${q(mb.section.text)}` : `\\section ${q(mb.section.text)}`);
  if (mb.repeat?.start) out.push('\\ro');
  if (mb.repeat?.alternateEndings?.length) out.push(`\\ae (${mb.repeat.alternateEndings.join(' ')})`);
  if (mb.repeat?.endCount) out.push(`\\rc ${mb.repeat.endCount}`);
  if (mb.tripletFeel && mb.tripletFeel !== 'none') out.push(`\\tf ${mb.tripletFeel === 'eighth' ? 'triplet8th' : 'triplet16th'}`);
  return out.join(' ');
}

export interface AlphaTexOptions {
  /** N'exporter que ces pistes (index). Par défaut toutes. */
  tracks?: number[];
}

export function songToAlphaTex(song: Song, opts: AlphaTexOptions = {}): string {
  const lines: string[] = [];
  const m = song.meta;
  if (m.title) lines.push(`\\title ${q(m.title)}`);
  if (m.subtitle) lines.push(`\\subtitle ${q(m.subtitle)}`);
  if (m.artist) lines.push(`\\artist ${q(m.artist)}`);
  if (m.album) lines.push(`\\album ${q(m.album)}`);
  if (m.words) lines.push(`\\words ${q(m.words)}`);
  if (m.music) lines.push(`\\music ${q(m.music)}`);
  if (m.tab) lines.push(`\\tab ${q(m.tab)}`);
  if (m.copyright) lines.push(`\\copyright ${q(m.copyright)}`);
  lines.push(`\\tempo ${song.tempo}`);

  const indexes = opts.tracks ?? song.tracks.map((_, i) => i);
  indexes.forEach((ti, order) => {
    const t = song.tracks[ti];
    const drums = t.kind === 'drums';
    lines.push(`\\track ${q(t.name)}${t.shortName ? ' ' + q(t.shortName) : ''}`);
    if (drums) {
      lines.push('\\instrument percussion');
      lines.push('\\staff {score}');
      lines.push('\\clef neutral');
    } else {
      const staff = [t.showTablature ? 'tabs' : '', t.showStandard || !t.showTablature ? 'score' : ''].filter(Boolean).join(' ');
      lines.push(`\\staff {${staff}}`);
      lines.push(`\\tuning ${tuningTex(t)}`);
      if (t.kind === 'bass') lines.push('\\clef F4');
      lines.push(`\\instrument ${t.program}`);
      if (t.capo) lines.push(`\\capo ${t.capo}`);
      // alphaTex : valeur positive = écrit plus haut que le son réel.
      if (t.displayTranspose) lines.push(`\\displaytranspose ${t.displayTranspose}`);
    }
    const chordIds = new Map<string, string>();
    for (const c of t.chords) {
      chordIds.set(c.name, c.name);
      lines.push(`\\chord (${q(c.name)} ${c.frets.map((f) => (f < 0 ? 'x' : String(f))).join(' ')})`);
    }
    const voiceCount = Math.max(1, ...t.bars.map((b) => {
      let last = 0;
      b.voices.forEach((v, i) => { if (v.beats.length) last = i + 1; });
      return last;
    }));
    for (let v = 0; v < voiceCount; v++) {
      if (v > 0) lines.push('\\voice');
      const bars = t.bars.map((bar, bi) => {
        const mb = song.masterBars[bi];
        // Les métadonnées de mesure ne sont écrites qu'une fois (première piste, voix 1).
        const meta = order === 0 && v === 0 ? masterBarTex(mb, song.masterBars[bi - 1], bi) : '';
        const beats = bar.voices[v]?.beats ?? [];
        const content = beats.length ? beats.map((b) => beatTex(b, t, chordIds)).join(' ') : restsFor(mb, drums);
        return (meta ? meta + ' ' : '') + content;
      });
      lines.push(bars.join(' |\n'));
    }
  });
  return lines.join('\n');
}

export const _internal = { noteEffects, beatEffects };
export type { Finger };
