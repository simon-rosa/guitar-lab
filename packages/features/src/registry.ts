/**
 * Registre de toutes les features du cahier des charges.
 * C'est la carte du projet : chaque entrée dit où vit le code et où il en est.
 *
 *  - done     : implémenté et utilisable dans l'app ;
 *  - partial  : utilisable mais incomplet (voir `note`) ;
 *  - skeleton : interfaces et emplacement prêts, implémentation à écrire.
 */

export type Priority = 'MVP' | 'V1' | 'V2';
export type Status = 'done' | 'partial' | 'skeleton';

export type Family =
  | 'Édition'
  | 'Notation'
  | 'Audio'
  | 'Apprentissage'
  | 'Import / export'
  | 'Interface'
  | 'Mode scène'
  | 'Collaboration et cloud';

export interface Feature {
  id: string;
  family: Family;
  name: string;
  priority: Priority;
  status: Status;
  /** Fichier ou module où vit (ou vivra) le code. */
  module: string;
  note?: string;
}

const f = (family: Family, priority: Priority, status: Status, id: string, name: string, module: string, note?: string): Feature => ({
  id, family, name, priority, status, module, note,
});

const ED: Family = 'Édition';
const NO: Family = 'Notation';
const AU: Family = 'Audio';
const AP: Family = 'Apprentissage';
const IO: Family = 'Import / export';
const UI: Family = 'Interface';
const SC: Family = 'Mode scène';
const CO: Family = 'Collaboration et cloud';

