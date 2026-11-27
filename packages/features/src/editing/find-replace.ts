/**
 * Recherche et remplacement de motifs
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Recherche d’un motif rythmique (durées) ou mélodique (intervalles)
 *  - Remplacement global ou par piste
 *  - Prise en compte des transpositions
 */
import type { Beat, Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export interface PatternMatch {
  track: number;
  bar: number;
  beat: number;
}

export function findPattern(_song: Song, _pattern: Beat[], _mode: 'rhythm' | 'melody' | 'exact'): PatternMatch[] {
  return notImplemented('find-replace');
}
