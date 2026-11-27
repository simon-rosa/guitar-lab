/**
 * Conducteur et parties séparées liées
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Vue conducteur (toutes les pistes, son réel)
 *  - Parties extraites avec leur propre mise en page
 *  - Transposition d’écriture par partie (Track.displayTranspose)
 *  - Pauses multi-mesures dans les parties
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export interface PartLayout {
  track: number;
  staffSize: number;
  barsPerSystem?: number;
  pageBreaks: number[];
}

export function extractPart(_song: Song, _track: number, _layout?: Partial<PartLayout>): Song {
  return notImplemented('parts');
}
