import type { Bar, Beat, Direction, Duration, MasterBar, Song, Tuplet, Voice } from './model';

/** Résolution MIDI standard (ticks par noire). */
export const PPQ = 960;

const TUPLET_DENOMINATOR: Record<Tuplet, number> = { 3: 2, 5: 4, 6: 4, 7: 4, 9: 8, 10: 8, 11: 8, 12: 8 };

/**
 * Nombre de notes « normales » remplacées par le n-olet (3 → 2, 5 → 4…).
 * Les n-olets rares venus d'un fichier importé (13, 15…) prennent la puissance de 2 inférieure.
 */
export function tupletDenominator(tuplet: number): number {
  return TUPLET_DENOMINATOR[tuplet as Tuplet] ?? 2 ** Math.floor(Math.log2(Math.max(2, tuplet)));
}

export function tupletRatio(tuplet?: Tuplet): number {
  return tuplet ? tupletDenominator(tuplet) / tuplet : 1;
}

/** Durée d'un temps en ticks (PPQ = noire). */
export function beatTicks(beat: Pick<Beat, 'duration' | 'dots' | 'tuplet'>): number {
  const base = (PPQ * 4) / beat.duration;
  const dotted = beat.dots === 1 ? base * 1.5 : beat.dots === 2 ? base * 1.75 : base;
  return Math.round(dotted * tupletRatio(beat.tuplet));
}

export function barCapacityTicks(mb: MasterBar): number {
  const [num, den] = mb.timeSignature;
  return Math.round((PPQ * 4 * num) / den);
}

export function voiceTicks(voice: Voice): number {
  return voice.beats.reduce((sum, b) => sum + beatTicks(b), 0);
}

export type FillStatus = 'empty' | 'incomplete' | 'full' | 'overfull';

export function voiceFillStatus(voice: Voice, mb: MasterBar): FillStatus {
  if (voice.beats.length === 0) return 'empty';
  const used = voiceTicks(voice);
  const cap = barCapacityTicks(mb);
  if (used === cap) return 'full';
  return used < cap ? 'incomplete' : 'overfull';
}

export function barFillStatus(bar: Bar, mb: MasterBar): FillStatus {
  const statuses = bar.voices.filter((v) => v.beats.length > 0).map((v) => voiceFillStatus(v, mb));
  if (statuses.length === 0) return 'empty';
  if (statuses.includes('overfull')) return 'overfull';
  if (statuses.includes('incomplete')) return mb.anacrusis ? 'full' : 'incomplete';
  return 'full';
}

/**
 * Décompose un nombre de ticks en silences de durées standard
 * (du plus long au plus court, avec points si possible).
 */
export function ticksToDurations(ticks: number): Array<Pick<Beat, 'duration' | 'dots'>> {
  const out: Array<Pick<Beat, 'duration' | 'dots'>> = [];
  let rest = ticks;
  const candidates: Array<{ duration: Duration; dots: 0 | 1 }> = [];
  for (const d of [1, 2, 4, 8, 16, 32, 64] as Duration[]) {
    candidates.push({ duration: d, dots: 1 }, { duration: d, dots: 0 });
  }
  while (rest > 0) {
    const c = candidates.find((c) => beatTicks(c) <= rest);
    if (!c) break;
    out.push({ ...c });
    rest -= beatTicks(c);
  }
  return out;
}

/** Tick absolu de début de chaque mesure (sans dérouler les reprises). */
export function masterBarStartTicks(song: Song): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const mb of song.masterBars) {
    starts.push(t);
    t += barCapacityTicks(mb);
  }
  return starts;
}

/** Tempo en vigueur à chaque mesure. */
export function tempoAtBars(song: Song): number[] {
  let current = song.tempo;
  return song.masterBars.map((mb) => {
    if (mb.tempo) current = mb.tempo;
    return current;
  });
}

/** Durée totale du morceau en secondes (sans reprises). */
export function songDurationSeconds(song: Song): number {
  const tempos = tempoAtBars(song);
  return song.masterBars.reduce((sum, mb, i) => sum + (barCapacityTicks(mb) / PPQ) * (60 / tempos[i]), 0);
}

/** Renvois D.C. / D.S. : cible du saut, repère où s'arrêter, repère où reprendre. */
const JUMPS: Array<{ jump: Direction; target: Direction | null; until: Direction | null; resume: Direction | null }> = [
  { jump: 'da-capo', target: null, until: null, resume: null },
  { jump: 'da-capo-al-coda', target: null, until: 'to-coda', resume: 'coda' },
  { jump: 'da-capo-al-fine', target: null, until: 'fine', resume: null },
  { jump: 'dal-segno', target: 'segno', until: null, resume: null },
  { jump: 'dal-segno-al-coda', target: 'segno', until: 'to-coda', resume: 'coda' },
  { jump: 'dal-segno-al-fine', target: 'segno', until: 'fine', resume: null },
];

/**
 * Ordre de lecture des mesures : reprises, 1re/2e fois, D.C., D.S., Coda et Fine,
 * avec les mêmes règles que le lecteur d'alphaTab (chaque renvoi n'est pris qu'une
 * fois ; après un renvoi, les reprises ne sont jouées qu'une fois, avec la dernière fin).
 */
