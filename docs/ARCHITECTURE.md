# Architecture

## Principe

Le **modèle Guitar Lab** (`packages/core/src/model.ts`) est la seule source de vérité. Tout le reste en dérive :

```
          saisie (clavier, souris, MIDI)
                     │
                     ▼
  EditorState { song, cursor, anchor }  ──►  historique (immer, annulation illimitée)
                     │
         ┌───────────┼───────────────┬──────────────┐
         ▼           ▼               ▼              ▼
     alphaTex     .glab (JSON)     MIDI (SMF)    tab ASCII
         │
         ▼
  alphaTab Score ──► rendu SVG + synthé SoundFont + bornes cliquables
```

- **Pourquoi alphaTex** : le modèle est converti en texte alphaTex puis analysé par alphaTab. Le couplage reste faible, la conversion est testée par aller-retour (`packages/alphatab-bridge/test`), et on peut remplacer le moteur de rendu sans toucher au modèle.
- **Import** : alphaTab lit les fichiers GP3 à GP8, MusicXML et Capella. Ensuite `fromAlphaTabScore` convertit le résultat en `Song`.
- **Immuabilité** : chaque modification produit un nouveau `Song` (immer). Les parties inchangées gardent leur identité. Le lecteur s'en sert pour ne pas redessiner quand seul le mixeur bouge, et l'historique ne coûte presque rien en mémoire.

## Paquets

| Paquet | Rôle | Dépend de |
| --- | --- | --- |
| `@guitar-lab/core` | Modèle, opérations d'édition pures, timing, accordages, raccourcis, formats | immer |
| `@guitar-lab/alphatab-bridge` | Song ⇄ Score alphaTab, import/export Guitar Pro | core, alphaTab |
| `@guitar-lab/features` | Registre des features ; modules V1/V2 | core |
| `@guitar-lab/desktop` | Interface React, lecteur, fichiers ; backend Tauri | tous |

## Conventions du modèle

- Les cordes sont numérotées comme en tablature : **1 = la plus aiguë**. alphaTab utilise l'inverse, la passerelle convertit.
- `tuning` liste les hauteurs MIDI de la corde 1 à la corde N.
- Une note sonne à `tuning[corde-1] + capo + frette`. La frette est relative au capo.
- `displayTranspose` = transposition d'écriture. Elle vaut 12 pour la guitare et la basse, qui s'écrivent une octave au-dessus du son réel.
- Batterie : la « frette » porte la touche General MIDI (36 grosse caisse, 38 caisse claire, 42 charleston…).
- Les propriétés communes à toutes les pistes pour une mesure (signature, tempo, reprises, sections) vivent dans `MasterBar`.

## Application (`apps/desktop/src`)

| Dossier | Contenu |
| --- | --- |
| `app/store.ts` | État zustand : historique, préférences, état du lecteur |
| `app/actions.ts` | Exécution des actions (raccourcis, menus, palette) |
| `app/keyboard.ts` | Clavier global, saisie des chiffres, pédalier |
| `app/files.ts`, `platform.ts` | Ouvrir / enregistrer / exporter (dialogues natifs sous Tauri, téléchargement dans le navigateur) |
| `audio/player.ts` | Instance unique d'alphaTab : rendu, lecture, boucle, bornes du curseur |
| `components/` | Barre d'outils, partition, pistes et mixeur, manche, transport, dialogues |

## Backend Rust (`apps/desktop/src-tauri`)

Aujourd'hui il ne sert qu'aux fichiers (plugins `dialog` et `fs`). Les modules natifs sont déjà en place avec leurs commandes Tauri :

- `audio/` : contrat du moteur basse latence (cpal), chaîne d'effets (gain et overdrive déjà prêts) ;
- `plugins.rs` : scan des plugins VST3, CLAP et AU (opérationnel) ; leur hébergement reste à écrire ;
- `midi.rs` : MIDI natif (midir), messages Program Change ;
- `sync.rs` : MIDI Clock et Ableton Link.

## Ajouter une feature

1. Mettre la logique pure dans `packages/core` ou `packages/features`, avec ses tests.
2. Brancher l'interface dans `apps/desktop`.
3. Mettre à jour son statut dans `packages/features/src/registry.ts`, puis lancer `npm run docs:features`.

Le test `registre › pointe vers des fichiers qui existent` vérifie que chaque feature référence un fichier réel.
