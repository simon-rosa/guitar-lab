/**
 * Import PowerTab (.ptb), TuxGuitar (.tg), MuseScore (.mscz)
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Lecteur PowerTab binaire
 *  - TuxGuitar : format binaire documenté dans leurs sources
 *  - MuseScore : archive zip contenant du XML (.mscx)
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function importLegacy(_bytes: Uint8Array, _ext: 'ptb' | 'tg' | 'mscz'): Song {
  return notImplemented('powertab-tuxguitar');
}
