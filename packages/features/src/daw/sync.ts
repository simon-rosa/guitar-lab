/**
 * Synchro DAW : MIDI Clock, MIDI Timecode, Ableton Link
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Esclave MIDI Clock (24 ppqn) et maître
 *  - MTC pour la vidéo
 *  - Ableton Link via le backend Rust (crate rusty_link)
 */
import { notImplemented } from '../shared';

export type SyncSource = 'internal' | 'midi-clock' | 'mtc' | 'link';

export function setSyncSource(_source: SyncSource): void {
  notImplemented('daw-sync');
}
