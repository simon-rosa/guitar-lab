import type { Bar, Beat, Duration, MasterBar, Song, Tuplet, Voice } from './model';

/** Résolution MIDI standard (ticks par noire). */
export const PPQ = 960;

const TUPLET_DENOMINATOR: Record<Tuplet, number> = { 3: 2, 5: 4, 6: 4, 7: 4, 9: 8, 10: 8, 11: 8, 12: 8 };

export function tupletRatio(tuplet?: Tuplet): number {
  return tuplet ? TUPLET_DENOMINATOR[tuplet] / tuplet : 1;
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

/**
 * Ordre de lecture des mesures en tenant compte des reprises et fins alternatives.
 * (Les sauts D.C./D.S./Coda sont gérés par alphaTab à la lecture ; cette fonction
 * sert à l'export MIDI maison et aux statistiques.)
 */
export function playbackBarOrder(song: Song): number[] {
  const order: number[] = [];
  let i = 0;
  let repeatStart = 0;
  let pass = 1;
  let guard = 0;
  while (i < song.masterBars.length && guard++ < 100_000) {
    const mb = song.masterBars[i];
    if (mb.repeat?.start && pass === 1 && order[order.length - 1] !== i) repeatStart = i;
    const endings = mb.repeat?.alternateEndings;
    if (endings && endings.length > 0 && !endings.includes(pass)) {
      i++;
      continue;
    }
    order.push(i);
    const endCount = mb.repeat?.endCount;
    if (endCount && pass < endCount) {
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
