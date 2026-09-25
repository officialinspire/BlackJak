// Dev-only browser QA. See scripts/qa/README.md.
const { chromium } = require(process.env.PW);
const S = process.env.S;
const URL = 'http://localhost:4173/BlackJak/';
const log = (...a) => console.log(...a);
const phase = (p) => p.$eval('.table-dock', (e) => e.className.match(/phase-(\w+)/)?.[1] ?? null).catch(() => null);
const chips = (p) => p.$eval('.hud-chips strong', (e) => Number(e.textContent.replace(/,/g, '')));
const fails = [];
const check = (name, ok, detail = '') => { log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };

async function enterGame(p) {
  const start = await p.$('.startup-action');
  if (start) {
    await start.click();
    await p.waitForTimeout(80);
  }
  const skip = await p.$('.startup-skip');
  if (skip) await skip.click().catch(() => undefined); // intro may end/fail first
  await p.waitForSelector('.menu-board', { timeout: 10000 });
}

async function gotoGame(p) {
  await p.goto(URL);
  await enterGame(p);
}

async function fresh(b, opts = {}, enter = true) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  if (enter) await enterGame(p);
  return { ctx, p };
}

async function dealPlaying(p) {
  for (let k = 0; k < 20; k++) {
    if (await p.$('[data-action="refill"]')) await p.click('[data-action="refill"]');
    await p.keyboard.press('n'); await p.waitForTimeout(70);
    if (await phase(p) === 'playing') return true;
  }
  return false;
}

async function layoutMetrics(p) {
  return p.evaluate(() => {
    const rect = (selector) => {
      const e = document.querySelector(selector);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const visible = (selector) => {
      const r = rect(selector);
      return Boolean(r && r.width > 0 && r.height > 0);
    };
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const dock = rect('.table-dock');
    const footer = rect('.game-footer-compact');
    // Table screens clip horizontal overflow, so a pushed-out control never shows as page overflow.
    const clippedControls = [...document.querySelectorAll('.table-hud button, .table-dock button')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.left < -1 || r.right > innerWidth + 1))
      .map(({ e }) => e.dataset.action ?? e.dataset.stake ?? e.className.split(' ')[0]);
    const scene = rect('.game-scene');
    return {
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      brokenImg: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
      dockInView: !dock || (dock.left >= -1 && dock.right <= innerWidth + 1 && dock.bottom <= innerHeight + 1),
      sceneInWidth: !scene || (scene.left >= -1 && scene.right <= innerWidth + 1),
      footerDockOverlap: intersects(footer, dock),
      clippedControls,
      footer: visible('.game-footer'),
      cards: document.querySelectorAll('.playing-card').length,
      jak: visible('.dealer-window'),
      panel: visible('.dialogue-panel'),
      board: visible('.menu-board'),
    };
  });
}

