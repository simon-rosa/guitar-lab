/** Exécution des actions (raccourcis, menus, palette de commandes). */
import {
  copySelection,
  deleteAtCursor,
  deleteBars,
  deleteSelection,
  fillBarWithRests,
  insertBarAfter,
  insertBeatBefore,
  makeRest,
  moveBar,
  moveLeft,
  moveRight,
  moveRightFree,
  moveString,
  pasteBeats,
  setBeatEffect,
  setCursor,
  setDuration,
  setFret,
  setVoice,
  shiftDuration,
  toggleDeadNote,
  toggleDot,
  toggleNoteEffect,
  toggleTie,
  toggleTuplet,
  transpose,
  type ActionId,
  type Duration,
} from '@guitar-lab/core';
import { player } from '../audio/player';
import { exportAs, newSong, openAny, saveSong } from './files';
import { getEditor, useApp } from './store';

export function runAction(id: ActionId): void {
  const app = useApp.getState();
  const { edit, nav } = app;
  switch (id) {
    case 'cursor.left': return nav((s) => moveLeft(s));
    case 'cursor.right': return edit((s) => moveRightFree(s));
    case 'cursor.up': return nav((s) => moveString(s, -1));
    case 'cursor.down': return nav((s) => moveString(s, 1));
    case 'cursor.prevBar': return nav((s) => moveBar(s, -1));
    case 'cursor.nextBar': return nav((s) => moveBar(s, 1));
    case 'select.left': return nav((s) => moveLeft(s, true));
    case 'select.right': return nav((s) => moveRight(s, true));
    case 'edit.delete': return edit((s) => (s.anchor ? deleteSelection(s) : deleteAtCursor(s)));
    case 'edit.insertBeat': return edit(insertBeatBefore);
    case 'edit.rest': return edit(makeRest);
    case 'edit.undo': return app.undo();
    case 'edit.redo': return app.redo();
    case 'edit.copy': {
      const beats = copySelection(getEditor());
      app.setClipboard(beats);
      return app.notify(`${beats.length} temps copié${beats.length > 1 ? 's' : ''}.`);
    }
    case 'edit.cut': {
      app.setClipboard(copySelection(getEditor()));
      return edit(deleteSelection);
    }
    case 'edit.paste': {
      const clip = useApp.getState().clipboard;
      if (!clip.length) return app.notify('Le presse-papiers est vide.');
      return edit((s) => pasteBeats(s, clip));
    }
    case 'edit.selectAllBar':
      return nav((s) => {
        const beats = s.song.tracks[s.cursor.track].bars[s.cursor.bar].voices[s.cursor.voice]?.beats ?? [];
        const start = setCursor(s, { beat: 0 });
        return { ...setCursor(start, { beat: Math.max(0, beats.length - 1) }, true), anchor: { ...s.cursor, beat: 0 } };
      });
    case 'duration.shorter': return edit((s) => shiftDuration(s, 1));
    case 'duration.longer': return edit((s) => shiftDuration(s, -1));
    case 'duration.1':
    case 'duration.2':
    case 'duration.4':
    case 'duration.8':
    case 'duration.16':
    case 'duration.32':
      return edit((s) => setDuration(s, Number(id.split('.')[1]) as Duration));
    case 'beat.dot': return edit(toggleDot);
    case 'beat.triplet': return edit((s) => toggleTuplet(s, 3));
    case 'beat.pickUp': return edit((s) => setBeatEffect(s, 'pickStroke', 'up'));
    case 'beat.pickDown': return edit((s) => setBeatEffect(s, 'pickStroke', 'down'));
    case 'note.tie': return edit(toggleTie);
    case 'note.hammer': return edit((s) => toggleNoteEffect(s, 'hammerPull'));
    case 'note.slide': return edit((s) => toggleNoteEffect(s, 'slide', 'legato'));
    case 'note.bend': return edit((s) => toggleNoteEffect(s, 'bend', { type: 'bend', semitones: 2 }));
    case 'note.vibrato': return edit((s) => toggleNoteEffect(s, 'vibrato', 'slight'));
    case 'note.palmMute': return edit((s) => toggleNoteEffect(s, 'palmMute'));
    case 'note.dead': return edit(toggleDeadNote);
    case 'note.letRing': return edit((s) => toggleNoteEffect(s, 'letRing'));
    case 'note.harmonic': return edit((s) => toggleNoteEffect(s, 'harmonic', 'natural'));
    case 'note.ghost': return edit((s) => toggleNoteEffect(s, 'ghost'));
    case 'note.accent': return edit((s) => toggleNoteEffect(s, 'accent', 'normal'));
    case 'note.staccato': return edit((s) => toggleNoteEffect(s, 'staccato'));
    case 'note.tap': return edit((s) => toggleNoteEffect(s, 'tap'));
    case 'bar.insert': return edit((s) => moveBar(insertBarAfter(s, s.cursor.bar), 1));
    case 'bar.delete': return edit((s) => deleteBars(s, s.cursor.bar));
    case 'bar.fill': return edit((s) => fillBarWithRests(s));
    case 'voice.1':
    case 'voice.2':
    case 'voice.3':
    case 'voice.4':
      return nav((s) => setVoice(s, Number(id.split('.')[1]) - 1));
    case 'transpose.up': return edit((s) => transpose(s, 1, { selectionOnly: true }));
    case 'transpose.down': return edit((s) => transpose(s, -1, { selectionOnly: true }));
    case 'play.toggle': return player.playPause();
    case 'play.fromCursor': return player.playFrom(getEditor().cursor);
    case 'play.loop': {
      const s = getEditor();
      if (useApp.getState().player.looping) return player.setLoop(null, null);
      const from = s.anchor ?? { ...s.cursor, beat: 0 };
      const to = s.anchor ? s.cursor : { ...s.cursor, beat: Number.MAX_SAFE_INTEGER };
      player.setLoop(from, to);
      return app.notify('Boucle activée sur la sélection.');
    }
    case 'file.new': return void newSong();
    case 'file.open': return void openAny();
    case 'file.save': return void saveSong();
    case 'file.print': return player.print();
    case 'view.zoomIn': return app.setPrefs({ zoom: Math.min(2, Math.round((app.zoom + 0.1) * 10) / 10) });
    case 'view.zoomOut': return app.setPrefs({ zoom: Math.max(0.5, Math.round((app.zoom - 0.1) * 10) / 10) });
    case 'view.commandPalette': return app.openDialog('palette');
    case 'view.help': return app.openDialog('help');
  }
}