export function playbackBarOrder(song: Song): number[] {
  const mbs = song.masterBars;
  const has = (k: number, d: Direction) => !!mbs[k]?.directions?.includes(d);
  const find = (d: Direction, from: number, backwardsFirst: boolean): number => {
    const scan = (step: number) => {
      for (let k = from; k >= 0 && k < mbs.length; k += step) if (has(k, d)) return k;
      return -1;
    };
    const first = scan(backwardsFirst ? -1 : 1);
    return first !== -1 ? first : scan(backwardsFirst ? 1 : -1);
  };
  /** Plus grand numéro de fin alternative du groupe de reprise qui contient la mesure k. */
  const lastEnding = (k: number): number => {
    let max = 0;
    for (let j = k; j < mbs.length; j++) {
      if (j > k && mbs[j].repeat?.start) break;
      for (const e of mbs[j].repeat?.alternateEndings ?? []) max = Math.max(max, e);
    }
    return max;
  };

  const order: number[] = [];
  const taken = new Set<number>();
  let active: (typeof JUMPS)[number] | null = null;
  let finalPass = false;
  let i = 0;
  let repeatStart = 0;
  let pass = 1;
  let guard = 0;
  while (i < mbs.length && guard++ < 100_000) {
    const mb = mbs[i];
    if (mb.repeat?.start && pass === 1 && order[order.length - 1] !== i) repeatStart = i;
    const endings = mb.repeat?.alternateEndings;
    if (endings && endings.length > 0 && !endings.includes(finalPass ? lastEnding(i) : pass)) {
      i++;
      continue;
    }
    order.push(i);
    const endCount = mb.repeat?.endCount;
    const willRepeat = !!endCount && !finalPass && pass < endCount;

    if (!active && !willRepeat && !taken.has(i)) {
      const jump = JUMPS.find((j) => has(i, j.jump) && (j.target === null || find(j.target, i, true) !== -1));
      if (jump) {
        taken.add(i);
        active = jump;
        finalPass = true;
        pass = 1;
        i = jump.target === null ? 0 : find(jump.target, i, true);
        repeatStart = i;
        continue;
      }
    } else if (active?.until && has(i, active.until)) {
      if (active.resume === null) break;
      const k = find(active.resume, i, false);
      if (k !== -1) {
        active = null;
        finalPass = false;
        pass = 1;
        i = k;
        repeatStart = k;
        continue;
      }
    }

    if (willRepeat) {
      pass++;
      i = repeatStart;
      continue;
    }
    if (endCount) {
      pass = 1;
      repeatStart = i + 1;
    }
    i++;
  }
  return order;
}

const FRACTIONS: Array<[number, string]> = [
  [0, ''], [1 / 8, '⅛'], [1 / 6, '⅙'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [5 / 6, '⅚'], [7 / 8, '⅞'],
];

/** 3,5 → « 3½ », 0,25 → « ¼ », 2,333… → « 2⅓ » ; sinon un nombre à une décimale (« 2,1 »). */
export function formatBeats(v: number): string {
  const whole = Math.floor(v + 1e-6);
  const frac = v - whole;
  const match = FRACTIONS.find(([f]) => Math.abs(frac - f) < 0.01);
  if (match) return whole === 0 && match[1] ? match[1] : `${whole}${match[1]}`;
  if (Math.abs(frac - 1) < 0.01) return String(whole + 1);
  return v.toFixed(1).replace('.', ',');
}

/** Unité de compte selon la signature : « temps » en x/4, sinon la valeur de note (croches en 6/8…). */
const UNIT_NAMES: Record<number, string> = { 1: 'rondes', 2: 'blanches', 4: 'temps', 8: 'croches', 16: 'doubles', 32: 'triples' };

export interface BarFillInfo {
  status: FillStatus;
  /** Temps occupés par les notes et silences de la voix concernée. */
  used: number;
  /** Temps que contient la mesure (le numérateur de la signature). */
  total: number;
  unit: string;
  /** « 3½ / 4 temps ». */
  text: string;
  /** « il manque ½ temps », « ½ temps en trop », ou vide. */
  detail: string;
}

/**
 * Remplissage d'une mesure compté en temps de la signature. On décrit la voix
 * fautive (trop longue d'abord, sinon incomplète), sinon la voix 1.
 */
export function barFillInfo(bar: Bar, mb: MasterBar): BarFillInfo {
  const status = barFillStatus(bar, mb);
  const voices = bar.voices.filter((v) => v.beats.length > 0);
  const cap = barCapacityTicks(mb);
  const voice =
    voices.find((v) => voiceTicks(v) > cap) ?? voices.find((v) => voiceTicks(v) < cap) ?? voices[0] ?? bar.voices[0];
  const [num, den] = mb.timeSignature;
  const unitTicks = (PPQ * 4) / den;
  const used = (voice ? voiceTicks(voice) : 0) / unitTicks;
  const unit = UNIT_NAMES[den] ?? `${den}e`;
  const diff = Math.abs(num - used);
  const detail =
    status === 'incomplete' ? `il manque ${formatBeats(diff)} ${unit}` : status === 'overfull' ? `${formatBeats(diff)} ${unit} en trop` : '';
  return { status, used, total: num, unit, text: `${formatBeats(used)} / ${num} ${unit}`, detail };
}
