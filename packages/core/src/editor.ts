/**
 * Opérations d'édition pures : (état) → nouvel état.
 * Toutes les fonctions sont immuables (immer) pour que l'historique
 * d'annulation soit une simple pile d'instantanés partagés.
 */
import { produce, type Draft } from 'immer';
import {
  DURATIONS,
  type Bar,
  type Beat,
  type BeatEffects,
  type Duration,
  type MasterBar,
  type Note,
  type NoteEffects,
  type Song,
  type Track,
  type Tuplet,
} from './model';
import { cloneBeatsWithNewIds, createBar, createBeat, createMasterBar, createNote, createTrack, uid, type TrackOptions } from './factory';
import { barCapacityTicks, beatTicks, ticksToDurations, voiceFillStatus, voiceTicks } from './timing';

export interface Cursor {
  track: number;
  bar: number;
  voice: number;
  /** Index du temps ; peut valoir `beats.length` (emplacement d'ajout). */
  beat: number;
  /** Corde courante (1 = aiguë). */
  string: number;
}

export interface EditorState {
  song: Song;
  cursor: Cursor;
  /** Point d'ancrage de la sélection (même piste, même voix). */
  anchor: Cursor | null;
  /** Durée utilisée pour les nouveaux temps. */
  inputDuration: Duration;
}

export function createEditorState(song: Song): EditorState {
  return { song, cursor: { track: 0, bar: 0, voice: 0, beat: 0, string: 1 }, anchor: null, inputDuration: 4 };
}

// ---------------------------------------------------------------- accès

export function currentTrack(s: EditorState): Track {
  return s.song.tracks[s.cursor.track];
}

export function currentBar(s: EditorState): Bar {
  return currentTrack(s).bars[s.cursor.bar];
}

export function currentBeats(s: EditorState): Beat[] {
  return currentBar(s).voices[s.cursor.voice]?.beats ?? [];
}

export function currentBeat(s: EditorState): Beat | undefined {
  return currentBeats(s)[s.cursor.beat];
}

export function currentNote(s: EditorState): Note | undefined {
  return currentBeat(s)?.notes.find((n) => n.string === s.cursor.string);
}

function stringCount(song: Song, track: number): number {
  return song.tracks[track].tuning.length;
}

function ensureVoice(bar: Draft<Bar>, voice: number) {
  while (bar.voices.length <= voice) bar.voices.push({ beats: [] });
}

function withSong(s: EditorState, recipe: (song: Draft<Song>) => void): EditorState {
  return { ...s, song: produce(s.song, recipe) };
}

/** Renvoie le temps sous le curseur dans le brouillon, en le créant si besoin. */
function beatAtCursor(song: Draft<Song>, c: Cursor, duration: Duration, create: boolean): Draft<Beat> | undefined {
  const bar = song.tracks[c.track].bars[c.bar];
  ensureVoice(bar, c.voice);
  const beats = bar.voices[c.voice].beats;
  if (c.beat < beats.length) return beats[c.beat];
  if (!create) return undefined;
  const b = createBeat(duration);
  beats.push(b);
  return beats[beats.length - 1];
}

// ---------------------------------------------------------------- saisie

/** Écrit une frette sur la corde du curseur (crée le temps si besoin). */
export function setFret(s: EditorState, fret: number): EditorState {
  if (fret < 0 || fret > 127) return s;
  const c = s.cursor;
  return withSong(s, (song) => {
    const beat = beatAtCursor(song, c, s.inputDuration, true)!;
    const existing = beat.notes.find((n) => n.string === c.string);
    if (existing) {
      existing.fret = fret;
      existing.effects.dead = undefined;
    } else {
      beat.notes.push(createNote(c.string, fret));
      beat.notes.sort((a, b) => a.string - b.string);
    }
  });
}

/** Supprime la note sous le curseur, ou le temps entier s'il n'y a pas de note. */
export function deleteAtCursor(s: EditorState): EditorState {
  const beat = currentBeat(s);
  if (!beat) return s;
  const c = s.cursor;
  const hasNote = beat.notes.some((n) => n.string === c.string);
  const next = withSong(s, (song) => {
    const beats = song.tracks[c.track].bars[c.bar].voices[c.voice].beats;
    if (hasNote) {
      const b = beats[c.beat];
      b.notes = b.notes.filter((n) => n.string !== c.string);
    } else {
      beats.splice(c.beat, 1);
    }
  });
  return next;
}

