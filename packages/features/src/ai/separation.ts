/**
 * Séparation de pistes par IA
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Modèle de séparation (type Demucs) local ou serveur
 *  - Isoler guitare / basse / batterie / voix
 */
import { notImplemented } from '../shared';

export function separateStems(_audio: ArrayBuffer): Promise<Record<'guitar' | 'bass' | 'drums' | 'vocals' | 'other', ArrayBuffer>> {
  return notImplemented('stem-separation');
}
