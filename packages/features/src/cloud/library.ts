/**
 * Bibliothèque personnelle
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Dossiers, tags, recherche par titre / artiste / accordage / difficulté
 *  - Index local (IndexedDB) + cloud
 */
import { notImplemented } from '../shared';

export interface LibraryEntry {
  id: string;
  title: string;
  artist: string;
  tuning: string;
  tags: string[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
}

export function searchLibrary(_query: string): Promise<LibraryEntry[]> {
  return notImplemented('library');
}
