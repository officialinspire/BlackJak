// Dev-only browser QA for the achievement logbook. See scripts/qa/README.md.
const { chromium } = require(process.env.PW);
const URL = 'http://localhost:4173/BlackJak/';
const PROFILE_KEY = 'blackjak:v1:profile';
const fails = [];
const log = (...a) => console.log(...a);
const check = (name, ok, detail = '') => { log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails.push(name); };
const phase = (p) => p.$eval('.table-dock', (e) => e.className.match(/phase-(\w+)/)?.[1] ?? null).catch(() => null);
const toastName = (p) => p.$eval('.achievement-toast strong', (e) => e.textContent).catch(() => null);
const savedProfile = (p) => p.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.value ?? null, PROFILE_KEY);

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

/** Fresh page with an optional saved profile patch (merged into a default-shaped save by the app). */
async function openWith(b, viewport, patch = null) {
  const p = await b.newPage({ viewport });
  const errors = [];
  p.on('pageerror', (error) => errors.push(error.message));
  p.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await p.goto(URL);
  await p.evaluate(({ key, patch }) => {
    localStorage.clear();
    if (patch) localStorage.setItem(key, JSON.stringify({ version: 1, value: patch }));
  }, { key: PROFILE_KEY, patch });
  await p.reload();
  await enterGame(p);
  return { p, errors };
}

const localKey = (p, offsetDays) => p.evaluate((offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}, offsetDays);

/** Deals exactly one hand and stands until it settles (a natural can settle it on the deal). */
async function playOneHand(p) {
  const handsBefore = (await savedProfile(p))?.stats?.totalHands ?? 0;
  await p.waitForTimeout(400); // taps right after the controls change are ignored as stale double-taps
  await p.keyboard.press('n');
  for (let k = 0; k < 40; k++) {
    if (((await savedProfile(p))?.stats?.totalHands ?? 0) > handsBefore) return;
    if (await phase(p) === 'playing') await p.keyboard.press('s');
    await p.waitForTimeout(60);
  }
  throw new Error('playOneHand: the hand never settled');
}

