// Mes morceaux (enregistrer, récents, renommer, favori, persistance) et export audio MP3 / WAV.
import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const ok = (c, l) => { console.log(c ? '✓' : '✗', l); if (!c) process.exitCode = 1; };
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('guitar-lab'); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); });
await page.reload();
await page.waitForSelector('.at-surface');
await page.waitForFunction(() => window.__guitarLab?.player?.realisticReady, null, { timeout: 30000 });
const write = async (title, frets) => {
  await page.evaluate((t) => {
    const app = window.__guitarLab.store.getState();
    app.edit((s) => ({ ...s, song: { ...s.song, meta: { ...s.song.meta, title: t } } }));
  }, title);
  const box = await page.locator('.score-host').boundingBox();
  const r = await page.evaluate(() => window.__guitarLab.player.barRect(0, 0));
  await page.mouse.click(box.x + r.x + 40, box.y + r.staffY + 20);
  await page.keyboard.press('Escape');
  for (const f of frets) { await page.keyboard.press(String(f)); await page.keyboard.press('ArrowRight'); }
};
// Morceau 1 : écrit puis Ctrl+S.
await write('Riff en Mi', [0, 3, 5, 3]);
await page.keyboard.press('Control+s');
await page.waitForTimeout(500);
// Morceau 2 : nouveau, écrit, sauvegarde automatique (5 s).
await page.click('.menu-btn:has-text("Fichier")');
await page.click('.menu-list button:has-text("Nouveau")');
await page.waitForTimeout(500);
await write('Ballade', [7, 5, 7]);
await page.waitForTimeout(6000);
await page.keyboard.press('Control+Shift+O');
await page.waitForSelector('.lib-item');
const titles = await page.locator('.lib-title').allTextContents();
ok(titles.length === 2 && titles[0].startsWith('Ballade') && titles[1].startsWith('Riff en Mi'), `Mes morceaux : ${titles.join(' | ')}`);
await page.screenshot({ path: '/tmp/lib.png' });
// Ouvrir le premier morceau.
await page.click('.lib-item:has-text("Riff en Mi") .lib-main');
await page.waitForTimeout(600);
const t = await page.evaluate(() => window.__guitarLab.store.getState().history.present.song.meta.title);
ok(t === 'Riff en Mi', `ouvert depuis la bibliothèque : ${t}`);
// Menu Récents.
await page.click('.menu-btn:has-text("Fichier")');
const rec = await page.locator('.menu-list').innerText();
ok(rec.toLowerCase().includes('récents') && rec.includes('Ballade'), 'menu Récents');
await page.screenshot({ path: '/tmp/menu.png' });
await page.keyboard.press('Escape'); await page.mouse.click(1300, 700);
// Renommer et favori.
await page.keyboard.press('Control+Shift+O');
await page.hover('.lib-item:has-text("Ballade")');
await page.click('.lib-item:has-text("Ballade") button:has-text("Renommer")');
await page.fill('.lib-rename', 'Ballade du soir');
await page.keyboard.press('Enter');
await page.click('.lib-item:has-text("Ballade du soir") .lib-fav');
await page.waitForTimeout(300);
const first = await page.locator('.lib-title').first().textContent();
ok(first.startsWith('Ballade du soir'), `renommé et mis en favori en tête : ${first}`);
// Persistance après rechargement.
await page.reload();
await page.waitForSelector('.at-surface');
await page.keyboard.press('Control+Shift+O');
await page.waitForSelector('.lib-item');
ok((await page.locator('.lib-item').count()) === 2, 'bibliothèque conservée après rechargement');
await page.click('button:has-text("Fermer")').catch(() => {}); await page.keyboard.press('Escape');
await page.locator('.modal header button').click().catch(() => {});
// Export audio MP3 et WAV.
for (const fmt of ['MP3', 'WAV']) {
  await page.keyboard.press('Control+Shift+E');
  await page.click(`.audio-format:has-text("${fmt}")`);
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await page.click(`button:has-text("Exporter en ${fmt}")`);
  const d = await dl;
  const p = `/tmp/export.${fmt.toLowerCase()}`;
  await d.saveAs(p);
  const b = fs.readFileSync(p);
  const head = fmt === 'WAV' ? b.subarray(0, 4).toString() : b.subarray(0, 3).toString('hex');
  ok(b.length > 10000, `export ${fmt} : ${d.suggestedFilename()} ${(b.length / 1024).toFixed(0)} Ko, en-tête ${head}`);
  await page.waitForTimeout(500);
}
ok(errors.length === 0, `aucune erreur ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
