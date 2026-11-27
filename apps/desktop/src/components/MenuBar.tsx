/** Barre de menus : Fichier, Édition, Affichage, Outils, Aide. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_KEYMAP, type ActionId } from '@guitar-lab/core';
import { input_midi_input } from '@guitar-lab/features';
import { runAction, writeNote } from '../app/actions';
import { exportAs, newSong, openAny, saveSong } from '../app/files';
import { getEditor, useApp, type DialogId } from '../app/store';
import { isPreview, isTauri } from '../app/platform';

/** Vrai si l'utilisateur (ou le contrôle du son) a choisi les sons de base. */
const basicSounds = () => {
  try {
    return localStorage.getItem('guitar-lab:basic-sounds') === '1';
  } catch {
    return false;
  }
};

interface Item {
  label: string;
  action?: ActionId;
  run?: () => void;
  checked?: boolean;
  separator?: boolean;
}

function Menu({ label, items }: { label: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const keymap = useApp((s) => s.keymap);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className={`menu-btn${open ? ' open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((it, i) =>
            it.separator ? (
              <hr key={i} />
            ) : (
              <button
                key={i}
                type="button"
                role={it.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={it.checked}
                onClick={() => {
                  setOpen(false);
                  if (it.action) runAction(it.action);
                  else it.run?.();
                }}
              >
                <span className="check-mark">{it.checked ? '✓' : ''}</span>
                <span>{it.label}</span>
                {it.action && <kbd>{(keymap[it.action] ?? DEFAULT_KEYMAP[it.action] ?? [])[0]}</kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

const sep: Item = { label: '', separator: true };

export function MenuBar({ right }: { right?: ReactNode }) {
  const st = useApp();
  const open = (d: DialogId) => () => st.openDialog(d);
  const [midiOn, setMidiOn] = useState(false);
  const midiStop = useRef<(() => void) | null>(null);

  const toggleMidi = async () => {
    if (midiStop.current) {
      midiStop.current();
      midiStop.current = null;
      setMidiOn(false);
      return st.notify('Saisie MIDI désactivée.');
    }
    try {
      const { stop, inputs } = await input_midi_input.listenMidiInputs((e) => {
        const s = getEditor();
        const t = s.song.tracks[s.cursor.track];
        const pos = t.kind === 'drums' ? { string: 1, fret: e.pitch } : input_midi_input.pitchToPosition(e.pitch, t.tuning, t.capo, s.cursor.string);
        if (pos) writeNote(pos.fret, { string: pos.string });
      });
      midiStop.current = stop;
      setMidiOn(true);
      st.notify(inputs.length ? `Saisie MIDI active : ${inputs.join(', ')}.` : 'Saisie MIDI active, mais aucun périphérique n’est branché.');
    } catch (e) {
      st.notify((e as Error).message, 'error');
    }
  };

  return (
    <nav className="menubar" aria-label="Menus">
      <span className="brand" aria-hidden>
        <img src="./icon.svg" alt="" width={20} height={20} /> Guitar Lab
      </span>
      <Menu
        label="Fichier"
        items={[
          { label: 'Nouveau', run: newSong, action: 'file.new' },
          { label: 'Ouvrir… (glab, Guitar Pro, MusicXML, tab texte)', action: 'file.open' },
          { label: 'Enregistrer', action: 'file.save' },
          { label: 'Enregistrer sous…', run: () => void saveSong(true) },
          sep,
          { label: 'Exporter en Guitar Pro (.gp)', run: () => void exportAs('gp') },
          { label: 'Exporter en MIDI (.mid)', run: () => void exportAs('midi') },
          { label: 'Exporter en tablature texte (.txt)', run: () => void exportAs('ascii') },
          { label: 'Imprimer / PDF', action: 'file.print' },
        ]}
      />
      <Menu
        label="Édition"
        items={[
          { label: 'Annuler', action: 'edit.undo' },
          { label: 'Rétablir', action: 'edit.redo' },
          sep,
          { label: 'Couper', action: 'edit.cut' },
          { label: 'Copier', action: 'edit.copy' },
          { label: 'Coller', action: 'edit.paste' },
          { label: 'Sélectionner la mesure', action: 'edit.selectAllBar' },
          sep,
          { label: 'Insérer une mesure', action: 'bar.insert' },
          { label: 'Supprimer la mesure', action: 'bar.delete' },
          { label: 'Compléter la mesure avec des silences', action: 'bar.fill' },
          { label: 'Propriétés de la mesure…', run: open('bar') },
          sep,
          { label: 'Transposer la sélection +½ ton', action: 'transpose.up' },
          { label: 'Transposer la sélection −½ ton', action: 'transpose.down' },
          { label: 'Morceau : titre, tempo, transposition…', run: open('song') },
          { label: 'Piste : accordage, capo, son…', run: open('track') },
        ]}
      />
      <Menu
        label="Affichage"
        items={[
          { label: 'Thème clair', checked: st.theme === 'light', run: () => st.setPrefs({ theme: 'light' }) },
          { label: 'Thème sombre', checked: st.theme === 'dark', run: () => st.setPrefs({ theme: 'dark' }) },
          { label: 'Thème scène', checked: st.theme === 'stage', run: () => st.setPrefs({ theme: 'stage' }) },
          sep,
          { label: 'Page', checked: st.layout === 'page', run: () => st.setPrefs({ layout: 'page' }) },
          { label: 'Parchemin horizontal', checked: st.layout === 'horizontal', run: () => st.setPrefs({ layout: 'horizontal' }) },
          { label: 'Tablature seule', checked: st.notation === 'tab', run: () => st.setPrefs({ notation: 'tab' }) },
          { label: 'Tablature + partition', checked: st.notation === 'both', run: () => st.setPrefs({ notation: 'both' }) },
          { label: 'Partition seule', checked: st.notation === 'score', run: () => st.setPrefs({ notation: 'score' }) },
          sep,
          { label: 'Toutes les pistes (conducteur)', checked: st.showAllTracks, run: () => st.setPrefs({ showAllTracks: !st.showAllTracks }) },
          { label: 'Manche virtuel', checked: st.showFretboard, run: () => st.setPrefs({ showFretboard: !st.showFretboard }) },
          sep,
          { label: 'Zoom avant', action: 'view.zoomIn' },
          { label: 'Zoom arrière', action: 'view.zoomOut' },
          { label: 'Palette de commandes', action: 'view.commandPalette' },
        ]}
      />
      <Menu
        label="Outils"
        items={[
          { label: 'Entendre chaque note en l’écrivant', checked: st.auditionNotes, run: () => st.setPrefs({ auditionNotes: !st.auditionNotes }) },
          {
            label: 'Instruments réalistes (GeneralUser GS)',
            checked: !basicSounds(),
            run: () => {
              try {
                if (basicSounds()) localStorage.removeItem('guitar-lab:basic-sounds');
                else localStorage.setItem('guitar-lab:basic-sounds', '1');
              } catch {
                /* stockage indisponible */
              }
              st.notify('Rechargez la page pour appliquer le changement de sons.');
            },
          },
          { label: 'Accordeur', run: open('tuner') },
          { label: 'Saisie MIDI (clavier / guitare MIDI)', checked: midiOn, run: () => void toggleMidi() },
          { label: 'Raccourcis clavier…', run: open('shortcuts') },
        ]}
      />
      <Menu
        label="Aide"
        items={[
          { label: 'Guide de démarrage et aide-mémoire', action: 'view.help' },
          { label: 'Raccourcis clavier…', run: open('shortcuts') },
          { label: 'Feuille de route des fonctionnalités', run: open('roadmap') },
          { label: 'À propos de Guitar Lab', run: open('about') },
        ]}
      />
      <div className="menubar-right">
        {right}
        {isPreview() ? (
          <span className="env-badge preview" title="Version de test en ligne. Les exports Guitar Pro/MIDI, l’impression et le micro sont réservés à l’app desktop.">Aperçu</span>
        ) : (
          !isTauri() && <span className="env-badge" title="Lancez « npm run tauri dev » pour l’app desktop">Web</span>
        )}
      </div>
    </nav>
  );
}
