/**
 * Clavier virtuel
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Affichage piano des notes jouées / sous le curseur
 *  - Saisie à la souris sur le clavier
 */
import { notImplemented } from '../shared';

export const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

export function pianoView(): never {
  return notImplemented('piano');
}
