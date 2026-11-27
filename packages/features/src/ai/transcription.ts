/**
 * Transcription audio → tablature par IA
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Modèle de transcription polyphonique (type Basic Pitch / MT3) côté serveur ou ONNX local
 *  - Estimation des cordes/frettes via editing/auto-fingering.ts
 *  - Interface de correction
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function transcribe(_audio: ArrayBuffer, _opts: { instrument: 'guitar' | 'bass'; tuning: number[] }): Promise<Song> {
  return notImplemented('ai-transcription');
}
