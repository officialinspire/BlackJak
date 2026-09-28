import { BLACKJAK_ASSET_URLS } from './blackjak-assets';
import { CARD_DECKS, type AtlasSheetId, type CardThemeId } from '../data/visual-atlas';

/*
 * Art-sheet warm-up. The sheets are only referenced from markup that is built
 * after the startup intro, so without this the browser would first request
 * (and decode) them at the moment the menu or table appears, and a deck the
 * player has not used yet would pop in when it is first shown.
 *
 * Every sheet is requested at boot, while the start screen and intro video
 * play, and decoded off the main thread. The decoded <img> objects are kept
 * for the whole session so the browser's memory cache keeps them alive: the
 * SVG <image> layers that each innerHTML re-render creates reuse the ready
 * bitmap instead of flashing empty while the sheet is fetched or re-decoded.
 */

/** Sheets visible on the first menu / table frame. */
const CRITICAL_SHEETS: readonly AtlasSheetId[] = ['menuBar', 'table', 'dealer', 'dialogueBar'];

/** Longest the first game render waits for critical art before showing anyway. */
export const ART_READY_TIMEOUT_MS = 1500;

const retained = new Map<AtlasSheetId, HTMLImageElement>();
const pending = new Map<AtlasSheetId, Promise<void>>();

export function preloadSheetOrder(activeTheme: CardThemeId): AtlasSheetId[] {
  const active = CARD_DECKS[activeTheme].sheet;
  const order: AtlasSheetId[] = [...CRITICAL_SHEETS, active];
  for (const sheet of Object.keys(BLACKJAK_ASSET_URLS) as AtlasSheetId[]) {
    if (!order.includes(sheet)) order.push(sheet);
  }
  return order;
}

function loadSheet(sheet: AtlasSheetId, priority: 'high' | 'low'): Promise<void> {
  const existing = pending.get(sheet);
  if (existing) return existing;

  const image = new Image();
  image.decoding = 'async';
  if ('fetchPriority' in image) image.fetchPriority = priority;
  retained.set(sheet, image);

  const loaded = new Promise<void>((resolve) => {
    const done = (): void => resolve();
    image.addEventListener('load', () => {
      // decode() keeps the rasterisation off the first frame that shows the art.
      if (typeof image.decode === 'function') void image.decode().then(done, done);
      else done();
    }, { once: true });
    // A failed sheet must never block the game; the markup retries it normally.
    image.addEventListener('error', done, { once: true });
  });
  image.src = BLACKJAK_ASSET_URLS[sheet];
  pending.set(sheet, loaded);
  return loaded;
}

/**
 * Starts fetching and decoding every art sheet. Critical sheets and the active
 * card deck go first at high priority; the other decks follow at low priority
 * so they are ready before the player opens Settings or cycles the deck.
 * Safe to call more than once and a no-op outside a browser.
 */
export function preloadArtSheets(activeTheme: CardThemeId): void {
  if (typeof Image === 'undefined') return;
  const activeSheet = CARD_DECKS[activeTheme].sheet;
  for (const sheet of preloadSheetOrder(activeTheme)) {
    const critical = CRITICAL_SHEETS.includes(sheet) || sheet === activeSheet;
    void loadSheet(sheet, critical ? 'high' : 'low');
  }
}

/**
 * Resolves once the critical sheets and the active deck are decoded, or after
 * `timeoutMs`, whichever comes first. Never rejects.
 */
export function whenCriticalArtReady(activeTheme: CardThemeId, timeoutMs = ART_READY_TIMEOUT_MS): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  preloadArtSheets(activeTheme);
  const sheets = [...CRITICAL_SHEETS, CARD_DECKS[activeTheme].sheet];
  const ready = Promise.all(sheets.map((sheet) => pending.get(sheet))).then(() => undefined);
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void ready.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
