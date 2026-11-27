/** Ouverture, enregistrement, import et export de morceaux. */
import { exportGp, importScoreFile, SUPPORTED_IMPORT_EXTENSIONS } from '@guitar-lab/alphatab-bridge';
import {
  createEditorState,
  deserializeSong,
  exportAsciiTab,
  exportMidi,
  importAsciiTab,
  NATIVE_EXTENSION,
  serializeSong,
} from '@guitar-lab/core';
import { player } from '../audio/player';
import { zipSingle } from '../audio/audioExport';
import { askConfirm, demoState, getEditor, useApp } from './store';
import { isPreview, isTauri, openFile, safeFileName, saveFile } from './platform';
import { loadFromLibrary, saveToLibrary } from './library';

const ALL_OPENABLE = [NATIVE_EXTENSION, 'json', ...SUPPORTED_IMPORT_EXTENSIONS, 'txt'];

async function confirmDiscard(): Promise<boolean> {
  return !useApp.getState().dirty || askConfirm('Le morceau en cours a des modifications non enregistrées. Les abandonner ?', 'Abandonner', true);
}

export async function newSong() {
  if (!(await confirmDiscard())) return;
  player.stop();
  useApp.getState().loadDocument(demoState(), null, null);
}

export async function openAny() {
  if (!(await confirmDiscard())) return;
  const file = await openFile([
    { name: 'Partitions', extensions: ALL_OPENABLE },
    { name: 'Guitar Lab', extensions: [NATIVE_EXTENSION, 'json'] },
    { name: 'Guitar Pro', extensions: ['gp3', 'gp4', 'gp5', 'gpx', 'gp'] },
    { name: 'MusicXML', extensions: ['musicxml', 'xml', 'mxl'] },
    { name: 'Tablature texte', extensions: ['txt'] },
  ]);
  if (!file) return;
  const app = useApp.getState();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  try {
    let song;
    if (ext === NATIVE_EXTENSION || ext === 'json') song = deserializeSong(new TextDecoder().decode(file.bytes));
    else if (ext === 'txt') song = importAsciiTab(new TextDecoder().decode(file.bytes), { title: file.name.replace(/\.txt$/i, '') });
    else song = importScoreFile(file.bytes);
    // Fichier sans titre : on prend son nom (« Riff.gp5 » → « Riff »).
    if (!song.meta.title || song.meta.title === 'Sans titre') song.meta.title = file.name.replace(/\.[^.]+$/, '');
    player.stop();
    // Tout morceau ouvert rejoint « Mes morceaux » : on le retrouve ensuite sans chercher le fichier.
    const libraryId = await saveToLibrary(song, null, file.path ?? file.name);
    app.loadDocument(createEditorState(song), ext === NATIVE_EXTENSION || ext === 'json' ? file.name : null, libraryId);
    app.notify(`« ${song.meta.title} » ouvert (${song.tracks.length} piste${song.tracks.length > 1 ? 's' : ''}, ${song.masterBars.length} mesures).`);
  } catch (e) {
    const msg = (e as Error).message ?? '';
    // Messages techniques d'alphaTab → explication compréhensible.
    const reason = /exceeded|unexpected|unsupported|invalid|not supported|no importer/i.test(msg) ? 'le fichier est endommagé ou dans un format non reconnu' : msg;
    app.notify(`Impossible d’ouvrir ${file.name} : ${reason}.`, 'error');
  }
}

export async function importAsciiFromText(text: string) {
  if (!(await confirmDiscard())) return;
  const app = useApp.getState();
  try {
    const song = importAsciiTab(text);
    app.loadDocument(createEditorState(song), null, await saveToLibrary(song, null));
    app.notify(`Tablature importée : ${song.masterBars.length} mesures.`);
  } catch (e) {
    app.notify((e as Error).message, 'error');
  }
}

/**
 * Enregistrer : dans « Mes morceaux » (instantané, sans boîte de dialogue).
 * Dans l'app de bureau, un morceau lié à un fichier est aussi réécrit dans ce fichier.
 */
export async function saveSong(saveAs = false) {
  const app = useApp.getState();
  const song = getEditor().song;
  if (!saveAs && !(isTauri() && app.fileName)) {
    const id = await saveToLibrary(song, app.libraryId);
    app.setLibraryId(id);
    app.markSaved();
    app.notify(`« ${song.meta.title || 'Sans titre'} » enregistré dans Mes morceaux.`);
    return;
  }
  await saveFileCopy(saveAs);
}

/** Ouvre un morceau de la bibliothèque. */
export async function openFromLibrary(id: string) {
  if (!(await confirmDiscard())) return false;
  const song = await loadFromLibrary(id);
  const app = useApp.getState();
  if (!song) {
    app.notify('Ce morceau est introuvable dans la bibliothèque.', 'error');
    return false;
  }
  player.stop();
  app.loadDocument(createEditorState(song), null, id);
  return true;
}

/** Enregistre (ou télécharge) une copie du morceau au format Guitar Lab sur l'ordinateur. */
export async function saveFileCopy(saveAs = true) {
  const app = useApp.getState();
  const song = getEditor().song;
  // Dans l'aperçu web, seuls certains formats peuvent être téléchargés : le .glab (JSON) devient .glab.json.
  const ext = isPreview() ? `${NATIVE_EXTENSION}.json` : NATIVE_EXTENSION;
  const name = !saveAs && app.fileName?.endsWith(ext) ? app.fileName : `${safeFileName(song.meta.title)}.${ext}`;
  const saved = await saveFile(name, serializeSong(song, true), [{ name: 'Guitar Lab', extensions: [NATIVE_EXTENSION] }], 'application/json');
  if (saved) {
    app.setLibraryId(await saveToLibrary(song, app.libraryId, saved));
    app.markSaved(saved);
    app.notify(isPreview() ? 'Copie téléchargée et morceau gardé dans Mes morceaux.' : 'Morceau enregistré.');
  }
}

export async function exportAs(kind: 'gp' | 'midi' | 'ascii') {
  const app = useApp.getState();
  const song = getEditor().song;
  const base = safeFileName(song.meta.title);
  // L'aperçu web n'autorise pas ces extensions en téléchargement : le fichier y est livré dans un .zip.
  const deliver = (name: string, data: Uint8Array, filters: Parameters<typeof saveFile>[2], mime?: string) =>
    isPreview() ? saveFile(`${name}.zip`, zipSingle(name, data), [{ name: 'Archive', extensions: ['zip'] }], 'application/zip') : saveFile(name, data, filters, mime);
  try {
    if (kind === 'gp') await deliver(`${base}.gp`, exportGp(song), [{ name: 'Guitar Pro 7/8', extensions: ['gp'] }]);
    if (kind === 'midi') await deliver(`${base}.mid`, exportMidi(song), [{ name: 'MIDI', extensions: ['mid'] }], 'audio/midi');
    if (kind === 'ascii')
      await saveFile(`${base}.txt`, exportAsciiTab(song, { track: getEditor().cursor.track }), [{ name: 'Texte', extensions: ['txt'] }], 'text/plain');
  } catch (e) {
    app.notify(`Export impossible : ${(e as Error).message}`, 'error');
  }
}