/** Insère un silence avant le temps courant. */
export function insertBeatBefore(s: EditorState): EditorState {
  const c = s.cursor;
  return withSong(s, (song) => {
    const bar = song.tracks[c.track].bars[c.bar];
    ensureVoice(bar, c.voice);
    const ref = bar.voices[c.voice].beats[c.beat];
    bar.voices[c.voice].beats.splice(c.beat, 0, createBeat(ref?.duration ?? s.inputDuration));
  });
}

/** Transforme le temps courant en silence (ou crée un silence). */
export function makeRest(s: EditorState): EditorState {
  const c = s.cursor;
  return withSong(s, (song) => {
    const beat = beatAtCursor(song, c, s.inputDuration, true)!;
    beat.notes = [];
  });
}

export function setDuration(s: EditorState, duration: Duration): EditorState {
  const beat = currentBeat(s);
  const next = { ...s, inputDuration: duration };
  if (!beat) return next;
  const c = s.cursor;
  return withSong(next, (song) => {
    song.tracks[c.track].bars[c.bar].voices[c.voice].beats[c.beat].duration = duration;
  });
}

/** `direction` = +1 pour une valeur plus courte (noire → croche), -1 plus longue. */
export function shiftDuration(s: EditorState, direction: 1 | -1): EditorState {
  const cur = currentBeat(s)?.duration ?? s.inputDuration;
  const i = DURATIONS.indexOf(cur) + direction;
  if (i < 0 || i >= DURATIONS.length) return s;
  return setDuration(s, DURATIONS[i]);
}

function updateBeat(s: EditorState, fn: (beat: Draft<Beat>) => void): EditorState {
  const c = s.cursor;
  return withSong(s, (song) => {
    const beat = beatAtCursor(song, c, s.inputDuration, true)!;
    fn(beat);
  });
}

export function toggleDot(s: EditorState): EditorState {
  return updateBeat(s, (b) => {
    b.dots = b.dots === 0 ? 1 : b.dots === 1 ? 2 : 0;
  });
}

export function toggleTuplet(s: EditorState, tuplet: Tuplet = 3): EditorState {
  return updateBeat(s, (b) => {
    b.tuplet = b.tuplet === tuplet ? undefined : tuplet;
  });
}

export function setBeatEffect<K extends keyof BeatEffects>(s: EditorState, key: K, value: BeatEffects[K] | undefined): EditorState {
  return updateBeat(s, (b) => {
    if (value === undefined || (b.effects as BeatEffects)[key] === value) delete (b.effects as BeatEffects)[key];
    else (b.effects as BeatEffects)[key] = value as never;
  });
}

function updateNote(s: EditorState, fn: (note: Draft<Note>) => void): EditorState {
  if (!currentNote(s)) return s;
  const c = s.cursor;
  return withSong(s, (song) => {
    const note = song.tracks[c.track].bars[c.bar].voices[c.voice].beats[c.beat].notes.find((n) => n.string === c.string)!;
    fn(note);
  });
}

/**
 * Bascule un effet de note. Si `value` est fourni et différent de la valeur
 * actuelle, il la remplace ; sinon l'effet est retiré.
 */
export function toggleNoteEffect<K extends keyof NoteEffects>(s: EditorState, key: K, value: NoteEffects[K] = true as NoteEffects[K]): EditorState {
  return updateNote(s, (n) => {
    const fx = n.effects as NoteEffects;
    if (fx[key] !== undefined && JSON.stringify(fx[key]) === JSON.stringify(value)) delete fx[key];
    else fx[key] = value;
  });
}

export function toggleTie(s: EditorState): EditorState {
  return updateNote(s, (n) => {
    n.tie = !n.tie || undefined;
  });
}

/** Note étouffée « x » : crée la note si elle n'existe pas. */
export function toggleDeadNote(s: EditorState): EditorState {
  const st = currentNote(s) ? s : setFret(s, 0);
  return toggleNoteEffect(st, 'dead');
}

// ---------------------------------------------------------------- navigation

function clampCursor(song: Song, c: Cursor): Cursor {
  const track = Math.max(0, Math.min(song.tracks.length - 1, c.track));
  const bar = Math.max(0, Math.min(song.masterBars.length - 1, c.bar));
  const beats = song.tracks[track].bars[bar].voices[c.voice]?.beats ?? [];
  return {
    track,
    bar,
    voice: Math.max(0, Math.min(3, c.voice)),
    beat: Math.max(0, Math.min(beats.length, c.beat)),
    string: Math.max(1, Math.min(stringCount(song, track), c.string)),
  };
}

export function setCursor(s: EditorState, c: Partial<Cursor>, extendSelection = false): EditorState {
  const cursor = clampCursor(s.song, { ...s.cursor, ...c });
  return { ...s, cursor, anchor: extendSelection ? s.anchor ?? s.cursor : null };
}

