/**
 * « Mes morceaux » : tous les morceaux enregistrés ou ouverts, du plus récent au
 * plus ancien. Recherche, favoris, ouverture en un clic, renommer, dupliquer, supprimer.
 */
import { useEffect, useMemo, useState } from 'react';
import { askConfirm, useApp } from '../app/store';
import { newSong, openAny, openFromLibrary } from '../app/files';
import {
  deleteFromLibrary,
  duplicateInLibrary,
  listLibrary,
  onLibraryChange,
  relativeDate,
  renameInLibrary,
  toggleFavorite,
  type LibraryEntry,
} from '../app/library';
import { Modal } from './Modal';

export function useLibrary(): LibraryEntry[] | null {
  const [items, setItems] = useState<LibraryEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => void listLibrary().then((l) => alive && setItems(l));
    load();
    const off = onLibraryChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return items;
}

type Filter = 'all' | 'favorites';

export function LibraryDialog() {
  const items = useLibrary();
  const currentId = useApp((s) => s.libraryId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const close = () => useApp.getState().openDialog(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? [])
      .filter((e) => filter === 'all' || e.favorite)
      .filter((e) => !q || `${e.title} ${e.artist} ${e.instruments.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }, [items, query, filter]);

  const open = async (id: string) => {
    if (id === currentId) return close();
    if (await openFromLibrary(id)) close();
  };

  const commitRename = async () => {
    if (!renaming) return;
    const title = renaming.title.trim();
    if (title) {
      await renameInLibrary(renaming.id, title);
      // Morceau ouvert : le titre change aussi dans l'éditeur.
      if (renaming.id === useApp.getState().libraryId) {
        useApp.getState().edit((st) => ({ ...st, song: { ...st.song, meta: { ...st.song.meta, title } } }));
      }
    }
    setRenaming(null);
  };

  return (
    <Modal
      title="Mes morceaux"
      wide
      footer={
        <>
          <span className="chord-status">
            {items ? `${items.length} morceau${items.length > 1 ? 'x' : ''}` : 'Chargement…'} · enregistrés automatiquement sur cet appareil
          </span>
          <button type="button" className="ghost" onClick={() => void openAny().then(close)}>Importer un fichier…</button>
          <button type="button" className="primary" onClick={() => void newSong().then(close)}>Nouveau morceau</button>
        </>
      }
    >
      <div className="lib-bar">
        <input
          type="search"
          className="lib-search"
          placeholder="Rechercher un titre, un artiste, un instrument…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher dans mes morceaux"
        />
        <div className="segmented" role="radiogroup" aria-label="Filtre">
          {(['all', 'favorites'] as Filter[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tous' : '★ Favoris'}
            </button>
          ))}
        </div>
      </div>

      {items && items.length === 0 ? (
        <div className="lib-empty">
          <p><strong>Aucun morceau pour l’instant.</strong></p>
          <p>Écrivez quelques notes : le morceau apparaîtra ici tout seul. Vous pouvez aussi importer un fichier Guitar Pro, MusicXML ou une tablature texte.</p>
        </div>
      ) : shown.length === 0 && items ? (
        <p className="muted">Aucun morceau ne correspond.</p>
      ) : (
        <ul className="lib-list">
          {shown.map((e) => (
            <li key={e.id} className={`lib-item${e.id === currentId ? ' current' : ''}`}>
              <button
                type="button"
                className={`lib-fav${e.favorite ? ' on' : ''}`}
                title={e.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-pressed={!!e.favorite}
                onClick={() => void toggleFavorite(e.id)}
              >
                {e.favorite ? '★' : '☆'}
              </button>
              {renaming?.id === e.id ? (
                <input
                  className="lib-rename"
                  autoFocus
                  value={renaming.title}
                  aria-label="Nouveau titre"
                  onChange={(ev) => setRenaming({ id: e.id, title: ev.target.value })}
                  onBlur={() => void commitRename()}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') void commitRename();
                    if (ev.key === 'Escape') {
                      ev.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <button type="button" className="lib-main" onClick={() => void open(e.id)} title="Ouvrir">
                  <span className="lib-title">
                    {e.title}
                    {e.id === currentId && <span className="lib-badge">ouvert</span>}
                  </span>
                  <span className="lib-meta">
                    {[e.artist, e.instruments.join(', '), `${e.bars} mesure${e.bars > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                  </span>
                </button>
              )}
              <span className="lib-date" title={new Date(e.updatedAt).toLocaleString('fr-FR')}>{relativeDate(Math.max(e.updatedAt, e.openedAt))}</span>
              <span className="lib-actions">
                <button type="button" className="ghost small" onClick={() => setRenaming({ id: e.id, title: e.title })}>Renommer</button>
                <button type="button" className="ghost small" onClick={() => void duplicateInLibrary(e.id)}>Dupliquer</button>
                <button
                  type="button"
                  className="ghost small danger"
                  onClick={async () => {
                    if (!(await askConfirm(`Supprimer « ${e.title} » de Mes morceaux ? Cette action est définitive.`, 'Supprimer', true))) return;
                    await deleteFromLibrary(e.id);
                    if (e.id === useApp.getState().libraryId) useApp.getState().setLibraryId(null);
                  }}
                >
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
