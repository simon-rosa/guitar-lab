/**
 * Export audio WAV / MP3 / FLAC et stems
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Rendu hors ligne via l’API exportAudio d’alphaTab
 *  - Une piste = un fichier (stems)
 *  - Encodage MP3/FLAC côté Rust (Tauri)
 */
import { notImplemented } from '../shared';

export interface AudioExportOptions {
  format: 'wav' | 'mp3' | 'flac';
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24;
  stems: boolean;
}

/** Encode des échantillons PCM flottants en WAV (16 bits). */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const frames = channels[0]?.length ?? 0;
  const n = channels.length;
  const data = new DataView(new ArrayBuffer(44 + frames * n * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  data.setUint32(4, 36 + frames * n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, n, true);
  data.setUint32(24, sampleRate, true);
  data.setUint32(28, sampleRate * n * 2, true);
  data.setUint16(32, n * 2, true);
  data.setUint16(34, 16, true);
  str(36, 'data');
  data.setUint32(40, frames * n * 2, true);
  let o = 44;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < n; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  return new Uint8Array(data.buffer);
}

export function exportAudio(_opts: AudioExportOptions): Promise<Uint8Array[]> {
  return notImplemented('audio-export');
}