(async () => {
  const b = await chromium.launch();
  try {
    // ---- Log-in streak: yesterday's visit on a 2-day streak becomes BACK AGAIN today, toasted on the menu.
    {
      const probe = await b.newPage();
      await probe.goto(URL);
      const yesterday = await localKey(probe, -1);
      const today = await localKey(probe, 0);
      await probe.close();
      const { p, errors } = await openWith(b, { width: 390, height: 844 }, {
        chips: 1000, rep: 0,
        activity: { lastVisitDate: yesterday, visitStreak: 2, longestVisitStreak: 2, daysVisited: 2, lastVisitWeek: null, weekStreak: 1, longestWeekStreak: 1, dailyHandsCompleted: 0, dailyWins: 0, houseRounds: 0, decksTried: [] },
      });
      check('log-in streak: menu toasts BACK AGAIN', await toastName(p) === 'BACK AGAIN', String(await toastName(p)));
      const saved = await savedProfile(p);
      check('log-in streak: saved 3-day streak for today', saved?.activity?.visitStreak === 3 && saved.activity.lastVisitDate === today, JSON.stringify(saved?.activity));
      check('log-in streak: unlock saved', saved?.progression?.unlockedAchievements?.includes('back-again'));
      // Measure the resting position: the toast slides up 10px as it arrives.
      const toastBox = await p.$eval('.achievement-toast', async (e) => { await Promise.all(e.getAnimations().map((a) => a.finished)); const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, pe: getComputedStyle(e).pointerEvents }; });
      check('log-in streak: toast inside viewport and click-through', toastBox.l >= 0 && toastBox.r <= toastBox.w && toastBox.b <= toastBox.h && toastBox.pe === 'none', JSON.stringify(toastBox));
      await p.reload(); await enterGame(p);
      check('log-in streak: second visit the same day does not re-toast', await toastName(p) === null);
      await p.click('[data-screen="stats"]');
      check('log-in streak: toast cleared when leaving the menu', await toastName(p) === null);
      check('log-in streak: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Stats logbook at phone, tablet and desktop widths.
    for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1280, 800]]) {
      const { p, errors } = await openWith(b, { width: w, height: h });
      await p.click('[data-screen="stats"]');
      const shape = await p.evaluate(() => ({
        entries: document.querySelectorAll('.achievement-entry').length,
        shelf: document.querySelectorAll('.badge-shelf-slot').length,
        categories: document.querySelectorAll('[data-achievement-category]').length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        smallTargets: [...document.querySelectorAll('.achievement-category, .achievement-filter')].filter((e) => e.getBoundingClientRect().height < 44).length,
        clipped: [...document.querySelectorAll('.achievement-entry')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).length,
      }));
      check(`stats ${w}x${h}: 89 entries, 89 shelf badges, 7 type chips`, shape.entries === 89 && shape.shelf === 89 && shape.categories === 7, JSON.stringify(shape));
      check(`stats ${w}x${h}: no horizontal overflow or clipped entries`, shape.overflow <= 0 && shape.clipped === 0, JSON.stringify(shape));
      check(`stats ${w}x${h}: type and filter chips are 44px touch targets`, shape.smallTargets === 0, JSON.stringify(shape));

      // Category filter: correct entries, focus kept on the chip, fast redraw.
      const timing = await p.evaluate(() => {
        const button = document.querySelector('[data-achievement-category="visits"]');
        button.focus();
        const t0 = performance.now();
        button.click();
        return performance.now() - t0;
      });
      const visits = await p.evaluate(() => ({
        ids: [...document.querySelectorAll('.achievement-entry')].filter((e) => e.checkVisibility()).map((e) => e.dataset.achievementId),
        focused: document.activeElement?.getAttribute('data-achievement-category'),
        pressed: document.querySelector('[data-achievement-category="visits"]')?.getAttribute('aria-pressed'),
      }));
      check(`stats ${w}x${h}: Log-ins shows the ten visit achievements`, visits.ids.join() === 'back-again,creature-of-habit,part-of-the-furniture,weekly-regular,season-ticket,loyalty-program,permanent-resident,half-year-habit,anniversary,frequent-flyer', visits.ids.join());
      check(`stats ${w}x${h}: focus stays on the pressed type chip`, visits.focused === 'visits' && visits.pressed === 'true', JSON.stringify(visits));
      check(`stats ${w}x${h}: type filter redraw under 50ms`, timing < 50, `${timing.toFixed(1)}ms`);
      await p.click('[data-achievement-filter="locked"]');
      await p.click('[data-achievement-category="comedy"]');
      const comedy = await p.$$eval('.achievement-entry', (list) => list.filter((e) => e.checkVisibility()).map((e) => e.dataset.category));
      const visibleIds = () => p.$$eval('.achievement-entry', (list) => list.filter((e) => e.checkVisibility()).map((e) => e.dataset.achievementId).join());
      const inPlace = await visibleIds();
      // Leave and come back: a full render from the same filter state must show the same entries.
      await p.click('.back-button[data-screen="menu"]');
      await p.click('[data-screen="stats"]');
      const reRendered = await visibleIds();
      const kept = await p.evaluate(() => [document.querySelector('.achievement-category.is-selected')?.dataset.achievementCategory, document.querySelector('.achievement-filter.is-selected')?.dataset.achievementFilter].join());
      check(`stats ${w}x${h}: in-place filtering matches a full re-render`, inPlace === reRendered && kept === 'comedy,locked', `${kept} ${inPlace === reRendered}`);
      check(`stats ${w}x${h}: Comedy + Locked filters combine`, comedy.length === 19 && comedy.every((c) => c === 'comedy'), `${comedy.length} ${[...new Set(comedy)]}`);
      await p.click('[data-achievement-filter="all"]');
      const fullRedraw = await p.evaluate(() => {
        const t0 = performance.now();
        document.querySelector('[data-achievement-category="all"]').click();
        return performance.now() - t0;
      });
      check(`stats ${w}x${h}: full 89-entry logbook redraw under 50ms`, fullRedraw < 50, `${fullRedraw.toFixed(1)}ms`);
      if (w === 390) await p.screenshot({ path: `${process.env.S}/achievements-stats-390.png`, fullPage: true });
      if (w === 1280) await p.screenshot({ path: `${process.env.S}/achievements-stats-1280.png`, fullPage: true });
      check(`stats ${w}x${h}: no console errors`, errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Chip and REP ladders: balances from before these achievements are credited at startup.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 }, { chips: 120000, rep: 30000, stats: { highestChipBalance: 120000, lifetimeRep: 30000 } });
      const toast = await p.$eval('.achievement-toast', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
      check('milestones: startup toast shows QUARTER STACK +3 MORE', toast.includes('QUARTER STACK') && toast.includes('+3 MORE'), toast);
      const saved = await savedProfile(p);
      const ladder = ['chips-25k', 'chips-50k', 'chips-100k', 'rep-25k'];
      check('milestones: exactly the reached rungs saved', ladder.every((id) => saved.progression.unlockedAchievements.includes(id)) && !saved.progression.unlockedAchievements.includes('chips-250k') && !saved.progression.unlockedAchievements.includes('rep-50k'), saved.progression.unlockedAchievements.join());
      await p.click('[data-screen="stats"]');
      await p.click('[data-achievement-category="milestones"]');
      const view = await p.evaluate(() => ({
        entries: [...document.querySelectorAll('.achievement-entry')].filter((e) => e.checkVisibility()).length,
        unlocked: [...document.querySelectorAll('.achievement-entry.is-unlocked')].filter((e) => e.checkVisibility()).length,
        chips250: document.querySelector('[data-achievement-id="chips-250k"] .achievement-progress small')?.textContent,
        rep1m: document.querySelector('[data-achievement-id="rep-1m"] .achievement-progress small')?.textContent,
      }));
      check('milestones: Milestones type lists 16 with 4 unlocked and ladder progress', view.entries === 16 && view.unlocked === 4 && view.chips250 === '120,000 / 250,000' && view.rep1m === '30,000 / 1,000,000', JSON.stringify(view));
      await p.reload(); await enterGame(p);
      check('milestones: not re-toasted on the next visit', await toastName(p) === null);
      check('milestones: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Table-max bet and a first Jak's House round.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 }, { chips: 5000, rep: 0 });
      await p.click('[data-screen="classic"]');
      await p.waitForTimeout(400);
      await p.click('[data-stake="max"]');
      await playOneHand(p);
      let saved = await savedProfile(p);
      check('high stakes: betting the table max unlocks HIGH STAKES', saved.progression.unlockedAchievements.includes('high-stakes'), saved.progression.unlockedAchievements.join());
      await p.keyboard.press('Escape'); await p.waitForTimeout(650);
      await p.click('.pause-overlay [data-pause-action="menu"]'); await p.waitForTimeout(150);
      await p.click('[data-screen="house"]');
      await playOneHand(p);
      saved = await savedProfile(p);
      check("house: first Jak's House round unlocks WELCOME TO THE HOUSE", saved.progression.unlockedAchievements.includes('welcome-to-the-house') && saved.activity.houseRounds === 1, `${saved.activity.houseRounds} ${saved.progression.unlockedAchievements.join()}`);
      check('high stakes / house: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- First hand: PULL UP A CHAIR toasts on the table and shows unlocked in Stats with its badge lit.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 });
      await p.click('[data-screen="classic"]');
      await playOneHand(p);
      const toasts = await p.$eval('.achievement-toast', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
      const firstUnlocks = (await savedProfile(p))?.progression?.unlockedAchievements ?? [];
      // A lucky first hand can unlock more than one; the toast then shows the first plus "+N MORE".
      check('first hand: PULL UP A CHAIR unlocked and toasted on the table', firstUnlocks.includes('pull-up-a-chair') && (toasts.includes('PULL UP A CHAIR') || (firstUnlocks.length > 1 && toasts.includes('MORE'))), toasts);
      await p.keyboard.press('Escape'); await p.waitForTimeout(650);
      await p.click('.pause-overlay [data-pause-action="menu"]'); await p.waitForTimeout(150);
      await p.click('[data-screen="stats"]');
      const entry = await p.$eval('[data-achievement-id="pull-up-a-chair"]', (e) => ({ unlocked: e.classList.contains('is-unlocked'), badge: e.querySelector('.achievement-badge')?.classList.contains('is-earned') }));
      check('first hand: logbook shows it unlocked with its badge earned', entry.unlocked && entry.badge, JSON.stringify(entry));
      const progressText = await p.$eval('[data-achievement-id="i-can-quit-anytime"] .achievement-progress small', (e) => e.textContent);
      check('first hand: locked count achievement shows progress', progressText === '1 / 100', progressText);
      check('first hand: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Deck themes: FASHION VICTIM toasts on Settings after trying all three decks.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 });
      await p.click('[data-screen="settings"]');
      await p.click('[data-card-theme="jak"]');
      check('decks: no unlock after two decks', await toastName(p) === null);
      await p.click('[data-card-theme="inspire"]');
      check('decks: FASHION VICTIM toast on Settings', await toastName(p) === 'FASHION VICTIM', String(await toastName(p)));
      await p.click('[data-card-theme="standard"]');
      check('decks: re-selecting a deck does not repeat the unlock', (await p.$$('.achievement-toast')).length === 1);
      check('decks: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Mid-hand unlock (deck cycle) then leaving the hand: unlock kept, stake refunded.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 }, { chips: 1000, rep: 0, activity: { decksTried: ['standard', 'jak'] } });
      await p.click('[data-screen="classic"]');
      const hudChips = () => p.$eval('.hud-chips strong', (e) => Number(e.textContent.replace(/,/g, '')));
      let preHand = null;
      for (let k = 0; k < 20 && preHand === null; k++) {
        const before = await hudChips();
        await p.keyboard.press('n'); await p.waitForTimeout(60);
        if (await phase(p) === 'playing') preHand = before;
      }
      if (preHand !== null) {
        // Standard -> Jak (already tried) -> Inspire completes the set mid-hand.
        await p.click('[data-deck-cycle]');
        await p.click('[data-deck-cycle]');
        const saved = await savedProfile(p);
        check('mid-hand unlock: saved at pre-hand chips, reserved stake not saved', saved.chips === preHand && saved.progression.unlockedAchievements.includes('fashion-victim'), `saved ${saved.chips} vs pre-hand ${preHand}`);
        await p.reload(); await enterGame(p);
        await p.click('[data-screen="classic"]');
        const chips = await hudChips();
        const reloaded = await savedProfile(p);
        check('mid-hand unlock: refresh mid-hand restores pre-hand chips and keeps the unlock', chips === preHand && reloaded.progression.unlockedAchievements.includes('fashion-victim'), `chips ${chips} vs ${preHand}`);
      } else {
        check('mid-hand unlock: a hand could be dealt', false);
      }
      check('mid-hand unlock: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Out of chips: taking the refill toasts RESPONSIBLE GAMBLING.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 }, { chips: 0, rep: 0 });
      await p.click('[data-screen="classic"]');
      await p.waitForTimeout(400); // taps right after the controls change are ignored as stale double-taps
      await p.click('[data-action="refill"]');
      check('refill: RESPONSIBLE GAMBLING toast', await toastName(p) === 'RESPONSIBLE GAMBLING', String(await toastName(p)));
      const saved = await savedProfile(p);
      check('refill: chips refilled and unlock saved', saved.chips === 1000 && saved.progression.unlockedAchievements.includes('responsible-gambling'), `chips ${saved.chips}`);
      check('refill: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Daily Hand: finishing it toasts DAILY DOSE on the Daily screen.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 });
      await p.click('[data-screen="daily"]');
      const start = await p.$('[data-action="start-daily"]');
      if (start) await start.click();
      for (let k = 0; k < 20 && await p.$('[data-daily-action="stand"]:not(:disabled)'); k++) { await p.click('[data-daily-action="stand"]'); await p.waitForTimeout(60); }
      check('daily: DAILY DOSE toast after finishing the Daily Hand', await toastName(p) === 'DAILY DOSE', String(await toastName(p)));
      const saved = await savedProfile(p);
      check('daily: Daily Hand count saved', saved.activity.dailyHandsCompleted === 1, JSON.stringify(saved.activity));
      check('daily: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }

    // ---- Performance: 60 fast hands with achievements on; each settle + redraw stays quick.
    {
      const { p, errors } = await openWith(b, { width: 390, height: 844 });
      await p.click('[data-screen="classic"]');
      const worst = await p.evaluate(async () => {
        let slowest = 0;
        const press = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        for (let hand = 0; hand < 60; hand++) {
          const t0 = performance.now();
          press('n');
          for (let k = 0; k < 10 && document.querySelector('.table-dock.phase-playing'); k++) press('s');
          slowest = Math.max(slowest, performance.now() - t0);
          await new Promise((resolve) => setTimeout(resolve, 20));
          if (document.querySelector('[data-action="refill"]')) document.querySelector('[data-action="refill"]').click();
        }
        return slowest;
      });
      const saved = await savedProfile(p);
      check('performance: 60 hands played and saved', saved.stats.totalHands >= 55, `hands ${saved.stats.totalHands}`);
      check('performance: slowest deal-to-settle under 100ms', worst < 100, `${worst.toFixed(1)}ms`);
      check('performance: no console errors', errors.length === 0, errors.join(' | '));
      await p.close();
    }
  } finally {
    await b.close();
  }
  log(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nALL CHECKS PASSED');
  if (fails.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exit(1); });
