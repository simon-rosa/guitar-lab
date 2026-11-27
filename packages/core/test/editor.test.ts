import { describe, expect, it } from 'vitest';
import {
  barFillStatus,
  commit,
  copySelection,
  createEditorState,
  createHistory,
  createSong,
  currentBeat,
  currentNote,
  deleteAtCursor,
  fillBarWithRests,
  moveLeft,
  moveRight,
  moveString,
  pasteBeats,
  redo,
  setDuration,
  setFret,
  setTuning,
  toggleDot,
  toggleNoteEffect,
  toggleTuplet,
  transpose,
  undo,
  beatTicks,
  PPQ,
  playbackBarOrder,
  GUITAR_TUNINGS,
  addTrack,
  removeTrack,
  deleteBars,
  updateMasterBar,
} from '../src';

const fresh = () => createEditorState(createSong({ bars: 2 }));

describe('saisie', () => {
  it('crée un temps et une note à la saisie d’une frette', () => {
    const s = setFret(fresh(), 5);
    expect(currentBeat(s)?.notes).toEqual([{ string: 1, fret: 5, effects: {} }]);
    expect(currentBeat(s)?.duration).toBe(4);
  });

  it('construit un accord en changeant de corde', () => {
    let s = setFret(fresh(), 0);
    s = moveString(s, 1);
    s = setFret(s, 1);
    s = moveString(s, 1);
    s = setFret(s, 0);
    expect(currentBeat(s)?.notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['1:0', '2:1', '3:0']);
  });

  it('avance, remplit la mesure puis passe à la suivante', () => {
    let s = fresh();
    for (let i = 0; i < 4; i++) {
      s = setFret(s, i);
      s = moveRight(s);
    }
    expect(s.cursor.bar).toBe(1);
    expect(s.cursor.beat).toBe(0);
    expect(barFillStatus(s.song.tracks[0].bars[0], s.song.masterBars[0])).toBe('full');
  });

  it('crée une mesure quand on dépasse la fin', () => {
    let s = fresh();
    for (let i = 0; i < 9; i++) s = moveRight(setFret(s, 1));
    expect(s.song.masterBars.length).toBe(3);
    expect(s.song.tracks[0].bars.length).toBe(3);
  });

  it('supprime la note puis le temps', () => {
    let s = setFret(fresh(), 3);
    s = deleteAtCursor(s);
    expect(currentBeat(s)?.notes).toEqual([]);
    s = deleteAtCursor(s);
    expect(currentBeat(s)).toBeUndefined();
  });

  it('gère durées, points et triolets', () => {
    let s = setFret(fresh(), 3);
    s = setDuration(s, 8);
    s = toggleDot(s);
    expect(beatTicks(currentBeat(s)!)).toBe((PPQ / 2) * 1.5);
    s = toggleTuplet(s, 3);
    expect(currentBeat(s)?.tuplet).toBe(3);
  });

  it('bascule les effets de note', () => {
    let s = setFret(fresh(), 7);
    s = toggleNoteEffect(s, 'hammerPull');
    expect(currentNote(s)?.effects.hammerPull).toBe(true);
    s = toggleNoteEffect(s, 'hammerPull');
    expect(currentNote(s)?.effects.hammerPull).toBeUndefined();
    s = toggleNoteEffect(s, 'bend', { type: 'bend', semitones: 2 });
    expect(currentNote(s)?.effects.bend).toEqual({ type: 'bend', semitones: 2 });
  });

  it('complète une mesure avec des silences', () => {
    let s = setFret(fresh(), 1);
    s = fillBarWithRests(s);
    const bar = s.song.tracks[0].bars[0];
    expect(barFillStatus(bar, s.song.masterBars[0])).toBe('full');
    expect(bar.voices[0].beats.slice(1).every((b) => b.notes.length === 0)).toBe(true);
  });

  it('revient en arrière dans la mesure précédente', () => {
    let s = fresh();
    for (let i = 0; i < 4; i++) s = moveRight(setFret(s, i));
    s = moveLeft(s);
    expect(s.cursor).toMatchObject({ bar: 0, beat: 3 });
  });
});

