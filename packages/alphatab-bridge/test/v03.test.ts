import { describe, expect, it } from 'vitest';
import { applyChord, createEditorState, createSong, moveRightFree, setFret, setNoteEffect, updateMasterBar } from '@guitar-lab/core';
import { alphaTab, fromAlphaTabScore, toAlphaTabScore } from '../src';

describe('v0.3 dans alphaTab', () => {
  it('les renvois sont lus par alphaTab et relus à l’import', () => {
    let s = createEditorState(createSong({ bars: 6 }));
    s = updateMasterBar(s, 1, { directions: ['segno'] });
    s = updateMasterBar(s, 2, { directions: ['to-coda'] });
    s = updateMasterBar(s, 3, { directions: ['dal-segno-al-coda'] });
    s = updateMasterBar(s, 4, { directions: ['coda'] });
    const score = toAlphaTabScore(s.song);
    expect([...(score.masterBars[1].directions ?? [])]).toEqual([alphaTab.model.Direction.TargetSegno]);
    expect([...(score.masterBars[3].directions ?? [])]).toEqual([alphaTab.model.Direction.JumpDalSegnoAlCoda]);
    const back = fromAlphaTabScore(score);
    expect(back.masterBars.map((m) => m.directions ?? [])).toEqual([[], ['segno'], ['to-coda'], ['dal-segno-al-coda'], ['coda'], []]);
  });

  it('le lecteur d’alphaTab suit le D.S. al Coda', () => {
    let s = createEditorState(createSong({ bars: 6 }));
    s = updateMasterBar(s, 1, { directions: ['segno'] });
    s = updateMasterBar(s, 2, { directions: ['to-coda'] });
    s = updateMasterBar(s, 3, { directions: ['dal-segno-al-coda'] });
    s = updateMasterBar(s, 4, { directions: ['coda'] });
    const score = toAlphaTabScore(s.song);
    const midi = new alphaTab.midi.MidiFile();
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midi);
    const gen = new alphaTab.midi.MidiFileGenerator(score, new alphaTab.Settings(), handler);
    gen.generate();
    // 8 mesures jouées (0 1 2 3 1 2 4 5) de 4 noires à 960 ticks.
    const bars = 8;
    expect(gen.tickLookup.masterBars.length).toBe(bars);
  });

  it('accords, bends et slides réglés se dessinent sans erreur', () => {
    let s = createEditorState(createSong({ bars: 2 }));
    s = applyChord(s, [0, 1, 0, 2, 3, -1], 'C');
    s = moveRightFree(s);
    s = setFret(s, 7);
    s = setNoteEffect(s, 'bend', { type: 'pre-bend-release', semitones: 3 });
    s = moveRightFree(s);
    s = setFret(s, 5);
    s = setNoteEffect(s, 'slide', 'in-above');
    const score = toAlphaTabScore(s.song);
    const beats = score.tracks[0].staves[0].bars[0].voices[0].beats;
    expect(beats[0].chordId).toBeTruthy();
    expect(beats[1].notes[0].hasBend).toBe(true);
    expect(beats[2].notes[0].slideInType).toBe(alphaTab.model.SlideInType.IntoFromAbove);
  });
});
