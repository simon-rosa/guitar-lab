/** Propriétés de mesure : signature, armure, tempo, reprises, section, anacrouse. */
import { useState } from 'react';
import { DIRECTION_LABELS, updateMasterBar, type Direction, type MasterBar } from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';
import { Field, Modal } from './Modal';

const KEYS = [
  [-7, 'Do♭ / La♭m (7♭)'], [-6, 'Sol♭ / Mi♭m (6♭)'], [-5, 'Ré♭ / Si♭m (5♭)'], [-4, 'La♭ / Fam (4♭)'], [-3, 'Mi♭ / Dom (3♭)'],
  [-2, 'Si♭ / Solm (2♭)'], [-1, 'Fa / Rém (1♭)'], [0, 'Do / Lam'], [1, 'Sol / Mim (1♯)'], [2, 'Ré / Sim (2♯)'], [3, 'La / Fa♯m (3♯)'],
  [4, 'Mi / Do♯m (4♯)'], [5, 'Si / Sol♯m (5♯)'], [6, 'Fa♯ / Ré♯m (6♯)'], [7, 'Do♯ / La♯m (7♯)'],
] as const;

/** Ce qui se passe à la fin de la mesure (un seul choix). */
const END_DIRECTIONS: Array<[Direction | '', string]> = [
  ['', 'Rien'],
  ['fine', 'Fine (fin du morceau après un renvoi)'],
  ['to-coda', 'To Coda (au second passage, saute à la Coda)'],
  ['da-capo', 'D.C. (retour au début)'],
  ['da-capo-al-fine', 'D.C. al Fine (retour au début, jusqu’à Fine)'],
  ['da-capo-al-coda', 'D.C. al Coda (retour au début, puis To Coda → Coda)'],
  ['dal-segno', 'D.S. (retour au Segno)'],
  ['dal-segno-al-fine', 'D.S. al Fine (retour au Segno, jusqu’à Fine)'],
  ['dal-segno-al-coda', 'D.S. al Coda (retour au Segno, puis To Coda → Coda)'],
];

