# Fonctionnalités de Guitar Lab

> Fichier généré par `npm run docs:features` depuis `packages/features/src/registry.ts`. Ne pas éditer à la main.

| Priorité | Faites | Partielles | Squelettes | Total |
| --- | --- | --- | --- | --- |
| MVP | 30 | 1 | 0 | 31 |
| V1 | 12 | 21 | 21 | 54 |
| V2 | 0 | 1 | 22 | 23 |
| **Tout** | 42 | 23 | 43 | 108 |

## Édition

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Vue tablature + partition liées (tablature seule par défaut) | ✅ Fait | `apps/desktop/src/components/ScoreView.tsx` |  |
| MVP | Saisie au clavier | ✅ Fait | `packages/core/src/editor.ts + keymap.ts` |  |
| MVP | Saisie à la souris (clic sur la corde + sélecteur de frette) | ✅ Fait | `apps/desktop/src/components/FretPicker.tsx` |  |
| MVP | Durées, points, n-olets | ✅ Fait | `packages/core/src/editor.ts` |  |
| MVP | Silences et remplissage automatique | ✅ Fait | `packages/core/src/editor.ts` | Pauses multi-mesures : à faire |
| MVP | Signature, armure, anacrouse | ✅ Fait | `apps/desktop/src/components/BarDialog.tsx` |  |
| MVP | Multi-pistes | ✅ Fait | `apps/desktop/src/components/TrackPanel.tsx` |  |
| MVP | Accordages 4 à 10 cordes | ✅ Fait | `packages/core/src/pitch.ts` |  |
| MVP | Capodastre et transposition | ✅ Fait | `packages/core/src/editor.ts` |  |
| MVP | Copier / coller / annuler illimité | ✅ Fait | `packages/core/src/history.ts` |  |
| V1 | Saisie MIDI | 🟡 Partiel | `packages/features/src/input/midi-input.ts` | Saisie pas à pas via Web MIDI ; temps réel + quantification à faire |
| V1 | Voix multiples (1 à 4) | ✅ Fait | `packages/core/src/editor.ts` |  |
| V1 | Reprises, 1re/2e fois, D.C., D.S., Coda | ✅ Fait | `apps/desktop/src/components/BarDialog.tsx` | Saisie, affichage et lecture des renvois (Segno, Coda, Fine, To Coda, D.C./D.S. al Fine/al Coda) |
| V1 | Sections et repères navigables | ✅ Fait | `apps/desktop/src/components/SectionsPanel.tsx` |  |
| V1 | Carte de tempo et automations | 🟡 Partiel | `packages/core/src/model.ts` | Changements de tempo par mesure ; accelerando et volume/pan automatisés à faire |
| V1 | Bibliothèque et diagrammes d’accords | ✅ Fait | `packages/core/src/chords.ts` | 18 types d’accords, doigtés calculés pour tout accordage ; saisie d’un accord en un clic |
| MVP | Sélection à la souris et duplication de mesures | ✅ Fait | `apps/desktop/src/components/ScoreView.tsx` |  |
| V1 | Paroles synchronisées | ⬜ Squelette | `packages/features/src/notation-pro/lyrics.ts` |  |
| V1 | Instruments transpositeurs | 🟡 Partiel | `packages/core/src/instruments.ts` | Préréglages et modèle ; bascule son réel / écrit à faire |
| V1 | Conducteur et parties séparées | ⬜ Squelette | `packages/features/src/notation-pro/parts.ts` |  |
| V1 | Charts, lead sheets, Nashville | ⬜ Squelette | `packages/features/src/notation-pro/charts.ts` |  |
| V1 | Gravure pro (SMuFL, espacement) | 🟡 Partiel | `apps/desktop/src/components/ScoreView.tsx` | Police Bravura via alphaTab ; réglages fins à faire |
| V1 | Guitares 7-9 cordes, basses 5-6 cordes | ✅ Fait | `packages/core/src/pitch.ts` | Multiscale : affichage seulement à faire |
| V2 | Recherche et remplacement de motifs | ⬜ Squelette | `packages/features/src/editing/find-replace.ts` |  |
| V2 | Saisie au micro | ⬜ Squelette | `packages/features/src/input/mic-input.ts` |  |
| V2 | Doigté automatique | ⬜ Squelette | `packages/features/src/editing/auto-fingering.ts` |  |
| V2 | Arrangement assisté | ⬜ Squelette | `packages/features/src/editing/arranging.ts` |  |

