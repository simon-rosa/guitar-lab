/**
 * Doigté automatique : la position la plus jouable
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Recherche du chemin de coût minimal (programmation dynamique) sur les positions possibles
 *  - Coût = déplacement de la main + écart des doigts + préférence cordes à vide
 *  - Respect des notes verrouillées par l’utilisateur
 */
import { notImplemented } from '../shared';

export interface Position {
  string: number;
  fret: number;
}

/** Toutes les positions possibles d'une hauteur sur un accordage. */
export function positionsFor(pitch: number, tuning: number[], capo = 0, maxFret = 24): Position[] {
  return tuning
    .map((open, i) => ({ string: i + 1, fret: pitch - open - capo }))
    .filter((p) => p.fret >= 0 && p.fret <= maxFret);
}

export function optimalFingering(_pitches: number[][], _tuning: number[]): Position[][] {
  return notImplemented('auto-fingering');
}
