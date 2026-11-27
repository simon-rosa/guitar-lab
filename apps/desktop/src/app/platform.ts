/**
 * Accès aux fichiers : boîtes de dialogue natives sous Tauri,
 * sélecteur de fichier et téléchargement dans le navigateur.
 */

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface OpenedFile {
  name: string;
  path?: string;
  bytes: Uint8Array;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export async function openFile(filters: FileFilter[]): Promise<OpenedFile | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters });
    if (!path || Array.isArray(path)) return null;
    const bytes = await readFile(path);
    return { name: path.split(/[\\/]/).pop() ?? path, path, bytes };
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Enregistre des octets. Renvoie le nom (ou chemin) choisi, ou null si annulé. */
export async function saveFile(suggestedName: string, data: Uint8Array | string, filters: FileFilter[], mime = 'application/octet-stream'): Promise<string | null> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: suggestedName, filters });
    if (!path) return null;
    await writeFile(path, bytes);
    return path.split(/[\\/]/).pop() ?? path;
  }
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return suggestedName;
}

export function safeFileName(title: string): string {
  return (title || 'morceau').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 80) || 'morceau';
}
