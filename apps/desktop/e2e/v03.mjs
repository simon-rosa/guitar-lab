// Test de bout en bout v0.3 : sons réalistes, bend/slide, accords, glisser, dupliquer, renvois.
// Prérequis : npm run dev (port 1420). Lancer : node apps/desktop/e2e/v03.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
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
const ok = (cond, label) => { console.log(cond ? '✓' : '✗', label); if (!cond) process.exitCode = 1; };
await page.goto('http://localhost:1420/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('guitar-lab:prefs', JSON.stringify({ welcomeDone: true })); });
await page.reload();
await page.waitForSelector('.at-surface');
await page.waitForFunction(() => /\d:\d\d \/ /.test(document.querySelector('.time')?.textContent ?? ''), null, { timeout: 30000 });
await page.waitForFunction(() => window.__guitarLab?.player?.realisticReady, null, { timeout: 30000 });
ok(true, 'instruments réalistes chargés');
const state = () => page.evaluate(() => {
  const st = window.__guitarLab.store.getState().history.present;
  const t = st.song.tracks[st.cursor.track];
  const beats = (b) => t.bars[b]?.voices[0].beats ?? [];
  const cur = beats(st.cursor.bar)[st.cursor.beat];
  const note = cur?.notes.find((n) => n.string === st.cursor.string);
  const count = (b) => beats(b).reduce((n, x) => n + x.notes.length, 0);
  return JSON.parse(JSON.stringify({
    cursor: st.cursor, anchor: st.anchor, bend: note?.effects.bend, slide: note?.effects.slide,
    bar0: beats(0).map((x) => ({ notes: x.notes.length, chord: x.effects.chord })),
    bars: st.song.masterBars.length, bar0Notes: count(0), bar1Notes: count(1),
    directions: st.song.masterBars.map((m) => m.directions ?? []), program: t.program,
  }));
});

// Démo vierge : nouveau document vide.
await page.evaluate(() => {
  const app = window.__guitarLab.store.getState();
  const s = app.history.present;
  const song = structuredClone(s.song);
  song.masterBars = song.masterBars.slice(0, 4);
  song.tracks = [song.tracks[0]];
  song.tracks[0].bars = song.tracks[0].bars.slice(0, 4).map(() => ({ voices: [{ beats: [] }] }));
  app.loadDocument({ ...s, song, cursor: { track: 0, bar: 0, voice: 0, beat: 0, string: 1 }, anchor: null }, null);
});
await page.waitForTimeout(600);
const box = await page.locator('.score-host').boundingBox();
// Clic sur la corde 3 de la première mesure.
const bar0 = await page.evaluate(() => { const r = window.__guitarLab.player.barRect(0, 0); return r; });
const clickString = async (bar, string) => {
  const r = await page.evaluate((b) => window.__guitarLab.player.barRect(0, b), bar);
  const sp = r.staffH / (r.lines - 1);
  await page.mouse.click(box.x + r.x + 40, box.y + r.staffY + sp * (string - 1));
};
await clickString(0, 3);
await page.keyboard.press('Escape');
await page.keyboard.press('7');
await page.waitForTimeout(500);
let peak = 0;
for (let i = 0; i < 30; i++) { peak = Math.max(peak, await page.evaluate(() => window.__peak())); await page.waitForTimeout(25); }
ok(peak > 0.01, `son de la note à la saisie (pic ${peak.toFixed(3)})`);

// Bend : 1½ ton, pre-bend + release.
await page.click('.tech-menu button:has-text("Bend")');
await page.click('.tech-pop .pill:has-text("Pre-bend + release")');
await page.click('.tech-pop .pill:has-text("1½ ton")');
let s = await state();
ok(JSON.stringify(s.bend) === JSON.stringify({ type: 'pre-bend-release', semitones: 3 }), `bend réglé : ${JSON.stringify(s.bend)}`);
await page.screenshot({ path: '/tmp/v03-bend.png' });
await page.keyboard.press('Escape');

// Slide : entrée par le bas.
await page.click('.tech-menu button:has-text("Slide")');
await page.screenshot({ path: '/tmp/v03-slide.png' });
await page.click('.tech-item:has-text("Entrée par le bas")');
s = await state();
ok(s.slide === 'in-below', `slide réglé : ${s.slide}`);

// Accords : C puis Am.
await page.keyboard.press('ArrowRight');
await page.click('button:has-text("Accord…")');
await page.waitForSelector('.chord-card');
await page.screenshot({ path: '/tmp/v03-chords.png' });
await page.click('.chord-roots .pill:has-text("Do · C")');
await page.click('.chord-qualities .pill:has-text("Majeur")');
await page.locator('.chord-card').first().click();
await page.click('.chord-roots .pill:has-text("La · A")');
await page.click('.chord-qualities .pill:has-text("Mineur")');
await page.locator('.chord-card').first().click();
await page.click('button:has-text("Terminé")');
s = await state();
ok(s.bar0.length >= 3 && s.bar0[1].notes === 5 && s.bar0[1].chord === 'C' && s.bar0[2].chord === 'Am', `accords posés : ${JSON.stringify(s.bar0)}`);

// Dupliquer la mesure 1.
await clickString(0, 1); await page.keyboard.press('Escape');
await page.click('button.tool:has-text("Dupliquer")');
s = await state();
ok(s.bars === 5 && s.bar1Notes === s.bar0Notes, `mesure dupliquée (${s.bars} mesures, ${s.bar1Notes} notes copiées)`);

// Glisser pour sélectionner de la mesure 1 à la mesure 3.
await page.waitForTimeout(400);
const r0 = await page.evaluate(() => window.__guitarLab.player.barRect(0, 0));
const r2 = await page.evaluate(() => window.__guitarLab.player.barRect(0, 2));
await page.mouse.move(box.x + r0.x + 40, box.y + r0.staffY + 10);
await page.mouse.down();
await page.mouse.move(box.x + r0.x + 120, box.y + r0.staffY + 12, { steps: 4 });
await page.mouse.move(box.x + r2.x + 40, box.y + r2.staffY + 12, { steps: 8 });
await page.mouse.up();
s = await state();
ok(s.anchor && s.anchor.bar === 0 && s.cursor.bar === 2, `sélection au glisser : de ${s.anchor?.bar + 1} à ${s.cursor.bar + 1}`);
await page.screenshot({ path: '/tmp/v03-drag.png' });

// Renvois : D.S. al Coda via la fenêtre de mesure.
await page.keyboard.press('Escape');
await clickString(1, 1); await page.keyboard.press('Escape');
await page.click('button:has-text("Plus…")');
await page.check('label:has-text("Segno") input');
await page.click('button:has-text("Appliquer")');
await clickString(3, 1); await page.keyboard.press('Escape');
await page.click('button:has-text("Plus…")');
await page.selectOption('select:has(option[value="dal-segno"])', 'dal-segno');
await page.screenshot({ path: '/tmp/v03-bar-dialog.png' });
await page.click('button:has-text("Appliquer")');
s = await state();
ok(s.directions[1]?.includes('segno') && s.directions[3]?.includes('dal-segno'), `renvois enregistrés : ${JSON.stringify(s.directions)}`);
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/v03-score.png' });

// Son de guitare : distorsion.
await page.selectOption('.tone-row select', '30');
s = await state();
ok(s.program === 30, 'son distorsion choisi');
// Lecture et son.
await page.keyboard.press('Space');
await page.waitForTimeout(1200);
peak = 0;
for (let i = 0; i < 30; i++) { peak = Math.max(peak, await page.evaluate(() => window.__peak())); await page.waitForTimeout(25); }
await page.keyboard.press('Space');
ok(peak > 0.01, `lecture audible avec la distorsion (pic ${peak.toFixed(3)})`);
ok(errors.length === 0, `aucune erreur console ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
