// Contrôle du son : simule une panne (réverb ou instruments) et vérifie la réparation automatique.
// Lancer sur l'aperçu servi en local (port 8765) : node sound-heal.mjs, MODE = none | fx | banks.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('pageerror', (e) => logs.push('ERR ' + e));
page.on('console', (m) => logs.push(m.type() + ' ' + m.text()));
await page.addInitScript(() => {
  window.claude = { use: () => null };
  localStorage.removeItem('guitar-lab:basic-sounds');
  if (window.__MODE === undefined) window.__MODE = 'MODE';
  if (window.__MODE === 'fx') {
    // Panne simulée : le compresseur ne laisse rien passer.
    const orig = BaseAudioContext.prototype.createDynamicsCompressor;
    BaseAudioContext.prototype.createDynamicsCompressor = function () { const c = orig.call(this); const g = this.createGain(); g.gain.value = 0; const p = { value: 0 }; return Object.assign(g, { threshold: p, knee: p, ratio: p, attack: p, release: p }); };
  }
  if (window.__MODE === 'banks') {
    // Panne simulée : la synthèse ne sort que du silence tant que les banques réalistes sont actives.
    const origGain = BaseAudioContext.prototype.createGain;
    let first = true;
    BaseAudioContext.prototype.createGain = function () { const g = origGain.call(this); if (first) { first = false; window.__inputGain = g; g.gain.value = 0; } return g; };
  }
  localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true }));
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__an) { ctx.__an = ctx.createAnalyser(); window.__analysers = [...(window.__analysers || []), ctx.__an]; }
      orig.call(this, ctx.__an);
    }
    return r;
  };
  window.__peak = () => { let m = 0; for (const an of window.__analysers || []) { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); for (const v of b) m = Math.max(m, Math.abs(v)); } return m; };
});
await page.goto('http://localhost:8765/');
await page.waitForFunction(() => /\d:\d\d \/ /.test(document.querySelector('.time')?.textContent ?? ''), null, { timeout: 30000 });
const WAIT = Number(process.argv[2] ?? 4000);
await page.waitForTimeout(WAIT);
const box = await page.locator('.score-host').boundingBox();
await page.mouse.click(box.x + 120, box.y + 70);
await page.keyboard.press('Escape');
for (const k of ['5','ArrowRight','7','ArrowRight','8','ArrowRight','5']) { await page.keyboard.press(k); await page.waitForTimeout(150); }
await page.waitForTimeout(800);
await page.keyboard.press('Home');
await page.click('.transport .tool[title="Retour au début"]');
await page.waitForTimeout(300);
await page.click('.transport .tool.play');
const t0 = Date.now(); let peak = 0;
for (let i = 0; i < 160; i++) { peak = Math.max(peak, await page.evaluate(() => window.__peak())); await page.waitForTimeout(25); }
console.log(`attente ${WAIT} ms → pic`, peak.toFixed(3), 'temps:', await page.textContent('.time'), 'bouton:', await page.textContent('.transport .tool.play'));
console.log('toast:', await page.locator('.toast').allTextContents().catch(() => []), '| sons de base mémorisés:', await page.evaluate(() => localStorage.getItem('guitar-lab:basic-sounds')));
console.log(logs.filter(l => !l.startsWith('debug')).slice(0, 10).join('\n'));
await browser.close();
