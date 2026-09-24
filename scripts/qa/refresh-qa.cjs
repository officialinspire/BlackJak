// Dev-only browser QA. See scripts/qa/README.md.
const { chromium } = require(process.env.PW);
const phase = (p) => p.$eval('.table-dock', (e) => e.className.match(/phase-(\w+)/)[1]).catch(() => null);
const chips = (p) => p.$eval('.hud-chips strong', (e) => Number(e.textContent.replace(/,/g, '')));
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
(async () => {
  const b = await chromium.launch(); let bad = 0;
  try {
  for (const mode of ['classic', 'house']) for (let t = 0; t < 15; t++) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto('http://localhost:4173/BlackJak/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await enterGame(p);
    await p.click(`[data-screen="${mode}"]`);
    let before = null;
    for (let k = 0; k < 20; k++) { before = await chips(p); await p.keyboard.press('n'); await p.waitForTimeout(50); if (await phase(p) === 'playing') break; }
    const inHand = await chips(p);
    await p.reload(); await enterGame(p); await p.click(`[data-screen="${mode}"]`);
    const after = await chips(p);
    if (after !== before || await phase(p) !== 'betting') { bad++; console.log('MISMATCH', mode, before, inHand, after); }
    await p.close();
  }
  console.log(bad ? `${bad} mismatches` : 'refresh mid-hand: 30/30 restored to pre-hand chips');
  } finally {
    await b.close();
  }
  if (bad) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exit(1); });
