/**
 * Synchro du groupe en direct
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Session locale (WebRTC / réseau local)
 *  - Position partagée, chacun sur sa partie
 */
import { notImplemented } from '../shared';

export function joinBandSession(_code: string): Promise<never> {
  return notImplemented('band-sync');
}
