/** Guide de démarrage et aide-mémoire. S'ouvre au premier lancement, puis avec F1 ou « ? ». */
import { useApp } from '../app/store';
import { Modal } from './Modal';

const STEPS: Array<{ title: string; text: string }> = [
  { title: 'Cliquez sur une corde', text: 'Dans la tablature, cliquez sur la ligne de la corde, à l’endroit du temps voulu. Un cadre orange montre où la note va s’écrire.' },
  { title: 'Choisissez la frette', text: 'Le sélecteur qui s’ouvre propose les frettes 0 à 24 avec le nom de la note. Le curseur passe ensuite au temps suivant.' },
  { title: 'Réglez la durée', text: 'Noire, croche, blanche… : choisissez la durée dans la barre « Durée » ou dans le sélecteur, avant ou après avoir posé la note.' },
  { title: 'Écoutez', text: 'Appuyez sur Espace ou sur ▶. Réglez le tempo (♩ = BPM) et la vitesse de lecture en bas de l’écran.' },
];

const KEYS: Array<[string, string]> = [
  ['0 à 9', 'Écrire une frette (deux chiffres rapides : 10 à 24)'],
  ['← →', 'Temps précédent / suivant (→ après la dernière note : ajouter une note)'],
  ['↑ ↓', 'Corde au-dessus / en dessous'],
  ['= / −', 'Durée plus courte / plus longue'],
  ['.', 'Note pointée'],
  ['r', 'Silence'],
  ['Suppr', 'Effacer la note, puis le temps'],
  ['h  s  b  v', 'Hammer, slide, bend, vibrato'],
  ['p  x', 'Palm mute, note étouffée'],
  ['Espace', 'Lecture / pause'],
  ['Ctrl+Z / Ctrl+Y', 'Annuler / rétablir'],
  ['Ctrl+K', 'Chercher une commande par son nom'],
];

export function HelpDialog() {
  const welcomeDone = useApp((s) => s.welcomeDone);
  const close = () => {
    useApp.getState().setPrefs({ welcomeDone: true });
    useApp.getState().openDialog(null);
  };
  return (
    <Modal
      title={welcomeDone ? 'Aide' : 'Bienvenue dans Guitar Lab'}
      wide
      footer={
        <>
          <button type="button" className="ghost" onClick={() => useApp.getState().openDialog('shortcuts')}>
            Tous les raccourcis…
          </button>
          <button type="button" className="primary" onClick={close}>
            {welcomeDone ? 'Fermer' : 'C’est parti'}
          </button>
        </>
      }
    >
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="step-no">{i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3>Au clavier, c’est encore plus rapide</h3>
      <table className="shortcuts cheat">
        <tbody>
          {KEYS.map(([k, v]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Une mesure encadrée en rouge a une durée totale qui ne correspond pas à sa signature (« Trop longue » ou « Incomplète ») : ajoutez, retirez ou changez la durée de notes jusqu’à ce que le rouge disparaisse.
        <br />
        Astuce : le manche en bas de l’écran sert aussi à saisir, un clic sur une case écrit la note. Le bouton « Tablature / Tab + partition / Partition » change les portées affichées.
      </p>
    </Modal>
  );
}
