/**
 * Arrangement assisté
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Réduction piano d’un ensemble
 *  - Éclatement d’un accord en voix
 *  - Harmonisation d’une mélodie
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function pianoReduction(_song: Song, _tracks: number[]): Song {
  return notImplemented('arranging');
}
