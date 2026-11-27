/**
 * Paroles synchronisées aux notes, plusieurs couplets
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Saisie des syllabes temps par temps (Beat.effects.lyrics existe déjà)
 *  - Découpage automatique d’un texte en syllabes
 *  - Export vers alphaTex (\\lyrics) et MusicXML
 */
import type { Song } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export function applyLyrics(_song: Song, _track: number, _text: string, _verse = 0): Song {
  return notImplemented('lyrics');
}