export function moveRight(s: EditorState, extendSelection = false): EditorState {
  const c = s.cursor;
  const beats = currentBeats(s);
  const mb = s.song.masterBars[c.bar];
  const voice = currentBar(s).voices[c.voice] ?? { beats: [] };
  const atAppend = c.beat >= beats.length;
  const canAppend = voiceFillStatus(voice, mb) === 'incomplete' || voiceFillStatus(voice, mb) === 'empty';
  if (!atAppend && (c.beat + 1 < beats.length || canAppend)) {
    return setCursor(s, { beat: c.beat + 1 }, extendSelection);
  }
  let st = s;
  if (c.bar + 1 >= s.song.masterBars.length) {
    if (extendSelection) return s;
    st = insertBarAfter(s, c.bar);
  }
  return setCursor(st, { bar: c.bar + 1, beat: 0 }, extendSelection);
}

export function moveLeft(s: EditorState, extendSelection = false): EditorState {
  const c = s.cursor;
  if (c.beat > 0) return setCursor(s, { beat: c.beat - 1 }, extendSelection);
  if (c.bar === 0) return s;
  const prevBeats = s.song.tracks[c.track].bars[c.bar - 1].voices[c.voice]?.beats ?? [];
  return setCursor(s, { bar: c.bar - 1, beat: Math.max(0, prevBeats.length - 1) }, extendSelection);
}

export function moveString(s: EditorState, delta: number): EditorState {
  return setCursor(s, { string: s.cursor.string + delta });
}

export function moveBar(s: EditorState, delta: number): EditorState {
  return setCursor(s, { bar: s.cursor.bar + delta, beat: 0 });
}

export function setVoice(s: EditorState, voice: number): EditorState {
  return setCursor(s, { voice, beat: 0 });
}

export function selectTrack(s: EditorState, track: number): EditorState {
  return setCursor(s, { track, beat: 0, voice: 0 });
}

// ---------------------------------------------------------------- mesures

export function insertBarAfter(s: EditorState, barIndex: number, count = 1): EditorState {
  return withSong(s, (song) => {
    const ref = song.masterBars[barIndex];
    for (let k = 0; k < count; k++) {
      song.masterBars.splice(barIndex + 1, 0, createMasterBar(ref as MasterBar));
      for (const t of song.tracks) t.bars.splice(barIndex + 1, 0, createBar());
    }
  });
}

export function insertBarBefore(s: EditorState, barIndex: number): EditorState {
  const st = withSong(s, (song) => {
    song.masterBars.splice(barIndex, 0, createMasterBar(song.masterBars[barIndex] as MasterBar));
    for (const t of song.tracks) t.bars.splice(barIndex, 0, createBar());
  });
  return st;
}

export function deleteBars(s: EditorState, from: number, to = from): EditorState {
  const count = to - from + 1;
  if (s.song.masterBars.length - count < 1) {
    // On garde toujours au moins une mesure : on la vide.
    return withSong(s, (song) => {
      for (const t of song.tracks) t.bars[0] = createBar();
    });
  }
  const st = withSong(s, (song) => {
    song.masterBars.splice(from, count);
    for (const t of song.tracks) t.bars.splice(from, count);
  });
  return setCursor(st, { bar: Math.min(from, st.song.masterBars.length - 1), beat: 0 });
}

/** Propriétés qui « durent » d'une mesure à l'autre (les autres sont ponctuelles). */
const PERSISTENT_KEYS = new Set<keyof MasterBar>(['timeSignature', 'keySignature', 'keyMode', 'tripletFeel']);

/**
 * Modifie une mesure. Avec `applyToFollowing`, seules les propriétés durables
 * (signature, armure, feeling) sont propagées aux mesures suivantes ; leurs
 * sections, tempos et reprises restent intacts.
 */
export function updateMasterBar(s: EditorState, barIndex: number, patch: Partial<MasterBar>, applyToFollowing = false): EditorState {
  return withSong(s, (song) => {
    const end = applyToFollowing ? song.masterBars.length : barIndex + 1;
    for (let i = barIndex; i < end; i++) {
      const mb = song.masterBars[i];
      for (const [k, v] of Object.entries(patch) as Array<[keyof MasterBar, unknown]>) {
        if (i > barIndex && !PERSISTENT_KEYS.has(k)) continue;
        if (v === undefined) delete (mb as Record<string, unknown>)[k];
        else (mb as Record<string, unknown>)[k] = v;
      }
    }
  });
}

