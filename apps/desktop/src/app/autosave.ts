/**
 * Sauvegarde automatique toutes les 30 s dans le stockage local,
 * et récupération au démarrage après une fermeture inattendue.
 */
import { createEditorState, deserializeSong, serializeSong } from '@guitar-lab/core';
import { useApp } from './store';

const KEY = 'guitar-lab:autosave';
const INTERVAL_MS = 30_000;

export function startAutosave(): () => void {
  let lastSaved: unknown = null;
  const save = () => {
    const { history, dirty, fileName } = useApp.getState();
    const song = history.present.song;
    if (song === lastSaved) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ fileName, dirty, data: serializeSong(song) }));
      lastSaved = song;
    } catch {
      /* quota dépassé ou stockage indisponible */
    }
  };
  // Avant de quitter : on sauvegarde, et on prévient si le travail n'est pas enregistré.
  const onUnload = (e: BeforeUnloadEvent) => {
    save();
    if (useApp.getState().dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  const id = window.setInterval(save, INTERVAL_MS);
  window.addEventListener('beforeunload', onUnload);
  return () => {
    window.clearInterval(id);
    window.removeEventListener('beforeunload', onUnload);
  };
}

/** Recharge le dernier état sauvegardé automatiquement, s'il existe. */
export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const { fileName, dirty, data } = JSON.parse(raw) as { fileName: string | null; dirty: boolean; data: string };
    const song = deserializeSong(data);
    useApp.getState().loadDocument(createEditorState(song), fileName);
    if (dirty) useApp.setState({ dirty: true });
    return true;
  } catch {
    return false;
  }
}
