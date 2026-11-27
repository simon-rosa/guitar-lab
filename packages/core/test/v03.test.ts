import { describe, expect, it } from 'vitest';
import {
  applyChord,
  CHORD_QUALITIES,
  createEditorState,
  createSong,
  duplicateBars,
  findVoicings,
  playbackBarOrder,
  setCursor,
  setFret,
  setNoteEffect,
  songToAlphaTex,
  updateMasterBar,
  voicingLabel,
  type EditorState,
} from '../src';

const q = (id: string) => CHORD_QUALITIES.find((x) => x.id === id)!;
const STD = [64, 59, 55, 50, 45, 40];

describe('bibliothèque d’accords', () => {
  it('propose d’abord les accords ouverts classiques en accordage standard', () => {
    expect(voicingLabel(findVoicings(STD, 'C', q('maj'))[0].frets)).toBe('x32010');
    expect(voicingLabel(findVoicings(STD, 'A', q('m'))[0].frets)).toBe('x02210');
    expect(voicingLabel(findVoicings(STD, 'E', q('5'))[0].frets)).toBe('022xxx');
  });

  it('chaque doigté calculé contient toutes les notes obligatoires, fondamentale à la basse', () => {
    for (const quality of CHORD_QUALITIES) {
      const voicings = findVoicings(STD, 'Bb', quality);
      expect(voicings.length).toBeGreaterThan(0);
      for (const v of voicings) {
        const played = v.frets.map((f, i) => (f >= 0 ? (STD[i] + f) % 12 : -1)).filter((p) => p >= 0);
        const lowest = v.frets.map((f, i) => ({ f, i })).filter((x) => x.f >= 0).at(-1)!;
        expect((STD[lowest.i] + lowest.f) % 12).toBe(10); // Si♭
        const optional = new Set((quality.optional ?? []).map((i) => (10 + i) % 12));
        for (const iv of quality.intervals) {
          const pc = (10 + iv) % 12;
          if (!optional.has(pc)) expect(played).toContain(pc);
        }
      }
    }
  });

  it('fonctionne avec d’autres accordages (drop D, basse, 7 cordes)', () => {
    expect(findVoicings([64, 59, 55, 50, 45, 38], 'D', q('5')).length).toBeGreaterThan(0);
    expect(findVoicings([43, 38, 33, 28], 'A', q('5')).length).toBeGreaterThan(0);
    expect(findVoicings([64, 59, 55, 50, 45, 40, 35], 'G', q('maj')).length).toBeGreaterThan(0);
  });

  it('applyChord pose toutes les notes et le nom de l’accord', () => {
    let s = createEditorState(createSong({ bars: 2 }));
    s = applyChord(s, [0, 1, 0, 2, 3, -1], 'C');
    const beat = s.song.tracks[0].bars[0].voices[0].beats[0];
    expect(beat.notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['1:0', '2:1', '3:0', '4:2', '5:3']);
    expect(beat.effects.chord).toBe('C');
    expect(s.song.tracks[0].chords[0].name).toBe('C');
    expect(s.cursor.string).toBe(5);
    expect(songToAlphaTex(s.song)).toContain('ch "C"');
  });
});

describe('techniques fines', () => {
  it('bend : amplitude et type réglables', () => {
    let s = setFret(createEditorState(createSong({ bars: 1 })), 7);
    s = setNoteEffect(s, 'bend', { type: 'pre-bend-release', semitones: 3 });
    expect(songToAlphaTex(s.song)).toContain('b (6 0)');
    s = setNoteEffect(s, 'bend', { type: 'bend', semitones: 1 });
    expect(songToAlphaTex(s.song)).toContain('b (0 2)');
    s = setNoteEffect(s, 'bend', undefined);
    expect(s.song.tracks[0].bars[0].voices[0].beats[0].notes[0].effects.bend).toBeUndefined();
  });

  it('slide : direction', () => {
    let s = setFret(createEditorState(createSong({ bars: 1 })), 5);
    s = setNoteEffect(s, 'slide', 'in-below');
    expect(songToAlphaTex(s.song)).toContain('sib');
    s = setNoteEffect(s, 'slide', 'out-up');
    expect(songToAlphaTex(s.song)).toContain('sou');
  });
});

describe('duplication de mesures', () => {
  it('copie les notes de toutes les pistes juste après, avec de nouveaux identifiants', () => {
    let s: EditorState = createEditorState(createSong({ bars: 3 }));
    s = setFret(s, 3);
    s = updateMasterBar(s, 0, { section: { marker: 'A', text: 'Intro' }, repeat: { start: true } });
    s = duplicateBars(s, 0);
    expect(s.song.masterBars).toHaveLength(4);
    const [b0, b1] = s.song.tracks[0].bars;
    expect(b1.voices[0].beats[0].notes[0].fret).toBe(3);
    expect(b1.voices[0].beats[0].id).not.toBe(b0.voices[0].beats[0].id);
    expect(s.song.masterBars[1].section).toBeUndefined();
    expect(s.song.masterBars[1].repeat).toBeUndefined();
    expect(s.cursor.bar).toBe(1);
  });

  it('duplique une plage de mesures', () => {
    let s = createEditorState(createSong({ bars: 4 }));
    s = setFret(setCursor(s, { bar: 2 }), 9);
    s = duplicateBars(s, 1, 2);
    expect(s.song.masterBars).toHaveLength(6);
    expect(s.song.tracks[0].bars[4].voices[0].beats[0].notes[0].fret).toBe(9);
  });
});

describe('renvois D.C. / D.S. / Coda', () => {
  const song = (dirs: Record<number, string[]>, bars = 6) => {
    let s = createEditorState(createSong({ bars }));
    for (const [i, d] of Object.entries(dirs)) s = updateMasterBar(s, Number(i), { directions: d as never });
    return s.song;
  };

  it('D.C. al Fine', () => {
    expect(playbackBarOrder(song({ 1: ['fine'], 3: ['da-capo-al-fine'] }, 4))).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it('D.S. al Coda avec To Coda', () => {
    const order = playbackBarOrder(song({ 1: ['segno'], 2: ['to-coda'], 3: ['dal-segno-al-coda'], 4: ['coda'] }, 6));
    expect(order).toEqual([0, 1, 2, 3, 1, 2, 4, 5]);
  });

  it('D.C. simple : rejoue tout une fois', () => {
    expect(playbackBarOrder(song({ 2: ['da-capo'] }, 3))).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('exporte les renvois en alphaTex', () => {
    const tex = songToAlphaTex(song({ 1: ['segno'], 3: ['dal-segno-al-coda'] }, 4));
    expect(tex).toContain('\\jump Segno');
    expect(tex).toContain('\\jump DalSegnoAlCoda');
  });
});
