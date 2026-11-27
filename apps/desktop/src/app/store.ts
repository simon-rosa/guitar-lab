/**
 * État global de l'application (zustand).
 * - `history` : document + curseur, avec annulation illimitée ;
 * - le reste : préférences d'interface et état de lecture.
 */
import { create } from 'zustand';
import {
  commit,
  createEditorState,
  createHistory,
  createSong,
  DEFAULT_KEYMAP,
  redo,
  replacePresent,
  undo,
  type Beat,
  type EditorState,
  type History,
  type Keymap,
} from '@guitar-lab/core';

export type Theme = 'light' | 'dark' | 'stage';
export type LayoutMode = 'page' | 'horizontal';
/** Portées affichées : tablature seule (par défaut), partition seule, ou les deux. */
export type NotationMode = 'tab' | 'both' | 'score';
export type DialogId = 'bar' | 'track' | 'song' | 'shortcuts' | 'palette' | 'tuner' | 'roadmap' | 'about' | 'help' | 'chord' | null;

export interface PlayerUiState {
  ready: boolean;
  loadingSoundFont: number; // 0..1
  playing: boolean;
  /** 0.25 .. 2 */
  speed: number;
  looping: boolean;
  /** Accélération progressive de la boucle (+5 % par tour jusqu'à 100 %). */
  progressiveLoop: boolean;
  metronome: boolean;
  countIn: boolean;
  currentTime: number;
  endTime: number;
  /** Temps en cours de lecture (pour le manche). */
  playingBeat: { track: number; bar: number; voice: number; beat: number } | null;
}

interface Prefs {
  theme: Theme;
  zoom: number;
  layout: LayoutMode;
  showAllTracks: boolean;
  keymap: Keymap;
  showFretboard: boolean;
  notation: NotationMode;
  /** Après un choix de frette dans le sélecteur, passer au temps suivant. */
  autoAdvance: boolean;
  /** L'aide de démarrage a été fermée. */
  welcomeDone: boolean;
  /** Jouer chaque note au moment où on l'écrit. */
  auditionNotes: boolean;
}



export interface AppState extends Prefs {
  history: History<EditorState>;
  fileName: string | null;
  dirty: boolean;
  clipboard: Beat[];
  dialog: DialogId;
  toast: { text: string; kind: 'info' | 'error'; id: number } | null;
  renderError: string | null;
  player: PlayerUiState;
  /** Sélecteur de frette ouvert sous le curseur. */
  picker: boolean;
  /** Demande de confirmation affichée dans l'app (remplace window.confirm, bloqué dans l'aperçu web). */
  confirmRequest: { message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void } | null;

  /** Modification du document (crée une entrée d'annulation). */
  edit: (fn: (s: EditorState) => EditorState) => void;
  /** Navigation / sélection (pas d'entrée d'annulation). */
  nav: (fn: (s: EditorState) => EditorState) => void;
  undo: () => void;
  redo: () => void;
  loadDocument: (state: EditorState, fileName: string | null) => void;
  markSaved: (fileName?: string) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setPlayer: (p: Partial<PlayerUiState>) => void;
  openDialog: (d: DialogId) => void;
  notify: (text: string, kind?: 'info' | 'error') => void;
  setClipboard: (beats: Beat[]) => void;
  setRenderError: (e: string | null) => void;
  setPicker: (open: boolean) => void;
}

const PREFS_KEY = 'guitar-lab:prefs';

function loadPrefs(): Prefs {
  const defaults: Prefs = {
    theme: 'dark',
    zoom: 1.1,
    layout: 'page',
    showAllTracks: false,
    keymap: DEFAULT_KEYMAP,
    showFretboard: true,
    notation: 'tab',
    autoAdvance: true,
    welcomeDone: false,
    auditionNotes: true,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { ...defaults, ...p, keymap: { ...DEFAULT_KEYMAP, ...(p.keymap ?? {}) } };
  } catch {
    return defaults;
  }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible : on garde les préférences en mémoire */
  }
}

export function demoState(): EditorState {
  return createEditorState(createSong({ title: 'Nouveau morceau', bars: 8, tempo: 120 }));
}

let toastId = 0;

export const useApp = create<AppState>((set, get) => ({
  ...loadPrefs(),
  history: createHistory(demoState()),
  fileName: null,
  dirty: false,
  clipboard: [],
  dialog: null,
  toast: null,
  renderError: null,
  player: {
    ready: false,
    loadingSoundFont: 0,
    playing: false,
    speed: 1,
    looping: false,
    progressiveLoop: false,
    metronome: false,
    countIn: false,
    currentTime: 0,
    endTime: 0,
    playingBeat: null,
  },

  edit: (fn) =>
    set((st) => {
      const next = fn(st.history.present);
      if (next === st.history.present) return {};
      // Une modification qui ne touche que le curseur n'est pas une modification.
      if (next.song === st.history.present.song) return { history: replacePresent(st.history, next) };
      return { history: commit(st.history, next), dirty: true };
    }),
  nav: (fn) => set((st) => ({ history: replacePresent(st.history, fn(st.history.present)) })),
  undo: () => set((st) => ({ history: undo(st.history), dirty: true })),
  redo: () => set((st) => ({ history: redo(st.history), dirty: true })),
  loadDocument: (state, fileName) => set({ history: createHistory(state), fileName, dirty: false, renderError: null }),
  markSaved: (fileName) => set((st) => ({ dirty: false, fileName: fileName ?? st.fileName })),
  setPrefs: (p) => {
    set(p);
    const s = get();
    savePrefs({
      theme: s.theme,
      zoom: s.zoom,
      layout: s.layout,
      showAllTracks: s.showAllTracks,
      keymap: s.keymap,
      showFretboard: s.showFretboard,
      notation: s.notation,
      autoAdvance: s.autoAdvance,
      welcomeDone: s.welcomeDone,
      auditionNotes: s.auditionNotes,
    });
  },
  setPlayer: (p) => set((st) => ({ player: { ...st.player, ...p } })),
  openDialog: (dialog) => set({ dialog }),
  notify: (text, kind = 'info') => set({ toast: { text, kind, id: ++toastId } }),
  setClipboard: (clipboard) => set({ clipboard }),
  setRenderError: (renderError) => set({ renderError }),
  picker: false,
  confirmRequest: null,
  setPicker: (picker) => set({ picker }),
}));

/** Raccourci : état d'édition courant. */
export const useEditor = () => useApp((s) => s.history.present);
export const getEditor = () => useApp.getState().history.present;

/** Confirmation dans l'interface. Renvoie true si l'utilisateur accepte. */
export function askConfirm(message: string, confirmLabel = 'Continuer', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    useApp.setState({
      confirmRequest: {
        message,
        confirmLabel,
        danger,
        resolve: (ok) => {
          useApp.setState({ confirmRequest: null });
          resolve(ok);
        },
      },
    });
  });
}
