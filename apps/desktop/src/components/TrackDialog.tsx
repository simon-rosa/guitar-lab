/** Réglages de piste : nom, instrument, accordage, capo, affichage. */
import { useState } from 'react';
import {
  ALL_TUNINGS,
  findTuningPreset,
  GM_PROGRAMS,
  parsePitch,
  pitchName,
  setTuning,
  updateTrack,
  type InstrumentKind,
} from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';
import { Field, Modal } from './Modal';

const KINDS: Array<[InstrumentKind, string]> = [
  ['guitar', 'Guitare'], ['bass', 'Basse'], ['drums', 'Batterie'], ['keys', 'Clavier'], ['voice', 'Voix'], ['strings', 'Cordes'], ['brass', 'Vents'], ['other', 'Autre'],
];

export function TrackDialog() {
  const s = useEditor();
  const index = s.cursor.track;
  const t = s.song.tracks[index];
  const [name, setName] = useState(t.name);
  const [kind, setKind] = useState(t.kind);
  const [program, setProgram] = useState(t.program);
  const [color, setColor] = useState(t.color);
  const [capo, setCapo] = useState(t.capo);
  const [showTab, setShowTab] = useState(t.showTablature);
  const [showStd, setShowStd] = useState(t.showStandard);
  const [tuningText, setTuningText] = useState(t.tuning.map((p) => pitchName(p)).join(' '));
  const [keepPitch, setKeepPitch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = (() => {
    try {
      return findTuningPreset(tuningText.trim().split(/\s+/).map(parsePitch))?.id ?? 'custom';
    } catch {
      return 'custom';
    }
  })();

  const apply = () => {
    let tuning: number[];
    try {
      tuning = tuningText.trim().split(/\s+/).map(parsePitch);
    } catch (e) {
      return setError((e as Error).message);
    }
    if (tuning.length < 1 || tuning.length > 10) return setError('Entre 1 et 10 cordes.');
    const { edit, openDialog } = useApp.getState();
    edit((st) => {
      let next = updateTrack(st, index, { name: name || t.name, kind, program, color, capo, showTablature: showTab, showStandard: showStd, channel: kind === 'drums' ? 10 : t.channel === 10 ? 1 : t.channel });
      if (tuning.join() !== t.tuning.join()) next = setTuning(next, index, tuning, keepPitch);
      return next;
    });
    openDialog(null);
  };

  return (
    <Modal
      title="Réglages de la piste"
      footer={
        <>
          <button type="button" className="ghost" onClick={() => useApp.getState().openDialog(null)}>Annuler</button>
          <button type="button" className="primary" onClick={apply}>Appliquer</button>
        </>
      }
    >
      <div className="grid-2">
        <Field label="Nom"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Couleur"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value as InstrumentKind)}>
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Son (General MIDI)">
          <select value={program} onChange={(e) => setProgram(Number(e.target.value))} disabled={kind === 'drums'}>
            {GM_PROGRAMS.map((p, i) => <option key={i} value={i}>{i + 1}. {p}</option>)}
          </select>
        </Field>
      </div>
      {kind !== 'drums' && (
        <>
          <div className="grid-2">
            <Field label="Accordage prédéfini">
              <select
                value={preset}
                onChange={(e) => {
                  const p = ALL_TUNINGS.find((x) => x.id === e.target.value);
                  if (p) setTuningText(p.pitches.map((x) => pitchName(x)).join(' '));
                }}
              >
                <option value="custom">Personnalisé</option>
                {ALL_TUNINGS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Capodastre">
              <input type="number" min={0} max={24} value={capo} onChange={(e) => setCapo(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Accordage (corde aiguë → grave)" hint="Notation anglo-saxonne avec octave : E4 B3 G3 D3 A2 E2. De 1 à 10 cordes.">
            <input type="text" value={tuningText} onChange={(e) => { setTuningText(e.target.value); setError(null); }} />
          </Field>
          <label className="check"><input type="checkbox" checked={keepPitch} onChange={(e) => setKeepPitch(e.target.checked)} /> Garder la hauteur des notes (recalculer les frettes)</label>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}