(async () => {
  const b = await chromium.launch();
  try {

  // ---- Prompt 5 device matrix: startup, intro, menu/panels, tables, pause ----
  const sizes = [
    [320, 568], [360, 740], [390, 844], [430, 932],
    [768, 1024], [1024, 768], [1280, 720], [1440, 900],
    [844, 390], [667, 375],
  ];

  for (const [w, h] of sizes) {
    const { ctx, p } = await fresh(b, { viewport: { width: w, height: h } }, false);

    const startup = await p.evaluate(() => {
      const action = document.querySelector('.startup-action')?.getBoundingClientRect();
      return {
        ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        action: action ? { width: action.width, height: action.height, left: action.left, right: action.right } : null,
      };
    });
    check(`startup ${w}x${h}`, startup.ov === 0 && startup.action && startup.action.height >= 44 && startup.action.left >= -1 && startup.action.right <= w + 1, JSON.stringify(startup));

    await p.click('.startup-action');
    await p.waitForTimeout(80);
    if (await p.$('.startup-intro')) {
      const intro = await p.evaluate(() => {
        const v = document.querySelector('.startup-video')?.getBoundingClientRect();
        const skip = document.querySelector('.startup-skip')?.getBoundingClientRect();
        return {
          ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          video: v ? { left: v.left, top: v.top, right: v.right, bottom: v.bottom } : null,
          skip: skip ? { width: skip.width, height: skip.height, right: skip.right, bottom: skip.bottom } : null,
          fit: document.querySelector('.startup-video') ? getComputedStyle(document.querySelector('.startup-video')).objectFit : null,
        };
      });
      // Chromium builds without H.264 fail the intro and fall straight through to the
      // menu (the designed failure path); only measure an intro that is still up.
      if (intro.video) check(`intro ${w}x${h}`, intro.ov === 0 && intro.video && intro.video.left >= -1 && intro.video.right <= w + 1 && intro.video.top >= -1 && intro.video.bottom <= h + 1 && intro.skip?.height >= 44 && intro.fit === 'contain', JSON.stringify(intro));
      const skip = await p.$('.startup-skip');
      if (skip) await skip.click().catch(() => undefined);
    }
    await p.waitForSelector('.menu-board', { timeout: 10000 });

    const out = [];
    for (const screen of ['menu', 'stats', 'settings', 'daily', 'classic', 'house']) {
      if (screen !== 'menu') {
        await gotoGame(p);
        await p.click(`[data-screen="${screen}"]`);
        await p.waitForTimeout(180);
      }
      if (screen === 'classic' || screen === 'house') {
        // Betting dock (stake chips + Deal) must fit too, not just the playing dock.
        const betting = await layoutMetrics(p);
        check(`controls in view ${screen} betting ${w}x${h}`, betting.clippedControls.length === 0, JSON.stringify(betting.clippedControls));
        await dealPlaying(p);
      }
      await p.waitForTimeout(180);

      const m = await layoutMetrics(p);
      if (S) await p.screenshot({ path: `${S}/qa-${screen}-${w}x${h}.png`, fullPage: true });
      out.push(`${screen}:ov=${m.ov},dock=${m.dockInView},scene=${m.sceneInWidth},broken=${m.brokenImg}`);
      if ((screen === 'classic' || screen === 'house') && h > 540) {
        // Stacked layouts: Jak's dialogue/result bar must not start the round hidden under the sticky dock.
        const clear = await p.evaluate(() => {
          const panel = document.querySelector('.dialogue-panel')?.getBoundingClientRect();
          const dock = document.querySelector('.table-dock')?.getBoundingClientRect();
          return Boolean(panel && dock && panel.bottom <= dock.top + 1);
        });
        check(`dialogue bar clear of the sticky dock ${screen} ${w}x${h}`, clear);
      }
      check(`layout ${screen} ${w}x${h}`, m.ov === 0 && m.brokenImg === 0 && m.dockInView && m.sceneInWidth && !m.footerDockOverlap && m.footer && m.clippedControls.length === 0, JSON.stringify(m));

      if (screen === 'classic' || screen === 'house') {
        await p.keyboard.press('Escape');
        await p.waitForTimeout(650);
        const pause = await p.evaluate(() => {
          const sign = document.querySelector('.pause-sign')?.getBoundingClientRect();
          const buttons = [...document.querySelectorAll('.pause-overlay .menu-board-item')].map((e) => e.getBoundingClientRect());
          return {
            ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            sign: sign ? { left: sign.left, right: sign.right, width: sign.width } : null,
            hitTargets: buttons.map((r) => ({ width: r.width, height: r.height })),
          };
        });
        check(`pause ${screen} ${w}x${h}`, pause.ov === 0 && pause.sign && pause.sign.left >= -1 && pause.sign.right <= w + 1 && pause.hitTargets.every((r) => r.width >= 44 && r.height >= 44), JSON.stringify(pause));
        await p.keyboard.press('Escape');
      }
    }

    log(`${w}x${h}`, out.join(' | '), p.errs.length ? 'ERR ' + p.errs.join(';') : '');
    if (p.errs.length) check(`no errors ${w}x${h}`, false, p.errs.join(';'));
    await ctx.close();
  }

  // ---- Menu hitboxes: each board button's centre hits itself and is touch sized ----
  {
    const { ctx, p } = await fresh(b, { viewport: { width: 360, height: 740 } });
    const r = await p.evaluate(() => [...document.querySelectorAll('.menu-board-item')].map((btn) => {
      const rc = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
      return btn.contains(hit) && rc.width >= 44 && rc.height >= 44;
    }));
    check('menu hitboxes reachable and >=44px', r.length === 5 && r.every(Boolean), JSON.stringify(r));
    await ctx.close();
  }

  // ---- Keyboard only: menu → Classic → play → pause → resume ----
  {
    const { ctx, p } = await fresh(b);
    let first = null;
    for (let i = 0; i < 12 && first !== 'classic'; i++) {
      await p.keyboard.press('Tab');
      first = await p.evaluate(() => document.activeElement?.dataset?.screen ?? null);
    }
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
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await p.keyboard.press('Tab');
      stops.push(await p.evaluate(() => {
        const e = document.activeElement;
        const cs = getComputedStyle(e);
        return `${e.tagName}${e.dataset.action || e.dataset.stake || e.dataset.pause || (e.hasAttribute('data-deck-cycle') ? 'deck' : '')}:${cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'}`;
      }));
    }
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
    const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
    await p.click('[data-screen="classic"]'); await dealPlaying(p);
    const before = await p.evaluate(() => [window.__osc, window.__vib]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    await p.click('.pause-overlay [data-pause-action="sound"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const mid = await p.evaluate(() => [window.__osc, window.__vib]);
    for (let k = 0; k < 3; k++) { while (await phase(p) === 'playing') { await p.keyboard.press('s'); await p.waitForTimeout(50); } await p.keyboard.press('n'); await p.waitForTimeout(60); }
    const after = await p.evaluate(() => [window.__osc, window.__vib]);
    await p.reload(); await enterGame(p); await p.click('[data-screen="settings"]');
    const persisted = await p.$eval('[data-setting-toggle="master"]', (e) => e.getAttribute('aria-pressed'));
    check('audio/haptics active before mute', before[0] > 0 && before[1] > 0, JSON.stringify(before));
    check('mute: no sound or vibration afterwards, persisted', after[0] === mid[0] && after[1] === mid[1] && persisted === 'false', `${JSON.stringify(mid)} → ${JSON.stringify(after)} persisted=${persisted}`);
    await ctx.close();
  }

  // ---- Startup media resilience: failed / stalled intro never strands the player ----
  for (const mode of ['abort', 'stall']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/\.mp4$/, (route) => (mode === 'abort' ? route.abort() : new Promise(() => undefined)));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(URL);
    const started = Date.now();
    await p.click('.startup-action');
    const reached = await p.waitForSelector('.menu-board', { timeout: 12000 }).then(() => true).catch(() => false);
    check(`startup: intro ${mode === 'abort' ? 'load failure' : 'stall'} falls through to the menu`, reached && errs.length === 0, `${Date.now() - started}ms ${errs.join(';')}`);
    await ctx.close();
  }

  // ---- Music: one track at a time through rapid navigation, background tab, mute ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      window.__media = new Set();
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patchedPlay() { window.__media.add(this); return play.call(this); };
    });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
    const audible = () => p.evaluate(() => [...window.__media]
      .filter((m) => !m.paused && !m.muted && m.volume > 0.01)
      .map((m) => (m.currentSrc || m.src).split('/').pop().replace(/-[\w-]{8}\.\w+$/, '')));
    const setHidden = (hidden) => p.evaluate((h) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await p.waitForTimeout(900);
    const menu = await audible();
    for (const screen of ['classic', 'menu', 'house', 'menu', 'daily', 'menu', 'classic']) {
      if (screen === 'menu') {
        // Tables: Esc opens the pause board, Main Menu asks to confirm mid-hand. Daily: Esc goes back.
        await p.keyboard.press('Escape'); await p.waitForTimeout(120);
        for (let tap = 0; tap < 2 && await p.$('.pause-overlay [data-pause-action="menu"]'); tap++) {
          await p.click('.pause-overlay [data-pause-action="menu"]'); await p.waitForTimeout(60);
        }
      }
      else { const target = await p.$(`[data-screen="${screen}"]`); if (target) await target.click(); }
      await p.waitForTimeout(60);
    }
    await p.waitForTimeout(1100);
    const afterRapid = await audible();
    await setHidden(true); await p.waitForTimeout(100);
    const hidden = await audible();
    await setHidden(false); await p.waitForTimeout(900);
    const shown = await audible();
    const screen = await p.$eval('#app-main', (e) => e.className);
    check('music: menu track alone after startup (intro audio stopped)', menu.length === 1 && menu[0].startsWith('jak-gold'), JSON.stringify(menu));
    check('music: exactly one track after rapid navigation', afterRapid.length === 1, `${JSON.stringify(afterRapid)} on ${screen}`);
    check('music: silent in background tab, one track on return', hidden.length === 0 && shown.length === 1 && shown[0] === afterRapid[0], `${JSON.stringify(hidden)} → ${JSON.stringify(shown)}`);
    check('music: no page errors', errs.length === 0, errs.join(';'));
    await ctx.close();
  }

  // ---- Music volume: routed through Web Audio gain (iOS ignores element.volume) ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      window.__gains = []; window.__routed = 0;
      const createGain = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function patchedGain() { const gain = createGain.call(this); window.__gains.push(gain); return gain; };
      const source = AudioContext.prototype.createMediaElementSource;
      AudioContext.prototype.createMediaElementSource = function patchedSource(element) { window.__routed++; return source.call(this, element); };
    });
    const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
    await p.click('[data-screen="settings"]'); await p.waitForTimeout(900);
    const menuGain = () => p.evaluate(() => Number(window.__gains[0]?.gain.value.toFixed(2)));
    const start = await menuGain();
    await (await p.$('[data-setting-volume="music"]')).fill('20'); await p.waitForTimeout(200);
    const lowered = await menuGain();
    await (await p.$('[data-setting-volume="sfx"]')).fill('90'); await p.waitForTimeout(200);
    const afterSfx = await menuGain();
    await p.reload(); await enterGame(p); await p.click('[data-screen="settings"]');
    const persisted = [await p.$eval('[data-setting-volume="music"]', (e) => e.value), await p.$eval('[data-setting-volume="sfx"]', (e) => e.value)];
    const routed = await p.evaluate(() => window.__routed);
    check('music volume slider drives the music gain; effects slider is separate; both persist', routed === 2 && start === 0.65 && lowered === 0.2 && afterSfx === 0.2 && persisted.join() === '20,90', JSON.stringify({ routed, start, lowered, afterSfx, persisted }));
    await ctx.close();
  }

  // ---- Deck switching from every control, including Daily Hand ----
  {
    const { ctx, p } = await fresh(b);
    const themes = (scope) => p.evaluate((s) => [...new Set([...document.querySelectorAll(`${s} .playing-card`)].map((e) => [...e.classList].find((c) => c.startsWith('card-theme-'))))].join(), scope);
    await p.click('[data-screen="daily"]'); await p.waitForTimeout(200);
    const dailyBefore = await themes('.daily-screen'); await p.click('[data-deck-cycle]'); await p.waitForTimeout(150);
    const dailyAfter = await themes('.daily-screen');
    check('deck switch works on Daily Hand', dailyBefore === 'card-theme-standard' && dailyAfter === 'card-theme-jak', `${dailyBefore} → ${dailyAfter}`);
    await ctx.close();
  }

  // ---- Haptics: distinct action patterns; iOS switch fallback without vibrate() ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = (pattern) => { window.__vib.push(JSON.stringify(pattern)); return true; }; });
    const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
    await p.click('[data-screen="classic"]'); await dealPlaying(p); await p.waitForTimeout(320);
    const mark = await p.evaluate(() => window.__vib.length);
    if (await p.$('[data-action="hit"]:not([disabled])')) { await p.click('[data-action="hit"]'); await p.waitForTimeout(320); }
    const afterHit = await p.evaluate((m) => window.__vib.slice(m), mark);
    await ctx.close();

    const ios = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ios.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true });
      window.__ticks = 0;
      document.addEventListener('click', (event) => { if (event.target instanceof HTMLInputElement && event.target.hasAttribute('switch')) window.__ticks++; }, true);
    });
    const q = await ios.newPage(); const errs = []; q.on('pageerror', (e) => errs.push(String(e)));
    await q.goto(URL); await q.evaluate(() => localStorage.clear()); await q.reload(); await enterGame(q);
    await q.click('[data-screen="classic"]'); await dealPlaying(q); await q.waitForTimeout(400);
    const ticks = await q.evaluate(() => window.__ticks);
    const focusSafe = await q.evaluate(() => !(document.activeElement instanceof HTMLInputElement));
    check('haptics: Hit has its own pattern; iOS gets switch ticks without focus theft', afterHit.includes('14') && ticks > 0 && focusSafe && errs.length === 0, JSON.stringify({ afterHit, ticks, focusSafe, errs }));
    await ios.close();
  }

  // ---- Refresh mid-hand: stake not charged, no stuck round ----
  {
    const { ctx, p } = await fresh(b);

    const startUnresolved = async (screen) => {
      await p.click(`[data-screen="${screen}"]`);
      for (let attempt = 0; attempt < 20; attempt++) {
        if (await p.$('[data-action="refill"]')) await p.click('[data-action="refill"]');
        const before = await chips(p);
        await p.keyboard.press('n');
        await p.waitForTimeout(70);
        if (await phase(p) === 'playing') return before;
      }
      return null;
    };

    const c0 = await startUnresolved('classic');
    const mid = await chips(p);
    await p.reload(); await enterGame(p); await p.click('[data-screen="classic"]');
    const c1 = await chips(p);
    check('refresh mid-hand: stake returned, table idle', c0 !== null && mid < c0 && c1 === c0 && await phase(p) === 'betting', `${c0} → ${mid} → reload ${c1}`);

    await p.evaluate(() => localStorage.clear());
    await p.reload(); await enterGame(p);
    const h0 = await startUnresolved('house');
    const hMid = await chips(p);
    await p.reload(); await enterGame(p); await p.click('[data-screen="house"]');
    const h1 = await chips(p);
    check('refresh mid-hand (House): stake returned', h0 !== null && hMid < h0 && h1 === h0 && await phase(p) === 'betting', `${h0} → ${hMid} → reload ${h1}`);
    await ctx.close();
  }

  // ---- Corrupt storage ----
  {
    const { ctx, p } = await fresh(b);
    await p.evaluate(() => {
      for (const k of ['profile', 'feedback-preferences', 'visual-preferences', 'daily']) localStorage.setItem(`blackjak:v1:${k}`, '{not json');
      localStorage.setItem('blackjak:v1:visual-preferences', '{"version":1,"value":{"cardTheme":"<script>"}}');
    });
    await p.reload(); await enterGame(p); await p.waitForTimeout(100);
    const boot = !!(await p.$('.menu-board'));
    await p.click('[data-screen="classic"]'); const ok = await dealPlaying(p);
    check('corrupt storage: boots to menu, defaults, playable', boot && ok && p.errs.length === 0 && await p.$eval('[data-deck-cycle]', (e) => e.getAttribute('aria-label').includes('Standard')), p.errs.join(';'));
    await ctx.close();
  }

  // ---- Blocked storage: leaving a table must not reset the session's progress ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', (e) => p.errs.push(String(e)));
    await gotoGame(p);
    const rep = () => p.$eval('.menu-progression b', (e) => e.textContent);
    await p.click('[data-screen="classic"]');
    // Play until a win earns REP (losses earn none).
    const hudRep = () => p.$eval('.rep-pill strong', (e) => e.textContent);
    for (let k = 0; k < 60 && await hudRep() === '0'; k++) {
      if (await p.$('[data-action="refill"]')) await p.click('[data-action="refill"]');
      await p.keyboard.press('n'); await p.waitForTimeout(70);
      while (await phase(p) === 'playing') { await p.keyboard.press('s'); await p.waitForTimeout(70); }
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    await p.click('.pause-overlay [data-pause-action="menu"].menu-board-item'); await p.waitForTimeout(150);
    const earned = await rep();
    // Open a table and leave without dealing, then abandon a hand mid-play.
    await p.click('[data-screen="house"]'); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    await p.click('.pause-overlay [data-pause-action="menu"].menu-board-item'); await p.waitForTimeout(150);
    const afterEmptyVisit = await rep();
    await p.click('[data-screen="classic"]'); await dealPlaying(p);
    await p.keyboard.press('Escape'); await p.waitForTimeout(650);
    for (let i = 0; i < 2; i++) { await p.click('.pause-overlay [data-pause-action="menu"].menu-board-item'); await p.waitForTimeout(400); }
    const afterAbandon = await rep();
    check('blocked storage: leaving a table keeps session REP', earned !== '0 REP' && afterEmptyVisit === earned && afterAbandon === earned && p.errs.length === 0, `${earned} → ${afterEmptyVisit} → ${afterAbandon} ${p.errs.join(';')}`);
    await ctx.close();
  }

  // ---- Offline PWA: startup gate + game visuals work from cache ----
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); await p.goto(URL);
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    // Play once online so the menu track lands in the runtime media cache.
    await enterGame(p);
    await p.waitForFunction(async () => (await (await caches.open('blackjak-media-v1')).keys()).some((r) => r.url.includes('jak-gold')), null, { timeout: 15000 }).catch(() => null);
    await ctx.setOffline(true);
    await p.reload(); await enterGame(p); await p.waitForTimeout(200);
    const booted = !!(await p.$('.menu-board'));
    await p.click('[data-screen="classic"]'); await dealPlaying(p); await p.waitForTimeout(300);
    const assets = await p.evaluate(async () => {
      const urls = [...new Set([...document.querySelectorAll('image')].map((i) => i.getAttribute('href')).concat([...document.images].map((i) => i.src)))].filter(Boolean);
      const res = await Promise.all(urls.map((u) => fetch(u).then((r) => r.ok).catch(() => false)));
      return { urls: urls.length, ok: res.filter(Boolean).length };
    });
    const sheetsCached = await p.evaluate(async () => {
      const keys = await caches.keys();
      const key = keys.find((k) => k.startsWith('blackjak-app-'));
      if (!key) return 0;
      const c = await caches.open(key);
      const reqs = await c.keys();
      return reqs.filter((r) => r.url.endsWith('.webp')).length;
    });
    const notice = !!(await p.$('[data-pwa-notice="offline"]'));
    check('offline: boots, deals, all sprite sheets from cache', booted && assets.ok === assets.urls && sheetsCached === 7, `${assets.ok}/${assets.urls} fetched, ${sheetsCached} webp cached, offline notice=${notice}`);
    const media = await p.evaluate(async () => {
      const sw = await (await fetch('sw.js')).text();
      const urls = JSON.parse(sw.match(/const MEDIA_URLS = (\[[\s\S]*?\]);/)[1]);
      const precache = JSON.parse(sw.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/)[1]);
      const cache = await caches.open('blackjak-media-v1');
      const cached = (await cache.keys()).map((r) => new URL(r.url).pathname);
      const menuTrack = urls.find((u) => u.includes('jak-gold'));
      const ranged = await fetch(menuTrack, { headers: { Range: 'bytes=100-199' } }).then(async (r) => ({ status: r.status, bytes: (await r.arrayBuffer()).byteLength, range: r.headers.get('content-range') })).catch((e) => String(e));
      return { urls: urls.length, inPrecache: urls.filter((u) => precache.includes(u)).length, cached, ranged };
    });
    check('offline: media runtime-cached (not precached) and served as byte ranges', media.urls === 3 && media.inPrecache === 0 && media.cached.some((u) => u.includes('jak-gold')) && media.ranged.status === 206 && media.ranged.bytes === 100 && /^bytes 100-199\/\d+$/.test(media.ranged.range), JSON.stringify(media));
    await ctx.close();
  }

  log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(' | ')}` : '\nALL CHECKS PASSED');
  } finally {
    // Always release Chromium: a thrown assertion must fail fast, not hang CI.
    await b.close();
  }
  if (fails.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exit(1); });
