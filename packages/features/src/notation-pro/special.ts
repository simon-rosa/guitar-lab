/**
 * Microtonalité, accordages non tempérés, notation slash
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Altérations microtonales (¼ de ton) dans le modèle
 *  - Accordages en cents
 *  - Notation slash pour sections rythmiques
 */
import { notImplemented } from '../shared';

export interface MicrotonalPitch {
  midi: number;
  cents: number;
}

export function toMicrotonal(_pitch: MicrotonalPitch): never {
  return notImplemented('special-notation');
}