/** Complète la voix courante avec des silences jusqu'à la fin de la mesure. */
export function fillBarWithRests(s: EditorState, barIndex = s.cursor.bar): EditorState {
  const c = s.cursor;
  return withSong(s, (song) => {
    const bar = song.tracks[c.track].bars[barIndex];
    ensureVoice(bar, c.voice);
    const voice = bar.voices[c.voice];
    const missing = barCapacityTicks(song.masterBars[barIndex] as MasterBar) - voiceTicks(voice as never);
    for (const d of ticksToDurations(missing)) voice.beats.push({ ...createBeat(d.duration), dots: d.dots as 0 | 1 });
  });
}

/** Complète toutes les mesures incomplètes de toutes les pistes (voix 1). */
export function fillAllIncompleteBars(s: EditorState): EditorState {
  return withSong(s, (song) => {
    song.masterBars.forEach((mb, i) => {
      if (mb.anacrusis) return;
      for (const t of song.tracks) {
        const voice = t.bars[i].voices[0];
        const missing = barCapacityTicks(mb as MasterBar) - voiceTicks(voice as never);
        if (missing <= 0) continue;
        for (const d of ticksToDurations(missing)) voice.beats.push({ ...createBeat(d.duration), dots: d.dots as 0 | 1 });
      }
    });
  });
}

// ---------------------------------------------------------------- pistes

export function addTrack(s: EditorState, opts: TrackOptions = {}): EditorState {
  const st = withSong(s, (song) => {
    song.tracks.push(createTrack(song.masterBars.length, { index: song.tracks.length, ...opts }) as Draft<Track>);
  });
  return selectTrack(st, st.song.tracks.length - 1);
}

export function removeTrack(s: EditorState, index: number): EditorState {
  if (s.song.tracks.length <= 1) return s;
  const st = withSong(s, (song) => {
    song.tracks.splice(index, 1);
  });
  return selectTrack(st, Math.min(s.cursor.track, st.song.tracks.length - 1));
}

export function moveTrack(s: EditorState, index: number, delta: number): EditorState {
  const target = index + delta;
  if (target < 0 || target >= s.song.tracks.length) return s;
  const st = withSong(s, (song) => {
    const [t] = song.tracks.splice(index, 1);
    song.tracks.splice(target, 0, t);
  });
  return selectTrack(st, target);
}

export function updateTrack(s: EditorState, index: number, patch: Partial<Omit<Track, 'bars' | 'id'>>): EditorState {
  return withSong(s, (song) => {
    Object.assign(song.tracks[index], patch);
  });
}

/**
 * Change l'accordage. Les notes sur des cordes qui disparaissent sont supprimées ;
 * avec `keepPitch`, les frettes sont recalculées pour conserver la hauteur sonnante.
 */
export function setTuning(s: EditorState, index: number, tuning: number[], keepPitch = false): EditorState {
  const st = withSong(s, (song) => {
    const t = song.tracks[index];
    const old = [...t.tuning];
    t.tuning = [...tuning];
    for (const bar of t.bars)
      for (const v of bar.voices)
        for (const b of v.beats) {
          b.notes = b.notes.filter((n) => n.string <= tuning.length);
          if (keepPitch)
            for (const n of b.notes) {
              const delta = (old[n.string - 1] ?? tuning[n.string - 1]) - tuning[n.string - 1];
              n.fret = Math.max(0, n.fret + delta);
            }
        }
  });
  return setCursor(st, {});
}

// ---------------------------------------------------------------- sélection, copier/coller

export interface BeatRef {
  bar: number;
  beat: number;
}

/** Temps sélectionnés (dans l'ordre), entre l'ancre et le curseur. */
export function selectedBeats(s: EditorState): BeatRef[] {
  const a = s.anchor ?? s.cursor;
  const c = s.cursor;
  const [from, to] = a.bar < c.bar || (a.bar === c.bar && a.beat <= c.beat) ? [a, c] : [c, a];
  const out: BeatRef[] = [];
  const track = s.song.tracks[c.track];
  for (let bar = from.bar; bar <= to.bar; bar++) {
    const beats = track.bars[bar].voices[c.voice]?.beats ?? [];
    const start = bar === from.bar ? from.beat : 0;
    const end = bar === to.bar ? Math.min(to.beat, beats.length - 1) : beats.length - 1;
    for (let i = start; i <= end; i++) out.push({ bar, beat: i });
  }
  return out;
}

export function copySelection(s: EditorState): Beat[] {
  const track = currentTrack(s);
  return selectedBeats(s).map((r) => structuredClone(track.bars[r.bar].voices[s.cursor.voice].beats[r.beat]));
}

