/**
 * Format natif Guitar Lab (.glab) : JSON documenté et versionné.
 * Ouvert par conception : n'importe quel outil peut le lire ou l'écrire.
 */
import { FORMAT_VERSION, type Song } from '../model';
import { createBar } from '../factory';

export const NATIVE_EXTENSION = 'glab';
export const NATIVE_MIME = 'application/vnd.guitarlab+json';

interface NativeFile {
  app: 'guitar-lab';
  formatVersion: number;
  savedAt: string;
  song: Song;
}

export function serializeSong(song: Song, pretty = false): string {
  const file: NativeFile = { app: 'guitar-lab', formatVersion: FORMAT_VERSION, savedAt: new Date().toISOString(), song };
  return JSON.stringify(file, null, pretty ? 2 : undefined);
}

export class NativeFormatError extends Error {}

export function deserializeSong(text: string): Song {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NativeFormatError('Fichier illisible : ce n’est pas du JSON valide.');
  }
  const file = data as Partial<NativeFile>;
  if (file.app !== 'guitar-lab' || !file.song) throw new NativeFormatError('Ce fichier n’est pas un fichier Guitar Lab.');
  if ((file.formatVersion ?? 0) > FORMAT_VERSION)
    throw new NativeFormatError('Ce fichier a été créé par une version plus récente de Guitar Lab.');
  return migrate(normalize(file.song));
}

/** Répare les incohérences (pistes plus courtes que la partition, voix manquantes…). */
export function normalize(song: Song): Song {
  const bars = song.masterBars.length;
  for (const t of song.tracks) {
    while (t.bars.length < bars) t.bars.push(createBar());
    if (t.bars.length > bars) t.bars.length = bars;
    for (const b of t.bars) if (b.voices.length === 0) b.voices.push({ beats: [] });
    t.chords ??= [];
    t.displayTranspose ??= 0;
  }
  return song;
}

/** Migrations successives entre versions du format. */
function migrate(song: Song): Song {
  // v1 : format initial. Ajouter ici les migrations futures (v1 → v2 …).
  song.formatVersion = FORMAT_VERSION;
  return song;
}
