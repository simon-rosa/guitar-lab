/**
 * Humanisation du rendu
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Variations aléatoires reproductibles (graine) de timing ±10 ms
 *  - Variations de vélocité ±8
 *  - Accentuation des temps forts
 */
import { notImplemented } from '../shared';

export interface HumanizeOptions {
  timingMs: number;
  velocity: number;
  seed: number;
}

export function humanize(_opts: HumanizeOptions): never {
  return notImplemented('humanize');
}
