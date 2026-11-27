/**
 * Bibliothèque d'accords : calcule les doigtés jouables d'un accord pour
 * n'importe quel accordage (standard, drop, open, 7 cordes, basse…).
 *
 * Un doigté est un tableau de frettes par corde (index 0 = corde 1, la plus aiguë),
 * -1 pour une corde non jouée.
 */

export const CHORD_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export type ChordRoot = (typeof CHORD_ROOTS)[number];

export interface ChordQuality {
  id: string;
  /** Suffixe du nom de l'accord (Am7 → « m7 »). */
  suffix: string;
  label: string;
  /** Intervalles en demi-tons depuis la fondamentale. */
  intervals: number[];
  /** Intervalles qu'on peut omettre (la quinte, en général). */
  optional?: number[];
}

export const CHORD_QUALITIES: ChordQuality[] = [
  { id: 'maj', suffix: '', label: 'Majeur', intervals: [0, 4, 7], optional: [7] },
  { id: 'm', suffix: 'm', label: 'Mineur', intervals: [0, 3, 7], optional: [7] },
  { id: '5', suffix: '5', label: 'Power chord', intervals: [0, 7] },
  { id: '7', suffix: '7', label: '7', intervals: [0, 4, 7, 10], optional: [7] },
  { id: 'maj7', suffix: 'maj7', label: 'Maj7', intervals: [0, 4, 7, 11], optional: [7] },
  { id: 'm7', suffix: 'm7', label: 'm7', intervals: [0, 3, 7, 10], optional: [7] },
  { id: 'sus2', suffix: 'sus2', label: 'Sus2', intervals: [0, 2, 7] },
  { id: 'sus4', suffix: 'sus4', label: 'Sus4', intervals: [0, 5, 7] },
  { id: '7sus4', suffix: '7sus4', label: '7sus4', intervals: [0, 5, 7, 10], optional: [7] },
  { id: 'add9', suffix: 'add9', label: 'Add9', intervals: [0, 4, 7, 2], optional: [7] },
  { id: '6', suffix: '6', label: '6', intervals: [0, 4, 7, 9], optional: [7] },
  { id: 'm6', suffix: 'm6', label: 'm6', intervals: [0, 3, 7, 9], optional: [7] },
  { id: '9', suffix: '9', label: '9', intervals: [0, 4, 7, 10, 2], optional: [7] },
  { id: 'm9', suffix: 'm9', label: 'm9', intervals: [0, 3, 7, 10, 2], optional: [7] },
  { id: 'dim', suffix: 'dim', label: 'Diminué', intervals: [0, 3, 6] },
  { id: 'dim7', suffix: 'dim7', label: 'dim7', intervals: [0, 3, 6, 9] },
  { id: 'm7b5', suffix: 'm7b5', label: 'm7♭5', intervals: [0, 3, 6, 10] },
  { id: 'aug', suffix: 'aug', label: 'Augmenté', intervals: [0, 4, 8] },
];

export interface ChordVoicing {
  /** Frette par corde (index 0 = corde 1, aiguë), -1 = non jouée. */
  frets: number[];
  /** Plus petite frette appuyée (1 pour un accord ouvert). */
  baseFret: number;
}

export function chordName(root: ChordRoot | string, quality: ChordQuality): string {
  return `${root}${quality.suffix}`;
}

const MAX_FRET = 15;

/**
 * Doigtés de référence en accordage standard (de la corde grave à l'aiguë),
 * proposés en premier : ce sont ceux qu'on apprend et qu'on attend.
 */
const STANDARD_SHAPES: Record<string, string[]> = {
  'C:maj': ['x32010', 'x35553'], 'D:maj': ['xx0232', 'x57775'], 'E:maj': ['022100'], 'F:maj': ['133211', 'xx3211'],
  'G:maj': ['320003', '320033', '355433'], 'A:maj': ['x02220', '577655'], 'B:maj': ['x24442'],
  'C:m': ['x35543'], 'D:m': ['xx0231', 'x57765'], 'E:m': ['022000'], 'F:m': ['133111'], 'G:m': ['355333'],
  'A:m': ['x02210', '577555'], 'B:m': ['x24432'],
  'C:7': ['x32310'], 'D:7': ['xx0212'], 'E:7': ['020100', '022130'], 'G:7': ['320001'], 'A:7': ['x02020', 'x02223'], 'B:7': ['x21202'],
  'C:maj7': ['x32000'], 'D:maj7': ['xx0222'], 'E:maj7': ['021100'], 'F:maj7': ['xx3210'], 'G:maj7': ['320002'], 'A:maj7': ['x02120'],
  'D:m7': ['xx0211'], 'E:m7': ['020000', '022030'], 'A:m7': ['x02010'], 'B:m7': ['x20202'],
  'D:sus2': ['xx0230'], 'A:sus2': ['x02200'], 'D:sus4': ['xx0233'], 'E:sus4': ['022200'], 'A:sus4': ['x02230'],
  'C:add9': ['x32030'], 'G:add9': ['320203'],
  'E:5': ['022xxx'], 'F:5': ['133xxx'], 'G:5': ['355xxx'], 'A:5': ['x022xx'], 'B:5': ['x244xx'], 'C:5': ['x355xx'], 'D:5': ['xx023x', 'x577xx'],
};

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];

function parseShape(shape: string): number[] {
  // « x32010 » ou « 10-12-12-11-10-10 », de la grave vers l'aiguë.
  const parts = shape.includes('-') ? shape.split('-') : shape.split('');
  return parts.map((p) => (p === 'x' ? -1 : Number(p))).reverse();
}

/**
 * Doigtés jouables de l'accord, du plus courant au plus rare.
 * `tuning` : hauteurs MIDI à vide, corde 1 (aiguë) → corde N (grave).
 */
