/**
 * Générateur d’exercices techniques
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Alternate picking, legato, sweep, string skipping
 *  - Paramètres : gamme, position, tempo cible
 *  - Progression automatique
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export type ExerciseKind = 'alternate-picking' | 'legato' | 'sweep' | 'string-skipping' | 'chromatic';

export function generateExercise(_kind: ExerciseKind, _opts: { tempo: number; bars: number }): Song {
  return notImplemented('exercise-generator');
}
