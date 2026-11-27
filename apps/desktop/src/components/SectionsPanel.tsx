/** Sections du morceau (intro, couplet…) : navigation rapide. */
import { barFillInfo, setCursor } from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';

export function SectionsPanel() {
  const s = useEditor();
  const nav = useApp.getState().nav;
  const sections = s.song.masterBars
    .map((mb, i) => ({ i, section: mb.section }))
    .filter((x) => x.section);
  const track = s.song.tracks[s.cursor.track];
  const issues = s.song.masterBars
    .map((mb, i) => ({ i, ...barFillInfo(track.bars[i], mb) }))
    .filter((x) => x.status === 'incomplete' || x.status === 'overfull');

  return (
    <section className="panel" aria-labelledby="sections-title">
      <header className="panel-head">
        <h2 id="sections-title">Sections</h2>
      </header>
      {sections.length === 0 ? (
        <p className="hint">Aucune section. Pour marquer une intro, un couplet ou un refrain : bouton « Plus… » de la barre Mesure.</p>
      ) : (
        <ul className="section-list">
          {sections.map(({ i, section }) => (
            <li key={i}>
              <button type="button" className={s.cursor.bar === i ? 'current' : ''} onClick={() => nav((st) => setCursor(st, { bar: i, beat: 0 }))}>
                {section!.marker && <span className="marker">{section!.marker}</span>}
                {section!.text || 'Section'}
                <span className="bar-no">m. {i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {issues.length > 0 && (
        <>
          <h3 className="sub">Mesures à vérifier</h3>
          <ul className="section-list issues">
            {issues.slice(0, 30).map(({ i, status, text, detail }) => (
              <li key={i}>
                <button type="button" title={detail} onClick={() => nav((st) => setCursor(st, { bar: i, beat: 0 }))}>
                  m. {i + 1}
                  <span className={`bar-no ${status}`}>{text}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
