/** Export audio : choix du format, options, progression, enregistrement du fichier. */
import { useRef, useState } from 'react';
import { safeFileName, saveFile, isPreview } from '../app/platform';
import { getEditor, useApp } from '../app/store';
import { encodeMp3, encodeWav, renderSong, zipSingle, type AudioFormat } from '../audio/audioExport';
import { currentReverb } from '../audio/fx';
import { Modal } from './Modal';

const FORMATS: Array<{ id: AudioFormat; label: string; hint: string }> = [
  { id: 'mp3', label: 'MP3', hint: 'Léger (environ 1,5 Mo par minute) : idéal pour envoyer par message ou e-mail.' },
  { id: 'wav', label: 'WAV', hint: 'Qualité maximale, sans perte (environ 10 Mo par minute) : pour un logiciel de studio.' },
];

export function AudioExportDialog() {
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [metronome, setMetronome] = useState(false);
  const [reverb, setReverb] = useState(true);
  const [progress, setProgress] = useState<{ ratio: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ready = useApp((s) => s.player.ready);
  const song = getEditor().song;
  const close = () => {
    abort.current?.abort();
    useApp.getState().openDialog(null);
  };

  const run = async () => {
    setError(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      setProgress({ ratio: 0, label: 'Préparation…' });
      const audio = await renderSong({
        metronome,
        reverb: reverb ? currentReverb() : 0,
        signal: ctrl.signal,
        onProgress: (ratio, label) => setProgress({ ratio, label }),
      });
      setProgress({ ratio: 0.9, label: format === 'mp3' ? 'Encodage MP3…' : 'Création du fichier WAV…' });
      const data = format === 'mp3' ? await encodeMp3(audio, (r) => setProgress({ ratio: 0.9 + r * 0.09, label: 'Encodage MP3…' })) : encodeWav(audio);
      if (ctrl.signal.aborted) return;
      const name = `${safeFileName(song.meta.title)}.${format}`;
      setProgress({ ratio: 1, label: 'Enregistrement…' });
      // L'aperçu web n'autorise pas le téléchargement direct d'un fichier audio : il est livré dans un .zip.
      const saved = isPreview()
        ? await saveFile(`${name}.zip`, zipSingle(name, data), [{ name: 'Archive', extensions: ['zip'] }], 'application/zip')
        : await saveFile(name, data, [{ name: format.toUpperCase(), extensions: [format] }], format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      setProgress(null);
      if (saved) {
        const mins = Math.floor(audio.seconds / 60);
        const secs = String(Math.round(audio.seconds % 60)).padStart(2, '0');
        useApp.getState().notify(`${saved} enregistré (${mins}:${secs}, ${(data.length / 1048576).toFixed(1)} Mo).`);
        useApp.getState().openDialog(null);
      }
    } catch (e) {
      setProgress(null);
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    }
  };

  return (
    <Modal
      title="Exporter en audio"
      footer={
        <>
          <button type="button" className="ghost" onClick={close}>{progress ? 'Annuler' : 'Fermer'}</button>
          <button type="button" className="primary" disabled={!!progress || !ready} onClick={() => void run()}>
            Exporter en {format.toUpperCase()}
          </button>
        </>
      }
    >
      <p className="muted">Le morceau entier, toutes pistes mélangées comme à l’écoute (volume, panoramique, solo et muet compris).</p>
      <div className="audio-formats" role="radiogroup" aria-label="Format">
        {FORMATS.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={format === f.id} className={`audio-format${format === f.id ? ' on' : ''}`} onClick={() => setFormat(f.id)}>
            <strong>{f.label}</strong>
            <span>{f.hint}</span>
          </button>
        ))}
      </div>
      <label className="check"><input type="checkbox" checked={reverb} onChange={(e) => setReverb(e.target.checked)} /> Avec la réverbération réglée en bas de l’écran</label>
      <label className="check"><input type="checkbox" checked={metronome} onChange={(e) => setMetronome(e.target.checked)} /> Inclure le métronome</label>
      {isPreview() && <p className="field-hint">Dans l’aperçu web, le fichier est livré dans une archive .zip (double-cliquez dessus pour l’ouvrir).</p>}
      {progress && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}>
          <div className="progress-bar" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          <span>{progress.label} {Math.round(progress.ratio * 100)} %</span>
        </div>
      )}
      {error && <p className="error-text" role="alert">Export impossible : {error}</p>}
    </Modal>
  );
}
