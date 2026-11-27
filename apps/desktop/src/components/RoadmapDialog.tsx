/** Feuille de route : toutes les features du cahier des charges et leur état. */
import { useState } from 'react';
import { FEATURES, featureStats, type Priority, type Status } from '@guitar-lab/features';
import { useApp } from '../app/store';
import { Modal } from './Modal';

const STATUS_LABEL: Record<Status, string> = { done: 'Fait', partial: 'Partiel', skeleton: 'Squelette' };

export function RoadmapDialog() {
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const stats = featureStats();
  const list = FEATURES.filter((f) => (priority === 'all' || f.priority === priority) && (status === 'all' || f.status === status));
  const families = [...new Set(list.map((f) => f.family))];

  return (
    <Modal title="Feuille de route" wide footer={<button type="button" className="primary" onClick={() => useApp.getState().openDialog(null)}>Fermer</button>}>
      <div className="roadmap-stats">
        {(['MVP', 'V1', 'V2'] as const).map((p) => (
          <div key={p} className="stat">
            <strong>{p}</strong>
            <span>{stats[p].done} faites · {stats[p].partial} partielles · {stats[p].skeleton} squelettes</span>
            <div className="bar">
              <div className="done" style={{ width: `${(stats[p].done / stats[p].total) * 100}%` }} />
              <div className="partial" style={{ width: `${(stats[p].partial / stats[p].total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="inline filters">
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'all')} aria-label="Priorité">
          <option value="all">Toutes priorités</option>
          <option value="MVP">MVP</option>
          <option value="V1">V1</option>
          <option value="V2">V2</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')} aria-label="État">
          <option value="all">Tous états</option>
          <option value="done">Fait</option>
          <option value="partial">Partiel</option>
          <option value="skeleton">Squelette</option>
        </select>
        <span className="hint">{list.length} features</span>
      </div>
      {families.map((fam) => (
        <section key={fam}>
          <h3>{fam}</h3>
          <table className="roadmap">
            <tbody>
              {list.filter((f) => f.family === fam).map((f) => (
                <tr key={f.id}>
                  <td className="prio">{f.priority}</td>
                  <td>
                    {f.name}
                    {f.note && <div className="field-hint">{f.note}</div>}
                  </td>
                  <td><span className={`badge ${f.status}`}>{STATUS_LABEL[f.status]}</span></td>
                  <td className="module"><code>{f.module}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </Modal>
  );
}
