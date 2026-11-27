/**
 * Vue partition + tablature (alphaTab) avec le curseur d'édition par-dessus.
 * Un clic sur un temps ou une note place le curseur.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { player } from '../audio/player';
import { useApp, useEditor } from '../app/store';
import { selectedBeats, setCursor } from '@guitar-lab/core';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function ScoreView({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();
  const zoom = useApp((s) => s.zoom);
  const layout = useApp((s) => s.layout);
  const theme = useApp((s) => s.theme);
  const showAll = useApp((s) => s.showAllTracks);
  const renderError = useApp((s) => s.renderError);
  const [cursorRect, setCursorRect] = useState<{ beat: Rect; note?: Rect; stringY?: number; sel: Rect[] } | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // Montage d'alphaTab.
  useEffect(() => {
    if (!hostRef.current || !scrollRef.current) return;
    player.mount(hostRef.current, scrollRef.current);
    player.onBeatClick = (c) => useApp.getState().nav((s) => setCursor(s, { ...c, string: c.string ?? s.cursor.string }));
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
      player.render(editor.song, { tracks: tracksKey.split(',').map(Number), zoom, layout, dark: theme !== 'light' }),
    );
    return () => cancelAnimationFrame(id);
  }, [editor.song, tracksKey, zoom, layout, theme]);

  // Mixeur en direct.
  useEffect(() => player.updateMixer(editor.song), [editor.song]);

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

  // Garder le curseur visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !cursorRect) return;
    const { y, h, x, w } = cursorRect.beat;
    if (y < el.scrollTop + 20 || y + h > el.scrollTop + el.clientHeight - 20) el.scrollTo({ top: Math.max(0, y - 80), behavior: 'smooth' });
    if (x < el.scrollLeft || x + w > el.scrollLeft + el.clientWidth) el.scrollTo({ left: Math.max(0, x - 120), behavior: 'smooth' });
  }, [cursorRect, scrollRef]);

  return (
    <div className="score-scroll" ref={scrollRef}>
      {renderError && (
        <div className="render-error" role="alert">
          <strong>Le rendu a échoué.</strong> Le document est intact ; annulez la dernière action (Ctrl+Z) ou signalez ce message :
          <pre>{renderError}</pre>
        </div>
      )}
      <div className="score-wrap">
        <div ref={hostRef} className="score-host" />
        {cursorRect && (
          <div className="cursor-layer" aria-hidden>
            {cursorRect.sel.map((r, i) => (
              <div key={i} className="selection-box" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
            ))}
            <div className="beat-cursor" style={{ left: cursorRect.beat.x - 2, top: cursorRect.beat.y, width: cursorRect.beat.w + 4, height: cursorRect.beat.h }} />
            {cursorRect.stringY !== undefined && (
              <div className="string-mark" style={{ left: cursorRect.beat.x - 2, top: cursorRect.stringY - 6, width: Math.max(16, cursorRect.beat.w + 4) }} />
            )}
            {cursorRect.note && (
              <div className="note-cursor" style={{ left: cursorRect.note.x - 3, top: cursorRect.note.y - 3, width: cursorRect.note.w + 6, height: cursorRect.note.h + 6 }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
