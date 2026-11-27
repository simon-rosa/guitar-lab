// Test de bout en bout : on entend réellement la note à la saisie.
// Prérequis : npm run dev (port 1420), Chrome, et « npm i -D playwright ».
// Lancer : node apps/desktop/e2e/audition.mjs
import { chromium } from 'playwright';
// Pas de drapeau autoplay : même politique de son qu'un navigateur normal.
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  // Branche un analyseur sur tout ce qui part vers les haut-parleurs.
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__an) { ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048; window.__analysers = [...(window.__analysers || []), ctx.__an]; }
      orig.call(this, ctx.__an);
    }
    return r;
  };
  window.__peak = () => {
    let m = 0;
    for (const an of window.__analysers || []) { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); for (const v of b) m = Math.max(m, Math.abs(v)); }
    return m;
  };
});
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); }); await page.reload();
await page.waitForSelector('.at-surface');
await page.waitForFunction(() => /\d:\d\d \/ /.test(document.querySelector('.time')?.textContent ?? ''), null, { timeout: 30000 });
await page.mouse.click(900, 600); // place le curseur (premier geste)
await page.waitForTimeout(500);
const measure = async (label) => {
  let peak = 0;
  for (let i = 0; i < 40; i++) { peak = Math.max(peak, await page.evaluate(() => window.__peak())); await page.waitForTimeout(25); }
  console.log(label.padEnd(34), 'pic audio =', peak.toFixed(4), peak > 0.01 ? '→ SON' : '→ silence');
};
await measure('repos (rien)');
await page.keyboard.press('5'); await measure('touche 5 (1re note, sans ▶)');
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
await page.keyboard.press('7'); await measure('touche 7');
await page.keyboard.press('7'); await page.waitForTimeout(700); await measure('silence après la note');
await browser.close();
