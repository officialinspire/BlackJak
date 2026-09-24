// Dev-only browser QA. See scripts/qa/README.md.
const { chromium } = require(process.env.PW);
const S = process.env.S;
const URL = 'http://localhost:4173/BlackJak/';
const log = (...a) => console.log(...a);
const phase = (p) => p.$eval('.table-dock', (e) => e.className.match(/phase-(\w+)/)[1]).catch(() => null);
const chips = (p) => p.$eval('.hud-chips strong', (e) => Number(e.textContent.replace(/,/g, '')));
const fails = [];
const check = (name, ok, detail = '') => { log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };

async function fresh(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  return { ctx, p };
}
async function dealPlaying(p) {
  for (let k = 0; k < 20; k++) {
    if (await p.$('[data-action="refill"]')) await p.click('[data-action="refill"]');
    await p.keyboard.press('n'); await p.waitForTimeout(60);
    if (await phase(p) === 'playing') return true;
  }
  return false;
}

(async () => {
  const b = await chromium.launch();

  // ---- Layout at every width, all table screens + menu/daily ----
  const sizes = [[320, 568], [360, 740], [390, 844], [430, 932], [768, 1024], [1440, 900], [844, 390], [667, 375]];
  for (const [w, h] of sizes) {
    const { ctx, p } = await fresh(b, { viewport: { width: w, height: h } });
    const out = [];
    for (const screen of ['menu', 'classic', 'house', 'daily']) {
      if (screen !== 'menu') { await p.goto(URL); await p.click(`[data-screen="${screen}"]`); await p.waitForTimeout(250); }
      if (screen === 'classic' || screen === 'house') await dealPlaying(p);
      await p.waitForTimeout(250);
      const m = await p.evaluate(() => {
        const vis = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const imgs = [...document.images].concat([...document.querySelectorAll('image')]);
        return {
          ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          dockInView: (() => { const d = document.querySelector('.table-dock'); if (!d) return true; const r = d.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; })(),
          brokenImg: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
          cards: document.querySelectorAll('.playing-card').length,
          jak: vis('.dealer-window'), panel: vis('.dialogue-panel'), board: vis('.menu-board'),
        };
      });
      await p.screenshot({ path: `${S}/qa-${screen}-${w}x${h}.png` });
      out.push(`${screen}:ov=${m.ov},dock=${m.dockInView},broken=${m.brokenImg}`);
      if (m.ov !== 0 || m.brokenImg || !m.dockInView) check(`layout ${screen} ${w}x${h}`, false, JSON.stringify(m));
    }
    log(`${w}x${h}`, out.join(' | '), p.errs.length ? 'ERR ' + p.errs.join(';') : '');
    if (p.errs.length) check(`no errors ${w}x${h}`, false, p.errs.join(';'));
    await ctx.close();
  }

  // ---- Menu hitboxes: each board button's centre hits itself ----
  {
    const { ctx, p } = await fresh(b, { viewport: { width: 360, height: 740 } });
    const r = await p.evaluate(() => [...document.querySelectorAll('.menu-board-item')].map((btn) => { const rc = btn.getBoundingClientRect(); const hit = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2); return btn.contains(hit) && rc.height >= 24; }));
    check('menu hitboxes reachable and >=24px', r.length === 5 && r.every(Boolean), JSON.stringify(r));
    await ctx.close();
  }

  // ---- Keyboard only: menu → Classic → play → pause → resume → menu ----
  {
    const { ctx, p } = await fresh(b);
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
    const first = await p.evaluate(() => document.activeElement.dataset.screen);
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const atTable = !!(await p.$('.game-scene'));
    let played = false;
    for (let k = 0; k < 20 && !played; k++) {
      await p.keyboard.press('n'); await p.waitForTimeout(60);
      while (await phase(p) === 'playing') { await p.keyboard.press('s'); await p.waitForTimeout(60); played = true; }
    }
    const resolved = await phase(p);
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    const pauseFocus = await p.evaluate(() => document.activeElement.dataset.pauseAction);
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const resumed = !(await p.$('.pause-overlay'));
    const backFocus = await p.evaluate(() => document.activeElement.dataset.pause);
    // Tab through the whole table screen: every stop is visible and focus ring drawn
    const stops = [];
    for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); stops.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return `${e.tagName}${e.dataset.action || e.dataset.stake || e.dataset.pause || (e.hasAttribute('data-deck-cycle') ? 'deck' : '')}:${cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'}`; })); }
    check('keyboard: menu focus → Classic', first === 'classic' && atTable);
    check('keyboard: N/S play to resolution', played && resolved === 'resolved');
    check('keyboard: Esc pause focuses Resume; Enter resumes; focus returns', pauseFocus === 'resume' && resumed && backFocus === 'open');
    check('keyboard: every tab stop shows focus', stops.filter((s) => !s.startsWith('BODY')).every((s) => s.endsWith(':true')), stops.join(' '));
    await ctx.close();
  }

  // ---- Reduced motion ----
  {
    const { ctx, p } = await fresh(b, { reducedMotion: 'reduce' });
    await p.click('[data-screen="classic"]'); await dealPlaying(p); await p.waitForTimeout(40);
    const anims = await p.evaluate(() => [...document.querySelectorAll('.playing-card, .dialogue-panel, .dialogue-panel-line, .dealer-pose-mood, .pause-sign, .table-dock button')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'));
    check('reduced motion: no running animations', anims.length === 0, anims.join(','));
    await ctx.close();
  }

  // ---- Mute: no WebAudio nodes or vibration once Sound is off ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      window.__osc = 0; window.__vib = 0;
      const Orig = window.AudioContext;
      window.AudioContext = class extends Orig { createOscillator() { window.__osc++; return super.createOscillator(); } };
      navigator.vibrate = () => { window.__vib++; return true; };
    });
    const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.click('[data-screen="classic"]'); await dealPlaying(p);
    const before = await p.evaluate(() => [window.__osc, window.__vib]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    await p.click('.pause-overlay [data-pause-action="sound"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const mid = await p.evaluate(() => [window.__osc, window.__vib]);
    for (let k = 0; k < 3; k++) { while (await phase(p) === 'playing') { await p.keyboard.press('s'); await p.waitForTimeout(50); } await p.keyboard.press('n'); await p.waitForTimeout(60); }
    const after = await p.evaluate(() => [window.__osc, window.__vib]);
    await p.reload(); await p.click('[data-screen="settings"]');
    const persisted = await p.$eval('[data-setting-toggle="master"]', (e) => e.getAttribute('aria-pressed'));
    check('audio/haptics active before mute', before[0] > 0 && before[1] > 0, JSON.stringify(before));
    check('mute: no sound or vibration afterwards, persisted', after[0] === mid[0] && after[1] === mid[1] && persisted === 'false', `${JSON.stringify(mid)} → ${JSON.stringify(after)} persisted=${persisted}`);
    await ctx.close();
  }

  // ---- Refresh mid-hand: stake not charged, no stuck round ----
  {
    const { ctx, p } = await fresh(b);
    await p.click('[data-screen="classic"]');
    const c0 = await chips(p); await dealPlaying(p);
    const mid = await chips(p);
    await p.reload(); await p.click('[data-screen="classic"]');
    const c1 = await chips(p);
    check('refresh mid-hand: stake returned, table idle', mid < c0 && c1 === c0 && await phase(p) === 'betting', `${c0} → ${mid} → reload ${c1}`);
    // House mid-hand refresh
    await p.goto(URL); await p.click('[data-screen="house"]'); const h0 = await chips(p); await dealPlaying(p); await p.reload(); await p.click('[data-screen="house"]');
    check('refresh mid-hand (House): stake returned', await chips(p) === h0);
    await ctx.close();
  }

  // ---- Corrupt storage ----
  {
    const { ctx, p } = await fresh(b);
    await p.evaluate(() => { for (const k of ['profile', 'feedback-preferences', 'visual-preferences', 'daily']) localStorage.setItem(`blackjak:v1:${k}`, '{not json'); localStorage.setItem('blackjak:v1:visual-preferences', '{"version":1,"value":{"cardTheme":"<script>"}}'); });
    await p.reload(); await p.waitForTimeout(200);
    const boot = !!(await p.$('.menu-board'));
    await p.click('[data-screen="classic"]'); const ok = await dealPlaying(p);
    check('corrupt storage: boots to menu, defaults, playable', boot && ok && p.errs.length === 0 && await p.$eval('[data-deck-cycle]', (e) => e.getAttribute('aria-label').includes('Standard')), p.errs.join(';'));
    await ctx.close();
  }

  // ---- Offline PWA: every runtime visual served from cache ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); await p.goto(URL);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await p.waitForTimeout(500);
    await ctx.setOffline(true);
    await p.reload(); await p.waitForTimeout(300);
    const booted = !!(await p.$('.menu-board'));
    await p.click('[data-screen="classic"]'); await dealPlaying(p); await p.waitForTimeout(300);
    const assets = await p.evaluate(async () => {
      const urls = [...new Set([...document.querySelectorAll('image')].map((i) => i.getAttribute('href')).concat([...document.images].map((i) => i.src)))];
      const res = await Promise.all(urls.map((u) => fetch(u).then((r) => r.ok).catch(() => false)));
      return { urls: urls.length, ok: res.filter(Boolean).length };
    });
    const sheetsCached = await p.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys.find((k) => k.startsWith('blackjak-app-'))); const reqs = await c.keys(); return reqs.filter((r) => r.url.endsWith('.webp')).length; });
    const notice = !!(await p.$('[data-pwa-notice="offline"]'));
    check('offline: boots, deals, all sprite sheets from cache', booted && assets.ok === assets.urls && sheetsCached === 7, `${assets.ok}/${assets.urls} fetched, ${sheetsCached} webp cached, offline notice=${notice}`);
    await ctx.close();
  }

  log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(' | ')}` : '\nALL CHECKS PASSED');
  await b.close();
})();
