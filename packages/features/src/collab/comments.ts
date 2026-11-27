/**
 * Commentaires ancrés sur une mesure ou une note
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Fils de discussion ancrés (piste, mesure, temps)
 *  - Résolution, mentions
 */
import { notImplemented } from '../shared';

export interface Comment {
  id: string;
  anchor: { track: number; bar: number; beat?: number };
  author: string;
  text: string;
  resolved: boolean;
  createdAt: string;
}

export function addComment(_c: Omit<Comment, 'id' | 'createdAt' | 'resolved'>): Promise<Comment> {
  return notImplemented('comments');
}
