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
import { demoState, getEditor, useApp } from './store';
import { openFile, safeFileName, saveFile } from './platform';

const ALL_OPENABLE = [NATIVE_EXTENSION, ...SUPPORTED_IMPORT_EXTENSIONS, 'txt'];

function confirmDiscard(): boolean {
  return !useApp.getState().dirty || window.confirm('Le morceau en cours a des modifications non enregistrées. Continuer ?');
}

export function newSong() {
  if (!confirmDiscard()) return;
  player.stop();
  useApp.getState().loadDocument(demoState(), null);
}

export async function openAny() {
  if (!confirmDiscard()) return;
  const file = await openFile([
    { name: 'Partitions', extensions: ALL_OPENABLE },
    { name: 'Guitar Lab', extensions: [NATIVE_EXTENSION] },
    { name: 'Guitar Pro', extensions: ['gp3', 'gp4', 'gp5', 'gpx', 'gp'] },
    { name: 'MusicXML', extensions: ['musicxml', 'xml', 'mxl'] },
    { name: 'Tablature texte', extensions: ['txt'] },
  ]);
  if (!file) return;
  const app = useApp.getState();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  try {
    let song;
    if (ext === NATIVE_EXTENSION) song = deserializeSong(new TextDecoder().decode(file.bytes));
    else if (ext === 'txt') song = importAsciiTab(new TextDecoder().decode(file.bytes), { title: file.name.replace(/\.txt$/i, '') });
    else song = importScoreFile(file.bytes);
    player.stop();
    app.loadDocument(createEditorState(song), ext === NATIVE_EXTENSION ? file.name : null);
    app.notify(`« ${song.meta.title} » ouvert (${song.tracks.length} piste${song.tracks.length > 1 ? 's' : ''}, ${song.masterBars.length} mesures).`);
  } catch (e) {
    app.notify(`Impossible d’ouvrir ${file.name} : ${(e as Error).message}`, 'error');
  }
}

export async function importAsciiFromText(text: string) {
  if (!confirmDiscard()) return;
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
  const name = !saveAs && app.fileName ? app.fileName : `${safeFileName(song.meta.title)}.${NATIVE_EXTENSION}`;
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
  try {
    if (kind === 'gp') await saveFile(`${base}.gp`, exportGp(song), [{ name: 'Guitar Pro 7/8', extensions: ['gp'] }]);
    if (kind === 'midi') await saveFile(`${base}.mid`, exportMidi(song), [{ name: 'MIDI', extensions: ['mid'] }], 'audio/midi');
    if (kind === 'ascii')
      await saveFile(`${base}.txt`, exportAsciiTab(song, { track: getEditor().cursor.track }), [{ name: 'Texte', extensions: ['txt'] }], 'text/plain');
  } catch (e) {
    app.notify(`Export impossible : ${(e as Error).message}`, 'error');
  }
}
