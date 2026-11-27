/** Accordeur chromatique au micro (algorithme YIN de packages/features). */
import { useEffect, useRef, useState } from 'react';
import { practice_tuner } from '@guitar-lab/features';
import { pitchName } from '@guitar-lab/core';
import { useEditor } from '../app/store';
import { Modal } from './Modal';

export function TunerDialog() {
  const s = useEditor();
  const tuning = s.song.tracks[s.cursor.track].tuning;
  const [reading, setReading] = useState<{ name: string; cents: number; freq: number; string: number; stringCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [a4, setA4] = useState(440);
  const a4Ref = useRef(a4);
  a4Ref.current = a4;

  useEffect(() => {
    let stop = false;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 8192;
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const loop = () => {
          if (stop) return;
          analyser.getFloatTimeDomainData(buf);
          const r = practice_tuner.detectPitch(buf, ctx!.sampleRate);
          if (r && r.clarity > 0.85) {
            const note = practice_tuner.frequencyToNote(r.frequency, a4Ref.current);
            const near = practice_tuner.nearestString(practice_tuner.midiFloat(r.frequency, a4Ref.current), tuning);
            setReading({ name: note.name, cents: note.cents, freq: r.frequency, string: near.string, stringCents: near.cents });
          }
          requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        setError(`Micro indisponible : ${(e as Error).message}`);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [tuning]);

  const cents = reading?.cents ?? 0;
  const inTune = reading && Math.abs(cents) <= 3;

  return (
    <Modal title="Accordeur">
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="tuner">
          <div className={`tuner-note${inTune ? ' in-tune' : ''}`}>{reading?.name ?? '—'}</div>
          <div className="tuner-meter" aria-label={`Écart ${cents} cents`}>
            <div className="tuner-scale">
              {[-50, -25, 0, 25, 50].map((c) => <span key={c} style={{ left: `${50 + c}%` }}>{c > 0 ? `+${c}` : c}</span>)}
            </div>
            <div className="tuner-needle" style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} />
          </div>
          <p className="hint">
            {reading
              ? `${reading.freq.toFixed(1)} Hz · corde la plus proche : ${reading.string} (${pitchName(tuning[reading.string - 1])}, ${reading.stringCents > 0 ? '+' : ''}${reading.stringCents} cents)`
              : 'Jouez une corde à vide…'}
          </p>
          <label className="inline">
            La de référence
            <input type="number" min={415} max={466} value={a4} onChange={(e) => setA4(Number(e.target.value))} /> Hz
          </label>
        </div>
      )}
    </Modal>
  );
}
