/**
 * Setlists de concert
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Liste ordonnée de morceaux avec notes par morceau
 *  - Enchaînement automatique, préchargement du suivant
 *  - Export / partage avec le groupe
 */
import { notImplemented } from '../shared';

export interface SetlistItem {
  songId: string;
  title: string;
  notes?: string;
  transpose?: number;
  tempoOverride?: number;
}

export interface Setlist {
  id: string;
  name: string;
  date?: string;
  items: SetlistItem[];
}

export function moveItem(list: Setlist, from: number, to: number): Setlist {
  const items = [...list.items];
  const [it] = items.splice(from, 1);
  items.splice(to, 0, it);
  return { ...list, items };
}

export function openSetlist(_list: Setlist): void {
  notImplemented('setlists');
}
