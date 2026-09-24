/*
 * Vite-managed URLs for the BlackJak art sheets.
 *
 * `?url` makes Vite fingerprint each PNG into dist/assets/, so scripts/build-sw.mjs
 * picks it up for PWA precaching and the base path (/BlackJak/) is applied.
 */
import dealerSheetUrl from '../../blackjak-sprite-sheet.png?url';
import tableUrl from '../../blackjak-table.png?url';
import dialogueBarUrl from '../../dialogue-status-bar.png?url';
import menuBarUrl from '../../menu-bar.png?url';
import cardsStandardUrl from '../../blackjak-cards-standard.png?url';
import cardsJakUrl from '../../blackjak-cards-jak-theme.png?url';
import cardsInspireUrl from '../../blackjak-cards-inspire-theme.png?url';
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
