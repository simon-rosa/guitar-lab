/** Informations du morceau et transposition globale. */
import { useState } from 'react';
import { setSongTempo, transpose, updateSongMeta } from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';
import { Field, Modal } from './Modal';

export function SongDialog() {
  const s = useEditor();
  const m = s.song.meta;
  const [meta, setMeta] = useState({ ...m });
  const [tempo, setTempo] = useState(s.song.tempo);
  const [semitones, setSemitones] = useState(0);

  const set = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setMeta({ ...meta, [k]: e.target.value });

  const apply = () => {
    const { edit, openDialog } = useApp.getState();
    edit((st) => {
      let next = setSongTempo(updateSongMeta(st, meta), tempo);
      if (semitones) next = transpose(next, semitones);
      return next;
    });
    openDialog(null);
  };

  return (
    <Modal
      title="Morceau"
      footer={
        <>
          <button type="button" className="ghost" onClick={() => useApp.getState().openDialog(null)}>Annuler</button>
          <button type="button" className="primary" onClick={apply}>Appliquer</button>
        </>
      }
    >
      <div className="grid-2">
        <Field label="Titre"><input type="text" value={meta.title} onChange={set('title')} /></Field>
        <Field label="Artiste"><input type="text" value={meta.artist} onChange={set('artist')} /></Field>
        <Field label="Album"><input type="text" value={meta.album ?? ''} onChange={set('album')} /></Field>
        <Field label="Transcription"><input type="text" value={meta.tab ?? ''} onChange={set('tab')} /></Field>
        <Field label="Musique"><input type="text" value={meta.music ?? ''} onChange={set('music')} /></Field>
        <Field label="Paroles"><input type="text" value={meta.words ?? ''} onChange={set('words')} /></Field>
        <Field label="Copyright"><input type="text" value={meta.copyright ?? ''} onChange={set('copyright')} /></Field>
        <Field label="Tempo initial (BPM)"><input type="number" min={10} max={400} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} /></Field>
      </div>
      <Field label="Notes"><textarea rows={3} value={meta.notes ?? ''} onChange={set('notes')} /></Field>
      <Field label="Transposer tout le morceau (demi-tons)" hint="Les notes qui sortent du manche changent de corde automatiquement.">
        <input type="number" min={-12} max={12} value={semitones} onChange={(e) => setSemitones(Number(e.target.value))} />
      </Field>
    </Modal>
  );
}
