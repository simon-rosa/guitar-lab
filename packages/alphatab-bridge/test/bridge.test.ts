import { describe, expect, it } from 'vitest';
import {
  addTrack,
  createEditorState,
  createSong,
  moveRight,
  moveString,
  setDuration,
  setFret,
  toggleDot,
  toggleNoteEffect,
  toggleTuplet,
  setBeatEffect,
  updateMasterBar,
  fillAllIncompleteBars,
  type EditorState,
} from '@guitar-lab/core';
import { exportGp, findAlphaTabBeat, fromAlphaTabScore, importScoreFile, toAlphaTabScore } from '../src';

/** Un morceau qui exerce la plupart des fonctions du modèle. */
function fixture(): EditorState {
  let s = createEditorState(createSong({ title: 'Banc d’essai', bars: 3, tempo: 96 }));
  s = { ...s, song: { ...s.song, meta: { ...s.song.meta, artist: 'Guitar Lab' } } };
  s = setFret(s, 5);
  s = toggleNoteEffect(s, 'hammerPull');
  s = moveRight(s);
  s = setFret(s, 7);
  s = toggleNoteEffect(s, 'bend', { type: 'bend', semitones: 2 });
  s = moveRight(s);
  s = setDuration(s, 8);
  s = setFret(s, 3);
  s = toggleDot(s);
  s = toggleNoteEffect(s, 'slide', 'legato');
  s = moveRight(s);
  s = setDuration(s, 16);
  s = setFret(s, 5);
  s = toggleNoteEffect(s, 'vibrato', 'wide');
  s = moveRight(s);
  s = setDuration(s, 4);
  s = moveString(s, 4);
  s = setFret(s, 0);
  s = toggleNoteEffect(s, 'palmMute');
  s = setBeatEffect(s, 'pickStroke', 'down');
  s = moveString(s, -1);
  s = setFret(s, 2);
  s = moveRight(s); // mesure 2
  s = setDuration(s, 8);
  for (let i = 0; i < 3; i++) {
    s = setFret(s, 9);
    s = toggleTuplet(s, 3);
    s = toggleNoteEffect(s, 'harmonic', 'natural');
    s = moveRight(s);
  }
  s = updateMasterBar(s, 1, { tempo: 140, section: { marker: 'A', text: 'Couplet' }, repeat: { start: true } });
  s = updateMasterBar(s, 2, { repeat: { endCount: 2 }, timeSignature: [3, 4] });
  s = addTrack(s, { presetId: 'bass-finger', name: 'Basse' });
  s = setFret(s, 3);
  s = fillAllIncompleteBars(s);
  return s;
}

describe('Song → alphaTab', () => {
  it('produit un Score sans erreur', () => {
    const score = toAlphaTabScore(fixture().song);
    expect(score.title).toBe('Banc d’essai');
    expect(score.tracks.map((t) => t.name)).toEqual(['Guitare', 'Basse']);
    expect(score.masterBars[2].timeSignatureNumerator).toBe(3);
    expect(score.masterBars[2].repeatCount).toBe(2);
  });

  it('retrouve le temps du curseur', () => {
    const score = toAlphaTabScore(fixture().song);
    const beat = findAlphaTabBeat(score, { track: 0, bar: 0, voice: 0, beat: 1, string: 1 });
    expect(beat?.notes[0].fret).toBe(7);
  });
});

describe('aller-retour Song → alphaTab → Song', () => {
  it('conserve notes, rythmes et effets', () => {
    const original = fixture().song;
    const back = fromAlphaTabScore(toAlphaTabScore(original));
    const strip = (song: typeof original) =>
      song.tracks.map((t) =>
        t.bars.map((b) =>
          b.voices[0].beats.map((beat) => ({
            d: beat.duration,
            dots: beat.dots,
            tu: beat.tuplet,
            ps: beat.effects.pickStroke,
            notes: beat.notes.map((n) => ({ s: n.string, f: n.fret, fx: n.effects })),
          })),
        ),
      );
    expect(strip(back)).toEqual(strip(original));
    expect(back.tempo).toBe(96);
    expect(back.masterBars[1]).toMatchObject({ tempo: 140, section: { text: 'Couplet' }, repeat: { start: true } });
    expect(back.masterBars[2]).toMatchObject({ timeSignature: [3, 4], repeat: { endCount: 2 } });
    expect(back.tracks[1].tuning).toEqual(original.tracks[1].tuning);
  });
});

describe('Guitar Pro', () => {
  it('exporte un .gp puis le réimporte', () => {
    const original = fixture().song;
    const bytes = exportGp(original);
    expect(bytes.length).toBeGreaterThan(500);
    // Un .gp est une archive zip : signature PK.
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    const back = importScoreFile(bytes);
    expect(back.tracks.length).toBe(2);
    expect(back.tracks[0].bars[0].voices[0].beats.map((b) => b.notes.map((n) => n.fret))).toEqual(
      original.tracks[0].bars[0].voices[0].beats.map((b) => b.notes.map((n) => n.fret)),
    );
    expect(back.tracks[0].bars[0].voices[0].beats[0].notes[0].effects.hammerPull).toBe(true);
  });
});

describe('batterie', () => {
  it('ignore les touches que alphaTab ne sait pas dessiner (saisie en cours)', () => {
    let s = createEditorState(createSong({ bars: 1 }));
    s = addTrack(s, { presetId: 'drums' });
    s = setFret(s, 3); // premier chiffre de « 36 »
    expect(() => toAlphaTabScore(s.song)).not.toThrow();
    s = setFret(s, 36);
    const score = toAlphaTabScore(s.song);
    expect(score.tracks[1].staves[0].isPercussion).toBe(true);
    expect(score.tracks[1].staves[0].bars[0].voices[0].beats[0].notes.length).toBe(1);
  });
});
