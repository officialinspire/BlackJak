/*
 * Vite-managed URLs for the BlackJak art sheets.
 *
 * Runtime art is the optimized WebP generated from the original PNG sources by
 * scripts/optimize-assets.py (same pixel dimensions, so every atlas coordinate
 * applies unchanged). The PNGs at the repository root remain the source of
 * truth and are not shipped. `?url` makes Vite fingerprint each file into
 * dist/assets/, so scripts/build-sw.mjs precaches it for offline play.
 */
import dealerSheetUrl from './runtime/blackjak-sprite-sheet.webp?url';
import tableUrl from './runtime/blackjak-table.webp?url';
import dialogueBarUrl from './runtime/dialogue-status-bar.webp?url';
import menuBarUrl from './runtime/menu-bar.webp?url';
import cardsStandardUrl from './runtime/blackjak-cards-standard.webp?url';
import cardsJakUrl from './runtime/blackjak-cards-jak-theme.webp?url';
import cardsInspireUrl from './runtime/blackjak-cards-inspire-theme.webp?url';
import type { AtlasSheetId } from '../data/visual-atlas';

export const BLACKJAK_ASSET_URLS: Readonly<Record<AtlasSheetId, string>> = {
  dealer: dealerSheetUrl,
  table: tableUrl,
  dialogueBar: dialogueBarUrl,
  menuBar: menuBarUrl,
  cardsStandard: cardsStandardUrl,
  cardsJak: cardsJakUrl,
  cardsInspire: cardsInspireUrl,
};

export function assetUrl(sheet: AtlasSheetId): string {
  return BLACKJAK_ASSET_URLS[sheet];
}
