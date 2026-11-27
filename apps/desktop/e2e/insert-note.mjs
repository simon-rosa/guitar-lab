// Clic droit → « Insérer une note après » : une note glissée au milieu d'une mélodie.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const ok = (c, l) => { console.log(c ? '✓' : '✗', l); if (!c) process.exitCode = 1; };
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('guitar-lab'); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); });
await page.reload();
await page.waitForSelector('.at-surface');
await page.waitForTimeout(1000);
const frets = () => page.evaluate(() => window.__guitarLab.store.getState().history.present.song.tracks[0].bars[0].voices[0].beats.map((b) => b.notes.map((n) => n.fret).join('+') || 'silence'));
let box = await page.locator('.score-host').boundingBox();
let r = await page.evaluate(() => window.__guitarLab.player.barRect(0, 0));
const sp = r.staffH / (r.lines - 1);
await page.mouse.click(box.x + r.x + 40, box.y + r.staffY + sp * 2);
await page.keyboard.press('Escape');
for (const k of ['5', 'ArrowRight', '7', 'ArrowRight', '8', 'ArrowRight', '5']) { await page.keyboard.press(k); await page.waitForTimeout(80); }
await page.waitForTimeout(600);
ok((await frets()).join(' ') === '5 7 8 5', `mélodie écrite : ${(await frets()).join(' ')}`);
// Clic droit sur la 2e note (7).
const b = await page.evaluate(() => {
  const p = window.__guitarLab.player;
  const s = window.__guitarLab.store.getState().history.present;
  return p.cursorBounds({ ...s.cursor, beat: 1, string: 3 });
});
box = await page.locator('.score-host').boundingBox();
await page.mouse.click(box.x + b.beat.x + b.beat.w / 2, box.y + b.stringY, { button: 'right' });
await page.waitForSelector('.ctx-menu');
await page.screenshot({ path: '/tmp/ctx.png' });
await page.click('.ctx-menu button:has-text("Insérer une note après")');
await page.waitForTimeout(500);
const cur = await page.evaluate(() => window.__guitarLab.store.getState().history.present.cursor);
const picker = await page.locator('.fret-picker').count();
ok(cur.beat === 2 && picker === 1, `curseur sur le nouvel emplacement (temps ${cur.beat + 1}, corde ${cur.string}), sélecteur ouvert : ${picker === 1}`);
await page.screenshot({ path: '/tmp/ctx2.png' });
await page.keyboard.press('1'); await page.keyboard.press('0');
await page.waitForTimeout(700);
ok((await frets()).join(' ') === '5 7 10 8 5', `note insérée au milieu : ${(await frets()).join(' ')}`);
// Raccourci Maj+I.
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('Shift+I');
await page.keyboard.press('3');
await page.waitForTimeout(700);
ok((await frets()).join(' ') === '5 7 3 10 8 5', `Maj+I puis 3 : ${(await frets()).join(' ')}`);
ok(errors.length === 0, `aucune erreur ${errors.join(' | ')}`);
await browser.close();
