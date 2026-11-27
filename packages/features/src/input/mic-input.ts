/**
 * Saisie au micro : jouer sa guitare et la note s’écrit
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Capter l’entrée audio (getUserMedia ou interface audio via Tauri)
 *  - Détecter les attaques (onset detection) puis la hauteur (YIN, réutiliser practice/tuner.ts)
 *  - Quantifier sur la grille rythmique du tempo courant
 *  - Choisir la corde/frette via editing/auto-fingering.ts
 */
import type { Beat } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export interface MicInputOptions {
  tempo: number;
  /** Grille de quantification (8 = croche). */
  grid: 4 | 8 | 16;
  tuning: number[];
}

export interface MicInputSession {
  stop(): Beat[];
}

export function startMicInput(_opts: MicInputOptions): Promise<MicInputSession> {
  return notImplemented('mic-input');
}
