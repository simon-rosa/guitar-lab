/** Pistes et mixeur : sélection, volume, panoramique, solo, muet. */
import { useState } from 'react';
import { addTrack, INSTRUMENT_PRESETS, moveTrack, removeTrack, selectTrack, tuningLabel, updateTrack } from '@guitar-lab/core';
import { useApp, useEditor } from '../app/store';

export function TrackPanel() {
  const s = useEditor();
  const { edit, nav, openDialog } = useApp.getState();
  const showAll = useApp((st) => st.showAllTracks);
  const [adding, setAdding] = useState(false);

  return (
    <section className="panel" aria-labelledby="tracks-title">
      <header className="panel-head">
        <h2 id="tracks-title">Pistes</h2>
        <button type="button" className="ghost small" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          + Piste
        </button>
      </header>
      {adding && (
        <div className="preset-list" role="menu">
          {INSTRUMENT_PRESETS.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              type="button"
              onClick={() => {
                edit((st) => addTrack(st, { presetId: p.id }));
                setAdding(false);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <ul className="track-list">
        {s.song.tracks.map((t, i) => {
          const selected = i === s.cursor.track;
          return (
            <li key={t.id} className={`track${selected ? ' selected' : ''}`}>
              <button type="button" className="track-name" onClick={() => nav((st) => selectTrack(st, i))} title={tuningLabel(t.tuning)}>
                <span className="swatch" style={{ background: t.color }} />
                <span className="name">{t.name}</span>
                <span className="meta">{t.kind === 'drums' ? 'Batterie' : `${t.tuning.length} c.${t.capo ? ` · capo ${t.capo}` : ''}`}</span>
              </button>
              <div className="mixer-row">
                <button
                  type="button"
                  className={`chip${t.mute ? ' on' : ''}`}
                  aria-pressed={t.mute}
                  title="Muet"
                  onClick={() => edit((st) => updateTrack(st, i, { mute: !t.mute }))}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`chip${t.solo ? ' on solo' : ''}`}
                  aria-pressed={t.solo}
                  title="Solo"
                  onClick={() => edit((st) => updateTrack(st, i, { solo: !t.solo }))}
                >
                  S
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={t.volume}
                  aria-label={`Volume de ${t.name}`}
                  title={`Volume ${Math.round(t.volume * 100)} %`}
                  onChange={(e) => edit((st) => updateTrack(st, i, { volume: Number(e.target.value) }))}
                />
                <input
                  type="range"
                  className="pan"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={t.pan}
                  aria-label={`Panoramique de ${t.name}`}
                  title={`Pan ${t.pan === 0 ? 'centre' : t.pan < 0 ? `G ${Math.round(-t.pan * 100)}` : `D ${Math.round(t.pan * 100)}`}`}
                  onChange={(e) => edit((st) => updateTrack(st, i, { pan: Number(e.target.value) }))}
                />
              </div>
              {selected && (
                <div className="track-actions">
                  <button type="button" className="ghost small" onClick={() => openDialog('track')}>Réglages…</button>
                  <button type="button" className="ghost small" title="Monter" disabled={i === 0} onClick={() => edit((st) => moveTrack(st, i, -1))}>↑</button>
                  <button type="button" className="ghost small" title="Descendre" disabled={i === s.song.tracks.length - 1} onClick={() => edit((st) => moveTrack(st, i, 1))}>↓</button>
                  <button
                    type="button"
                    className="ghost small danger"
                    disabled={s.song.tracks.length <= 1}
                    onClick={() => window.confirm(`Supprimer la piste « ${t.name} » ?`) && edit((st) => removeTrack(st, i))}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <label className="check">
        <input type="checkbox" checked={showAll} onChange={(e) => useApp.getState().setPrefs({ showAllTracks: e.target.checked })} />
        Afficher toutes les pistes (conducteur)
      </label>
    </section>
  );
}
