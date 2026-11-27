/**
 * Statistiques de pratique
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Temps passé par morceau et par section
 *  - Tempo maximal atteint par boucle
 *  - Courbe de progression
 */
import { notImplemented } from '../shared';

export interface PracticeSession {
  songTitle: string;
  startedAt: string;
  seconds: number;
  maxSpeed: number;
  loop?: { fromBar: number; toBar: number };
}

export function recordSession(_s: PracticeSession): void {
  notImplemented('practice-stats');
}
