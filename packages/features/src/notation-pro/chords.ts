/**
 * Diagrammes d’accords : bibliothèque, éditeur, génération automatique
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Bibliothèque d’accords courants par accordage
 *  - Éditeur graphique de diagramme
 *  - Reconnaître le nom d’accord à partir des notes d’un temps (identifyChord est prêt)
 */
import type { ChordDiagram } from '@guitar-lab/core';
import { notImplemented } from '../shared';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUALITIES: Array<[string, number[]]> = [
  ['', [0, 4, 7]], ['m', [0, 3, 7]], ['7', [0, 4, 7, 10]], ['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]],
  ['5', [0, 7]], ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]], ['dim', [0, 3, 6]], ['aug', [0, 4, 8]], ['m7b5', [0, 3, 6, 10]],
];

/** Nomme un accord à partir de hauteurs MIDI (la plus grave sert de fondamentale probable). */
export function identifyChord(pitches: number[]): string | undefined {
  if (pitches.length < 2) return undefined;
  const classes = [...new Set(pitches.map((p) => ((p % 12) + 12) % 12))];
  const bass = ((Math.min(...pitches) % 12) + 12) % 12;
  const roots = [bass, ...classes.filter((c) => c !== bass)];
  for (const root of roots) {
    const rel = classes.map((c) => (c - root + 12) % 12).sort((a, b) => a - b);
    for (const [name, iv] of QUALITIES) {
      if (rel.length === iv.length && rel.every((v, i) => v === iv[i])) {
        return NAMES[root] + name + (root !== bass ? `/${NAMES[bass]}` : '');
      }
    }
  }
  return undefined;
}

export function chordLibrary(_tuning: number[]): ChordDiagram[] {
  return notImplemented('chord-diagrams');
}