export const FEATURES: Feature[] = [
  // ------------------------------------------------------------ Édition
  f(ED, 'MVP', 'done', 'linked-views', 'Vue tablature + partition liées', 'apps/desktop/src/components/ScoreView.tsx'),
  f(ED, 'MVP', 'done', 'keyboard-entry', 'Saisie au clavier', 'packages/core/src/editor.ts + keymap.ts'),
  f(ED, 'MVP', 'done', 'mouse-entry', 'Saisie à la souris', 'apps/desktop/src/components/Toolbar.tsx'),
  f(ED, 'MVP', 'done', 'rhythms', 'Durées, points, n-olets', 'packages/core/src/editor.ts'),
  f(ED, 'MVP', 'done', 'rests', 'Silences et remplissage automatique', 'packages/core/src/editor.ts', 'Pauses multi-mesures : à faire'),
  f(ED, 'MVP', 'done', 'bars', 'Signature, armure, anacrouse', 'apps/desktop/src/components/BarDialog.tsx'),
  f(ED, 'MVP', 'done', 'multitrack', 'Multi-pistes', 'apps/desktop/src/components/TrackPanel.tsx'),
  f(ED, 'MVP', 'done', 'tunings', 'Accordages 4 à 10 cordes', 'packages/core/src/pitch.ts'),
  f(ED, 'MVP', 'done', 'capo-transpose', 'Capodastre et transposition', 'packages/core/src/editor.ts'),
  f(ED, 'MVP', 'done', 'clipboard-undo', 'Copier / coller / annuler illimité', 'packages/core/src/history.ts'),
  f(ED, 'V1', 'partial', 'midi-input', 'Saisie MIDI', 'packages/features/src/input/midi-input.ts', 'Saisie pas à pas via Web MIDI ; temps réel + quantification à faire'),
  f(ED, 'V1', 'done', 'voices', 'Voix multiples (1 à 4)', 'packages/core/src/editor.ts'),
  f(ED, 'V1', 'partial', 'repeats', 'Reprises, 1re/2e fois, D.C., D.S., Coda', 'apps/desktop/src/components/BarDialog.tsx', 'Reprises et fins alternatives OK ; sauts D.C./D.S./Coda dans le modèle seulement'),
  f(ED, 'V1', 'done', 'sections', 'Sections et repères navigables', 'apps/desktop/src/components/SectionsPanel.tsx'),
  f(ED, 'V1', 'partial', 'tempo-automation', 'Carte de tempo et automations', 'packages/core/src/model.ts', 'Changements de tempo par mesure ; accelerando et volume/pan automatisés à faire'),
  f(ED, 'V1', 'partial', 'chord-diagrams', 'Diagrammes d’accords', 'packages/features/src/notation-pro/chords.ts', 'Modèle + rendu ; éditeur et génération auto à faire'),
  f(ED, 'V1', 'skeleton', 'lyrics', 'Paroles synchronisées', 'packages/features/src/notation-pro/lyrics.ts'),
  f(ED, 'V1', 'partial', 'transposing-instruments', 'Instruments transpositeurs', 'packages/core/src/instruments.ts', 'Préréglages et modèle ; bascule son réel / écrit à faire'),
  f(ED, 'V1', 'skeleton', 'parts', 'Conducteur et parties séparées', 'packages/features/src/notation-pro/parts.ts'),
  f(ED, 'V1', 'skeleton', 'lead-sheets', 'Charts, lead sheets, Nashville', 'packages/features/src/notation-pro/charts.ts'),
  f(ED, 'V1', 'partial', 'engraving', 'Gravure pro (SMuFL, espacement)', 'apps/desktop/src/components/ScoreView.tsx', 'Police Bravura via alphaTab ; réglages fins à faire'),
  f(ED, 'V1', 'done', 'extended-range', 'Guitares 7-9 cordes, basses 5-6 cordes', 'packages/core/src/pitch.ts', 'Multiscale : affichage seulement à faire'),
  f(ED, 'V2', 'skeleton', 'find-replace', 'Recherche et remplacement de motifs', 'packages/features/src/editing/find-replace.ts'),
  f(ED, 'V2', 'skeleton', 'mic-input', 'Saisie au micro', 'packages/features/src/input/mic-input.ts'),
  f(ED, 'V2', 'skeleton', 'auto-fingering', 'Doigté automatique', 'packages/features/src/editing/auto-fingering.ts'),
  f(ED, 'V2', 'skeleton', 'arranging', 'Arrangement assisté', 'packages/features/src/editing/arranging.ts'),

  // ------------------------------------------------------------ Notation
  f(NO, 'MVP', 'done', 'legato', 'Hammer-on, pull-off, tapping', 'packages/core/src/formats/alphatex.ts'),
  f(NO, 'MVP', 'done', 'slides', 'Slides (6 types)', 'packages/core/src/formats/alphatex.ts'),
  f(NO, 'MVP', 'done', 'bends', 'Bends, release, pre-bend', 'packages/core/src/formats/alphatex.ts', 'Éditeur de courbe à faire'),
  f(NO, 'MVP', 'done', 'vibrato', 'Vibrato léger / large', 'packages/core/src/formats/alphatex.ts'),
  f(NO, 'MVP', 'done', 'muting', 'Palm mute, dead note, let ring', 'packages/core/src/formats/alphatex.ts'),
  f(NO, 'V1', 'done', 'harmonics', 'Harmoniques (5 types)', 'packages/core/src/formats/alphatex.ts'),
  f(NO, 'V1', 'partial', 'whammy', 'Whammy bar', 'packages/core/src/model.ts', 'Modèle + rendu ; saisie et éditeur de courbe à faire'),
  f(NO, 'V1', 'partial', 'rhythm-guitar', 'Coups, rasgueado, tremolo picking', 'packages/core/src/model.ts', 'Coups montants/descendants saisis ; brush et tremolo via import'),
  f(NO, 'V1', 'partial', 'ornaments', 'Notes d’agrément, trilles, mordants', 'packages/core/src/model.ts', 'Notes d’agrément seulement'),
  f(NO, 'V1', 'partial', 'dynamics', 'Nuances, accents, staccato', 'packages/core/src/model.ts', 'Accents et staccato saisis ; nuances via import'),
  f(NO, 'V1', 'partial', 'fingering', 'Doigtés main gauche / droite', 'packages/core/src/model.ts', 'Modèle + rendu ; saisie à faire'),
  f(NO, 'V1', 'partial', 'drums', 'Batterie', 'packages/features/src/notation-pro/drums.ts', 'Piste batterie GM ; grille step-sequencer à faire'),
  f(NO, 'V1', 'partial', 'bass-techniques', 'Slap, pop, notes fantômes', 'packages/core/src/model.ts'),
  f(NO, 'V2', 'partial', 'annotations', 'Annotations et textes', 'packages/core/src/model.ts', 'Texte de temps seulement'),
  f(NO, 'V2', 'skeleton', 'special-notation', 'Microtonalité, notation slash', 'packages/features/src/notation-pro/special.ts'),

  // ------------------------------------------------------------ Audio
  f(AU, 'MVP', 'done', 'midi-playback', 'Lecture SoundFont avec curseur', 'apps/desktop/src/audio/player.ts'),
  f(AU, 'MVP', 'done', 'transport', 'Lecture, pause, boucle, depuis le curseur', 'apps/desktop/src/components/Transport.tsx'),
  f(AU, 'MVP', 'done', 'mixer', 'Mixeur volume / pan / solo / mute', 'apps/desktop/src/components/TrackPanel.tsx'),
  f(AU, 'MVP', 'done', 'metronome', 'Métronome et décompte', 'apps/desktop/src/components/Transport.tsx'),
  f(AU, 'V1', 'partial', 'technique-playback', 'Rendu audio des techniques', 'apps/desktop/src/audio/player.ts', 'Assuré par le synthé alphaTab'),
  f(AU, 'V1', 'skeleton', 'realistic-sounds', 'Banque de sons échantillonnés', 'packages/features/src/audio/sound-library.ts'),
  f(AU, 'V1', 'skeleton', 'amp-sim', 'Amplis et effets', 'apps/desktop/src-tauri/src/audio/effects.rs'),
  f(AU, 'V1', 'skeleton', 'humanize', 'Humanisation', 'packages/features/src/audio/humanize.ts'),
  f(AU, 'V1', 'skeleton', 'low-latency', 'Audio basse latence ASIO / CoreAudio', 'apps/desktop/src-tauri/src/audio/mod.rs'),
  f(AU, 'V1', 'skeleton', 'vst-host', 'Plugins VST3 / AU', 'apps/desktop/src-tauri/src/plugins.rs'),
  f(AU, 'V1', 'skeleton', 'midi-out', 'Sortie MIDI externe', 'packages/features/src/daw/midi-out.ts'),
  f(AU, 'V1', 'skeleton', 'daw-sync', 'Synchro DAW (MIDI Clock, MTC, Link)', 'packages/features/src/daw/sync.ts'),
  f(AU, 'V1', 'skeleton', 'backing-track', 'Piste audio de référence', 'packages/features/src/audio/backing-track.ts'),
  f(AU, 'V1', 'skeleton', 'audio-export', 'Export WAV / MP3 / FLAC et stems', 'packages/features/src/audio/export.ts'),
  f(AU, 'V1', 'done', 'midi-export', 'Export MIDI multipiste', 'packages/core/src/formats/midi.ts', 'Keyswitches pour banques pro à faire'),
  f(AU, 'V2', 'skeleton', 'daw-plugin', 'Guitar Lab comme plugin dans le DAW', 'packages/features/src/daw/plugin.ts'),
  f(AU, 'V2', 'skeleton', 'recording', 'Enregistrement audio', 'packages/features/src/audio/recording.ts'),

  // ------------------------------------------------------------ Apprentissage
  f(AP, 'MVP', 'done', 'speed', 'Ralentir le tempo (25-200 %)', 'apps/desktop/src/components/Transport.tsx'),
  f(AP, 'MVP', 'done', 'ab-loop', 'Boucle A-B avec accélération progressive', 'apps/desktop/src/audio/player.ts'),
  f(AP, 'MVP', 'done', 'fretboard', 'Manche virtuel', 'apps/desktop/src/components/Fretboard.tsx'),
  f(AP, 'V1', 'skeleton', 'piano', 'Clavier virtuel', 'packages/features/src/practice/piano.ts'),
  f(AP, 'V1', 'partial', 'scrolling', 'Défilement adaptatif', 'apps/desktop/src/components/ScoreView.tsx', 'Page et horizontal ; prompteur à faire'),
  f(AP, 'V1', 'done', 'tuner', 'Accordeur chromatique', 'packages/features/src/practice/tuner.ts'),
  f(AP, 'V1', 'skeleton', 'theory', 'Gammes, modes, arpèges sur le manche', 'packages/features/src/practice/theory.ts'),
  f(AP, 'V1', 'done', 'play-along', 'Jouer avec (mute de sa piste)', 'apps/desktop/src/components/TrackPanel.tsx'),
  f(AP, 'V2', 'skeleton', 'play-detection', 'Détection de jeu au micro', 'packages/features/src/practice/play-detection.ts'),
  f(AP, 'V2', 'skeleton', 'practice-stats', 'Statistiques de pratique', 'packages/features/src/practice/stats.ts'),
  f(AP, 'V2', 'skeleton', 'exercise-generator', 'Générateur d’exercices', 'packages/features/src/practice/exercises.ts'),
  f(AP, 'V2', 'skeleton', 'ai-transcription', 'Transcription audio par IA', 'packages/features/src/ai/transcription.ts'),
  f(AP, 'V2', 'skeleton', 'stem-separation', 'Séparation de pistes par IA', 'packages/features/src/ai/separation.ts'),

  // ------------------------------------------------------------ Import / export
  f(IO, 'MVP', 'done', 'native-format', 'Format natif ouvert (.glab)', 'packages/core/src/formats/native.ts'),
  f(IO, 'MVP', 'done', 'gp-import-legacy', 'Import Guitar Pro 3-5', 'packages/alphatab-bridge/src/index.ts'),
  f(IO, 'V1', 'done', 'gp-modern', 'Import / export GP6-8', 'packages/alphatab-bridge/src/index.ts'),
  f(IO, 'V1', 'partial', 'musicxml', 'MusicXML', 'packages/features/src/io/musicxml.ts', 'Import OK (alphaTab) ; export à faire'),
  f(IO, 'MVP', 'partial', 'midi-io', 'MIDI', 'packages/core/src/formats/midi.ts', 'Export OK ; import à faire'),
  f(IO, 'MVP', 'done', 'pdf', 'Impression / PDF', 'apps/desktop/src/components/ScoreView.tsx'),
  f(IO, 'V1', 'skeleton', 'image-export', 'Export PNG / SVG', 'packages/features/src/io/image.ts'),
  f(IO, 'V1', 'done', 'ascii-tab', 'Tablature ASCII', 'packages/core/src/formats/ascii.ts'),
  f(IO, 'V2', 'skeleton', 'powertab-tuxguitar', 'Import PowerTab / TuxGuitar', 'packages/features/src/io/legacy-formats.ts'),
  f(IO, 'V2', 'skeleton', 'musescore', 'Import MuseScore', 'packages/features/src/io/legacy-formats.ts'),
  f(IO, 'V2', 'skeleton', 'omr', 'Reconnaissance de partition (photo / PDF)', 'packages/features/src/ai/omr.ts'),
  f(IO, 'V1', 'partial', 'layout', 'Mise en page et impression', 'apps/desktop/src/components/ScoreView.tsx', 'Zoom, mise en page alphaTab ; marges et sauts de page à faire'),

  // ------------------------------------------------------------ Interface
  f(UI, 'MVP', 'done', 'themes', 'Thèmes clair / sombre / scène', 'apps/desktop/src/styles.css'),
  f(UI, 'MVP', 'done', 'custom-shortcuts', 'Raccourcis configurables + préréglage Guitar Pro', 'apps/desktop/src/components/ShortcutsDialog.tsx'),
  f(UI, 'V1', 'done', 'command-palette', 'Palette de commandes (Ctrl+K)', 'apps/desktop/src/components/CommandPalette.tsx'),
  f(UI, 'MVP', 'done', 'zoom-layout', 'Zoom et modes d’affichage', 'apps/desktop/src/components/ScoreView.tsx'),
  f(UI, 'V1', 'skeleton', 'touch', 'Interface tactile (tablette)', 'packages/features/src/ui/touch.ts'),
  f(UI, 'V1', 'partial', 'foot-pedal', 'Pédalier Bluetooth', 'apps/desktop/src/app/keyboard.ts', 'Les pédaliers envoyant PageUp/PageDown/Espace sont pris en charge'),
  f(UI, 'V1', 'partial', 'accessibility', 'Accessibilité', 'apps/desktop/src', 'Tout est faisable au clavier ; audit lecteur d’écran à faire'),
  f(UI, 'V1', 'skeleton', 'i18n', 'Multilingue', 'packages/features/src/ui/i18n.ts'),

  // ------------------------------------------------------------ Mode scène
  f(SC, 'V1', 'skeleton', 'setlists', 'Setlists', 'packages/features/src/stage/setlist.ts'),
  f(SC, 'V1', 'partial', 'stage-display', 'Affichage scène', 'apps/desktop/src/styles.css', 'Thème scène ; défilement calé au tempo à faire'),
  f(SC, 'V1', 'skeleton', 'click-cues', 'Click et cues', 'packages/features/src/stage/click-cues.ts'),
  f(SC, 'V2', 'skeleton', 'program-change', 'MIDI Program Change automatique', 'packages/features/src/stage/program-change.ts'),
  f(SC, 'V1', 'partial', 'offline', 'Fonctionnement hors ligne garanti', 'apps/desktop', 'Tout est local ; mode « concert » sans notifications à faire'),
  f(SC, 'V2', 'skeleton', 'band-sync', 'Synchro du groupe', 'packages/features/src/stage/band-sync.ts'),

  // ------------------------------------------------------------ Collaboration et cloud
  f(CO, 'MVP', 'done', 'autosave', 'Sauvegarde automatique', 'apps/desktop/src/app/autosave.ts'),
  f(CO, 'V1', 'skeleton', 'cloud-sync', 'Synchronisation cloud', 'packages/features/src/cloud/sync.ts'),
  f(CO, 'V1', 'skeleton', 'versions', 'Historique de versions', 'packages/features/src/cloud/versions.ts'),
  f(CO, 'V1', 'skeleton', 'share-link', 'Partage par lien', 'packages/features/src/cloud/share.ts'),
  f(CO, 'V2', 'skeleton', 'realtime-collab', 'Co-édition temps réel', 'packages/features/src/collab/realtime.ts'),
  f(CO, 'V2', 'skeleton', 'comments', 'Commentaires ancrés', 'packages/features/src/collab/comments.ts'),
  f(CO, 'V1', 'skeleton', 'library', 'Bibliothèque personnelle', 'packages/features/src/cloud/library.ts'),
  f(CO, 'V2', 'skeleton', 'community', 'Communauté', 'packages/features/src/cloud/community.ts'),
  f(CO, 'V2', 'skeleton', 'embed', 'Widget intégrable', 'packages/features/src/cloud/embed.ts'),
  f(CO, 'V2', 'skeleton', 'scripting', 'API de scripts et plugins', 'packages/features/src/plugins/scripting.ts'),
];

export function featureStats(features: Feature[] = FEATURES) {
  const by = (p?: Priority) => {
    const list = p ? features.filter((x) => x.priority === p) : features;
    return {
      total: list.length,
      done: list.filter((x) => x.status === 'done').length,
      partial: list.filter((x) => x.status === 'partial').length,
      skeleton: list.filter((x) => x.status === 'skeleton').length,
    };
  };
  return { all: by(), MVP: by('MVP'), V1: by('V1'), V2: by('V2') };
}
