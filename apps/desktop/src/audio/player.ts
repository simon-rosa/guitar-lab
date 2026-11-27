/**
 * Moteur de rendu et de lecture, adossé à alphaTab.
 * Un seul AlphaTabApi pour toute l'application : il dessine la partition
 * (Song → alphaTex → Score) et joue le MIDI généré : banque SONiVOX pour tous les
 * instruments, remplacée par GeneralUser GS pour le piano, les guitares, basses et batterie.
 */
import * as alphaTab from '@coderline/alphatab';
import { AlphaTexError, cursorFromAlphaTabBeat, findAlphaTabBeat, stringFromAlphaTabNote, toAlphaTabScore } from '@guitar-lab/alphatab-bridge';
import type { Cursor, Song } from '@guitar-lab/core';
import { useApp } from '../app/store';
import { isPreview } from '../app/platform';
import { bypassEffects, DEFAULT_REVERB, effectsBypassed, installOutputEffects, outputLevels, setReverb } from './fx';

installOutputEffects();

/** Instruments GeneralUser GS chargés par-dessus SONiVOX (guitares, basses, piano, batterie). */
const REALISTIC_BANKS = ['p000', 'p024', 'p025', 'p026', 'p027', 'p028', 'p029', 'p030', 'p031', 'p032', 'p033', 'p034', 'p035', 'p036', 'p037', 'p038', 'p039', 'drums'];

