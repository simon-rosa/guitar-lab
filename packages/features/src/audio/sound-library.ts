/**
 * Banque de sons échantillonnés multi-couches
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Format de banque (SFZ ou SF3 multi-couches)
 *  - Téléchargement à la demande et cache local
 *  - Sélection automatique selon Track.program
 */
import { notImplemented } from '../shared';

export interface SoundBank {
  id: string;
  name: string;
  url: string;
  sizeMb: number;
  programs: number[];
}

export const DEFAULT_SOUNDFONT = 'sonivox.sf2';

export function installSoundBank(_bank: SoundBank): Promise<void> {
  return notImplemented('realistic-sounds');
}
