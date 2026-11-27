/**
 * Export audio du morceau (WAV ou MP3), pour le faire écouter sans l'app.
 *
 * 1. alphaTab rejoue le morceau hors temps réel avec les mêmes sons que la lecture ;
 * 2. la même chaîne d'effets (compresseur + réverbération) est appliquée hors ligne ;
 * 3. le résultat est normalisé puis encodé (WAV 16 bits, ou MP3 192 kb/s).
 */
import * as alphaTab from '@coderline/alphatab';
import { buildEffects } from './fx';
import { player } from './player';

export type AudioFormat = 'wav' | 'mp3';

export interface RenderOptions {
  metronome: boolean;
  reverb: number;
  onProgress?: (ratio: number, label: string) => void;
  signal?: AbortSignal;
}

const SAMPLE_RATE = 44100;
/** Queue de réverbération / de relâchement des notes ajoutée à la fin. */
const TAIL_SECONDS = 2;

export interface RenderedAudio {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  seconds: number;
}

/** Joue le morceau hors temps réel et renvoie le signal stéréo, effets compris. */
export async function renderSong(opts: RenderOptions): Promise<RenderedAudio> {
  const api = player.api;
  if (!api || !player.score) throw new Error('Le lecteur n’est pas prêt.');
  const options = new alphaTab.synth.AudioExportOptions();
  options.sampleRate = SAMPLE_RATE;
  options.masterVolume = 1;
  options.metronomeVolume = opts.metronome ? 1 : 0;
  options.useSyncPoints = false;
  const exporter = await api.exportAudio(options);
  const chunks: Float32Array[] = [];
  let total = 0;
  try {
    for (;;) {
      if (opts.signal?.aborted) throw new DOMException('Export annulé', 'AbortError');
      const chunk = await exporter.render(1000);
      if (!chunk) break;
      chunks.push(chunk.samples);
      total += chunk.samples.length;
      opts.onProgress?.(chunk.endTime ? (chunk.currentTime / chunk.endTime) * 0.8 : 0, 'Lecture du morceau…');
    }
  } finally {
    exporter.destroy();
  }
  // Échantillons entrelacés gauche / droite.
  const frames = Math.floor(total / 2);
  const tail = Math.round(TAIL_SECONDS * SAMPLE_RATE);
  const offline = new OfflineAudioContext(2, frames + tail, SAMPLE_RATE);
  const buf = offline.createBuffer(2, frames, SAMPLE_RATE);
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  let k = 0;
  for (const c of chunks) {
    for (let i = 0; i + 1 < c.length; i += 2) {
      l[k] = c[i];
      r[k] = c[i + 1];
      k++;
    }
  }
  opts.onProgress?.(0.82, 'Réverbération…');
  const src = offline.createBufferSource();
  src.buffer = buf;
  const fx = buildEffects(offline, opts.reverb);
  src.connect(fx.input);
  fx.out.connect(offline.destination);
  src.start();
  const out = await offline.startRendering();
  const left = out.getChannelData(0);
  const right = out.getChannelData(1);
  // Normalisation à -1 dBFS : un volume confortable sans saturation.
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  if (peak === 0) throw new Error('Le morceau ne contient aucune note à faire entendre.');
  const gain = 0.891 / peak;
  for (let i = 0; i < left.length; i++) {
    left[i] *= gain;
    right[i] *= gain;
  }
  return { left, right, sampleRate: SAMPLE_RATE, seconds: left.length / SAMPLE_RATE };
}

const clamp16 = (v: number) => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));

export function encodeWav(a: RenderedAudio): Uint8Array {
  const n = a.left.length;
  const bytes = new Uint8Array(44 + n * 4);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 4, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 2, true); // stéréo
  v.setUint32(24, a.sampleRate, true);
  v.setUint32(28, a.sampleRate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    v.setInt16(o, clamp16(a.left[i]), true);
    v.setInt16(o + 2, clamp16(a.right[i]), true);
    o += 4;
  }
  return bytes;
}

export async function encodeMp3(a: RenderedAudio, onProgress?: (r: number) => void): Promise<Uint8Array> {
  // Encodeur chargé à la demande (bibliothèque LAME, licence LGPL, fichier séparé).
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const enc = new Mp3Encoder(2, a.sampleRate, 192);
  const block = 1152 * 20;
  const parts: Uint8Array[] = [];
  const l16 = new Int16Array(block);
  const r16 = new Int16Array(block);
  for (let i = 0; i < a.left.length; i += block) {
    const len = Math.min(block, a.left.length - i);
    for (let j = 0; j < len; j++) {
      l16[j] = clamp16(a.left[i + j]);
      r16[j] = clamp16(a.right[i + j]);
    }
    const out = enc.encodeBuffer(l16.subarray(0, len), r16.subarray(0, len));
    if (out.length) parts.push(new Uint8Array(out));
    if ((i / block) % 20 === 0) {
      onProgress?.(i / a.left.length);
      await new Promise((res) => setTimeout(res, 0)); // laisse l'interface respirer
    }
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  const size = parts.reduce((s, p) => s + p.length, 0);
  const mp3 = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    mp3.set(p, o);
    o += p.length;
  }
  return mp3;
}

// ------------------------------------------------------------ archive .zip (sans compression)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Archive .zip contenant un seul fichier, stocké tel quel. */
export function zipSingle(name: string, data: Uint8Array): Uint8Array {
  const fname = new TextEncoder().encode(name);
  const crc = crc32(data);
  const local = new Uint8Array(30 + fname.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(4, 20, true);
  lv.setUint16(6, 0x0800, true); // noms en UTF-8
  lv.setUint32(14, crc, true);
  lv.setUint32(18, data.length, true);
  lv.setUint32(22, data.length, true);
  lv.setUint16(26, fname.length, true);
  local.set(fname, 30);
  const central = new Uint8Array(46 + fname.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(4, 20, true);
  cv.setUint16(6, 20, true);
  cv.setUint16(8, 0x0800, true);
  cv.setUint32(16, crc, true);
  cv.setUint32(20, data.length, true);
  cv.setUint32(24, data.length, true);
  cv.setUint16(28, fname.length, true);
  central.set(fname, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length + data.length, true);
  const out = new Uint8Array(local.length + data.length + central.length + end.length);
  out.set(local, 0);
  out.set(data, local.length);
  out.set(central, local.length + data.length);
  out.set(end, local.length + data.length + central.length);
  return out;
}
