import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FEATURES,
  featureStats,
  NotImplementedError,
  practice_tuner,
  input_midi_input,
  notation_pro_chords,
  notation_pro_charts,
  practice_theory,
  cloud_versions,
  audio_export,
  stage_setlist,
  io_musicxml,
} from '../src';
import { createSong, GUITAR_TUNINGS } from '@guitar-lab/core';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('registre', () => {
  it('a des identifiants uniques', () => {
    const ids = FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pointe vers des fichiers qui existent', () => {
    const missing = FEATURES.map((f) => f.module.split(' + ')[0]).filter((p) => !existsSync(repoRoot + p));
    expect(missing).toEqual([]);
  });

  it('a tout le MVP au moins partiellement fait', () => {
    expect(FEATURES.filter((f) => f.priority === 'MVP' && f.status === 'skeleton')).toEqual([]);
    expect(featureStats().all.total).toBe(FEATURES.length);
  });
});

describe('accordeur', () => {
  const sine = (freq: number, sr = 44100, n = 4096) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / sr) + 0.2 * Math.sin((4 * Math.PI * freq * i) / sr);
    return a;
  };

  it.each([82.41, 110, 146.83, 196, 246.94, 329.63, 41.2])('détecte %f Hz', (freq) => {
    const r = practice_tuner.detectPitch(sine(freq, 44100, 8192), 44100);
    expect(r).not.toBeNull();
    expect(Math.abs(r!.frequency - freq) / freq).toBeLessThan(0.005);
  });

  it('nomme la note et l’écart en cents', () => {
    expect(practice_tuner.frequencyToNote(440)).toEqual({ midi: 69, name: 'A4', cents: 0 });
    expect(practice_tuner.frequencyToNote(445).cents).toBe(20);
  });

  it('ignore le silence', () => {
    expect(practice_tuner.detectPitch(new Float32Array(4096), 44100)).toBeNull();
  });
});

describe('saisie MIDI', () => {
  const std = GUITAR_TUNINGS[0].pitches;
  it('place la note près de la corde du curseur', () => {
    expect(input_midi_input.pitchToPosition(64, std, 0, 1)).toEqual({ string: 1, fret: 0 });
    expect(input_midi_input.pitchToPosition(64, std, 0, 2)).toEqual({ string: 2, fret: 5 });
    expect(input_midi_input.pitchToPosition(30, std, 0, 1)).toBeNull();
  });
});

describe('modules utilitaires', () => {
  it('identifie les accords', () => {
    expect(notation_pro_chords.identifyChord([45, 52, 57, 60, 64])).toBe('Am');
    expect(notation_pro_chords.identifyChord([43, 47, 50, 55, 59, 65])).toBe('G7');
    expect(notation_pro_chords.identifyChord([52, 55, 60])).toBe('C/E');
  });

  it('calcule les degrés Nashville', () => {
    expect(notation_pro_charts.nashvilleDegree(7, 0)).toBe('5');
    expect(notation_pro_charts.nashvilleDegree(10, 0)).toBe('b7');
  });

  it('place une gamme sur le manche', () => {
    const pts = practice_theory.scaleOnFretboard(9, practice_theory.SCALES['pentatonique mineure'], GUITAR_TUNINGS[0].pitches, 12);
    expect(pts.filter((p) => p.string === 6).map((p) => p.fret)).toEqual([0, 3, 5, 8, 10, 12]);
  });

  it('compare deux versions', () => {
    const a = createSong({ bars: 3 });
    const b = structuredClone(a);
    b.masterBars[1].tempo = 90;
    expect(cloud_versions.changedBars(a, b)).toEqual([1]);
  });

  it('encode un WAV', () => {
    const wav = audio_export.encodeWav([new Float32Array([0, 0.5, -0.5])], 48000);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(wav.length).toBe(44 + 6);
  });

  it('réordonne une setlist', () => {
    const list = { id: 's', name: 'Concert', items: ['a', 'b', 'c'].map((t) => ({ songId: t, title: t })) };
    expect(stage_setlist.moveItem(list, 0, 2).items.map((i) => i.title)).toEqual(['b', 'c', 'a']);
  });

  it('signale clairement les squelettes', () => {
    expect(() => io_musicxml.exportMusicXml(createSong())).toThrow(NotImplementedError);
  });
});
