/**
 * Clavier global : raccourcis configurables, saisie des frettes au pavé
 * numérique ou aux chiffres, et pédaliers Bluetooth (PageUp / PageDown).
 */
import { buildKeyLookup, comboFromEvent, type Keymap } from '@guitar-lab/core';
import { runAction, typeDigit } from './actions';
import { useApp } from './store';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function installKeyboard(getScrollElement: () => HTMLElement | null): () => void {
  let keymap: Keymap | null = null;
  let lookup = buildKeyLookup({});

  const onKey = (e: KeyboardEvent) => {
    const app = useApp.getState();
    if (app.confirmRequest) return;
    if (app.dialog) {
      if (e.key === 'Escape') app.openDialog(null);
      return;
    }
    if (app.picker && e.key === 'Escape') {
      app.setPicker(false);
      e.preventDefault();
      return;
    }
    if (isTyping(e.target)) return;
    if (app.keymap !== keymap) {
      keymap = app.keymap;
      lookup = buildKeyLookup(keymap);
    }

    // Pédalier / tourne-page : défilement d'un écran.
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      const el = getScrollElement();
      if (el) {
        el.scrollBy({ top: (e.key === 'PageDown' ? 1 : -1) * el.clientHeight * 0.85, behavior: 'smooth' });
        e.preventDefault();
      }
      return;
    }

    const plainDigit = !e.ctrlKey && !e.metaKey && !e.altKey && /^\d$/.test(e.key);
    if (plainDigit) {
      typeDigit(Number(e.key));
      e.preventDefault();
      return;
    }

    const combo = comboFromEvent(e);
    const action = lookup.get(combo);
    if (action) {
      e.preventDefault();
      runAction(action);
    }
  };

  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
