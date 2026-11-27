/**
 * Click et cues vocaux sur une sortie dédiée
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Génération d’un click depuis la carte de tempo
 *  - Cues parlés aux changements de section (« Refrain dans 2 »)
 *  - Routage sur une sortie audio séparée (ear monitors)
 */
import { notImplemented } from '../shared';

export interface Cue {
  bar: number;
  text: string;
  barsAhead: number;
}

export function renderClickTrack(): Promise<never> {
  return notImplemented('click-cues');
}