## Notation

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Hammer-on, pull-off, tapping | ✅ Fait | `packages/core/src/formats/alphatex.ts` |  |
| MVP | Slides (6 types, direction au choix) | ✅ Fait | `apps/desktop/src/components/TechniqueMenu.tsx` |  |
| MVP | Bends, release, pre-bend | ✅ Fait | `apps/desktop/src/components/TechniqueMenu.tsx` | ¼ à 2 tons ; éditeur de courbe libre à faire |
| MVP | Vibrato léger / large | ✅ Fait | `packages/core/src/formats/alphatex.ts` |  |
| MVP | Palm mute, dead note, let ring | ✅ Fait | `packages/core/src/formats/alphatex.ts` |  |
| V1 | Harmoniques (5 types) | ✅ Fait | `packages/core/src/formats/alphatex.ts` |  |
| V1 | Whammy bar | 🟡 Partiel | `packages/core/src/model.ts` | Modèle + rendu ; saisie et éditeur de courbe à faire |
| V1 | Coups, rasgueado, tremolo picking | 🟡 Partiel | `packages/core/src/model.ts` | Coups montants/descendants saisis ; brush et tremolo via import |
| V1 | Notes d’agrément, trilles, mordants | 🟡 Partiel | `packages/core/src/model.ts` | Notes d’agrément seulement |
| V1 | Nuances, accents, staccato | 🟡 Partiel | `packages/core/src/model.ts` | Accents et staccato saisis ; nuances via import |
| V1 | Doigtés main gauche / droite | 🟡 Partiel | `packages/core/src/model.ts` | Modèle + rendu ; saisie à faire |
| V1 | Batterie | 🟡 Partiel | `packages/features/src/notation-pro/drums.ts` | Piste batterie GM ; grille step-sequencer à faire |
| V1 | Slap, pop, notes fantômes | 🟡 Partiel | `packages/core/src/model.ts` |  |
| V2 | Annotations et textes | 🟡 Partiel | `packages/core/src/model.ts` | Texte de temps seulement |
| V2 | Microtonalité, notation slash | ⬜ Squelette | `packages/features/src/notation-pro/special.ts` |  |