/** Mémorise qu'un navigateur ne lit pas les instruments réalistes : on ne les recharge plus. */
const SAFE_SOUNDS_KEY = 'guitar-lab:basic-sounds';
function basicSoundsOnly(): boolean {
  try {
    return localStorage.getItem(SAFE_SOUNDS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Banque SoundFont complète et intacte : en-tête RIFF « sfbk » et taille exacte. */
function isValidBank(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  const size = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  return tag(0) === 'RIFF' && tag(8) === 'sfbk' && size + 8 === b.length;
}

/** Lit un fichier de sons livré avec l'app (en base64 dans l'aperçu web, qui ne sert pas les banques). */
async function fetchBank(path: string): Promise<Uint8Array> {
  if (!isPreview()) {
    const res = await fetch(new URL(path, document.baseURI).href);
    if (!res.ok) throw new Error(`${path} : ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const res = await fetch(new URL(`${path}.b64.txt`, document.baseURI).href);
  if (!res.ok) throw new Error(`${path} : ${res.status}`);
  const bin = atob((await res.text()).replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

type Api = alphaTab.AlphaTabApi;

export interface RenderOptions {
  tracks: number[];
  zoom: number;
  layout: 'page' | 'horizontal';
  dark: boolean;
  /** Portées affichées pour les instruments à cordes. */
  notation: 'tab' | 'both' | 'score';
}

/** Espacement des lignes de tablature (alphaTab : 13 par défaut) : plus aéré, plus facile à viser. */
const TAB_LINE_SPACING = 20;
const TAB_FONT_SIZE = 17;
/** Hauteur réservée (avant zoom) au-dessus de chaque ligne pour l'avertissement de mesure. */
const BAR_TOOL_ROOM = 24;
/**
 * Espace libre (avant zoom) entre la barre de mesure et le bord gauche d'un nombre à deux
 * chiffres sur la première note : alphaTab le fixe à environ 15,5 et aucun réglage ne le change.
 * Les boutons + / − de la mesure tiennent dedans.
 */
export const BAR_START_ROOM = 15;

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
  /**
   * Note à faire entendre. Chaque modification recharge la musique du morceau,
   * et ce rechargement commence par un « stop » qui couperait la note : on
   * attend donc la fin du rechargement (événement midiLoaded) pour la jouer.
   */
  private pendingAudition: { cursor: Cursor; at: number; wholeBeat: boolean } | null = null;
  private unlockAudio = () => {
    // Le navigateur garde le son en veille tant qu'il n'a pas été réveillé
    // pendant un geste de l'utilisateur (clic ou touche).
    try {
      this.api?.player?.output.activate();
    } catch {
      /* lecteur pas encore prêt */
    }
  };
  private lastOpts = '';
  private loopLastTick = 0;
  private onRendered: Array<() => void> = [];

  mount(element: HTMLElement, scrollElement: HTMLElement) {
    if (this.api) this.destroy();
    const settings = new alphaTab.Settings();
    // Chemins relatifs à la page : fonctionne à la racine (Tauri, dev) comme dans un sous-dossier (aperçu en ligne).
    settings.core.fontDirectory = new URL('font/', document.baseURI).href;
    settings.core.includeNoteBounds = true;
    settings.core.logLevel = alphaTab.LogLevel.Warning;
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    // L'aperçu en ligne ne sert pas les .sf2 : la banque y est livrée en base64 (.txt) et décodée ici.
    if (!isPreview()) settings.player.soundFont = new URL('soundfont/sonivox.sf2', document.baseURI).href;
    settings.player.scrollElement = scrollElement;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    // Les clics servent à l'édition, pas à déplacer la tête de lecture.
    settings.player.enableUserInteraction = false;
    settings.display.padding = [20, 20, 20, 20];
    const api = new alphaTab.AlphaTabApi(element, settings);
    this.api = api;
    // Accès de débogage (outils de test), uniquement en développement.
    if (import.meta.env.DEV) (window as unknown as { __guitarLab: unknown }).__guitarLab = { player: this, alphaTab, store: useApp };

    if (isPreview()) void this.loadPreviewSoundFont(api);
    // Une fois la banque de base prête, on ajoute les instruments réalistes (une seule fois).
    let extrasRequested = basicSoundsOnly();
    api.soundFontLoaded.on(() => {
      if (extrasRequested) return;
      extrasRequested = true;
      void this.loadRealisticBanks(api);
    });
    api.soundFontLoad.on((e) => useApp.getState().setPlayer({ loadingSoundFont: e.total ? e.loaded / e.total : 0 }));
    api.midiLoaded.on(() => this.flushAudition());
    window.addEventListener('keydown', this.unlockAudio, true);
    window.addEventListener('pointerdown', this.unlockAudio, true);
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
      this.expectSound(beat);
    });
    api.playerStateChanged.on((e) => {
      if (e.state === alphaTab.synth.PlayerState.Playing) this.startWatchdog();
      else this.stopWatchdog();
    });
    api.postRenderFinished.on(() => {
      const cbs = this.onRendered;
      this.onRendered = [];
      cbs.forEach((cb) => cb());
      window.dispatchEvent(new CustomEvent('guitarlab:rendered'));
    });
    api.error.on((e) => useApp.getState().notify(`Rendu : ${e.message}`, 'error'));
  }

  private async loadPreviewSoundFont(api: Api) {
    try {
      api.loadSoundFont(await fetchBank('soundfont/sonivox.sf2'), false);
    } catch (e) {
      useApp.getState().notify(`Sons indisponibles : ${(e as Error).message}`, 'error');
    }
  }

  /** Vrai quand les guitares, basses et batterie réalistes sont chargées. */
  realisticReady = false;

  private async loadRealisticBanks(api: Api) {
    try {
      // Téléchargements en parallèle, ajout dans l'ordre (le dernier chargé l'emporte).
      const banks = await Promise.all(REALISTIC_BANKS.map((b) => fetchBank(`soundfont/generaluser/${b}.sf3`)));
      if (this.api !== api) return;
      // Un fichier tronqué ou altéré en route donnerait un instrument muet : on l'écarte.
      const valid = banks.filter(isValidBank);
      if (valid.length !== banks.length) console.warn(`${banks.length - valid.length} banque(s) de sons ignorée(s) (fichier incomplet).`);
      for (const bytes of valid) api.loadSoundFont(bytes, true);
      this.realisticReady = true;
      window.dispatchEvent(new CustomEvent('guitarlab:sounds-ready'));
    } catch (e) {
      console.warn('Instruments réalistes indisponibles, sons de base utilisés.', e);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.unlockAudio, true);
    window.removeEventListener('pointerdown', this.unlockAudio, true);
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
    setReverb(song.reverb ?? DEFAULT_REVERB);
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
    // Tablature seule / partition seule / les deux (la batterie garde sa portée).
    for (const t of this.score!.tracks) {
      const st = t.staves[0];
      if (st.isPercussion) continue;
      st.showTablature = opts.notation !== 'score';
      st.showStandardNotation = opts.notation !== 'tab';
    }
    const eng = api.settings.display.resources.engravingSettings;
    eng.tabLineSpacing = TAB_LINE_SPACING;
    api.settings.display.resources.tablatureFont = new alphaTab.model.Font('Arial', TAB_FONT_SIZE, alphaTab.model.FontStyle.Plain, alphaTab.model.FontWeight.Bold);
    // De la place au-dessus et en dessous de chaque ligne pour les boutons − / + des mesures.
    // Un peu de place au-dessus de chaque ligne pour l'avertissement « Trop longue / Incomplète ».
    api.settings.display.systemPaddingTop = 10;
    api.settings.display.systemPaddingBottom = 10 + BAR_TOOL_ROOM;
    api.settings.display.firstSystemPaddingTop = BAR_TOOL_ROOM;
    api.settings.display.lastSystemPaddingBottom = 5;
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

  /**
   * Fait entendre la note écrite à cette position. `immediate` : la partition
   * n'a pas changé (même frette réécrite), aucun rechargement n'aura lieu.
   */
  audition(c: Cursor, immediate = false) {
    if (!useApp.getState().auditionNotes) return;
    this.unlockAudio();
    if (immediate) this.playAuditionNote(c, false);
    else this.pendingAudition = { cursor: { ...c }, at: performance.now(), wholeBeat: false };
  }

  /** Fait entendre tout le temps (un accord) après la prochaine mise à jour de la partition. */
  auditionBeat(c: Cursor) {
    if (!useApp.getState().auditionNotes) return;
    this.unlockAudio();
    this.pendingAudition = { cursor: { ...c }, at: performance.now(), wholeBeat: true };
  }

  private flushAudition() {
    const pending = this.pendingAudition;
    this.pendingAudition = null;
    // Une demande trop ancienne ne correspond plus au geste de l'utilisateur.
    if (pending && performance.now() - pending.at < 2000) this.playAuditionNote(pending.cursor, pending.wholeBeat);
  }

  private playAuditionNote(c: Cursor, wholeBeat: boolean) {
    const api = this.api;
    const st = useApp.getState();
    if (!api || !this.score || !st.player.ready || st.player.playing) return;
    const beat = findAlphaTabBeat(this.score, c);
    if (!beat || beat.index !== c.beat) return;
    const note = beat.voice.bar.staff.isPercussion ? beat.notes[0] : beat.notes.find((n) => stringFromAlphaTabNote(n) === c.string);
    try {
      if (wholeBeat && beat.notes.length) api.playBeat(beat);
      else if (note) api.playNote(note);
    } catch {
      /* lecteur pas prêt : on ignore */
    }
  }

  // ------------------------------------------------------------ contrôle du son

  /**
   * Pendant la lecture, on vérifie qu'un temps joué avec des notes produit bien du son.
   * Sinon : effets retirés si ce sont eux qui bloquent, puis retour aux sons de base
   * si ce sont les instruments réalistes. Une fois le son constaté, on arrête de surveiller.
   */
  private soundHealthy = false;
  private watchdog: number | null = null;
  private expectedSince: number | null = null;
  private levelsSeen = { input: 0, output: 0 };

  private expectSound(beat: alphaTab.model.Beat) {
    if (this.soundHealthy || this.expectedSince !== null || beat.isRest || beat.notes.length === 0) return;
    const pi = beat.voice.bar.staff.track.playbackInfo;
    if (pi.isMute || pi.volume === 0) return;
    this.expectedSince = performance.now();
    this.levelsSeen = { input: 0, output: 0 };
  }

  private startWatchdog() {
    if (this.soundHealthy || this.watchdog !== null) return;
    this.watchdog = window.setInterval(() => this.checkSound(), 150);
  }

  private stopWatchdog() {
    if (this.watchdog !== null) window.clearInterval(this.watchdog);
    this.watchdog = null;
    this.expectedSince = null;
  }

  private checkSound() {
    const lv = outputLevels();
    const ctxRunning = (this.api?.player?.output as unknown as { context?: AudioContext } | undefined)?.context?.state === 'running';
    if (!lv || this.expectedSince === null || !ctxRunning) return;
    const seen = this.levelsSeen;
    seen.input = Number.isNaN(lv.input) || Number.isNaN(seen.input) ? Number.NaN : Math.max(seen.input, lv.input);
    seen.output = Number.isNaN(lv.output) || Number.isNaN(seen.output) ? Number.NaN : Math.max(seen.output, lv.output);
    const AUDIBLE = 0.002;
    if (seen.output > AUDIBLE) {
      this.soundHealthy = true;
      this.stopWatchdog();
      return;
    }
    if (performance.now() - this.expectedSince < 1500) return;
    // Plus d'une seconde de notes jouées sans aucun son en sortie : on cherche la cause.
    this.expectedSince = null;
    const notify = useApp.getState().notify;
    if (!effectsBypassed() && (Number.isNaN(seen.output) || seen.input > AUDIBLE || Number.isNaN(seen.input))) {
      bypassEffects();
      notify('Le son était bloqué par la réverbération : elle est désactivée pour cette séance.', 'error');
      return;
    }
    if (this.realisticReady) {
      this.fallbackToBasicSounds();
      return;
    }
    this.stopWatchdog();
    this.soundHealthy = true;
    notify('Aucun son ne sort : vérifie le volume de l’ordinateur et la sortie audio du navigateur, puis recharge la page.', 'error');
  }

  /** Recharge la seule banque SONiVOX et reprend la lecture. */
  private async fallbackToBasicSounds() {
    const api = this.api;
    if (!api) return;
    this.realisticReady = false;
    try {
      localStorage.setItem(SAFE_SOUNDS_KEY, '1');
    } catch {
      /* stockage indisponible */
    }
    useApp.getState().notify('Les instruments réalistes ne sonnent pas dans ce navigateur : retour aux sons de base.', 'error');
    try {
      const tick = api.tickPosition;
      const resume = () => {
        api.soundFontLoaded.off(resume);
        api.tickPosition = tick;
        api.play();
      };
      api.soundFontLoaded.on(resume);
      api.loadSoundFont(await fetchBank('soundfont/sonivox.sf2'), false);
    } catch (e) {
      useApp.getState().notify(`Sons indisponibles : ${(e as Error).message}`, 'error');
    }
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
    if (isPreview()) {
      useApp.getState().notify('L’impression et l’export PDF sont disponibles dans l’application desktop.', 'error');
      return;
    }
    this.api?.print(undefined, { display: { scale: 0.9 } });
  }

  /**
   * Position d'édition sous la souris : temps (ou emplacement d'ajout en fin de mesure)
   * et corde, déduite de la ligne de tablature la plus proche.
   * `x`, `y` sont relatifs au conteneur alphaTab.
   */
  hitTest(x: number, y: number, song: Song): (Omit<Cursor, 'string'> & { string?: number }) | null {
    const api = this.api;
    const lookup = api?.boundsLookup;
    if (!api || !lookup || !this.score) return null;
    const beat = lookup.getBeatAtPos(x, y);
    if (!beat) return null;
    const base = cursorFromAlphaTabBeat(beat);
    const all = lookup.findBeats(beat) ?? [];
    const modelBeats = song.tracks[base.track]?.bars[base.bar]?.voices[base.voice]?.beats ?? [];
    // Une mesure vide du modèle est dessinée avec des silences de remplissage : on vise le début.
    let beatIndex = modelBeats.length === 0 ? 0 : Math.min(base.beat, modelBeats.length);
    const right = Math.max(...all.map((b) => b.realBounds.x + b.realBounds.w));
    if (modelBeats.length > 0 && base.beat === modelBeats.length - 1 && x > right) beatIndex = modelBeats.length;
    // Corde : portée de tablature contenant le clic (la plus basse du système).
    const staff = beat.voice.bar.staff;
    let string: number | undefined;
    if (staff.showTablature && !staff.isPercussion) {
      const n = staff.tuning.length;
      for (const bb of all) {
        const r = bb.barBounds.realBounds;
        const sp = n > 1 ? r.h / (n - 1) : r.h;
        if (y >= r.y - sp * 0.8 && y <= r.y + r.h + sp * 0.8) {
          string = Math.max(1, Math.min(n, Math.round((y - r.y) / sp) + 1));
        }
      }
    }
    return { ...base, beat: beatIndex, string };
  }

  /**
   * Rectangle d'une mesure (toutes portées de la piste), relatif au conteneur alphaTab,
   * et étendue verticale de tout ce qui est dessiné sur sa ligne (`top`, `bottom`).
   */
  barRect(
    track: number,
    bar: number,
  ): { x: number; y: number; w: number; h: number; top: number; bottom: number; staffY: number; staffH: number; lines: number } | null {
    const lookup = this.api?.boundsLookup;
    const first = this.score?.tracks[track]?.staves[0]?.bars[bar]?.voices[0]?.beats[0];
    if (!lookup || !first) return null;
    const all = lookup.findBeats(first);
    if (!all?.length) return null;
    const rs = all.map((b) => b.barBounds.realBounds);
    const x = Math.min(...rs.map((r) => r.x));
    const y = Math.min(...rs.map((r) => r.y));
    // La ligne (système) couvre tout ce qui est dessiné — tempo, effets, queues de rythme.
    // Dans les limites d'alphaTab, sa marge basse est incluse (pas sa marge haute) : on la retire.
    const mb = all[0].barBounds.masterBarBounds;
    const sys = mb.realBounds;
    const systems = lookup.staffSystems;
    const display = this.api!.settings.display;
    // La dernière ligne n'inclut pas sa marge basse dans ses limites.
    const isLast = mb.staffSystemBounds === systems[systems.length - 1];
    const padBottom = isLast ? 0 : display.systemPaddingBottom * display.scale;
    // Portée la plus basse (la tablature quand elle est affichée) : ses lignes servent de repère.
    const lowest = [...rs].sort((a, b) => a.y - b.y).at(-1)!;
    const staff = first.voice.bar.staff;
    const lines = staff.showTablature && !staff.isPercussion ? staff.tuning.length : 5;
    return {
      x,
      y,
      w: Math.max(...rs.map((r) => r.x + r.w)) - x,
      h: Math.max(...rs.map((r) => r.y + r.h)) - y,
      top: sys.y,
      bottom: sys.y + sys.h - padBottom,
      staffY: lowest.y,
      staffH: lowest.h,
      lines,
    };
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
      return { beat: { x, y: beatRect.y, w: Math.max(14, Math.min(40, barBounds.x + barBounds.w - x - 4)), h: beatRect.h } as alphaTab.rendering.Bounds, bar: barBounds, stringY: this.stringY(c, beats, lookup) };
    }
    // Note : de préférence la frette sur la tablature (dernière portée).
    let noteBounds: alphaTab.rendering.Bounds | undefined;
    for (const bb of all) {
      const nb = bb.notes?.find((n) => stringFromAlphaTabNote(n.note) === c.string)?.noteHeadBounds;
      if (nb) noteBounds = nb;
    }
    return { beat: beatRect, note: noteBounds, bar: barBounds, stringY: this.stringY(c, beats, lookup) };
  }

  /** Ordonnée de la corde du curseur sur la portée de tablature (la plus basse du système). */
  private stringY(c: Cursor, beats: alphaTab.model.Beat[], lookup: alphaTab.rendering.BoundsLookup): number | undefined {
    const staff = this.score?.tracks[c.track]?.staves[0];
    if (!staff || !staff.showTablature || staff.isPercussion || beats.length === 0) return undefined;
    const all = lookup.findBeats(beats[Math.min(c.beat, beats.length - 1)]);
    if (!all?.length) return undefined;
    const r = [...all].sort((a, b) => a.barBounds.realBounds.y - b.barBounds.realBounds.y).at(-1)!.barBounds.realBounds;
    const n = staff.tuning.length;
    return r.y + ((c.string - 1) * r.h) / Math.max(1, n - 1);
  }
}

export const player = new Player();
