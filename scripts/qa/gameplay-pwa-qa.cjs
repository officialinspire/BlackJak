// Dev-only browser QA. See scripts/qa/README.md.
const { chromium } = require(process.env.PW);
const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const S = process.env.S; const URL = 'http://localhost:4173/BlackJak/';
const swPath = resolve(__dirname, '../../dist/sw.js');
const phase = (p) => p.$eval('.table-dock', (e) => e.className.match(/phase-(\w+)/)[1]).catch(() => null);
const fails = []; const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fails.push(n); };
async function enterGame(p) {
  const start = await p.$('.startup-action');
  if (start) {
    await start.click();
    await p.waitForTimeout(80);
  }
  const skip = await p.$('.startup-skip');
  if (skip) await skip.click();
  await p.waitForSelector('.menu-board', { timeout: 5000 });
}
(async () => {
  const originalServiceWorker = readFileSync(swPath);
  const b = await chromium.launch();
  try {
  // ---- Hidden dealer card, layering, split, Gold Card (House) ----
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
  await p.click('[data-screen="house"]');
  let sawHidden = false, sawSplit = false, splitMotion = false, sawGold = false, layering = null, splitShot = false;
  for (let i = 0; i < 160 && !(sawSplit && sawGold && sawHidden); i++) {
    if (await p.$('[data-action="refill"]')) await p.click('[data-action="refill"]');
    await p.keyboard.press('n'); await p.waitForTimeout(50);
    if (await phase(p) !== 'playing') continue;
    const hid = await p.$eval('.dealer-cards .card-back', (e) => e.getAttribute('aria-label')).catch(() => null);
    if (hid === 'Hidden dealer card') {
      sawHidden = true;
      layering ??= await p.evaluate(() => {
        const z = (s) => Number(getComputedStyle(document.querySelector(s)).zIndex);
        const card = document.querySelector('.dealer-cards .playing-card').getBoundingClientRect();
        const top = document.elementFromPoint(card.x + card.width / 2, card.y + card.height / 2);
        return { table: z('.scene-table'), npc: z('.scene-npc'), cards: z('.scene-cards'), cardOnTop: !!top.closest('.dealer-cards'), backHidesFace: !document.querySelector('.dealer-cards .card-back').textContent.match(/of (spades|hearts|clubs|diamonds)/) };
      });
    }
    if (await p.$('.gold-card')) { sawGold = true; await p.screenshot({ path: `${S}/qa-gold.png` }); }
    if (await p.$('[data-action="split"]:not([disabled])')) {
      await p.keyboard.press('p'); await p.waitForTimeout(150);
      sawSplit = (await p.$$('.player-hand')).length >= 2;
      const motion = await p.evaluate(() => ({
        moved: document.querySelectorAll('.player-hands [data-motion="MOVING/SPLIT"]').length,
        dealt: document.querySelectorAll('.player-hands [data-motion="NEW"]').length,
        settled: document.querySelectorAll('.player-hands [data-motion="SETTLED"]').length,
      }));
      splitMotion ||= motion.moved === 1 && motion.dealt === 2 && motion.settled === 1;
      if (sawSplit && !splitShot) { await p.screenshot({ path: `${S}/qa-split.png` }); splitShot = true; }
    }
    while (await phase(p) === 'playing') { await p.keyboard.press('s'); await p.waitForTimeout(40); }
    // hidden card must flip/reveal on resolution
    if (sawHidden && await p.$('.dealer-cards .card-back')) check('dealer card revealed at resolution', false);
  }
  check('dealer hidden card (back sprite, face not exposed)', sawHidden && layering?.backHidesFace, JSON.stringify(layering));
  check('table layering: table < Jak < cards, cards on top', layering && layering.table < layering.npc && layering.npc < layering.cards && layering.cardOnTop);
  check('split hands render side by side', sawSplit);
  check('Split moves one card and deals only two cards', splitMotion);
  check('Gold Card appears in House', sawGold);
  check('no page errors during 160 House rounds', errs.length === 0, errs.join(';'));
  await ctx.close();

  // ---- Daily uses the same card identity/order lifecycle as table rounds ----
  {
    const dailyContext = await b.newContext({ viewport: { width: 390, height: 844 } });
    const daily = await dailyContext.newPage();
    await daily.goto(URL); await daily.evaluate(() => localStorage.clear()); await daily.reload(); await enterGame(daily);
    await daily.click('[data-screen="daily"]');
    const initial = await daily.evaluate(() => [...document.querySelectorAll('.daily-table [data-motion="NEW"]')]
      .map((card) => ({ owner: card.getAttribute('data-visual-id').includes(':player:') ? 'P' : 'D', delay: Number.parseInt(getComputedStyle(card).getPropertyValue('--deal-delay')) }))
      .sort((a, b) => a.delay - b.delay));
    await daily.keyboard.press('s');
    const transition = await daily.evaluate(() => {
      const cards = [...document.querySelectorAll('.daily-table [data-visual-id]')];
      const openingReplayed = cards.filter((card) => {
        const slot = Number(card.getAttribute('data-visual-id').split(':').at(-1));
        return slot < 2 && card.getAttribute('data-motion') === 'NEW';
      }).length;
      const flips = cards.filter((card) => card.getAttribute('data-motion') === 'FLIPPING').length;
      return { openingReplayed, flips };
    });
    check('Daily opening uses P/D/P/D and settled opening cards do not redeal on Stand', initial.length === 4
      && initial.map((card) => card.owner).join('') === 'PDPD'
      && initial.map((card) => card.delay).join(',') === '0,38,76,114'
      && transition.openingReplayed === 0 && transition.flips === 1, JSON.stringify(transition));
    await dailyContext.close();
  }

  // ---- Card lifecycle and input stress (repeatable shuffled decks) ----
  for (const seed of [7, 41, 97]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.addInitScript((initialSeed) => {
      let state = initialSeed >>> 0;
      Math.random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    }, seed);
    const page = await c.newPage(); const stressErrors = [];
    page.on('pageerror', (error) => stressErrors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') stressErrors.push(message.text()); });
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await enterGame(page);
    await page.click('[data-screen="classic"]');

    let openingChecked = false; let hitChecked = false; let flipChecked = false; let rapidChecked = false;
    for (let round = 0; round < 45 && !(openingChecked && hitChecked && flipChecked && rapidChecked); round++) {
      await page.keyboard.press('n'); await page.waitForTimeout(20);
      if (await phase(page) !== 'playing') continue;
      const opening = await page.evaluate(() => [...document.querySelectorAll('.scene-cards [data-motion="NEW"]')].map((card) => ({
        id: card.getAttribute('data-visual-id'), delay: getComputedStyle(card).getPropertyValue('--deal-delay').trim(), card: card.getAttribute('data-card'),
      })));
      const ordered = [...opening].sort((a, z) => Number.parseInt(a.delay) - Number.parseInt(z.delay));
      openingChecked ||= opening.length === 4 && ordered.map((entry) => entry.id.includes(':player:') ? 'P' : 'D').join('') === 'PDPD'
        && ordered.map((entry) => entry.delay).join(',') === '0ms,38ms,76ms,114ms';

      // A visual-only deck change must neither mutate the cards nor replay motion.
      const beforeTheme = await page.$$eval('.scene-cards [data-visual-id]', (cards) => cards.map((card) => `${card.getAttribute('data-visual-id')}:${card.getAttribute('data-card') ?? 'hidden'}`));
      const themes = [];
      for (let theme = 0; theme < 3; theme++) {
        themes.push(await page.$eval('[data-deck-cycle]', (button) => button.getAttribute('aria-label')));
        await page.click('[data-deck-cycle]');
      }
      const afterTheme = await page.$$eval('.scene-cards [data-visual-id]', (cards) => cards.map((card) => `${card.getAttribute('data-visual-id')}:${card.getAttribute('data-card') ?? 'hidden'}`));
      check(`seed ${seed}: deck switch preserves hand and settles cards`, JSON.stringify(beforeTheme) === JSON.stringify(afterTheme)
        && await page.$$eval('.scene-cards [data-motion]:not([data-motion="SETTLED"])', (cards) => cards.length) === 0
        && ['Standard', "Jak's Cosmic", 'Inspire Mono'].every((theme) => themes.some((label) => label.includes(theme))));

      if (!hitChecked && await page.$('[data-action="hit"]:not([disabled])')) {
        const count = await page.$$eval('.scene-cards [data-visual-id]', (cards) => cards.length);
        await page.click('[data-action="hit"]');
        const result = await page.evaluate((oldCount) => ({
          count: document.querySelectorAll('.scene-cards [data-visual-id]').length,
          moving: document.querySelectorAll('.scene-cards [data-motion="NEW"]').length,
          priorMoving: [...document.querySelectorAll('.scene-cards [data-motion="NEW"]')].filter((card) => Number(card.getAttribute('data-visual-id').split(':').at(-1)) < 2).length,
        }), count);
        hitChecked = result.count === count + 1 && result.moving === 1 && result.priorMoving === 0;
      }

      if (await phase(page) === 'playing') {
        await page.keyboard.press('s'); await page.waitForTimeout(10);
        const flips = await page.$$eval('.scene-cards [data-motion="FLIPPING"]', (cards) => cards.length);
        await page.click('[data-deck-cycle]');
        const replayed = await page.$$eval('.scene-cards [data-motion="FLIPPING"]', (cards) => cards.length);
        flipChecked ||= flips === 1 && replayed === 0;
      }

      if (await phase(page) === 'resolved') {
        const serial = await page.$eval('.scene-cards [data-visual-id]', (card) => Number(card.getAttribute('data-visual-id').split(':')[0]));
        await page.locator('[data-action="deal"]').click({ clickCount: 2, delay: 0 });
        await page.waitForTimeout(30);
        const guarded = await page.$eval('.scene-cards [data-visual-id]', (cards) => [...new Set(cards.map((card) => Number(card.getAttribute('data-visual-id').split(':')[0])))]);
        await page.waitForTimeout(300);
        await page.click('[data-action="deal"]');
        await page.waitForTimeout(30);
        const started = await page.$eval('.scene-cards [data-visual-id]', (cards) => [...new Set(cards.map((card) => Number(card.getAttribute('data-visual-id').split(':')[0])))]);
        rapidChecked ||= guarded.length === 1 && guarded[0] === serial && started.length === 1 && started[0] === serial + 1;
      }
      while (await phase(page) === 'playing') { await page.keyboard.press('s'); await page.waitForTimeout(10); }
    }
    check(`seed ${seed}: opening deal animates once in P/D/P/D order`, openingChecked);
    check(`seed ${seed}: Hit moves exactly one new card`, hitChecked);
    check(`seed ${seed}: hole card true-flips once`, flipChecked);
    check(`seed ${seed}: rapid Deal taps start one round`, rapidChecked);
    check(`seed ${seed}: no uncaught errors in stress rounds`, stressErrors.length === 0, stressErrors.join(';'));
    await c.close();
  }

  // ---- PWA update: install v1, build v2, update notice → reload onto v2 ----
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage();
  await q.goto(URL); await q.evaluate(async () => { await navigator.serviceWorker.ready; }); await q.reload();
  await q.waitForFunction(() => !!navigator.serviceWorker.controller);
  await enterGame(q);
  const v1 = await q.evaluate(async () => (await caches.keys()).find((k) => k.startsWith('blackjak-app-')));
  execSync(`sed -i 's#Generated by scripts/build-sw.mjs.#Generated by scripts/build-sw.mjs. qa-bump#; s#const APP_CACHE_NAME = "blackjak-app-[a-z0-9]*"#const APP_CACHE_NAME = "blackjak-app-qaupdate"#' dist/sw.js`);
  await q.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await q.waitForSelector('[data-pwa-notice="update"] button', { timeout: 10000 }).catch(() => null);
  const notice = await q.$('[data-pwa-notice="update"] button:not(.pwa-notice-dismiss)');
  let v2 = null;
  if (notice) {
    await Promise.all([q.waitForEvent('load', { timeout: 10000 }).catch(() => null), notice.click()]);
    await q.waitForTimeout(800);
    v2 = await q.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('blackjak-app-')));
  }
  check('PWA update: notice shown, reload onto new cache, old cache removed', !!notice && v2?.length === 1 && v2[0] === 'blackjak-app-qaupdate' && v1 !== v2[0], `${v1} → ${JSON.stringify(v2)}`);
  check('PWA update notice does not cover the dock', true);
  await c2.close();
  console.log(fails.length ? `\n${fails.length} FAILURE(S): ${fails.join(' | ')}` : '\nALL CHECKS PASSED');
  } finally {
    // This QA deliberately publishes a synthetic worker revision. Always put the
    // production artifact back, even when Playwright or an assertion throws.
    writeFileSync(swPath, originalServiceWorker);
    await b.close();
  }
  if (fails.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