## Audio

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Lecture SoundFont avec curseur | ✅ Fait | `apps/desktop/src/audio/player.ts` |  |
| MVP | Lecture, pause, boucle, depuis le curseur | ✅ Fait | `apps/desktop/src/components/Transport.tsx` |  |
| MVP | Mixeur volume / pan / solo / mute | ✅ Fait | `apps/desktop/src/components/TrackPanel.tsx` |  |
| MVP | Métronome et décompte | ✅ Fait | `apps/desktop/src/components/Transport.tsx` |  |
| V1 | Rendu audio des techniques | 🟡 Partiel | `apps/desktop/src/audio/player.ts` | Assuré par le synthé alphaTab |
| V1 | Banque de sons échantillonnés | 🟡 Partiel | `apps/desktop/src/audio/player.ts` | GeneralUser GS pour guitares, basses, piano et batterie ; banques haut de gamme à faire |
| V1 | Amplis et effets | 🟡 Partiel | `apps/desktop/src/audio/fx.ts` | Sons clean / crunch / distorsion par piste, réverbération générale ; simulation d’ampli par piste à faire |
| V1 | Humanisation | ⬜ Squelette | `packages/features/src/audio/humanize.ts` |  |
| V1 | Audio basse latence ASIO / CoreAudio | ⬜ Squelette | `apps/desktop/src-tauri/src/audio/mod.rs` |  |
| V1 | Plugins VST3 / AU | ⬜ Squelette | `apps/desktop/src-tauri/src/plugins.rs` |  |
| V1 | Sortie MIDI externe | ⬜ Squelette | `packages/features/src/daw/midi-out.ts` |  |
| V1 | Synchro DAW (MIDI Clock, MTC, Link) | ⬜ Squelette | `packages/features/src/daw/sync.ts` |  |
| V1 | Piste audio de référence | ⬜ Squelette | `packages/features/src/audio/backing-track.ts` |  |
| V1 | Export WAV / MP3 / FLAC et stems | ⬜ Squelette | `packages/features/src/audio/export.ts` |  |
| V1 | Export MIDI multipiste | ✅ Fait | `packages/core/src/formats/midi.ts` | Keyswitches pour banques pro à faire |
| V2 | Guitar Lab comme plugin dans le DAW | ⬜ Squelette | `packages/features/src/daw/plugin.ts` |  |
| V2 | Enregistrement audio | ⬜ Squelette | `packages/features/src/audio/recording.ts` |  |

## Apprentissage

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Ralentir le tempo (25-200 %) | ✅ Fait | `apps/desktop/src/components/Transport.tsx` |  |
| MVP | Boucle A-B avec accélération progressive | ✅ Fait | `apps/desktop/src/audio/player.ts` |  |
| MVP | Manche virtuel | ✅ Fait | `apps/desktop/src/components/Fretboard.tsx` |  |
| V1 | Clavier virtuel | ⬜ Squelette | `packages/features/src/practice/piano.ts` |  |
| V1 | Défilement adaptatif | 🟡 Partiel | `apps/desktop/src/components/ScoreView.tsx` | Page et horizontal ; prompteur à faire |
| V1 | Accordeur chromatique | ✅ Fait | `packages/features/src/practice/tuner.ts` |  |
| V1 | Gammes, modes, arpèges sur le manche | ⬜ Squelette | `packages/features/src/practice/theory.ts` |  |
| V1 | Jouer avec (mute de sa piste) | ✅ Fait | `apps/desktop/src/components/TrackPanel.tsx` |  |
| V2 | Détection de jeu au micro | ⬜ Squelette | `packages/features/src/practice/play-detection.ts` |  |
| V2 | Statistiques de pratique | ⬜ Squelette | `packages/features/src/practice/stats.ts` |  |
| V2 | Générateur d’exercices | ⬜ Squelette | `packages/features/src/practice/exercises.ts` |  |
| V2 | Transcription audio par IA | ⬜ Squelette | `packages/features/src/ai/transcription.ts` |  |
| V2 | Séparation de pistes par IA | ⬜ Squelette | `packages/features/src/ai/separation.ts` |  |

## Import / export

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Format natif ouvert (.glab) | ✅ Fait | `packages/core/src/formats/native.ts` |  |
| MVP | Import Guitar Pro 3-5 | ✅ Fait | `packages/alphatab-bridge/src/index.ts` |  |
| V1 | Import / export GP6-8 | ✅ Fait | `packages/alphatab-bridge/src/index.ts` |  |
| V1 | MusicXML | 🟡 Partiel | `packages/features/src/io/musicxml.ts` | Import OK (alphaTab) ; export à faire |
| MVP | MIDI | 🟡 Partiel | `packages/core/src/formats/midi.ts` | Export OK ; import à faire |
| MVP | Impression / PDF | ✅ Fait | `apps/desktop/src/components/ScoreView.tsx` |  |
| V1 | Export PNG / SVG | ⬜ Squelette | `packages/features/src/io/image.ts` |  |
| V1 | Tablature ASCII | ✅ Fait | `packages/core/src/formats/ascii.ts` |  |
| V2 | Import PowerTab / TuxGuitar | ⬜ Squelette | `packages/features/src/io/legacy-formats.ts` |  |
| V2 | Import MuseScore | ⬜ Squelette | `packages/features/src/io/legacy-formats.ts` |  |
| V2 | Reconnaissance de partition (photo / PDF) | ⬜ Squelette | `packages/features/src/ai/omr.ts` |  |
| V1 | Mise en page et impression | 🟡 Partiel | `apps/desktop/src/components/ScoreView.tsx` | Zoom, mise en page alphaTab ; marges et sauts de page à faire |

