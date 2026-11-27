/**
 * Synchronisation cloud desktop / web / mobile
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Backend (Supabase ou équivalent) : auth + stockage
 *  - Synchro différentielle basée sur collab/realtime.ts (CRDT)
 *  - Résolution de conflits hors ligne
 */
import { notImplemented } from '../shared';

export interface CloudFile {
  id: string;
  title: string;
  updatedAt: string;
}

export function syncNow(): Promise<CloudFile[]> {
  return notImplemented('cloud-sync');
}
