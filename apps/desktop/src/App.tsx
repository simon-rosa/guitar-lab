import { useEffect, useRef } from 'react';
import { featureStats } from '@guitar-lab/features';
import { restoreAutosave, startAutosave } from './app/autosave';
import { installKeyboard } from './app/keyboard';
import { useApp, useEditor } from './app/store';
import { BarDialog } from './components/BarDialog';
import { CommandPalette } from './components/CommandPalette';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Fretboard } from './components/Fretboard';
import { HelpDialog } from './components/HelpDialog';
import { ChordDialog } from './components/ChordDialog';
import { MenuBar } from './components/MenuBar';
import { Modal } from './components/Modal';
import { RoadmapDialog } from './components/RoadmapDialog';
import { ScoreView } from './components/ScoreView';
import { SectionsPanel } from './components/SectionsPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SongDialog } from './components/SongDialog';
import { Toolbar } from './components/Toolbar';
import { TrackDialog } from './components/TrackDialog';
import { TrackPanel } from './components/TrackPanel';
import { Transport } from './components/Transport';
import { TunerDialog } from './components/TunerDialog';

function Toast() {
  const toast = useApp((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => useApp.setState({ toast: null }), toast.kind === 'error' ? 7000 : 3000);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      {toast.text}
    </div>
  );
}

function About() {
  const s = featureStats().all;
  return (
    <Modal title="Guitar Lab">
      <p>Éditeur de tablatures et partitions pour guitaristes, bassistes et musiciens professionnels.</p>
      <p className="hint">
        Version 0.3.0 · {s.done} fonctionnalités faites, {s.partial} partielles, {s.skeleton} en squelette sur {s.total}.
        Rendu et lecture : alphaTab (MPL-2.0), police Bravura (SIL OFL), sons SONiVOX.
      </p>
    </Modal>
  );
}

export function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = useApp((s) => s.theme);
  const dialog = useApp((s) => s.dialog);
  const showFretboard = useApp((s) => s.showFretboard);
  const dirty = useApp((s) => s.dirty);
  const fileName = useApp((s) => s.fileName);
  const title = useEditor().song.meta.title;
  const playing = useApp((s) => s.player.playing);

  useEffect(() => {
    restoreAutosave();
    if (!useApp.getState().welcomeDone) useApp.getState().openDialog('help');
    const stopSave = startAutosave();
    const stopKeys = installKeyboard(() => scrollRef.current);
    // Quelle que soit la façon de fermer le guide (bouton, ✕, Échap), il ne se rouvre plus tout seul.
    const stopWelcome = useApp.subscribe((s, prev) => {
      if (prev.dialog === 'help' && s.dialog !== 'help' && !s.welcomeDone) s.setPrefs({ welcomeDone: true });
    });
    return () => {
      stopSave();
      stopKeys();
      stopWelcome();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.title = `${dirty ? '• ' : ''}${title} — Guitar Lab`;
  }, [dirty, title]);

  return (
    <div className={`app${playing ? ' playing' : ''}`}>
      <MenuBar
        right={
          <button type="button" className="doc-title" onClick={() => useApp.getState().openDialog('song')} title="Informations du morceau">
            {title}
            {fileName && <span className="file">{fileName}</span>}
            {dirty && <span className="dirty" aria-label="modifications non enregistrées">●</span>}
          </button>
        }
      />
      <Toolbar />
      <div className="workspace">
        <aside className="sidebar">
          <TrackPanel />
          <SectionsPanel />
        </aside>
        <main className="center">
          <ScoreView scrollRef={scrollRef} />
          {showFretboard && <Fretboard />}
        </main>
      </div>
      <Transport />
      {dialog === 'bar' && <BarDialog />}
      {dialog === 'track' && <TrackDialog />}
      {dialog === 'song' && <SongDialog />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'palette' && <CommandPalette />}
      {dialog === 'tuner' && <TunerDialog />}
      {dialog === 'roadmap' && <RoadmapDialog />}
      {dialog === 'about' && <About />}
      {dialog === 'help' && <HelpDialog />}
      {dialog === 'chord' && <ChordDialog />}
      <ConfirmDialog />
      <Toast />
    </div>
  );
}
