/**
 * Tablature ASCII (texte brut), le format des sites de tabs :
 *
 *   e|-----0---|-3-------|
 *   B|---1-----|---0-----|
 *   ...
 *
 * L'export est fidèle aux positions ; l'import reconstitue des temps
 * à partir des colonnes (rythme approximatif : chaque colonne = 1 croche).
 */
import type { Beat, Duration, Note, Song } from '../model';
import { createBeat, createNote, createSong, createTrack } from '../factory';
import { parsePitch, pitchName } from '../pitch';
import { barCapacityTicks, beatTicks, PPQ } from '../timing';

function noteSymbol(n: Note): string {
  const e = n.effects;
  if (e.dead) return 'x';
  let s = String(n.fret);
  if (e.harmonic === 'natural') s = `<${s}>`;
  if (e.ghost) s = `(${s})`;
  if (e.bend) s += 'b';
  if (e.hammerPull) s += 'h';
  if (e.slide === 'shift' || e.slide === 'legato') s += '/';
  if (e.slide === 'out-down') s += '\\';
  if (e.vibrato) s += '~';
  return s;
}

export interface AsciiExportOptions {
  track?: number;
  /** Nombre de tirets par noire. */
  charsPerQuarter?: number;
  /** Mesures par ligne. */
  barsPerLine?: number;
}

export function exportAsciiTab(song: Song, opts: AsciiExportOptions = {}): string {
  const t = song.tracks[opts.track ?? 0];
  const cpq = opts.charsPerQuarter ?? 4;
  const perLine = opts.barsPerLine ?? 4;
  const names = t.tuning.map((p, i) => {
    const n = pitchName(p, { octave: false });
    return i === 0 && n === 'E' ? 'e' : n;
  });
  const width = Math.max(...names.map((n) => n.length));
  const header: string[] = [];
  header.push(`${song.meta.title}${song.meta.artist ? ' — ' + song.meta.artist : ''}`);
  header.push(`Accordage : ${t.tuning.map((p) => pitchName(p)).reverse().join(' ')}${t.capo ? ` · Capo ${t.capo}` : ''} · Tempo ${song.tempo}`);
  const blocks: string[] = [];
  for (let start = 0; start < t.bars.length; start += perLine) {
    const rows = names.map((n) => n.padEnd(width) + '|');
    for (let bi = start; bi < Math.min(start + perLine, t.bars.length); bi++) {
      const beats = t.bars[bi].voices[0].beats;
      const cap = barCapacityTicks(song.masterBars[bi]);
      const cols = Math.max(1, Math.round((cap / PPQ) * cpq));
      const cells = rows.map(() => Array<string>(cols).fill('-'));
      let tick = 0;
      for (const b of beats) {
        const col = Math.min(cols - 1, Math.round((tick / PPQ) * cpq));
        for (const n of b.notes) {
          const sym = noteSymbol(n);
          const row = cells[n.string - 1];
          if (!row) continue;
          for (let k = 0; k < sym.length && col + k < cols; k++) row[col + k] = sym[k];
        }
        tick += beatTicks(b);
      }
      rows.forEach((r, i) => (rows[i] = r + '-' + cells[i].join('') + '|'));
    }
    blocks.push(rows.join('\n'));
  }
  return [...header, '', ...blocks.flatMap((b) => [b, ''])].join('\n');
}

