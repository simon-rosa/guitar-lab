/**
 * Raccourcis clavier configurables. Une combinaison s'écrit
 * « Ctrl+Shift+ArrowRight », « Alt+h », « Space »… (Cmd est traité comme Ctrl sur macOS).
 */

export type ActionId =
  | 'cursor.left' | 'cursor.right' | 'cursor.up' | 'cursor.down'
  | 'cursor.prevBar' | 'cursor.nextBar'
  | 'select.left' | 'select.right'
  | 'edit.delete' | 'edit.insertBeat' | 'edit.rest'
  | 'edit.undo' | 'edit.redo' | 'edit.copy' | 'edit.cut' | 'edit.paste' | 'edit.selectAllBar'
  | 'duration.shorter' | 'duration.longer'
  | 'duration.1' | 'duration.2' | 'duration.4' | 'duration.8' | 'duration.16' | 'duration.32'
  | 'beat.dot' | 'beat.triplet' | 'beat.pickUp' | 'beat.pickDown'
  | 'note.tie' | 'note.hammer' | 'note.slide' | 'note.bend' | 'note.vibrato' | 'note.palmMute'
  | 'note.dead' | 'note.letRing' | 'note.harmonic' | 'note.ghost' | 'note.accent' | 'note.staccato' | 'note.tap'
  | 'bar.insert' | 'bar.delete' | 'bar.fill'
  | 'voice.1' | 'voice.2' | 'voice.3' | 'voice.4'
  | 'transpose.up' | 'transpose.down'
  | 'play.toggle' | 'play.fromCursor' | 'play.loop'
  | 'file.new' | 'file.open' | 'file.save' | 'file.print'
  | 'view.zoomIn' | 'view.zoomOut' | 'view.commandPalette' | 'view.help';

export interface ActionInfo {
  id: ActionId;
  label: string;
  group: string;
}

