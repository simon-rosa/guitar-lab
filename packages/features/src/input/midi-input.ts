/**
 * Saisie MIDI pas à pas : chaque note jouée sur un clavier ou une guitare MIDI
 * est placée sur le manche puis écrite au curseur.
 * Priorité : V1 — statut partiel (temps réel + quantification à faire).
 */

export interface MidiNoteEvent {
  pitch: number;
  velocity: number;
  /** Canal 1-16 : sur une guitare MIDI, un canal par corde (mode mono). */
  channel: number;
}

/**
 * Choisit la corde et la frette pour une hauteur, en privilégiant la corde
 * du curseur puis les cordes voisines, et les frettes basses.
 */
export function pitchToPosition(
  pitch: number,
  tuning: number[],
  capo: number,
  preferredString: number,
  maxFret = 24,
): { string: number; fret: number } | null {
  const options = tuning
    .map((open, i) => ({ string: i + 1, fret: pitch - open - capo }))
    .filter((o) => o.fret >= 0 && o.fret <= maxFret);
  if (options.length === 0) return null;
  options.sort((a, b) => Math.abs(a.string - preferredString) * 3 + a.fret * 0.2 - (Math.abs(b.string - preferredString) * 3 + b.fret * 0.2));
  return options[0];
}

/** Guitare MIDI en mode « un canal par corde » (canal 1 = corde 1). */
export function guitarChannelPosition(e: MidiNoteEvent, tuning: number[], capo: number) {
  const string = e.channel;
  if (string < 1 || string > tuning.length) return null;
  const fret = e.pitch - tuning[string - 1] - capo;
  return fret >= 0 ? { string, fret } : null;
}

/** Écoute toutes les entrées MIDI (Web MIDI). Renvoie une fonction d'arrêt. */
export async function listenMidiInputs(onNote: (e: MidiNoteEvent) => void): Promise<{ stop: () => void; inputs: string[] }> {
  const nav = globalThis.navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
  if (!nav?.requestMIDIAccess) throw new Error('Le MIDI n’est pas disponible dans ce navigateur.');
  const access = await nav.requestMIDIAccess();
  const handler = (msg: MIDIMessageEvent) => {
    const d = msg.data;
    if (!d || d.length < 3) return;
    const status = d[0] & 0xf0;
    if (status === 0x90 && d[2] > 0) onNote({ pitch: d[1], velocity: d[2], channel: (d[0] & 0x0f) + 1 });
  };
  const inputs = [...access.inputs.values()];
  inputs.forEach((i) => i.addEventListener('midimessage', handler as EventListener));
  return {
    inputs: inputs.map((i) => i.name ?? i.id),
    stop: () => inputs.forEach((i) => i.removeEventListener('midimessage', handler as EventListener)),
  };
}