const STRING_LINE = /^\s*([A-Ga-g][#b]?)\s*\|(.*)$/;

/**
 * Importe une tablature ASCII. Reconnaît les blocs de lignes `X|---…`.
 * Chaque colonne non vide devient un temps ; les durées sont estimées
 * d'après l'espacement (paramètre `columnsPerQuarter`).
 */
export function importAsciiTab(text: string, opts: { columnsPerQuarter?: number; title?: string } = {}): Song {
  const cpq = opts.columnsPerQuarter ?? 4;
  const lines = text.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];
  let names: string[] = [];
  for (const line of lines) {
    const m = STRING_LINE.exec(line);
    if (m) {
      current.push(m[2]);
      if (blocks.length === 0) names.push(m[1]);
    } else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);
  if (blocks.length === 0) throw new Error('Aucune tablature ASCII reconnue.');
  const stringCount = blocks[0].length;
  names = names.slice(0, stringCount);

  // Accordage : on déduit les octaves en partant de la corde grave (guitare : E2).
  const guessed = guessTuning(names);
  const song = createSong({ title: opts.title ?? 'Tablature importée', bars: 0 });
  song.masterBars = [];
  song.tracks = [createTrack(0, { name: 'Guitare', tuning: guessed })];
  const track = song.tracks[0];

  for (const block of blocks) {
    if (block.length !== stringCount) continue;
    const len = Math.max(...block.map((r) => r.length));
    const rows = block.map((r) => r.padEnd(len, '-'));
    // Découpage en mesures sur les barres verticales de la première corde.
    const bars: Array<[number, number]> = [];
    let s = 0;
    for (let i = 0; i <= len; i++) {
      if (i === len || rows[0][i] === '|') {
        if (i - s > 1) bars.push([s, i]);
        s = i + 1;
      }
    }
    for (const [from, to] of bars) {
      const beats: Beat[] = [];
      let col = from;
      const onsets: Array<{ col: number; notes: Note[] }> = [];
      while (col < to) {
        const notes: Note[] = [];
        let width = 1;
        rows.forEach((r, si) => {
          const ch = r[col];
          if (/\d/.test(ch)) {
            let num = ch;
            if (/\d/.test(r[col + 1] ?? '') && col + 1 < to) num += r[col + 1];
            width = Math.max(width, num.length);
            notes.push(createNote(si + 1, Number(num)));
          } else if (ch === 'x' || ch === 'X') {
            const n = createNote(si + 1, 0);
            n.effects.dead = true;
            notes.push(n);
          }
        });
        if (notes.length) {
          // Effets juste après le nombre.
          rows.forEach((r, si) => {
            const n = notes.find((x) => x.string === si + 1);
            const after = r[col + String(n?.fret ?? '').length];
            if (!n || n.effects.dead) return;
            if (after === 'h' || after === 'p') n.effects.hammerPull = true;
            if (after === '/' || after === '\\' || after === 's') n.effects.slide = 'legato';
            if (after === 'b') n.effects.bend = { type: 'bend', semitones: 2 };
            if (after === '~') n.effects.vibrato = 'slight';
          });
          onsets.push({ col, notes });
        }
        col += width;
      }
      for (let i = 0; i < onsets.length; i++) {
        const gap = (onsets[i + 1]?.col ?? to) - onsets[i].col;
        const beat = createBeat(columnsToDuration(gap, cpq), onsets[i].notes);
        beats.push(beat);
      }
      song.masterBars.push({ timeSignature: [4, 4], keySignature: 0, keyMode: 'major' });
      track.bars.push({ voices: [{ beats }] });
    }
  }
  if (song.masterBars.length === 0) throw new Error('Aucune mesure reconnue dans la tablature.');
  return song;
}

function columnsToDuration(cols: number, cpq: number): Duration {
  const quarters = cols / cpq;
  const options: Array<[number, Duration]> = [[4, 1], [2, 2], [1, 4], [0.5, 8], [0.25, 16], [0.125, 32]];
  let best: Duration = 8;
  let bestDiff = Infinity;
  for (const [q, d] of options) {
    const diff = Math.abs(Math.log2(q) - Math.log2(Math.max(quarters, 0.0625)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = d;
    }
  }
  return best;
}

function guessTuning(names: string[]): number[] {
  const standard6 = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'].map(parsePitch);
  const out: number[] = [];
  // De la corde grave vers l'aiguë : chaque corde est au-dessus de la précédente.
  let prev = -1;
  for (let i = names.length - 1; i >= 0; i--) {
    const name = names[i].length > 1 ? names[i][0].toUpperCase() + names[i].slice(1) : names[i].toUpperCase();
    let pitch: number;
    if (prev < 0) {
      pitch = parsePitch(`${name}${names.length >= 7 ? 1 : names.length === 4 ? 1 : 2}`);
      if (names.length === 6 && standard6[i] % 12 === pitch % 12) pitch = standard6[i];
    } else {
      pitch = parsePitch(`${name}0`);
      while (pitch <= prev) pitch += 12;
    }
    out.unshift(pitch);
    prev = pitch;
  }
  return out;
}
