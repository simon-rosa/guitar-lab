/**
 * API de scripts et plugins
 * Priorité : V2 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - API stable exposant le modèle et les commandes d’édition (packages/core)
 *  - Exécution isolée (Web Worker / QuickJS)
 *  - Gestionnaire d’extensions
 */
import type { EditorState } from '@guitar-lab/core';
import { notImplemented } from '../shared';

export interface GuitarLabPlugin {
  id: string;
  name: string;
  commands: Array<{ id: string; label: string; run: (state: EditorState) => EditorState }>;
}

export function registerPlugin(_p: GuitarLabPlugin): void {
  notImplemented('scripting');
}
