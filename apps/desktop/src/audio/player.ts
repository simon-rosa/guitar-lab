/**
 * Moteur de rendu et de lecture, adossé à alphaTab.
 * Un seul AlphaTabApi pour toute l'application : il dessine la partition
 * (Song → alphaTex → Score) et joue le MIDI généré avec la SoundFont SONiVOX.
 */
import * as alphaTab from '@coderline/alphatab';
import { AlphaTexError, cursorFromAlphaTabBeat, findAlphaTabBeat, stringFromAlphaTabNote, toAlphaTabScore } from '@guitar-lab/alphatab-bridge';
import type { Cursor, Song } from '@guitar-lab/core';
import { useApp } from '../app/store';

type Api = alphaTab.AlphaTabApi;

export interface RenderOptions {
  tracks: number[];
  zoom: number;
  layout: 'page' | 'horizontal';
  dark: boolean;
}

const MIXER_KEYS = new Set(['volume', 'pan', 'mute', 'solo']);

/** Vrai si seuls les réglages de mixage diffèrent (immer garde l'identité du reste). */
function onlyMixerChanged(a: Song, b: Song): boolean {
  if (a.meta !== b.meta || a.masterBars !== b.masterBars || a.tempo !== b.tempo || a.tracks.length !== b.tracks.length) return false;
  return a.tracks.every((ta, i) => {
    const tb = b.tracks[i];
    if (ta === tb) return true;
    return (Object.keys(ta) as Array<keyof typeof ta>).every((k) => MIXER_KEYS.has(k) || ta[k] === tb[k]);
  });
}

class Player {
  api: Api | null = null;
  score: alphaTab.model.Score | null = null;
  private lastSong: Song | null = null;
  private lastOpts = '';
  private loopLastTick = 0;
  private onRendered: Array<() => void> = [];
  /** Clic sur un temps ou une note dans la partition. */
  onBeatClick: ((c: Omit<Cursor, 'string'> & { string?: number }) => void) | null = null;

  mount(element: HTMLElement, scrollElement: HTMLElement) {
    if (this.api) this.destroy();
    const settings = new alphaTab.Settings();
    settings.core.fontDirectory = '/font/';
    settings.core.includeNoteBounds = true;
    settings.core.logLevel = alphaTab.LogLevel.Warning;
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = '/soundfont/sonivox.sf2';
    settings.player.scrollElement = scrollElement;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    // Les clics servent à l'édition, pas à déplacer la tête de lecture.
    settings.player.enableUserInteraction = false;
    settings.display.padding = [20, 20, 20, 20];
    const api = new alphaTab.AlphaTabApi(element, settings);
    this.api = api;

    api.soundFontLoad.on((e) => useApp.getState().setPlayer({ loadingSoundFont: e.total ? e.loaded / e.total : 0 }));
    api.playerReady.on(() => useApp.getState().setPlayer({ ready: true, loadingSoundFont: 1 }));
    api.playerStateChanged.on((e) => useApp.getState().setPlayer({ playing: e.state === alphaTab.synth.PlayerState.Playing }));
    api.playerPositionChanged.on((e) => {
      const st = useApp.getState();
      st.setPlayer({ currentTime: e.currentTime, endTime: e.endTime });
      // Boucle progressive : à chaque retour en début de boucle, +5 %.
      if (st.player.looping && st.player.progressiveLoop && e.currentTick < this.loopLastTick - 10) {
        const speed = Math.min(1, Math.round((st.player.speed + 0.05) * 100) / 100);
        this.setSpeed(speed);
      }
      this.loopLastTick = e.currentTick;
    });
    api.playedBeatChanged.on((beat) => {
      useApp.getState().setPlayer({ playingBeat: cursorFromAlphaTabBeat(beat) });
    });
    api.beatMouseDown.on((beat) => this.onBeatClick?.(cursorFromAlphaTabBeat(beat)));
    api.noteMouseDown.on((note) => this.onBeatClick?.({ ...cursorFromAlphaTabBeat(note.beat), string: stringFromAlphaTabNote(note) }));
    api.postRenderFinished.on(() => {
      const cbs = this.onRendered;
      this.onRendered = [];
      cbs.forEach((cb) => cb());
      window.dispatchEvent(new CustomEvent('guitarlab:rendered'));
    });
    api.error.on((e) => useApp.getState().notify(`Rendu : ${e.message}`, 'error'));
  }

