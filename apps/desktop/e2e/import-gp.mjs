// Import de vrais fichiers Guitar Pro 3/4/5 (jeu de test de PyGuitarPro, à télécharger à part).
import { chromium } from 'playwright';
const D = '/home/claude/dl/pgp2/pyguitarpro-0.11/tests/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); });
await page.reload();
await page.waitForSelector('.at-surface');
for (const f of ['Demo v5.gp5', 'Chords.gp3', 'Slides.gp4', 'chord-fail.gp3']) {
  const chooser = page.waitForEvent('filechooser');
  await page.click('.menu-btn:has-text("Fichier")'); await page.click('.menu-list button:has-text("Importer un fichier")');
  await (await chooser).setFiles(D + f);
  await page.waitForTimeout(2500);
  const toast = await page.locator('.toast').textContent().catch(() => '');
  console.log(f.padEnd(16), '→', toast);
  if (f === 'Demo v5.gp5') await page.screenshot({ path: '/tmp/imp-demo.png' });
}
await page.keyboard.press('Control+Shift+O');
await page.waitForSelector('.lib-item');
console.log('Mes morceaux :', (await page.locator('.lib-title').allTextContents()).join(' | '));
console.log('erreurs :', errors.length ? errors.join(' | ') : 'aucune');
await browser.close();
