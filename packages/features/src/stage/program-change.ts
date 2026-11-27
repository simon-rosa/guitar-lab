/**
 * MIDI Program Change automatique (Kemper, Helix, Quad Cortex)
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Marqueurs de changement de preset dans la partition
 *  - Envoi PC/CC sur la sortie MIDI au bon moment
 */
import { notImplemented } from '../shared';

export interface PresetChange {
  bar: number;
  beat: number;
  channel: number;
  program: number;
  cc?: Array<[number, number]>;
}

export function schedulePresetChanges(_changes: PresetChange[]): void {
  notImplemented('program-change');
}
