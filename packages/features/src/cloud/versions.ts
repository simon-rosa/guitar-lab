/**
 * Historique de versions et comparaison
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Instantanés horodatés
 *  - Diff mesure par mesure entre deux versions
 */
import type { Song } from '@guitar-lab/core';

/** Mesures dont le contenu diffère entre deux versions (toutes pistes confondues). */
export function changedBars(a: Song, b: Song): number[] {
  const n = Math.max(a.masterBars.length, b.masterBars.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const strip = (s: Song) =>
      JSON.stringify([s.masterBars[i], s.tracks.map((t) => t.bars[i]?.voices.map((v) => v.beats.map(({ id: _id, ...rest }) => rest)))]);
    if (strip(a) !== strip(b)) out.push(i);
  }
  return out;
}