export function deleteSelection(s: EditorState): EditorState {
  const refs = selectedBeats(s);
  if (refs.length === 0) return s;
  const c = s.cursor;
  const st = withSong(s, (song) => {
    // Du dernier au premier pour garder des index valides.
    for (const r of [...refs].reverse()) song.tracks[c.track].bars[r.bar].voices[c.voice].beats.splice(r.beat, 1);
  });
  const first = refs[0];
  return { ...setCursor(st, { bar: first.bar, beat: first.beat }), anchor: null };
}

/**
 * Colle des temps au curseur. Les temps sont répartis sur les mesures suivantes
 * dès que la mesure courante est pleine (de nouvelles mesures sont créées au besoin).
 */
export function pasteBeats(s: EditorState, beats: Beat[]): EditorState {
  if (beats.length === 0) return s;
  const c = s.cursor;
  let st: EditorState = s;
  const copies = cloneBeatsWithNewIds(beats);
  st = withSong(st, (song) => {
    let barIdx = c.bar;
    let insertAt = c.beat;
    for (const beat of copies) {
      if (barIdx >= song.masterBars.length) {
        song.masterBars.push(createMasterBar(song.masterBars[song.masterBars.length - 1] as MasterBar));
        for (const t of song.tracks) t.bars.push(createBar());
      }
      const bar = song.tracks[c.track].bars[barIdx];
      ensureVoice(bar, c.voice);
      const voice = bar.voices[c.voice];
      voice.beats.splice(insertAt, 0, beat as Draft<Beat>);
      insertAt++;
      const cap = barCapacityTicks(song.masterBars[barIdx] as MasterBar);
      const prefix = voice.beats.slice(0, insertAt).reduce((sum, b) => sum + beatTicks(b), 0);
      if (prefix >= cap && insertAt >= voice.beats.length) {
        barIdx++;
        insertAt = 0;
      }
    }
  });
  return { ...st, anchor: null };
}

// ---------------------------------------------------------------- transposition

export interface TransposeOptions {
  /** Piste(s) concernée(s) ; par défaut toutes. */
  tracks?: number[];
  /** Restreindre à la sélection courante. */
  selectionOnly?: boolean;
  /** Frette maximale autorisée. */
  maxFret?: number;
}

/**
 * Transpose de `semitones` demi-tons. Si une note sort du manche,
 * elle est déplacée sur une autre corde libre quand c'est possible.
 */
export function transpose(s: EditorState, semitones: number, opts: TransposeOptions = {}): EditorState {
  const maxFret = opts.maxFret ?? 24;
  const selection = opts.selectionOnly ? new Set(selectedBeats(s).map((r) => `${r.bar}:${r.beat}`)) : null;
  const tracks = opts.selectionOnly ? [s.cursor.track] : opts.tracks ?? s.song.tracks.map((_, i) => i);
  return withSong(s, (song) => {
    for (const ti of tracks) {
      const t = song.tracks[ti];
      if (t.kind === 'drums') continue;
      t.bars.forEach((bar, bi) =>
        bar.voices.forEach((v, vi) =>
          v.beats.forEach((b, beatIdx) => {
            if (selection && (vi !== s.cursor.voice || !selection.has(`${bi}:${beatIdx}`))) return;
            const used = new Set<number>();
            const moved: Note[] = [];
            for (const n of b.notes) {
              const pitch = t.tuning[n.string - 1] + n.fret + semitones;
              let target = { string: n.string, fret: n.fret + semitones };
              if (target.fret < 0 || target.fret > maxFret || used.has(target.string)) {
                const alt = t.tuning
                  .map((open, i) => ({ string: i + 1, fret: pitch - open }))
                  .filter((o) => o.fret >= 0 && o.fret <= maxFret && !used.has(o.string))
                  .sort((x, y) => Math.abs(x.string - n.string) - Math.abs(y.string - n.string))[0];
                if (!alt) continue; // note impossible à placer : retirée
                target = alt;
              }
              used.add(target.string);
              moved.push({ ...(n as Note), string: target.string, fret: target.fret });
            }
            b.notes = moved.sort((x, y) => x.string - y.string) as Draft<Note>[];
          }),
        ),
      );
    }
  });
}

// ---------------------------------------------------------------- divers

export function updateSongMeta(s: EditorState, patch: Partial<Song['meta']>): EditorState {
  return withSong(s, (song) => {
    Object.assign(song.meta, patch);
  });
}

export function setSongTempo(s: EditorState, tempo: number): EditorState {
  return withSong(s, (song) => {
    song.tempo = Math.max(10, Math.min(400, Math.round(tempo)));
  });
}

export function replaceSong(s: EditorState, song: Song): EditorState {
  return { ...createEditorState(song), inputDuration: s.inputDuration };
}

export { uid };
