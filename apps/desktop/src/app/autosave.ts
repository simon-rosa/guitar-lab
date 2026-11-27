/**
 * Sauvegarde automatique toutes les 30 s dans le stockage local,
 * et récupération au démarrage après une fermeture inattendue.
 */
import { createEditorState, deserializeSong, serializeSong } from '@guitar-lab/core';
import { saveToLibrary } from './library';
import { isTauri } from './platform';
import { useApp } from './store';

const KEY = 'guitar-lab:autosave';

const hasNotes = (song: { tracks: Array<{ bars: Array<{ voices: Array<{ beats: Array<{ notes: unknown[] }> }> }> }> }) =>
  song.tracks.some((t) => t.bars.some((b) => b.voices.some((v) => v.beats.some((x) => x.notes.length > 0))));
const INTERVAL_MS = 30_000;

export function startAutosave(): () => void {
  let lastSaved: unknown = null;
  let lastLibrary: unknown = null;
  const save = () => {
    const { history, dirty, fileName, libraryId } = useApp.getState();
    const song = history.present.song;
    if (song === lastSaved) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ fileName, dirty, libraryId, data: serializeSong(song) }));
      lastSaved = song;
    } catch {
      /* quota dépassé ou stockage indisponible */
    }
  };
  // « Mes morceaux » se tient à jour tout seul : rien n'est perdu, même sans Ctrl+S.
  // Dans le navigateur, la bibliothèque fait foi (le morceau est considéré enregistré) ;
  // dans l'app de bureau, le fichier sur disque reste la référence.
  const saveLibrary = async () => {
    const { history, libraryId, dirty } = useApp.getState();
    const song = history.present.song;
    if (song === lastLibrary || !dirty || (!libraryId && !hasNotes(song))) return;
    lastLibrary = song;
    const id = await saveToLibrary(song, libraryId);
    const st = useApp.getState();
    if (st.history.present.song !== song) return;
    if (!libraryId) st.setLibraryId(id);
    if (!isTauri() || !st.fileName) st.markSaved();
  };
  const libId = window.setInterval(() => void saveLibrary(), 5_000);
  // Avant de quitter : on sauvegarde, et on prévient si le travail n'est pas enregistré.
  const onUnload = (e: BeforeUnloadEvent) => {
    save();
    void saveLibrary();
    if (useApp.getState().dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  const id = window.setInterval(save, INTERVAL_MS);
  window.addEventListener('beforeunload', onUnload);
  return () => {
    window.clearInterval(id);
    window.clearInterval(libId);
    window.removeEventListener('beforeunload', onUnload);
  };
}

/** Recharge le dernier état sauvegardé automatiquement, s'il existe. */
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const { fileName, dirty, data, libraryId } = JSON.parse(raw) as { fileName: string | null; dirty: boolean; data: string; libraryId?: string | null };
    const song = deserializeSong(data);
    useApp.getState().loadDocument(createEditorState(song), fileName, libraryId ?? null);
    if (dirty) useApp.setState({ dirty: true });
    return true;
  } catch {
    return false;
  }
}
