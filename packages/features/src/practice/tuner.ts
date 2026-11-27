/**
 * Accordeur chromatique : détection de hauteur par l'algorithme YIN
 * (de Cheveigné & Kawahara, 2002). Fonctions pures, testables sans micro ;
 * l'interface (apps/desktop/src/components/TunerDialog.tsx) branche le micro.
 */

export interface PitchResult {
  frequency: number;
  /** 0..1, confiance de la détection. */
  clarity: number;
}

export function detectPitch(samples: Float32Array, sampleRate: number, threshold = 0.12): PitchResult | null {
  const half = Math.floor(samples.length / 2);
  const minLag = Math.floor(sampleRate / 1400); // ~ 1400 Hz max
  const maxLag = Math.min(half, Math.floor(sampleRate / 25)); // ~ 25 Hz min (basse 6 cordes)
  let rms = 0;
  for (let i = 0; i < samples.length; i++) rms += samples[i] * samples[i];
  if (Math.sqrt(rms / samples.length) < 0.01) return null; // silence

  const diff = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  // Différence cumulée normalisée.
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += diff[tau];
    cmnd[tau] = running === 0 ? 1 : (diff[tau] * tau) / running;
  }
  let tau = -1;
  for (let t = Math.max(2, minLag); t <= maxLag; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // Interpolation parabolique autour du minimum.
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau < maxLag ? cmnd[tau + 1] : cmnd[tau];
  const denom = 2 * (2 * cmnd[tau] - x2 - x0);
  const better = denom !== 0 ? tau + (x2 - x0) / denom : tau;
  return { frequency: sampleRate / better, clarity: 1 - cmnd[tau] };
}

export interface NoteReading {
  midi: number;
  name: string;
  /** Écart en cents par rapport à la note la plus proche (-50..+50). */
  cents: number;
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToNote(freq: number, a4 = 440): NoteReading {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  return { midi, name: `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`, cents: Math.round((exact - midi) * 100) };
}

/** Corde la plus proche dans un accordage (pour le mode « guitare »). */
export function nearestString(midiFloat: number, tuning: number[]): { string: number; cents: number } {
  let best = { string: 1, cents: Infinity };
  tuning.forEach((p, i) => {
    const c = (midiFloat - p) * 100;
    if (Math.abs(c) < Math.abs(best.cents)) best = { string: i + 1, cents: Math.round(c) };
  });
  return best;
}

export function midiFloat(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}
