/**
 * Sortie MIDI externe
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Lister les sorties via Web MIDI (navigateur) ou midir (Tauri)
 *  - Une sortie et un canal par piste
 *  - Envoi des événements depuis le séquenceur alphaTab (midiEventsPlayed)
 */
import { notImplemented } from '../shared';

export interface MidiOutputPort {
  id: string;
  name: string;
}

export async function listMidiOutputs(): Promise<MidiOutputPort[]> {
  const nav = globalThis.navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
  if (!nav?.requestMIDIAccess) return [];
  const access = await nav.requestMIDIAccess();
  return [...access.outputs.values()].map((o) => ({ id: o.id, name: o.name ?? o.id }));
}

export function routeTrackToOutput(_track: number, _portId: string, _channel: number): void {
  notImplemented('midi-out');
}
