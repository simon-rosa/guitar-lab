import type { Duration } from '@guitar-lab/core';

/** Durées avec leur nom français, leur symbole et leur valeur en temps (noire = 1). */
export const DURATION_INFO: Array<{ d: Duration; label: string; short: string; glyph: string; beats: string }> = [
  { d: 1, label: 'Ronde', short: 'Ronde', glyph: '𝅝', beats: '4 temps' },
  { d: 2, label: 'Blanche', short: 'Blanche', glyph: '𝅗𝅥', beats: '2 temps' },
  { d: 4, label: 'Noire', short: 'Noire', glyph: '♩', beats: '1 temps' },
  { d: 8, label: 'Croche', short: 'Croche', glyph: '♪', beats: '½ temps' },
  { d: 16, label: 'Double croche', short: 'Double', glyph: '𝅘𝅥𝅯', beats: '¼ temps' },
  { d: 32, label: 'Triple croche', short: 'Triple', glyph: '𝅘𝅥𝅰', beats: '⅛ temps' },
  { d: 64, label: 'Quadruple croche', short: 'Quadruple', glyph: '𝅘𝅥𝅱', beats: '1/16 temps' },
];

export const durationName = (d: Duration) => DURATION_INFO.find((x) => x.d === d)?.label.toLowerCase() ?? '';