  destroy() {
    this.api?.destroy();
    this.api = null;
    this.score = null;
    this.lastSong = null;
  }

  /** Redessine si le morceau ou les options ont changé. */
  render(song: Song, opts: RenderOptions) {
    const api = this.api;
    if (!api) return;
    const optsKey = JSON.stringify(opts);
    if (song === this.lastSong && optsKey === this.lastOpts) return;
    const songChanged = song !== this.lastSong && !(this.lastSong && onlyMixerChanged(this.lastSong, song));
    if (!songChanged && optsKey === this.lastOpts) {
      // Seul le mixeur a bougé : pas de re-rendu, mise à jour live.
      this.lastSong = song;
      this.updateMixer(song);
      return;
    }
    this.lastSong = song;
    this.lastOpts = optsKey;
    try {
      if (songChanged || !this.score) {
        this.score = toAlphaTabScore(song, api.settings);
        this.applyMixer(song, this.score);
      }
      useApp.getState().setRenderError(null);
    } catch (e) {
      const msg = e instanceof AlphaTexError ? `${e.message}\n${e.diagnostics.join('\n')}` : String(e);
      useApp.getState().setRenderError(msg);
      console.error(msg, e instanceof AlphaTexError ? e.tex : '');
      return;
    }
    // Les nuances ne s'affichent que si le morceau en contient (sinon alphaTab montre un « f » par défaut).
    const usesDynamics = song.tracks.some((t) => t.bars.some((b) => b.voices.some((v) => v.beats.some((x) => x.effects.dynamic))));
    api.settings.notation.elements.set(alphaTab.NotationElement.EffectDynamics, usesDynamics);
    api.settings.display.scale = opts.zoom;
    api.settings.display.layoutMode = opts.layout === 'page' ? alphaTab.LayoutMode.Page : alphaTab.LayoutMode.Horizontal;
    const res = api.settings.display.resources;
    const ink = alphaTab.model.Color.fromJson(opts.dark ? '#e8e6e1' : '#1d1f24')!;
    const soft = alphaTab.model.Color.fromJson(opts.dark ? '#8a8f98' : '#6b7079')!;
    res.mainGlyphColor = ink;
    res.secondaryGlyphColor = soft;
    res.scoreInfoColor = ink;
    res.staffLineColor = soft;
    res.barSeparatorColor = soft;
    res.barNumberColor = soft;
    api.updateSettings();
    api.renderScore(this.score!, opts.tracks.filter((t) => t < this.score!.tracks.length));
  }

  whenRendered(cb: () => void) {
    this.onRendered.push(cb);
  }

  /** Volume / pan / mute / solo : appliqués au Score avant la génération MIDI. */
  private applyMixer(song: Song, score: alphaTab.model.Score) {
    song.tracks.forEach((t, i) => {
      const pi = score.tracks[i]?.playbackInfo;
      if (!pi) return;
      pi.volume = Math.round(t.volume * 16);
      pi.balance = Math.round((t.pan + 1) * 8);
      pi.isMute = t.mute;
      pi.isSolo = t.solo;
      if (t.kind !== 'drums') pi.program = t.program;
    });
  }

  /** Mise à jour live du mixeur sans re-rendu. */
  updateMixer(song: Song) {
    if (!this.api || !this.score) return;
    const tracks = this.score.tracks;
    song.tracks.forEach((t, i) => {
      const at = tracks[i];
      if (!at) return;
      this.api!.changeTrackMute([at], t.mute);
      this.api!.changeTrackSolo([at], t.solo);
      this.api!.changeTrackVolume([at], t.volume / 0.8);
    });
  }

  // ------------------------------------------------------------ transport

  playPause() {
    this.api?.playPause();
  }

  stop() {
    this.api?.stop();
  }

  playFrom(c: Cursor) {
    const api = this.api;
    if (!api || !this.score) return;
    const beat = findAlphaTabBeat(this.score, c);
    if (beat) api.tickPosition = beat.absolutePlaybackStart;
    api.play();
  }

  setSpeed(speed: number) {
    if (this.api) this.api.playbackSpeed = speed;
    useApp.getState().setPlayer({ speed });
  }

  setMetronome(on: boolean) {
    if (this.api) this.api.metronomeVolume = on ? 1 : 0;
    useApp.getState().setPlayer({ metronome: on });
  }

  setCountIn(on: boolean) {
    if (this.api) this.api.countInVolume = on ? 1 : 0;
    useApp.getState().setPlayer({ countIn: on });
  }

