// Test de bout en bout : boutons − / + des mesures, même place partout, sans rien recouvrir.
// Prérequis : npm run dev (port 1420), Chrome, et « npm i -D playwright ».
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = []; page.on('pageerror', (e) => logs.push(e.message));
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); }); await page.reload();
await page.waitForSelector('.at-surface'); await page.waitForTimeout(1200);
await page.mouse.click(900, 600);
await page.keyboard.press('Alt+4');
// Notes chargées d'effets en mesure 1 et 2 : bend + palm mute en haut, notes graves en bas
for (const bar of [0, 1]) {
  await page.keyboard.press('1'); await page.keyboard.press('2'); await page.keyboard.press('b'); await page.keyboard.press('p'); await page.keyboard.press('v');
  await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  for (let k = 0; k < 7; k++) { await page.keyboard.press(String(k)); await page.keyboard.press('ArrowRight'); }
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
}
await page.waitForTimeout(800);
// Plus de mesures pour avoir plusieurs lignes
for (let i = 0; i < 10; i++) { await page.locator('.bar-tool.add').last().click(); await page.waitForTimeout(150); }
await page.waitForTimeout(1200);
const check = async (label) => {
  const res = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.at-surface svg *')].filter((e) => ['text', 'path', 'rect', 'circle', 'line', 'polygon'].includes(e.tagName));
    // Pour un caractère de police musicale, la boîte DOM inclut toute la hauteur de ligne :
    // on mesure la forme réellement dessinée en la rasterisant.
    const inkBox = (e) => {
      const r = e.getBoundingClientRect();
      if (e.tagName !== 'text' || r.height < 60) return r;
      const c = document.createElement('canvas'); c.width = Math.ceil(r.width) + 2; c.height = Math.ceil(r.height) + 2;
      const g = c.getContext('2d'); const cs = getComputedStyle(e);
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; g.textBaseline = 'alphabetic';
      const y = Number(e.getAttribute('y') || 0); const bb = e.getBBox();
      g.fillText(e.textContent, 1, 1 + (y - bb.y));
      const d = g.getImageData(0, 0, c.width, c.height).data; let t = 1e9, b = -1;
      for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) if (d[(yy * c.width + xx) * 4 + 3] > 20) { t = Math.min(t, yy); b = Math.max(b, yy); }
      if (b < 0) return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
      const sy = r.height / c.height;
      return { left: r.left, right: r.right, top: r.top + t * sy, bottom: r.top + b * sy, width: r.width, height: (b - t) * sy };
    };
    const host0 = document.querySelector('.score-host').getBoundingClientRect();
    const boxes = els.map((e) => ({ ...JSON.parse(JSON.stringify(inkBox(e))), tag: e.tagName, txt: e.textContent?.slice(0, 6) })).filter((r) => r.width > 0 || r.height > 0);
    const hits = [];
    const btns = [...document.querySelectorAll('.bar-tool')];
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      for (const x of boxes) if (x.left < r.right - 0.5 && x.right > r.left + 0.5 && x.top < r.bottom - 0.5 && x.bottom > r.top + 0.5) { hits.push(`${b.ariaLabel} [${Math.round(r.left - host0.left)},${Math.round(r.top - host0.top)}] ↔ ${x.tag} «${x.txt}» ${Math.round(x.left - host0.left)},${Math.round(x.top - host0.top)} ${Math.round(x.width)}x${Math.round(x.height)}`); break; }
    }
    // même place pour chaque mesure : décalage horizontal bouton / début de mesure
    const { player } = window.__guitarLab; const host = document.querySelector('.score-host').getBoundingClientRect();
    const offsets = new Set();
    btns.filter((b) => b.classList.contains('add')).forEach((b, i) => { const br = player.barRect(0, i); if (br) offsets.add(Math.round(b.getBoundingClientRect().left - host.left - br.x)); });
    const lines = new Set([...document.querySelectorAll('.bar-tool.add')].map((b) => Math.round(b.getBoundingClientRect().top)));
    // Chaque − doit être au-dessus de toute la ligne de sa mesure et chaque + en dessous.
    const order = [];
    btns.filter((b) => !b.classList.contains('add')).forEach((b, i) => {
      const br = player.barRect(0, i); if (!br) return;
      const minus = b.getBoundingClientRect().bottom - host0.top, plus = btns.filter((x) => x.classList.contains('add'))[i].getBoundingClientRect().top - host0.top;
      if (!(minus <= br.top + 1 && plus >= br.bottom - 1)) order.push(`mesure ${i + 1}: −bas ${Math.round(minus)} top ${Math.round(br.top)} / +haut ${Math.round(plus)} bottom ${Math.round(br.bottom)}`);
    });
    // Le + d'une ligne et le − de la ligne suivante ne doivent pas se toucher.
    const rects = btns.map((b) => b.getBoundingClientRect());
    let touching = [];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], c = rects[j]; if (a.left < c.right && a.right > c.left && a.top < c.bottom + 12 && a.bottom + 12 > c.top) touching.push(`${btns[i].ariaLabel} [${Math.round(a.top - host0.top)}] / ${btns[j].ariaLabel} [${Math.round(c.top - host0.top)}]`); }
    return { buttons: btns.length, hits, offsets: [...offsets], lignes: lines.size, malPlaces: order, boutonsQuiSeTouchent: touching };
  });
  console.log(label, JSON.stringify(res));
};
await check('Tab seule      :');
await page.screenshot({ path: '/tmp/v7a.png' });
await page.getByRole('radio', { name: 'Tab + partition' }).click(); await page.waitForTimeout(1500);
await check('Tab + partition:');
await page.screenshot({ path: '/tmp/v7b.png' });
console.log('erreurs:', logs.join('\n') || 'aucune');
await browser.close();
