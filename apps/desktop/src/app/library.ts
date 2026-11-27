/**
 * Bibliothèque personnelle « Mes morceaux » : chaque morceau enregistré ou ouvert
 * y est gardé (IndexedDB du navigateur ou de l'app), avec ses dates de modification
 * et d'ouverture, pour le retrouver sans chercher de fichier.
 */
import { deserializeSong, serializeSong, uid, type Song } from '@guitar-lab/core';

export interface LibraryEntry {
  id: string;
  title: string;
  artist: string;
  tracks: number;
  bars: number;
  /** Instruments, pour l'aperçu dans la liste (« Guitare, Basse… »). */
  instruments: string[];
  createdAt: number;
  updatedAt: number;
  openedAt: number;
  /** Fichier d'origine (import ou fichier enregistré sur l'ordinateur). */
  source?: string;
  favorite?: boolean;
}

interface StoredEntry extends LibraryEntry {
  data: string;
}

const DB_NAME = 'guitar-lab';
const STORE = 'songs';
let dbPromise: Promise<IDBDatabase | null> | null = null;
/** Repli si IndexedDB est indisponible (navigation privée stricte) : la liste vit le temps de la séance. */
const memory = new Map<string, StoredEntry>();

function db(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(e: StoredEntry) {
  memory.set(e.id, e);
  try {
    await tx('readwrite', (s) => s.put(e));
  } catch {
    /* quota dépassé : reste en mémoire */
  }
  notifyChange();
}

async function getStored(id: string): Promise<StoredEntry | undefined> {
  try {
    return (await tx<StoredEntry>('readonly', (s) => s.get(id))) ?? memory.get(id);
  } catch {
    return memory.get(id);
  }
}

const KIND_NAMES: Record<string, string> = {
  guitar: 'Guitare', bass: 'Basse', drums: 'Batterie', keys: 'Clavier', voice: 'Voix', strings: 'Cordes', brass: 'Cuivres', other: 'Autre',
};

function summarize(song: Song): Pick<LibraryEntry, 'title' | 'artist' | 'tracks' | 'bars' | 'instruments'> {
  return {
    title: song.meta.title || 'Sans titre',
    artist: song.meta.artist ?? '',
    tracks: song.tracks.length,
    bars: song.masterBars.length,
    instruments: [...new Set(song.tracks.map((t) => KIND_NAMES[t.kind] ?? t.kind))],
  };
}

/** Morceaux, du plus récemment utilisé au plus ancien (favoris en tête si demandé). */
export async function listLibrary(): Promise<LibraryEntry[]> {
  let all: StoredEntry[] = [];
  try {
    all = (await tx<StoredEntry[]>('readonly', (s) => s.getAll())) ?? [...memory.values()];
  } catch {
    all = [...memory.values()];
  }
  return all
    .map(({ data: _data, ...meta }) => meta)
    .sort((a, b) => Math.max(b.updatedAt, b.openedAt) - Math.max(a.updatedAt, a.openedAt));
}

/** Enregistre le morceau (nouvelle entrée si `id` est absent). Renvoie l'identifiant. */
export async function saveToLibrary(song: Song, id?: string | null, source?: string): Promise<string> {
  const now = Date.now();
  const prev = id ? await getStored(id) : undefined;
  const entry: StoredEntry = {
    id: prev?.id ?? id ?? uid('song'),
    ...summarize(song),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    openedAt: prev?.openedAt ?? now,
    source: source ?? prev?.source,
    favorite: prev?.favorite,
    data: serializeSong(song),
  };
  await put(entry);
  return entry.id;
}

export async function loadFromLibrary(id: string): Promise<Song | null> {
  const e = await getStored(id);
  if (!e) return null;
  await put({ ...e, openedAt: Date.now() });
  return deserializeSong(e.data);
}

export async function renameInLibrary(id: string, title: string) {
  const e = await getStored(id);
  if (!e) return;
  const song = deserializeSong(e.data);
  song.meta.title = title;
  await put({ ...e, title, data: serializeSong(song), updatedAt: Date.now() });
}

export async function toggleFavorite(id: string) {
  const e = await getStored(id);
  if (e) await put({ ...e, favorite: !e.favorite });
}

export async function duplicateInLibrary(id: string): Promise<string | null> {
  const e = await getStored(id);
  if (!e) return null;
  const song = deserializeSong(e.data);
  song.meta.title = `${e.title} (copie)`;
  return saveToLibrary(song, null);
}

export async function deleteFromLibrary(id: string) {
  memory.delete(id);
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    /* rien à faire */
  }
  notifyChange();
}

// Abonnement aux changements (liste « Récents » du menu, fenêtre Mes morceaux).
const listeners = new Set<() => void>();
export function onLibraryChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notifyChange() {
  listeners.forEach((fn) => fn());
}

/** « il y a 5 min », « hier », « 12 nov. ». */
export function relativeDate(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `aujourd’hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
