/**
 * Génère docs/FEATURES.md à partir du registre (packages/features/src/registry.ts).
 * Usage : npm run docs:features
 */
import { writeFileSync } from 'node:fs';
import { FEATURES, featureStats } from '../packages/features/src/registry';

const LABEL = { done: '✅ Fait', partial: '🟡 Partiel', skeleton: '⬜ Squelette' } as const;
const s = featureStats();
const lines = [
  '# Fonctionnalités de Guitar Lab',
  '',
  '> Fichier généré par `npm run docs:features` depuis `packages/features/src/registry.ts`. Ne pas éditer à la main.',
  '',
  '| Priorité | Faites | Partielles | Squelettes | Total |',
  '| --- | --- | --- | --- | --- |',
  ...(['MVP', 'V1', 'V2'] as const).map((p) => `| ${p} | ${s[p].done} | ${s[p].partial} | ${s[p].skeleton} | ${s[p].total} |`),
  `| **Tout** | ${s.all.done} | ${s.all.partial} | ${s.all.skeleton} | ${s.all.total} |`,
  '',
];
for (const fam of [...new Set(FEATURES.map((f) => f.family))]) {
  lines.push(`## ${fam}`, '', '| Priorité | Fonctionnalité | État | Code | Remarque |', '| --- | --- | --- | --- | --- |');
  for (const f of FEATURES.filter((x) => x.family === fam))
    lines.push(`| ${f.priority} | ${f.name} | ${LABEL[f.status]} | \`${f.module}\` | ${f.note ?? ''} |`);
  lines.push('');
}
writeFileSync(new URL('../docs/FEATURES.md', import.meta.url), lines.join('\n'));
console.log(`docs/FEATURES.md : ${FEATURES.length} fonctionnalités`);
