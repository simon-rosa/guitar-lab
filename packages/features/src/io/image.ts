/**
 * Export PNG / SVG d’un extrait
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Rendu alphaTab en mode SVG hors écran sur la plage sélectionnée
 *  - Rastérisation PNG via canvas
 */
import { notImplemented } from '../shared';

export function exportImage(_fromBar: number, _toBar: number, _format: 'png' | 'svg'): Promise<Blob> {
  return notImplemented('image-export');
}
