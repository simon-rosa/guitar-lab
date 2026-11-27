/**
 * Vue tablature / partition (alphaTab) avec le curseur d'édition par-dessus.
 * Un clic sur une corde de la tablature place le curseur sur cette corde et
 * ouvre le sélecteur de frette ; on peut aussi taper la frette au clavier.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { barFillStatus, selectedBeats, setCursor } from '@guitar-lab/core';
import { player } from '../audio/player';
import { useApp, useEditor } from '../app/store';
import { FretPicker } from './FretPicker';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PICKER_WIDTH = 318;

export function ScoreView({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();
  const zoom = useApp((s) => s.zoom);
  const layout = useApp((s) => s.layout);
  const theme = useApp((s) => s.theme);
  const notation = useApp((s) => s.notation);
  const showAll = useApp((s) => s.showAllTracks);
  const renderError = useApp((s) => s.renderError);
  const pickerOpen = useApp((s) => s.picker);
  const [cursorRect, setCursorRect] = useState<{ beat: Rect; note?: Rect; stringY?: number; sel: Rect[] } | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [badBars, setBadBars] = useState<Array<Rect & { key: string; label: string; over: boolean }>>([]);

  // Montage d'alphaTab.
  useEffect(() => {
    if (!hostRef.current || !scrollRef.current) return;
    player.mount(hostRef.current, scrollRef.current);
    const onRendered = () => setRenderTick((t) => t + 1);
    window.addEventListener('guitarlab:rendered', onRendered);
    return () => {
      window.removeEventListener('guitarlab:rendered', onRendered);
      player.destroy();
    };
  }, [scrollRef]);

  // Rendu à chaque modification (regroupé par frame).
  const tracks = showAll ? editor.song.tracks.map((_, i) => i) : [editor.cursor.track];
  const tracksKey = tracks.join(',');
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      player.render(editor.song, { tracks: tracksKey.split(',').map(Number), zoom, layout, dark: theme !== 'light', notation }),
    );
    return () => cancelAnimationFrame(id);
  }, [editor.song, tracksKey, zoom, layout, theme, notation]);

  // Position du curseur et de la sélection.
  useLayoutEffect(() => {
    const b = player.cursorBounds(editor.cursor);
    if (!b) return setCursorRect(null);
    const sel: Rect[] = [];
    if (editor.anchor) {
      for (const r of selectedBeats(editor)) {
        const bb = player.cursorBounds({ ...editor.cursor, bar: r.bar, beat: r.beat });
        if (bb) sel.push(bb.beat);
      }
    }
    setCursorRect({ beat: b.beat, note: b.note, stringY: b.stringY, sel });
  }, [editor, renderTick]);

  // Mesures dont le total des durées ne correspond pas à la signature : en rouge, comme Guitar Pro.
  useLayoutEffect(() => {
    const out: Array<Rect & { key: string; label: string; over: boolean }> = [];
    for (const ti of tracksKey.split(',').map(Number)) {
      const t = editor.song.tracks[ti];
      if (!t) continue;
      editor.song.masterBars.forEach((mb, bi) => {
        const st = barFillStatus(t.bars[bi], mb);
        if (st !== 'incomplete' && st !== 'overfull') return;
        const r = player.barRect(ti, bi);
        if (r) out.push({ ...r, key: `${ti}-${bi}`, over: st === 'overfull', label: st === 'overfull' ? 'Trop longue' : 'Incomplète' });
      });
    }
    setBadBars(out);
  }, [editor.song, tracksKey, renderTick]);

  // Garder le curseur (et le sélecteur) visibles.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !cursorRect) return;
    const { y, h, x, w } = cursorRect.beat;
    const top = el.scrollTop;
    const view = el.clientHeight;
    let target = top;
    if (y - 20 < top) target = Math.max(0, y - 60);
    else {
      // Bas de ce qui doit être visible : la portée, ou le bas du sélecteur s'il est ouvert.
      const pickerH = wrapRef.current?.querySelector('.fret-picker')?.getBoundingClientRect().height ?? 360;
      const bottom = pickerOpen ? y + h + 24 + pickerH + 12 : y + h + 20;
      if (bottom > top + view) target = Math.min(y - 20, bottom - view);
    }
    if (Math.abs(target - top) > 2) el.scrollTo({ top: target, behavior: 'smooth' });
    if (x < el.scrollLeft || x + w > el.scrollLeft + el.clientWidth) el.scrollTo({ left: Math.max(0, x - 120), behavior: 'smooth' });
  }, [cursorRect, scrollRef, pickerOpen]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !hostRef.current) return;
    const r = hostRef.current.getBoundingClientRect();
    const st = useApp.getState();
    const song = st.history.present.song;
    const hit = player.hitTest(e.clientX - r.left, e.clientY - r.top, song);
    if (!hit) {
      st.setPicker(false);
      return;
    }
    st.nav((s) => setCursor(s, { ...hit, string: hit.string ?? s.cursor.string }, e.shiftKey));
    const drums = song.tracks[hit.track]?.kind === 'drums';
    // Le sélecteur s'ouvre quand on vise une corde de la tablature (ou la batterie).
    st.setPicker(!e.shiftKey && (hit.string !== undefined || drums));
  };

  const pickerPos = (() => {
    if (!cursorRect) return null;
    const wrapW = wrapRef.current?.clientWidth ?? 1000;
    // Sous toute la portée : le sélecteur ne doit jamais cacher les cordes de la mesure.
    return {
      left: Math.max(8, Math.min(wrapW - PICKER_WIDTH - 8, cursorRect.beat.x - 20)),
      top: cursorRect.beat.y + cursorRect.beat.h + 24,
    };
  })();

  const isEmpty = editor.song.tracks.every((t) => t.bars.every((b) => b.voices.every((v) => v.beats.every((x) => x.notes.length === 0))));

  return (
    <div className="score-scroll" ref={scrollRef}>
      {renderError && (
        <div className="render-error" role="alert">
          <strong>Le rendu a échoué.</strong> Le document est intact ; annulez la dernière action (Ctrl+Z) ou signalez ce message :
          <pre>{renderError}</pre>
        </div>
      )}
      {isEmpty && !pickerOpen && (
        <div className="empty-hint" role="note">
          <strong>Pour commencer :</strong> cliquez sur une corde de la tablature, puis choisissez la frette. Vous pouvez aussi taper la frette au clavier (0 à 24).
        </div>
      )}
      <div className="score-wrap" ref={wrapRef} onMouseDown={onMouseDown}>
        <div ref={hostRef} className="score-host" />
        <div className="bar-status-layer" aria-hidden>
          {badBars.map((b) => (
            <div key={b.key} className={`bar-bad${b.over ? ' over' : ''}`} style={{ left: b.x, top: b.y - 4, width: b.w, height: b.h + 8 }}>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
        {cursorRect && (
          <div className="cursor-layer" aria-hidden>
            {cursorRect.sel.map((r, i) => (
              <div key={i} className="selection-box" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
            ))}
            <div className="beat-cursor" style={{ left: cursorRect.beat.x - 2, top: cursorRect.beat.y, width: cursorRect.beat.w + 4, height: cursorRect.beat.h }} />
            {cursorRect.stringY !== undefined && (
              <div className="string-mark" style={{ left: cursorRect.beat.x - 4, top: cursorRect.stringY - 12, width: Math.max(26, cursorRect.beat.w + 8) }} />
            )}
          </div>
        )}
        {pickerOpen && pickerPos && <FretPicker left={pickerPos.left} top={pickerPos.top} />}
      </div>
    </div>
  );
}
