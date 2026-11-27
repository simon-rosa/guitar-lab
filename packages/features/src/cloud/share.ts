/**
 * Partage par lien avec lecteur intégré
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Lien en lecture seule sans compte
 *  - Lecteur web léger (alphaTab en mode lecture)
 */
import { notImplemented } from '../shared';

export function createShareLink(_songId: string): Promise<string> {
  return notImplemented('share-link');
}
