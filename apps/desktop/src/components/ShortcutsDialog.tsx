/** Raccourcis clavier : consultation, réaffectation, préréglages. */
import { useState } from 'react';
import { ACTIONS, comboFromEvent, DEFAULT_KEYMAP, findConflicts, GUITAR_PRO_KEYMAP, type ActionId } from '@guitar-lab/core';
import { useApp } from '../app/store';
import { Modal } from './Modal';

export function ShortcutsDialog() {
  const keymap = useApp((s) => s.keymap);
  const setPrefs = useApp((s) => s.setPrefs);
  const [recording, setRecording] = useState<ActionId | null>(null);
  const [filter, setFilter] = useState('');
  const conflicts = findConflicts(keymap);
  const conflicted = new Set(conflicts.flatMap((c) => c.actions));
  const groups = [...new Set(ACTIONS.map((a) => a.group))];

  const record = (e: React.KeyboardEvent, id: ActionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') return setRecording(null);
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const combo = comboFromEvent(e.nativeEvent);
    setPrefs({ keymap: { ...keymap, [id]: [combo] } });
    setRecording(null);
  };

  return (
    <Modal
      title="Raccourcis clavier"
      wide
      footer={
        <>
          <button type="button" className="ghost" onClick={() => setPrefs({ keymap: GUITAR_PRO_KEYMAP })}>Préréglage Guitar Pro</button>
          <button type="button" className="ghost" onClick={() => setPrefs({ keymap: DEFAULT_KEYMAP })}>Réinitialiser</button>
          <button type="button" className="primary" onClick={() => useApp.getState().openDialog(null)}>Fermer</button>
        </>
      }
    >
      <p className="hint">
        Chiffres 0-9 : frette sur la corde courante (deux chiffres rapides = 10 à 36). Cliquez sur un raccourci puis appuyez sur la nouvelle combinaison.
      </p>
      <input type="search" placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} className="filter" />
      {conflicts.length > 0 && (
        <p className="error">Conflits : {conflicts.map((c) => `${c.combo} (${c.actions.length} actions)`).join(', ')}</p>
      )}
      <div className="shortcut-groups">
        {groups.map((g) => {
          const items = ACTIONS.filter((a) => a.group === g && a.label.toLowerCase().includes(filter.toLowerCase()));
          if (!items.length) return null;
          return (
            <section key={g}>
              <h3>{g}</h3>
              <table className="shortcuts">
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className={conflicted.has(a.id) ? 'conflict' : ''}>
                      <td>{a.label}</td>
                      <td>
                        <button
                          type="button"
                          className={`kbd-btn${recording === a.id ? ' recording' : ''}`}
                          onClick={() => setRecording(a.id)}
                          onKeyDown={(e) => recording === a.id && record(e, a.id)}
                          onBlur={() => recording === a.id && setRecording(null)}
                        >
                          {recording === a.id ? 'Appuyez…' : (keymap[a.id] ?? []).map((k) => <kbd key={k}>{k}</kbd>)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
