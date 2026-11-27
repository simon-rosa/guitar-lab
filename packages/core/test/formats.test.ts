import { describe, expect, it } from 'vitest';
import {
  createEditorState,
  createSong,
  deserializeSong,
  exportAsciiTab,
  exportMidi,
  importAsciiTab,
  moveRight,
  serializeSong,
  setFret,
  songToAlphaTex,
  parsePitch,
  pitchName,
  comboFromEvent,
  buildKeyLookup,
  DEFAULT_KEYMAP,
  findConflicts,
} from '../src';

function riff() {
  let s = createEditorState(createSong({ title: 'Riff', bars: 1 }));
  for (const f of [0, 3, 5, 3]) s = moveRight(setFret(s, f));
  return s.song;
}

describe('format natif', () => {
  it('fait un aller-retour sans perte', () => {
    const song = riff();
    expect(deserializeSong(serializeSong(song))).toEqual(song);
  });
  it('refuse un fichier étranger', () => {
    expect(() => deserializeSong('{"foo":1}')).toThrow();
  });
});

describe('hauteurs', () => {
  it('convertit noms et numéros MIDI', () => {
    expect(parsePitch('E2')).toBe(40);
    expect(parsePitch('C4')).toBe(60);
    expect(parsePitch('Bb3')).toBe(58);
    expect(pitchName(61)).toBe('C#4');
  });
});

describe('alphaTex', () => {
  it('génère pistes, accordage et notes', () => {
    const tex = songToAlphaTex(riff());
    expect(tex).toContain('\\title "Riff"');
    expect(tex).toContain('\\tuning (E4 B3 G3 D3 A2 E2)');
    expect(tex).toContain('0.1.4 3.1.4 5.1.4 3.1.4');
  });
});

describe('tablature ASCII', () => {
  it('exporte puis réimporte les frettes', () => {
    const ascii = exportAsciiTab(riff());
    expect(ascii.split('\n').find((l) => l.startsWith('e|'))).toContain('0---3---5---3');
    const back = importAsciiTab(ascii);
    expect(back.tracks[0].tuning).toEqual([64, 59, 55, 50, 45, 40]);
    expect(back.tracks[0].bars[0].voices[0].beats.map((b) => b.notes[0].fret)).toEqual([0, 3, 5, 3]);
    expect(back.tracks[0].bars[0].voices[0].beats.map((b) => b.duration)).toEqual([4, 4, 4, 4]);
  });

  it('lit une tab de site avec effets', () => {
    const text = `
e|-------------|
B|-------------|
G|-----5h7-----|
D|-5-7-------x-|
A|-------------|
E|-------------|`;
    const song = importAsciiTab(text);
    const beats = song.tracks[0].bars[0].voices[0].beats;
    expect(beats.map((b) => b.notes.map((n) => `${n.string}:${n.fret}`).join())).toEqual(['4:5', '4:7', '3:5', '3:7', '4:0']);
    expect(beats[2].notes[0].effects.hammerPull).toBe(true);
    expect(beats[4].notes[0].effects.dead).toBe(true);
  });
});

describe('MIDI', () => {
  it('produit un fichier SMF valide', () => {
    const bytes = exportMidi(riff());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    // format 1, 2 pistes (tempo + guitare), 960 PPQ
    expect([...bytes.slice(8, 14)]).toEqual([0, 1, 0, 2, 0x03, 0xc0]);
    // 4 note-on (0x90) sur la guitare
    const noteOns = [...bytes].filter((b, i) => b === 0x90 && bytes[i + 2] > 0).length;
    expect(noteOns).toBeGreaterThanOrEqual(4);
  });
});

describe('raccourcis', () => {
  it('normalise les combinaisons', () => {
    expect(comboFromEvent({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe('Ctrl+z');
    expect(comboFromEvent({ key: 'ArrowRight', ctrlKey: false, metaKey: false, shiftKey: true, altKey: false })).toBe('Shift+ArrowRight');
    expect(comboFromEvent({ key: '¡', code: 'Digit1', ctrlKey: false, metaKey: false, shiftKey: false, altKey: true })).toBe('Alt+1');
    expect(buildKeyLookup(DEFAULT_KEYMAP).get('h')).toBe('note.hammer');
  });
  it('n’a aucun conflit dans la disposition par défaut', () => {
    expect(findConflicts(DEFAULT_KEYMAP)).toEqual([]);
  });
});
