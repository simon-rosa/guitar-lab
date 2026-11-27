/**
 * Co-édition en temps réel
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Représenter le Song dans un CRDT (Yjs) : Y.Map par piste, Y.Array par voix
 *  - Curseurs des collaborateurs
 *  - Serveur de relais (y-websocket)
 */
import { notImplemented } from '../shared';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { track: number; bar: number; beat: number };
}

export function joinRoom(_roomId: string): Promise<never> {
  return notImplemented('realtime-collab');
}