export function BarDialog() {
  const s = useEditor();
  const bar = s.cursor.bar;
  const mb = s.song.masterBars[bar];
  const [num, setNum] = useState(mb.timeSignature[0]);
  const [den, setDen] = useState(mb.timeSignature[1]);
  const [key, setKey] = useState(mb.keySignature);
  const [minor, setMinor] = useState(mb.keyMode === 'minor');
  const [tempo, setTempo] = useState<string>(mb.tempo ? String(mb.tempo) : '');
  const [repeatStart, setRepeatStart] = useState(!!mb.repeat?.start);
  const [repeatEnd, setRepeatEnd] = useState<string>(mb.repeat?.endCount ? String(mb.repeat.endCount) : '');
  const [endings, setEndings] = useState((mb.repeat?.alternateEndings ?? []).join(', '));
  const [sectionText, setSectionText] = useState(mb.section?.text ?? '');
  const [sectionMarker, setSectionMarker] = useState(mb.section?.marker ?? '');
  const [anacrusis, setAnacrusis] = useState(!!mb.anacrusis);
  const [following, setFollowing] = useState(true);
  const [segno, setSegno] = useState(!!mb.directions?.includes('segno'));
  const [coda, setCoda] = useState(!!mb.directions?.includes('coda'));
  const [endDirection, setEndDirection] = useState<Direction | ''>(
    (mb.directions ?? []).find((d) => d !== 'segno' && d !== 'coda') ?? '',
  );

  const apply = () => {
    const endingList = endings.split(/[ ,;]+/).map(Number).filter((n) => n > 0 && n < 17);
    const repeat: MasterBar['repeat'] = {};
    if (repeatStart) repeat.start = true;
    if (Number(repeatEnd) > 1) repeat.endCount = Number(repeatEnd);
    if (endingList.length) repeat.alternateEndings = endingList;
    const directions: Direction[] = [];
    if (segno) directions.push('segno');
    if (coda) directions.push('coda');
    if (endDirection) directions.push(endDirection);
    const { edit, openDialog } = useApp.getState();
    edit((st) => {
      // Signature et armure : éventuellement propagées aux mesures suivantes.
      let next = updateMasterBar(st, bar, { timeSignature: [num, den], keySignature: key, keyMode: minor ? 'minor' : 'major' }, following);
      next = updateMasterBar(next, bar, {
        tempo: Number(tempo) > 0 ? Math.round(Number(tempo)) : undefined,
        repeat: Object.keys(repeat).length ? repeat : undefined,
        section: sectionText || sectionMarker ? { text: sectionText, marker: sectionMarker } : undefined,
        anacrusis: anacrusis || undefined,
        directions: directions.length ? directions : undefined,
      });
      return next;
    });
    openDialog(null);
  };

  return (
    <Modal
      title={`Mesure ${bar + 1}`}
      footer={
        <>
          <button type="button" className="ghost" onClick={() => useApp.getState().openDialog(null)}>Annuler</button>
          <button type="button" className="primary" onClick={apply}>Appliquer</button>
        </>
      }
    >
      <div className="grid-2">
        <Field label="Signature rythmique">
          <div className="inline">
            <input type="number" min={1} max={32} value={num} onChange={(e) => setNum(Number(e.target.value))} aria-label="Temps par mesure" />
            <span>/</span>
            <select value={den} onChange={(e) => setDen(Number(e.target.value))} aria-label="Unité de temps">
              {[1, 2, 4, 8, 16, 32].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Armure">
          <div className="inline">
            <select value={key} onChange={(e) => setKey(Number(e.target.value))}>
              {KEYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="check compact"><input type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} /> mineur</label>
          </div>
        </Field>
      </div>
      <label className="check"><input type="checkbox" checked={following} onChange={(e) => setFollowing(e.target.checked)} /> Appliquer signature et armure aux mesures suivantes</label>
      <div className="grid-2">
        <Field label="Changement de tempo (BPM)" hint={`Tempo initial du morceau : ${s.song.tempo}`}>
          <input type="number" min={10} max={400} placeholder="—" value={tempo} onChange={(e) => setTempo(e.target.value)} />
        </Field>
        <Field label="Anacrouse">
          <label className="check compact"><input type="checkbox" checked={anacrusis} onChange={(e) => setAnacrusis(e.target.checked)} /> mesure incomplète autorisée</label>
        </Field>
      </div>
      <fieldset>
        <legend>Reprises</legend>
        <div className="grid-3">
          <label className="check compact"><input type="checkbox" checked={repeatStart} onChange={(e) => setRepeatStart(e.target.checked)} /> Début de reprise</label>
          <Field label="Fin de reprise : nb de passages">
            <input type="number" min={0} max={16} placeholder="—" value={repeatEnd} onChange={(e) => setRepeatEnd(e.target.value)} />
          </Field>
          <Field label="Fins alternatives" hint="ex. 1 ou 1, 2">
            <input type="text" value={endings} onChange={(e) => setEndings(e.target.value)} />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend>Renvois (D.C., D.S., Coda)</legend>
        <div className="grid-2">
          <Field label="Repère au début de la mesure">
            <div className="inline">
              <label className="check compact"><input type="checkbox" checked={segno} onChange={(e) => setSegno(e.target.checked)} /> {DIRECTION_LABELS.segno}</label>
              <label className="check compact"><input type="checkbox" checked={coda} onChange={(e) => setCoda(e.target.checked)} /> {DIRECTION_LABELS.coda}</label>
            </div>
          </Field>
          <Field label="À la fin de la mesure" hint="La lecture suit ces renvois, comme dans Guitar Pro.">
            <select value={endDirection} onChange={(e) => setEndDirection(e.target.value as Direction | '')}>
              {END_DIRECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend>Section</legend>
        <div className="grid-2">
          <Field label="Repère" hint="A, B, C…"><input type="text" maxLength={4} value={sectionMarker} onChange={(e) => setSectionMarker(e.target.value)} /></Field>
          <Field label="Nom" hint="Intro, Couplet, Refrain…"><input type="text" value={sectionText} onChange={(e) => setSectionText(e.target.value)} /></Field>
        </div>
      </fieldset>
    </Modal>
  );
}
