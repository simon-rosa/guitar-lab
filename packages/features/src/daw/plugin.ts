/**
 * Guitar Lab en plugin VST3 / AU / ARA dans le DAW
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Cible JUCE ou nih-plug embarquant la vue web
 *  - Synchronisation avec la timeline de l’hôte
 *  - ARA2 pour lire l’audio de l’hôte (transcription)
 */
import { notImplemented } from '../shared';

export function hostInfo(): never {
  return notImplemented('daw-plugin');
}
