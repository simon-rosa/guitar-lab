/** Barre de transport : lecture, boucle, vitesse, métronome, décompte. */
import { barFillStatus, currentBeat, tempoAtBars } from '@guitar-lab/core';
import { player } from '../audio/player';
import { runAction } from '../app/actions';
import { useApp, useEditor } from '../app/store';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const DURATION_NAMES: Record<number, string> = { 1: 'ronde', 2: 'blanche', 4: 'noire', 8: 'croche', 16: 'double croche', 32: 'triple croche', 64: 'quadruple croche' };

export function Transport() {
  const p = useApp((s) => s.player);
  const s = useEditor();
  const beat = currentBeat(s);
  const track = s.song.tracks[s.cursor.track];
  const mb = s.song.masterBars[s.cursor.bar];
  const fill = barFillStatus(track.bars[s.cursor.bar], mb);
  const tempo = tempoAtBars(s.song)[s.cursor.bar];

  return (
    <footer className="transport">
      <div className="transport-controls">
        <button type="button" className="tool" title="Retour au début" onClick={() => player.stop()} disabled={!p.ready}>⏮</button>
        <button type="button" className="tool play" title="Lecture / pause (Espace)" onClick={() => runAction('play.toggle')} disabled={!p.ready}>
          {p.playing ? '⏸' : '▶'}
        </button>
        <button type="button" className="tool" title="Lire depuis le curseur (Maj+Espace)" onClick={() => runAction('play.fromCursor')} disabled={!p.ready}>
          ▶|
        </button>
        <button
          type="button"
          className={`tool${p.looping ? ' active' : ''}`}
          title="Boucler la sélection ou la mesure (Ctrl+L)"
          aria-pressed={p.looping}
          onClick={() => runAction('play.loop')}
          disabled={!p.ready}
        >
          ⟲
        </button>
        <label className="check compact" title="Accélère de 5 % à chaque tour de boucle jusqu'à 100 %">
          <input type="checkbox" checked={p.progressiveLoop} onChange={(e) => useApp.getState().setPlayer({ progressiveLoop: e.target.checked })} />
          +5 %/tour
        </label>
        <label className="speed">
          Vitesse
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={p.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
            aria-valuetext={`${Math.round(p.speed * 100)} %`}
          />
          <output>{Math.round(p.speed * 100)} %</output>
        </label>
        <button type="button" className={`tool${p.metronome ? ' active' : ''}`} title="Métronome" aria-pressed={p.metronome} onClick={() => player.setMetronome(!p.metronome)}>
          𝅘𝅥 ◁
        </button>
        <button type="button" className={`tool${p.countIn ? ' active' : ''}`} title="Décompte avant lecture" aria-pressed={p.countIn} onClick={() => player.setCountIn(!p.countIn)}>
          1-2-3
        </button>
        <span className="time">
          {p.ready ? `${fmt(p.currentTime)} / ${fmt(p.endTime)}` : p.loadingSoundFont > 0 ? `Sons… ${Math.round(p.loadingSoundFont * 100)} %` : 'Chargement des sons…'}
        </span>
      </div>
      <div className="status" aria-live="polite">
        <span>Mesure {s.cursor.bar + 1}/{s.song.masterBars.length}</span>
        <span>Temps {s.cursor.beat + 1}</span>
        <span>Corde {s.cursor.string}</span>
        <span>Voix {s.cursor.voice + 1}</span>
        <span>{DURATION_NAMES[beat?.duration ?? s.inputDuration]}</span>
        <span>{mb.timeSignature.join('/')} · ♩ = {tempo}</span>
        <span className={`fill ${fill}`}>{{ empty: 'mesure vide', incomplete: 'incomplète', full: 'complète', overfull: 'trop pleine' }[fill]}</span>
        {s.anchor && <span className="sel">Sélection</span>}
      </div>
    </footer>
  );
}