export const ACTIONS: ActionInfo[] = [
  { id: 'cursor.left', label: 'Temps précédent', group: 'Navigation' },
  { id: 'cursor.right', label: 'Temps suivant', group: 'Navigation' },
  { id: 'cursor.up', label: 'Corde au-dessus', group: 'Navigation' },
  { id: 'cursor.down', label: 'Corde en dessous', group: 'Navigation' },
  { id: 'cursor.prevBar', label: 'Mesure précédente', group: 'Navigation' },
  { id: 'cursor.nextBar', label: 'Mesure suivante', group: 'Navigation' },
  { id: 'select.left', label: 'Étendre la sélection à gauche', group: 'Navigation' },
  { id: 'select.right', label: 'Étendre la sélection à droite', group: 'Navigation' },
  { id: 'edit.delete', label: 'Supprimer la note / le temps', group: 'Édition' },
  { id: 'edit.insertBeat', label: 'Insérer un temps', group: 'Édition' },
  { id: 'edit.rest', label: 'Silence', group: 'Édition' },
  { id: 'edit.undo', label: 'Annuler', group: 'Édition' },
  { id: 'edit.redo', label: 'Rétablir', group: 'Édition' },
  { id: 'edit.copy', label: 'Copier', group: 'Édition' },
  { id: 'edit.cut', label: 'Couper', group: 'Édition' },
  { id: 'edit.paste', label: 'Coller', group: 'Édition' },
  { id: 'edit.selectAllBar', label: 'Sélectionner la mesure', group: 'Édition' },
  { id: 'duration.shorter', label: 'Durée plus courte', group: 'Rythme' },
  { id: 'duration.longer', label: 'Durée plus longue', group: 'Rythme' },
  { id: 'duration.1', label: 'Ronde', group: 'Rythme' },
  { id: 'duration.2', label: 'Blanche', group: 'Rythme' },
  { id: 'duration.4', label: 'Noire', group: 'Rythme' },
  { id: 'duration.8', label: 'Croche', group: 'Rythme' },
  { id: 'duration.16', label: 'Double croche', group: 'Rythme' },
  { id: 'duration.32', label: 'Triple croche', group: 'Rythme' },
  { id: 'beat.dot', label: 'Point (pointé / double)', group: 'Rythme' },
  { id: 'beat.triplet', label: 'Triolet', group: 'Rythme' },
  { id: 'beat.pickUp', label: 'Coup montant', group: 'Techniques' },
  { id: 'beat.pickDown', label: 'Coup descendant', group: 'Techniques' },
  { id: 'note.tie', label: 'Liaison de prolongation', group: 'Techniques' },
  { id: 'note.hammer', label: 'Hammer-on / pull-off', group: 'Techniques' },
  { id: 'note.slide', label: 'Slide', group: 'Techniques' },
  { id: 'note.bend', label: 'Bend (1 ton)', group: 'Techniques' },
  { id: 'note.vibrato', label: 'Vibrato', group: 'Techniques' },
  { id: 'note.palmMute', label: 'Palm mute', group: 'Techniques' },
  { id: 'note.dead', label: 'Note étouffée (x)', group: 'Techniques' },
  { id: 'note.letRing', label: 'Let ring', group: 'Techniques' },
  { id: 'note.harmonic', label: 'Harmonique naturelle', group: 'Techniques' },
  { id: 'note.ghost', label: 'Note fantôme', group: 'Techniques' },
  { id: 'note.accent', label: 'Accent', group: 'Techniques' },
  { id: 'note.staccato', label: 'Staccato', group: 'Techniques' },
  { id: 'note.tap', label: 'Tapping', group: 'Techniques' },
  { id: 'bar.insert', label: 'Insérer une mesure', group: 'Mesures' },
  { id: 'bar.delete', label: 'Supprimer la mesure', group: 'Mesures' },
  { id: 'bar.fill', label: 'Compléter la mesure avec des silences', group: 'Mesures' },
  { id: 'voice.1', label: 'Voix 1', group: 'Mesures' },
  { id: 'voice.2', label: 'Voix 2', group: 'Mesures' },
  { id: 'voice.3', label: 'Voix 3', group: 'Mesures' },
  { id: 'voice.4', label: 'Voix 4', group: 'Mesures' },
  { id: 'transpose.up', label: 'Transposer la sélection +½ ton', group: 'Mesures' },
  { id: 'transpose.down', label: 'Transposer la sélection −½ ton', group: 'Mesures' },
  { id: 'play.toggle', label: 'Lecture / pause', group: 'Lecture' },
  { id: 'play.fromCursor', label: 'Lire depuis le curseur', group: 'Lecture' },
  { id: 'play.loop', label: 'Boucler la sélection', group: 'Lecture' },
  { id: 'file.new', label: 'Nouveau morceau', group: 'Fichier' },
  { id: 'file.open', label: 'Ouvrir', group: 'Fichier' },
  { id: 'file.save', label: 'Enregistrer', group: 'Fichier' },
  { id: 'file.print', label: 'Imprimer / PDF', group: 'Fichier' },
  { id: 'view.zoomIn', label: 'Zoom avant', group: 'Affichage' },
  { id: 'view.zoomOut', label: 'Zoom arrière', group: 'Affichage' },
  { id: 'view.commandPalette', label: 'Palette de commandes', group: 'Affichage' },
  { id: 'view.help', label: 'Aide et guide de démarrage', group: 'Affichage' },
];

export type Keymap = Partial<Record<ActionId, string[]>>;