/** Saisie d'une frette : deux chiffres rapprochés (< 600 ms) forment un nombre (12, 15…). */
let lastDigit: { value: number; at: number; key: string } | null = null;

export function typeDigit(d: number) {
  const s = getEditor();
  const now = performance.now();
  const key = `${s.cursor.track}:${s.cursor.bar}:${s.cursor.voice}:${s.cursor.beat}:${s.cursor.string}`;
  let fret = d;
  if (lastDigit && lastDigit.key === key && now - lastDigit.at < 600 && lastDigit.value > 0 && lastDigit.value * 10 + d <= (s.song.tracks[s.cursor.track].kind === 'drums' ? 99 : 36)) {
    fret = lastDigit.value * 10 + d;
  }
  lastDigit = { value: fret, at: now, key };
  writeNote(fret);
}

/**
 * Écrit une frette au curseur (corde courante), fait entendre la note,
 * puis avance si demandé. Utilisé par le clavier, le sélecteur, le manche et le MIDI.
 */
export function writeNote(fret: number, opts: { string?: number; advance?: boolean } = {}) {
  const app = useApp.getState();
  const before = app.history.present;
  const at = { ...before.cursor, string: opts.string ?? before.cursor.string };
  app.edit((st) => {
    const placed = opts.string !== undefined ? setCursor(st, { string: opts.string }) : st;
    const next = setFret(placed, fret);
    return opts.advance ? moveRight(next) : next;
  });
  player.audition(at);
}

export { exportAs };
