/** Barre de transport : lecture, boucle, vitesse, métronome, décompte. */
import { useEffect, useState } from 'react';
import { barFillInfo, currentBeat, setSongReverb, setSongTempo, tempoAtBars } from '@guitar-lab/core';
import { DEFAULT_REVERB, setReverb } from '../audio/fx';
import { player } from '../audio/player';
import { runAction } from '../app/actions';
import { useApp, useEditor } from '../app/store';
import { durationName } from './durations';

/** Champ de tempo : on peut taper librement, la valeur est validée à la sortie ou sur Entrée. */
function TempoInput({ value }: { value: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Math.round(Number(text));
    if (v >= 20 && v <= 400) useApp.getState().edit((st) => setSongTempo(st, v));
    else setText(String(value));
  };
  return (
    <input
      type="number"
      min={20}
      max={400}
      value={text}
      aria-label="Tempo du morceau (BPM)"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
/** Réverbération : entendue en direct pendant le réglage, enregistrée dans le morceau au relâchement. */
function ReverbControl({ value }: { value: number }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v !== value) useApp.getState().edit((st) => setSongReverb(st, v));
  };
  return (
    <label className="speed" title="Réverbération (effet de salle) appliquée à toute la lecture">
      Réverb
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={v}
        onChange={(e) => {
          const n = Number(e.target.value);
          setV(n);
          setReverb(n);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-valuetext={`${Math.round(v * 100)} %`}
      />
      <output>{Math.round(v * 100)} %</output>
    </label>
  );
}


const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};


export function Transport() {
  const p = useApp((s) => s.player);
  const s = useEditor();
  const beat = currentBeat(s);
  const track = s.song.tracks[s.cursor.track];
  const mb = s.song.masterBars[s.cursor.bar];
  const fillInfo = barFillInfo(track.bars[s.cursor.bar], mb);
  const fill = fillInfo.status;
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
        <label className="tempo" title="Tempo du morceau en battements par minute (noires par minute)">
          ♩ =
          <TempoInput value={s.song.tempo} />
          BPM
        </label>
        <label className="speed" title="Ralentir ou accélérer la lecture sans changer le morceau">
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
        <ReverbControl value={s.song.reverb ?? DEFAULT_REVERB} />
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
        <span>{durationName(beat?.duration ?? s.inputDuration)}</span>
        <span>{mb.timeSignature.join('/')}{tempo !== s.song.tempo ? ` · ♩ = ${tempo} ici` : ''}</span>
        <span className={`fill ${fill}`} title={fillInfo.detail}>
          {fill === 'empty' ? 'mesure vide' : fill === 'full' ? `${fillInfo.text} ✓` : `${fillInfo.text} · ${fillInfo.detail}`}
        </span>
        {s.anchor && <span className="sel">Sélection</span>}
      </div>
    </footer>
  );
}
