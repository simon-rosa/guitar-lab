/**
 * Détection de jeu au micro (façon Rocksmith)
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Comparer en temps réel la hauteur détectée à la note attendue
 *  - Tolérance de timing réglable
 *  - Score de précision par passage
 */
import { notImplemented } from '../shared';

export interface HitResult {
  expectedPitch: number;
  detectedPitch?: number;
  timingErrorMs?: number;
  hit: boolean;
}

export function startPlayDetection(): Promise<never> {
  return notImplemented('play-detection');
}