describe('historique', () => {
  it('annule et rétablit', () => {
    let h = createHistory(fresh());
    h = commit(h, setFret(h.present, 5));
    h = commit(h, setFret(h.present, 7));
    expect(currentNote(h.present)?.fret).toBe(7);
    h = undo(h);
    expect(currentNote(h.present)?.fret).toBe(5);
    h = undo(h);
    expect(currentNote(h.present)).toBeUndefined();
    h = redo(h);
    expect(currentNote(h.present)?.fret).toBe(5);
  });
});

describe('copier / coller', () => {
  it('copie une sélection et la colle en débordant sur la mesure suivante', () => {
    let s = fresh();
    for (let i = 0; i < 4; i++) s = moveRight(setFret(s, i));
    s = { ...s, cursor: { ...s.cursor, bar: 0, beat: 0 }, anchor: null };
    s = moveRight(moveRight(moveRight(s, true), true), true);
    const copied = copySelection(s);
    expect(copied.map((b) => b.notes[0].fret)).toEqual([0, 1, 2, 3]);
    s = { ...s, cursor: { ...s.cursor, bar: 1, beat: 0 }, anchor: null };
    s = pasteBeats(s, copied);
    expect(s.song.tracks[0].bars[1].voices[0].beats.map((b) => b.notes[0].fret)).toEqual([0, 1, 2, 3]);
    expect(new Set(s.song.tracks[0].bars.flatMap((b) => b.voices[0].beats.map((x) => x.id))).size).toBe(8);
  });
});

describe('transposition et accordage', () => {
  it('transpose et change de corde si la frette devient négative', () => {
    let s = setFret(fresh(), 0); // mi aigu à vide
    s = transpose(s, -1);
    const n = currentBeat(s)!.notes[0];
    expect(n.string).toBe(2); // ré# sur la corde de si, frette 4
    expect(n.fret).toBe(4);
  });

  it('conserve la hauteur en passant en Drop D', () => {
    let s = moveString(fresh(), 5); // corde 6
    s = setFret(s, 2); // F#2
    const dropD = GUITAR_TUNINGS.find((t) => t.id === 'drop-d')!.pitches;
    s = setTuning(s, 0, dropD, true);
    expect(currentBeat(s)!.notes[0].fret).toBe(4);
  });
});

describe('pistes et mesures', () => {
  it('ajoute une piste alignée sur le nombre de mesures puis la retire', () => {
    let s = addTrack(fresh(), { presetId: 'bass-finger' });
    expect(s.song.tracks.length).toBe(2);
    expect(s.song.tracks[1].bars.length).toBe(2);
    expect(s.song.tracks[1].tuning.length).toBe(4);
    s = removeTrack(s, 1);
    expect(s.song.tracks.length).toBe(1);
  });

  it('supprime une mesure dans toutes les pistes', () => {
    let s = addTrack(fresh());
    s = deleteBars(s, 0);
    expect(s.song.masterBars.length).toBe(1);
    expect(s.song.tracks.every((t) => t.bars.length === 1)).toBe(true);
  });
});

describe('reprises', () => {
  it('déroule reprises et fins alternatives', () => {
    const song = createSong({ bars: 4 });
    song.masterBars[0].repeat = { start: true };
    song.masterBars[1].repeat = { alternateEndings: [1], endCount: 2 };
    song.masterBars[2].repeat = { alternateEndings: [2] };
    expect(playbackBarOrder(song)).toEqual([0, 1, 0, 2, 3]);
  });
});

describe('propriétés de mesure', () => {
  it('propage la signature sans effacer les sections et tempos suivants', () => {
    let s = createEditorState(createSong({ bars: 4 }));
    s = updateMasterBar(s, 2, { section: { marker: 'B', text: 'Refrain' }, tempo: 140 });
    s = updateMasterBar(s, 0, { timeSignature: [3, 4] }, true);
    expect(s.song.masterBars.map((m) => m.timeSignature.join('/'))).toEqual(['3/4', '3/4', '3/4', '3/4']);
    expect(s.song.masterBars[2].section?.text).toBe('Refrain');
    expect(s.song.masterBars[2].tempo).toBe(140);
  });
});