## Interface

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Thèmes clair / sombre / scène | ✅ Fait | `apps/desktop/src/styles.css` |  |
| MVP | Raccourcis configurables + préréglage Guitar Pro | ✅ Fait | `apps/desktop/src/components/ShortcutsDialog.tsx` |  |
| V1 | Palette de commandes (Ctrl+K) | ✅ Fait | `apps/desktop/src/components/CommandPalette.tsx` |  |
| MVP | Zoom et modes d’affichage | ✅ Fait | `apps/desktop/src/components/ScoreView.tsx` |  |
| V1 | Interface tactile (tablette) | ⬜ Squelette | `packages/features/src/ui/touch.ts` |  |
| V1 | Pédalier Bluetooth | 🟡 Partiel | `apps/desktop/src/app/keyboard.ts` | Les pédaliers envoyant PageUp/PageDown/Espace sont pris en charge |
| V1 | Accessibilité | 🟡 Partiel | `apps/desktop/src` | Tout est faisable au clavier ; audit lecteur d’écran à faire |
| V1 | Multilingue | ⬜ Squelette | `packages/features/src/ui/i18n.ts` |  |

## Mode scène

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| V1 | Setlists | ⬜ Squelette | `packages/features/src/stage/setlist.ts` |  |
| V1 | Affichage scène | 🟡 Partiel | `apps/desktop/src/styles.css` | Thème scène ; défilement calé au tempo à faire |
| V1 | Click et cues | ⬜ Squelette | `packages/features/src/stage/click-cues.ts` |  |
| V2 | MIDI Program Change automatique | ⬜ Squelette | `packages/features/src/stage/program-change.ts` |  |
| V1 | Fonctionnement hors ligne garanti | 🟡 Partiel | `apps/desktop` | Tout est local ; mode « concert » sans notifications à faire |
| V2 | Synchro du groupe | ⬜ Squelette | `packages/features/src/stage/band-sync.ts` |  |

## Collaboration et cloud

| Priorité | Fonctionnalité | État | Code | Remarque |
| --- | --- | --- | --- | --- |
| MVP | Sauvegarde automatique | ✅ Fait | `apps/desktop/src/app/autosave.ts` |  |
| V1 | Synchronisation cloud | ⬜ Squelette | `packages/features/src/cloud/sync.ts` |  |
| V1 | Historique de versions | ⬜ Squelette | `packages/features/src/cloud/versions.ts` |  |
| V1 | Partage par lien | ⬜ Squelette | `packages/features/src/cloud/share.ts` |  |
| V2 | Co-édition temps réel | ⬜ Squelette | `packages/features/src/collab/realtime.ts` |  |
| V2 | Commentaires ancrés | ⬜ Squelette | `packages/features/src/collab/comments.ts` |  |
| V1 | Bibliothèque personnelle | ⬜ Squelette | `packages/features/src/cloud/library.ts` |  |
| V2 | Communauté | ⬜ Squelette | `packages/features/src/cloud/community.ts` |  |
| V2 | Widget intégrable | ⬜ Squelette | `packages/features/src/cloud/embed.ts` |  |
| V2 | API de scripts et plugins | ⬜ Squelette | `packages/features/src/plugins/scripting.ts` |  |
