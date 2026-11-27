/**
 * Export MIDI (Standard MIDI File, type 1, PPQ 960).
 * Une piste MIDI par piste Guitar Lab + une piste de tempo.
 * Les reprises sont déroulées ; les liaisons prolongent la note précédente.
 */
import type { Song } from '../model';
import { notePitch } from '../pitch';
import { barCapacityTicks, beatTicks, playbackBarOrder, PPQ, tempoAtBars } from '../timing';

function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const ascii = (s: string) => [...new TextEncoder().encode(s)];

interface Ev {
  tick: number;
  /** Ordre à tick égal : note-off avant note-on. */
  order: number;
  data: number[];
}

function chunk(events: Ev[]): number[] {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const body: number[] = [];
  let last = 0;
  for (const e of events) {
    body.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  body.push(0x00, 0xff, 0x2f, 0x00);
  return [...ascii('MTrk'), ...u32(body.length), ...body];
}

const DYNAMIC_VELOCITY: Record<string, number> = { ppp: 20, pp: 35, p: 50, mp: 64, mf: 80, f: 96, ff: 112, fff: 127 };

export function exportMidi(song: Song): Uint8Array {
  const order = playbackBarOrder(song);
  const tempos = tempoAtBars(song);
  const tracks: number[][] = [];

  // Piste 0 : tempo, signatures, nom.
  const meta: Ev[] = [{ tick: 0, order: 0, data: [0xff, 0x03, ...vlq(ascii(song.meta.title).length), ...ascii(song.meta.title)] }];
  let tick = 0;
  let prevTempo = -1;
  let prevTs = '';
  for (const bi of order) {
    const mb = song.masterBars[bi];
    if (tempos[bi] !== prevTempo) {
      const us = Math.round(60_000_000 / tempos[bi]);
      meta.push({ tick, order: 0, data: [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff] });
      prevTempo = tempos[bi];
    }
    const ts = mb.timeSignature.join('/');
    if (ts !== prevTs) {
      meta.push({ tick, order: 0, data: [0xff, 0x58, 0x04, mb.timeSignature[0], Math.log2(mb.timeSignature[1]), 24, 8] });
      prevTs = ts;
    }
    tick += barCapacityTicks(mb);
  }
  tracks.push(chunk(meta));

  // Solo : si au moins une piste est en solo, seules celles-ci sont exportées.
  const anySolo = song.tracks.some((t) => t.solo);
  song.tracks.forEach((t) => {
    if (t.mute || (anySolo && !t.solo)) return;
    const ch = Math.max(0, Math.min(15, t.channel - 1));
    const evs: Ev[] = [
      { tick: 0, order: 0, data: [0xff, 0x03, ...vlq(ascii(t.name).length), ...ascii(t.name)] },
      { tick: 0, order: 1, data: [0xc0 | ch, t.program & 0x7f] },
      { tick: 0, order: 1, data: [0xb0 | ch, 7, Math.round(t.volume * 127)] },
      { tick: 0, order: 1, data: [0xb0 | ch, 10, Math.round((t.pan + 1) * 63.5)] },
    ];
    let barStart = 0;
    let velocity = 96;
    // Note en cours par corde, pour prolonger les liaisons.
    const open = new Map<number, { pitch: number; offIndex: number }>();
    for (const bi of order) {
      const mb = song.masterBars[bi];
      for (const voice of t.bars[bi].voices) {
        let pos = barStart;
        for (const beat of voice.beats) {
          const len = beatTicks(beat);
          if (beat.effects.dynamic) velocity = DYNAMIC_VELOCITY[beat.effects.dynamic];
          for (const n of beat.notes) {
            const pitch = t.kind === 'drums' ? n.fret : notePitch(t.tuning, t.capo, n.string, n.fret);
            if (pitch < 0 || pitch > 127) continue;
            const prev = open.get(n.string);
            if (n.tie && prev && prev.pitch === pitch) {
              evs[prev.offIndex].tick = pos + len;
              continue;
            }
            const vel = n.effects.ghost ? Math.round(velocity * 0.5) : n.effects.accent ? Math.min(127, velocity + 20) : velocity;
            const dur = n.effects.dead ? Math.min(len, PPQ / 8) : n.effects.staccato ? Math.round(len / 2) : len;
            evs.push({ tick: pos, order: 2, data: [0x90 | ch, pitch, Math.max(1, vel)] });
            evs.push({ tick: pos + dur, order: 0, data: [0x80 | ch, pitch, 0] });
            open.set(n.string, { pitch, offIndex: evs.length - 1 });
          }
          pos += len;
        }
      }
      barStart += barCapacityTicks(mb);
    }
    tracks.push(chunk(evs));
  });

  const header = [...ascii('MThd'), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
  return new Uint8Array([...header, ...tracks.flat()]);
}