/** Disposition par défaut de Guitar Lab (saisie rapide sans souris). */
export const DEFAULT_KEYMAP: Keymap = {
  'cursor.left': ['ArrowLeft'],
  'cursor.right': ['ArrowRight'],
  'cursor.up': ['ArrowUp'],
  'cursor.down': ['ArrowDown'],
  'cursor.prevBar': ['Ctrl+ArrowLeft'],
  'cursor.nextBar': ['Ctrl+ArrowRight'],
  'select.left': ['Shift+ArrowLeft'],
  'select.right': ['Shift+ArrowRight'],
  'edit.delete': ['Delete', 'Backspace'],
  'edit.insertBeat': ['Insert', 'i'],
  'edit.rest': ['r'],
  'edit.undo': ['Ctrl+z'],
  'edit.redo': ['Ctrl+y', 'Ctrl+Shift+z'],
  'edit.copy': ['Ctrl+c'],
  'edit.cut': ['Ctrl+x'],
  'edit.paste': ['Ctrl+v'],
  'edit.selectAllBar': ['Ctrl+a'],
  'duration.shorter': ['=', '+'],
  'duration.longer': ['-'],
  'duration.1': ['Alt+1'],
  'duration.2': ['Alt+2'],
  'duration.4': ['Alt+3'],
  'duration.8': ['Alt+4'],
  'duration.16': ['Alt+5'],
  'duration.32': ['Alt+6'],
  'beat.dot': ['.'],
  'beat.triplet': ['t'],
  'beat.pickUp': ['u'],
  'beat.pickDown': ['d'],
  'note.tie': ['l'],
  'note.hammer': ['h'],
  'note.slide': ['s'],
  'note.bend': ['b'],
  'note.vibrato': ['v'],
  'note.palmMute': ['p'],
  'note.dead': ['x'],
  'note.letRing': ['Shift+l'],
  'note.harmonic': ['n'],
  'note.ghost': ['g'],
  'note.accent': ['a'],
  'note.staccato': ['Shift+s'],
  'note.tap': ['Shift+t'],
  'bar.insert': ['Ctrl+Insert', 'Ctrl+i'],
  'bar.delete': ['Ctrl+Delete', 'Ctrl+Backspace'],
  'bar.fill': ['f'],
  'voice.1': ['Ctrl+1'],
  'voice.2': ['Ctrl+2'],
  'voice.3': ['Ctrl+3'],
  'voice.4': ['Ctrl+4'],
  'transpose.up': ['Ctrl+ArrowUp'],
  'transpose.down': ['Ctrl+ArrowDown'],
  'play.toggle': ['Space'],
  'play.fromCursor': ['Shift+Space'],
  'play.loop': ['Ctrl+l'],
  'file.new': ['Ctrl+n'],
  'file.open': ['Ctrl+o'],
  'file.save': ['Ctrl+s'],
  'file.print': ['Ctrl+p'],
  'view.zoomIn': ['Ctrl+='],
  'view.zoomOut': ['Ctrl+-'],
  'view.commandPalette': ['Ctrl+k'],
  'view.help': ['F1', '?'],
};

/** Préréglage pour les utilisateurs venant de Guitar Pro (touches les plus courantes). */
export const GUITAR_PRO_KEYMAP: Keymap = {
  ...DEFAULT_KEYMAP,
  'duration.shorter': ['NumpadAdd', '='],
  'duration.longer': ['NumpadSubtract', '-'],
  'note.hammer': ['h'],
  'note.slide': ['s'],
  'note.bend': ['b'],
  'note.vibrato': ['v'],
  'note.palmMute': ['p'],
  'note.dead': ['x'],
  'note.tie': ['l'],
  'edit.rest': ['r'],
  'bar.insert': ['Ctrl+Insert'],
  'play.toggle': ['Space'],
};

export interface KeyLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Normalise un événement clavier en combinaison textuelle. */
export function comboFromEvent(e: KeyLike): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  let key = e.key === ' ' ? 'Space' : e.key;
  if (e.code?.startsWith('Numpad') && /^Numpad(Add|Subtract)$/.test(e.code)) key = e.code;
  // Alt modifie souvent la touche produite (Alt+1 → ¡ sur macOS) : on se rabat sur le code physique.
  if (e.altKey && e.code?.startsWith('Digit')) key = e.code.slice(5);
  if (e.shiftKey && (key.length > 1 || /[a-zA-Z]/.test(key))) parts.push('Shift');
  if (key.length === 1 && /[A-Z]/.test(key)) key = key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

export function buildKeyLookup(keymap: Keymap): Map<string, ActionId> {
  const map = new Map<string, ActionId>();
  for (const [action, combos] of Object.entries(keymap) as Array<[ActionId, string[]]>) {
    for (const c of combos ?? []) map.set(c, action);
  }
  return map;
}

/** Combinaisons attribuées à plusieurs actions. */
export function findConflicts(keymap: Keymap): Array<{ combo: string; actions: ActionId[] }> {
  const seen = new Map<string, ActionId[]>();
  for (const [action, combos] of Object.entries(keymap) as Array<[ActionId, string[]]>) {
    for (const c of combos ?? []) seen.set(c, [...(seen.get(c) ?? []), action]);
  }
  return [...seen].filter(([, a]) => a.length > 1).map(([combo, actions]) => ({ combo, actions }));
}
