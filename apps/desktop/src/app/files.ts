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
import { askConfirm, demoState, getEditor, useApp } from './store';
import { isPreview, openFile, safeFileName, saveFile } from './platform';

const ALL_OPENABLE = [NATIVE_EXTENSION, 'json', ...SUPPORTED_IMPORT_EXTENSIONS, 'txt'];

async function confirmDiscard(): Promise<boolean> {
  return !useApp.getState().dirty || askConfirm('Le morceau en cours a des modifications non enregistrées. Les abandonner ?', 'Abandonner', true);
}

export async function newSong() {
  if (!(await confirmDiscard())) return;
  player.stop();
  useApp.getState().loadDocument(demoState(), null);
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
    player.stop();
    app.loadDocument(createEditorState(song), ext === NATIVE_EXTENSION || ext === 'json' ? file.name : null);
    app.notify(`« ${song.meta.title} » ouvert (${song.tracks.length} piste${song.tracks.length > 1 ? 's' : ''}, ${song.masterBars.length} mesures).`);
  } catch (e) {
    app.notify(`Impossible d’ouvrir ${file.name} : ${(e as Error).message}`, 'error');
  }
}

export async function importAsciiFromText(text: string) {
  if (!(await confirmDiscard())) return;
  const app = useApp.getState();
  try {
    const song = importAsciiTab(text);
    app.loadDocument(createEditorState(song), null);
    app.notify(`Tablature importée : ${song.masterBars.length} mesures.`);
  } catch (e) {
    app.notify((e as Error).message, 'error');
  }
}

export async function saveSong(saveAs = false) {
  const app = useApp.getState();
  const song = getEditor().song;
  // Dans l'aperçu web, seuls certains formats peuvent être téléchargés : le .glab (JSON) devient .glab.json.
  const ext = isPreview() ? `${NATIVE_EXTENSION}.json` : NATIVE_EXTENSION;
  const name = !saveAs && app.fileName?.endsWith(ext) ? app.fileName : `${safeFileName(song.meta.title)}.${ext}`;
  const saved = await saveFile(name, serializeSong(song, true), [{ name: 'Guitar Lab', extensions: [NATIVE_EXTENSION] }], 'application/json');
  if (saved) {
    app.markSaved(saved);
    app.notify('Morceau enregistré.');
  }
}

export async function exportAs(kind: 'gp' | 'midi' | 'ascii') {
  const app = useApp.getState();
  const song = getEditor().song;
  const base = safeFileName(song.meta.title);
  if (isPreview() && kind !== 'ascii') {
    app.notify('Les exports Guitar Pro et MIDI sont disponibles dans l’application desktop (l’aperçu web n’autorise que certains formats).', 'error');
    return;
  }
  try {
    if (kind === 'gp') await saveFile(`${base}.gp`, exportGp(song), [{ name: 'Guitar Pro 7/8', extensions: ['gp'] }]);
    if (kind === 'midi') await saveFile(`${base}.mid`, exportMidi(song), [{ name: 'MIDI', extensions: ['mid'] }], 'audio/midi');
    if (kind === 'ascii')
      await saveFile(`${base}.txt`, exportAsciiTab(song, { track: getEditor().cursor.track }), [{ name: 'Texte', extensions: ['txt'] }], 'text/plain');
  } catch (e) {
    app.notify(`Export impossible : ${(e as Error).message}`, 'error');
  }
}