  /** Boucle entre deux positions (bornes incluses). */
  setLoop(from: Cursor | null, to: Cursor | null) {
    const api = this.api;
    if (!api) return;
    if (!from || !to || !this.score) {
      api.playbackRange = null;
      api.isLooping = false;
      useApp.getState().setPlayer({ looping: false });
      return;
    }
    const a = findAlphaTabBeat(this.score, from);
    const b = findAlphaTabBeat(this.score, to);
    if (!a || !b) return;
    const range = new alphaTab.synth.PlaybackRange();
    range.startTick = Math.min(a.absolutePlaybackStart, b.absolutePlaybackStart);
    range.endTick = Math.max(a.absolutePlaybackStart + a.playbackDuration, b.absolutePlaybackStart + b.playbackDuration);
    api.playbackRange = range;
    api.isLooping = true;
    api.tickPosition = range.startTick;
    useApp.getState().setPlayer({ looping: true });
  }

  print() {
    this.api?.print(undefined, { display: { scale: 0.9 } });
  }

  /** Rectangle (relatif au conteneur alphaTab) du temps et de la note sous le curseur. */
  cursorBounds(c: Cursor): { beat: alphaTab.rendering.Bounds; note?: alphaTab.rendering.Bounds; bar?: alphaTab.rendering.Bounds; stringY?: number } | null {
    const api = this.api;
    if (!api || !this.score) return null;
    const lookup = api.boundsLookup;
    if (!lookup) return null;
    const bar = this.score.tracks[c.track]?.staves[0]?.bars[c.bar];
    if (!bar) return null;
    // Voix absente du rendu (voix 2 vide) : on se cale sur la voix 1.
    const voice = bar.voices[c.voice] ?? bar.voices[0];
    const beats = voice.beats;
    const append = c.beat >= beats.length;
    const beat = beats[Math.min(c.beat, beats.length - 1)];
    // Un temps a des bornes par portée (partition, tablature) : on les réunit.
    const all = beat ? lookup.findBeats(beat) ?? [] : [];
    if (all.length === 0) return null;
    const union = (rs: alphaTab.rendering.Bounds[]) => {
      const x = Math.min(...rs.map((r) => r.x));
      const y = Math.min(...rs.map((r) => r.y));
      return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y } as alphaTab.rendering.Bounds;
    };
    const beatRect = union(all.map((b) => b.realBounds));
    const barBounds = union(all.map((b) => b.barBounds.realBounds));
    if (append) {
      const x = beatRect.x + beatRect.w;
      return { beat: { x, y: beatRect.y, w: Math.max(14, Math.min(40, barBounds.x + barBounds.w - x - 4)), h: beatRect.h } as alphaTab.rendering.Bounds, bar: barBounds };
    }
    // Note : de préférence la frette sur la tablature (dernière portée).
    let noteBounds: alphaTab.rendering.Bounds | undefined;
    for (const bb of all) {
      const nb = bb.notes?.find((n) => stringFromAlphaTabNote(n.note) === c.string)?.noteHeadBounds;
      if (nb) noteBounds = nb;
    }
    return { beat: beatRect, note: noteBounds, bar: barBounds, stringY: noteBounds ? undefined : this.stringY(c, beats, lookup) };
  }

  /**
   * Ordonnée de la corde du curseur sur la tablature, déduite d'une note
   * de la même mesure (la tablature est la portée la plus basse).
   */
  private stringY(c: Cursor, beats: alphaTab.model.Beat[], lookup: alphaTab.rendering.BoundsLookup): number | undefined {
    const staff = this.score?.tracks[c.track]?.staves[0];
    if (!staff || !staff.showTablature || staff.isPercussion) return undefined;
    const spacing = (this.api?.settings.display.resources.engravingSettings.tabLineSpacing ?? 13) * (this.api?.settings.display.scale ?? 1);
    const ordered = [...beats.slice(Math.min(c.beat, beats.length - 1)), ...beats];
    for (const b of ordered) {
      const all = lookup.findBeats(b);
      if (!all?.length) continue;
      const tab = [...all].sort((x, y) => x.realBounds.y - y.realBounds.y).at(-1)!;
      const ref = tab.notes?.[0];
      if (!ref) continue;
      const y = ref.noteHeadBounds.y + ref.noteHeadBounds.h / 2;
      return y + (c.string - stringFromAlphaTabNote(ref.note)) * spacing;
    }
    return undefined;
  }
}

export const player = new Player();
