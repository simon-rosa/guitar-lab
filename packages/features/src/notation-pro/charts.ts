/**
 * Charts, lead sheets, Nashville Number System
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Grille d’accords (une mesure = une case)
 *  - Notation slash pour la rythmique
 *  - Conversion des accords en chiffres Nashville selon l’armure
 *  - Chiffrage jazz (Cmaj7, C△, C-7…)
 */
import { notImplemented } from '../shared';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** Degré Nashville (1-7, avec altération) d'une fondamentale dans une tonalité majeure. */
export function nashvilleDegree(rootPc: number, keyPc: number): string {
  const rel = (rootPc - keyPc + 12) % 12;
  const exact = MAJOR_SCALE.indexOf(rel);
  if (exact >= 0) return String(exact + 1);
  const below = MAJOR_SCALE.indexOf((rel + 1) % 12);
  return `b${below + 1}`;
}

export function renderChart(): never {
  return notImplemented('lead-sheets');
}
