/**
 * Batterie : grille step-sequencer et mapping General MIDI
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Grille de saisie type step-sequencer (lignes = éléments, colonnes = pas)
 *  - Mapping GM complet et kits personnalisés
 *  - Notation percussion propre (têtes de notes, hampes)
 */
import { notImplemented } from '../shared';

/** Principales touches General MIDI de percussion. */
export const GM_DRUMS = {
  kick: 36, snare: 38, rimshot: 37, clap: 39, hihatClosed: 42, hihatPedal: 44, hihatOpen: 46,
  tomLow: 45, tomMid: 47, tomHigh: 50, crash: 49, ride: 51, rideBell: 53, china: 52, splash: 55, cowbell: 56,
} as const;

export interface StepPattern {
  steps: number;
  rows: Array<{ key: number; hits: boolean[] }>;
}

export function patternToBeats(_pattern: StepPattern): never {
  return notImplemented('drums');
}
