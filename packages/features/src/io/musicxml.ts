/**
 * MusicXML : export (l’import passe déjà par alphaTab)
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Écrire partwise MusicXML 4.0 : parts, measures, notes, technical (string/fret)
 *  - Tester l’ouverture dans MuseScore, Dorico, Sibelius
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function exportMusicXml(_song: Song): string {
  return notImplemented('musicxml');
}