export function findVoicings(tuning: number[], root: ChordRoot | number, quality: ChordQuality, capo = 0, limit = 8): ChordVoicing[] {
  const n = tuning.length;
  if (n < 2) return [];
  const rootPc = typeof root === 'number' ? ((root % 12) + 12) % 12 : CHORD_ROOTS.indexOf(root);
  const pcs = new Set(quality.intervals.map((i) => (rootPc + i) % 12));
  const optional = new Set((quality.optional ?? []).map((i) => (rootPc + i) % 12));
  const required = [...pcs].filter((pc) => !optional.has(pc));
  const power = quality.id === '5';
  const open = tuning.map((p) => p + capo);
  // Accordage « en ordre » (cordes de plus en plus graves) : la fondamentale doit être à la basse.
  const ordered = open.every((p, i) => i === 0 || p <= open[i - 1]);
  const pc = (string: number, fret: number) => (open[string] + fret) % 12;

  const results = new Map<string, { v: ChordVoicing; score: number }>();
  const isStandard = capo === 0 && n === 6 && tuning.every((p, i) => p === STANDARD_TUNING[i]);
  const preferred = isStandard ? (STANDARD_SHAPES[`${CHORD_ROOTS[rootPc]}:${quality.id}`] ?? []).map(parseShape) : [];
  const minStrings = power ? 2 : Math.min(3, n);
  const maxStrings = power ? 3 : n;

  for (let base = 1; base <= MAX_FRET - 3; base++) {
    // Options par corde : à vide (si la note convient) ou dans la fenêtre [base, base+3].
    const options = open.map((_, s) => {
      const opts: number[] = [];
      if (pcs.has(pc(s, 0))) opts.push(0);
      for (let f = base; f <= base + 3; f++) if (pcs.has(pc(s, f))) opts.push(f);
      return opts;
    });
    // Bloc de cordes jouées contigu : de la corde `low` (grave) à la corde `high` (aiguë).
    for (let low = n - 1; low >= 0; low--) {
      for (let high = low; high >= 0; high--) {
        const count = low - high + 1;
        if (count < minStrings || count > maxStrings) continue;
        const frets = new Array<number>(n).fill(-1);
        const walk = (s: number) => {
          if (s < high) {
            consider(frets, base);
            return;
          }
          for (const f of options[s]) {
            if (s === low && ordered && pc(s, f) !== rootPc) continue;
            frets[s] = f;
            walk(s - 1);
          }
          frets[s] = -1;
        };
        walk(low);
      }
    }
  }

  function consider(frets: number[], base: number) {
    const played = frets.map((f, s) => ({ f, s })).filter((x) => x.f >= 0);
    const notesPc = new Set(played.map((x) => pc(x.s, x.f)));
    if (!required.every((r) => notesPc.has(r))) return;
    if (!ordered && !notesPc.has(rootPc)) return;
    const fretted = played.filter((x) => x.f > 0).map((x) => x.f);
    if (fretted.length && Math.min(...fretted) !== base && fretted.some((f) => f < base)) return;
    // Doigts : les notes à la plus petite frette peuvent être barrées avec un seul doigt.
    const minF = fretted.length ? Math.min(...fretted) : 0;
    const atMin = fretted.filter((f) => f === minF).length;
    const fingers = fretted.length - (atMin > 1 ? atMin - 1 : 0);
    if (fingers > 4) return;
    if (fretted.length && Math.max(...fretted) - minF > 3) return;
    // Un barré suppose que les cordes plus aiguës que la note barrée la plus grave ne sont pas à vide.
    const hasOpen = played.some((x) => x.f === 0);
    if (hasOpen && minF > 4) return;
    const span = fretted.length ? Math.max(...fretted) - minF : 0;
    let score = played.length * 10;
    if (power) score = 40 + (played.length === 3 ? 4 : 0) + (frets[n - 1] >= 0 ? 6 : 0) + (frets[n - 2] >= 0 ? 3 : 0);
    score -= minF * (hasOpen ? 1 : 2);
    score -= fingers * 2 + (span >= 3 ? 5 : 0);
    if (hasOpen && minF <= 3) score += 4 + played.filter((x) => x.f === 0).length;
    if (fingers === 4) score -= 3;
    if (atMin > 1 && !hasOpen) score -= 2; // barré : un peu plus difficile
    if (!power && frets[0] < 0) score -= 4; // la corde aiguë sonne mieux dans un accord gratté
    // Toutes les notes de l'accord présentes (quinte comprise) : plus plein.
    if ([...pcs].every((p) => notesPc.has(p))) score += 3;
    const key = frets.join(',');
    const prev = results.get(key);
    if (!prev || prev.score < score) results.set(key, { v: { frets: [...frets], baseFret: Math.max(1, minF) }, score });
  }

  const sorted = [...results.values()].sort((a, b) => b.score - a.score || a.v.baseFret - b.v.baseFret);
  // Variété : on évite deux doigtés presque identiques à la même position.
  const out: ChordVoicing[] = preferred.map((frets) => {
    const fretted = frets.filter((f) => f > 0);
    return { frets, baseFret: fretted.length ? Math.min(...fretted) : 1 };
  });
  for (const { v } of sorted) {
    const similar = out.some((o) => o.frets.join() === v.frets.join() || (o.baseFret === v.baseFret && o.frets.filter((f, i) => f !== v.frets[i]).length <= 1));
    if (similar) continue;
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

/** Représentation courte d'un doigté, de la corde grave à l'aiguë : « x32010 ». */
export function voicingLabel(frets: number[]): string {
  const parts = [...frets].reverse().map((f) => (f < 0 ? 'x' : String(f)));
  return parts.some((p) => p.length > 1) ? parts.join('-') : parts.join('');
}
