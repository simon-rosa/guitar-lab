# Guitar Lab

Éditeur de tablatures et de partitions pour guitaristes, bassistes et musiciens professionnels. Il a l'ambition de Guitar Pro avec une saisie plus rapide, un format ouvert et une version web.

- **Desktop** : Tauri 2 (Rust), sous Windows, macOS et Linux.
- **Web** : la même interface tourne dans le navigateur.
- **Rendu et lecture** : [alphaTab](https://alphatab.net) (MPL-2.0), police Bravura, SoundFont SONiVOX.

## Démarrer

```bash
npm install
npm run dev          # version web sur http://localhost:1420
npm run tauri dev    # application desktop (Rust + prérequis Tauri requis)
npm run tauri build  # installeurs desktop
```

Prérequis desktop : [Rust](https://rustup.rs) et les [dépendances système de Tauri](https://v2.tauri.app/start/prerequisites/) (WebKitGTK sous Linux, WebView2 sous Windows, Xcode CLT sous macOS).

## Vérifier

```bash
npm test             # tests TypeScript (cœur, passerelle alphaTab, features)
npm run typecheck    # vérification des types de tout le monorepo
npm run test:rust    # tests du backend Rust
npm run docs:features  # régénère docs/FEATURES.md depuis le registre
```

## Ce qui marche aujourd'hui

Tout le MVP du cahier des charges est implémenté et utilisable (29 features faites, 1 partielle sur 30) :

- **Saisie au clavier sans souris.** Chiffres = frette (deux chiffres rapides = 10 à 36), flèches = temps et cordes, `=`/`-` = durée. Les techniques ont des lettres (`h` hammer, `s` slide, `b` bend, `v` vibrato, `p` palm mute, `x` étouffée…).
- **Saisie à la souris** avec la palette d'outils et un clic sur le manche virtuel.
- **Tablature et partition liées**, multi-pistes, 4 voix, accordages de 4 à 10 cordes, capo, transposition qui change de corde au besoin.
- **Mesures** : signature, armure, tempo, reprises, fins alternatives, sections, anacrouse, remplissage automatique par des silences.
- **Édition** : copier/couper/coller sur plusieurs mesures, annulation illimitée.
- **Lecture** : SoundFont, curseur, mixeur (volume, pan, solo, muet), métronome, décompte, vitesse de 25 à 200 %, boucle avec accélération progressive (+5 % par tour), manche virtuel.
- **Formats** : natif `.glab` (JSON ouvert). Import Guitar Pro 3 à 8, MusicXML et tab texte ; export `.gp`, MIDI, tab texte et PDF.
- **Interface** : thèmes clair, sombre et scène, raccourcis configurables (avec un préréglage Guitar Pro), palette de commandes `Ctrl+K`, accordeur au micro, saisie MIDI, sauvegarde automatique.

Les features V1 et V2 sont en place sous forme de modules squelettes, avec leurs interfaces et la liste de ce qui reste à faire. L'état détaillé de chaque feature est dans **[docs/FEATURES.md](docs/FEATURES.md)**, ou dans l'app sous Aide → Feuille de route.

## Structure

```
packages/core             Modèle, édition, historique, formats (glab, alphaTex, ASCII, MIDI), raccourcis
packages/alphatab-bridge  Song ⇄ alphaTab : rendu, import GP/MusicXML, export .gp
packages/features         Registre des 107 features + modules V1/V2 (accordeur, MIDI, squelettes…)
apps/desktop              Interface React + Vite ; src-tauri = backend Rust (audio, VST, MIDI, synchro)
docs/                     Cahier des charges, architecture, liste des features
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
