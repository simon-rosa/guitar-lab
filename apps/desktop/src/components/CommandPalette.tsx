/** Palette de commandes (Ctrl+K) : toute action par son nom. */
import { useMemo, useState } from 'react';
import { ACTIONS, type ActionId } from '@guitar-lab/core';
import { runAction } from '../app/actions';
import { exportAs, saveSong } from '../app/files';
import { useApp, type DialogId } from '../app/store';

interface Command {
  id: string;
  label: string;
  group: string;
  keys?: string[];
  run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const keymap = useApp((s) => s.keymap);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const open = (d: DialogId) => () => useApp.getState().openDialog(d);
    const theme = (t: 'light' | 'dark' | 'stage') => () => useApp.getState().setPrefs({ theme: t });
    return [
      ...ACTIONS.filter((a) => a.id !== 'view.commandPalette').map((a) => ({
        id: a.id,
        label: a.label,
        group: a.group,
        keys: keymap[a.id as ActionId],
        run: () => runAction(a.id),
      })),
      { id: 'save-as', label: 'Enregistrer sous…', group: 'Fichier', run: () => void saveSong(true) },
      { id: 'export-gp', label: 'Exporter en Guitar Pro (.gp)', group: 'Fichier', run: () => void exportAs('gp') },
      { id: 'export-midi', label: 'Exporter en MIDI', group: 'Fichier', run: () => void exportAs('midi') },
      { id: 'export-ascii', label: 'Exporter en tablature texte', group: 'Fichier', run: () => void exportAs('ascii') },
      { id: 'song', label: 'Informations du morceau, tempo, transposition', group: 'Morceau', run: open('song') },
      { id: 'bar', label: 'Propriétés de la mesure', group: 'Mesures', run: open('bar') },
      { id: 'track', label: 'Réglages de la piste (accordage, capo…)', group: 'Pistes', run: open('track') },
      { id: 'tuner', label: 'Accordeur', group: 'Outils', run: open('tuner') },
      { id: 'shortcuts', label: 'Raccourcis clavier', group: 'Outils', run: open('shortcuts') },
      { id: 'roadmap', label: 'Feuille de route des fonctionnalités', group: 'Aide', run: open('roadmap') },
      { id: 'theme-light', label: 'Thème clair', group: 'Affichage', run: theme('light') },
      { id: 'theme-dark', label: 'Thème sombre', group: 'Affichage', run: theme('dark') },
      { id: 'theme-stage', label: 'Thème scène (contraste maximal)', group: 'Affichage', run: theme('stage') },
      { id: 'layout-page', label: 'Affichage page', group: 'Affichage', run: () => useApp.getState().setPrefs({ layout: 'page' }) },
      { id: 'layout-h', label: 'Affichage parchemin horizontal', group: 'Affichage', run: () => useApp.getState().setPrefs({ layout: 'horizontal' }) },
    ];
  }, [keymap]);

  const q = norm(query.trim());
  const results = q ? commands.filter((c) => norm(`${c.group} ${c.label}`).includes(q)) : commands;
  const current = Math.min(index, results.length - 1);

  const exec = (c: Command | undefined) => {
    if (!c) return;
    const closeFirst = !['song', 'bar', 'track', 'tuner', 'shortcuts', 'roadmap'].includes(c.id);
    if (closeFirst) useApp.getState().openDialog(null);
    c.run();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && useApp.getState().openDialog(null)}>
      <div className="palette" role="dialog" aria-label="Palette de commandes">
        <input
          autoFocus
          type="text"
          placeholder="Tapez une commande…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setIndex((i) => Math.min(results.length - 1, i + 1));
            else if (e.key === 'ArrowUp') setIndex((i) => Math.max(0, i - 1));
            else if (e.key === 'Enter') exec(results[current]);
            else if (e.key === 'Escape') useApp.getState().openDialog(null);
            else return;
            e.preventDefault();
          }}
          aria-activedescendant={results[current] ? `cmd-${results[current].id}` : undefined}
        />
        <ul role="listbox">
          {results.slice(0, 50).map((c, i) => (
            <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === current} className={i === current ? 'active' : ''} onMouseEnter={() => setIndex(i)} onMouseDown={() => exec(c)}>
              <span className="group">{c.group}</span>
              <span className="label">{c.label}</span>
              {c.keys?.[0] && <kbd>{c.keys[0]}</kbd>}
            </li>
          ))}
          {results.length === 0 && <li className="empty">Aucune commande.</li>}
        </ul>
      </div>
    </div>
  );
}
