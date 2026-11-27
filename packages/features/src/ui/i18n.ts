/**
 * Multilingue (FR, EN, ES, DE, PT, JA)
 * Priorité : V1 — voir packages/features/src/registry.ts
 *
 * À faire :
 *  - Extraire les libellés de l’interface dans des catalogues
 *  - Détection de la langue du système
 */
export type Locale = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ja';

const catalogs: Record<Locale, Record<string, string>> = { fr: {}, en: {}, es: {}, de: {}, pt: {}, ja: {} };

/** Traduit une clé ; tant que les catalogues sont vides, renvoie la clé (libellés FR d'origine). */
export function t(key: string, locale: Locale = 'fr'): string {
  return catalogs[locale][key] ?? key;
}
