/**
 * Gammes, modes, arpèges sur le manche
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Afficher une gamme sur le manche (le calcul est prêt)
 *  - Positions CAGED et 3 notes par corde
 *  - Identification d’accords (notation-pro/chords.ts)
 */
export const SCALES: Record<string, number[]> = {
  'majeure': [0, 2, 4, 5, 7, 9, 11],
  'mineure naturelle': [0, 2, 3, 5, 7, 8, 10],
  'mineure harmonique': [0, 2, 3, 5, 7, 8, 11],
  'pentatonique mineure': [0, 3, 5, 7, 10],
  'pentatonique majeure': [0, 2, 4, 7, 9],
  'blues': [0, 3, 5, 6, 7, 10],
  'dorien': [0, 2, 3, 5, 7, 9, 10],
  'phrygien': [0, 1, 3, 5, 7, 8, 10],
  'lydien': [0, 2, 4, 6, 7, 9, 11],
  'mixolydien': [0, 2, 4, 5, 7, 9, 10],
  'locrien': [0, 1, 3, 5, 6, 8, 10],
};

/** Positions (corde 1 = aiguë) d'une gamme sur un manche. */
export function scaleOnFretboard(rootPc: number, scale: number[], tuning: number[], maxFret = 15) {
  const set = new Set(scale.map((i) => (rootPc + i) % 12));
  const out: Array<{ string: number; fret: number; isRoot: boolean }> = [];
  tuning.forEach((open, si) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = (open + fret) % 12;
      if (set.has(pc)) out.push({ string: si + 1, fret, isRoot: pc === rootPc });
    }
  });
  return out;
}
