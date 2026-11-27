/**
 * Piste audio de référence synchronisée
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Import MP3/WAV/FLAC
 *  - Détection de tempo (beat tracking) et carte de tempo calquée
 *  - Points de synchro manuels (alphaTab gère les sync points)
 */
import { notImplemented } from '../shared';

export interface SyncPoint {
  barIndex: number;
  /** Position dans l'audio, en millisecondes. */
  millis: number;
}

export function detectTempo(_samples: Float32Array, _sampleRate: number): Promise<number> {
  return notImplemented('backing-track');
}
