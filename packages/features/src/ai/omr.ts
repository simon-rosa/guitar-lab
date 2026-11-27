/**
 * Reconnaissance de partition depuis une photo ou un PDF
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - OMR (type Audiveris) vers MusicXML
 *  - Puis import MusicXML existant
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function recognizeScore(_image: ArrayBuffer): Promise<Song> {
  return notImplemented('omr');
}
