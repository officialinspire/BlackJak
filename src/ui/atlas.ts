import '../styles/atlas.css';
import { assetUrl } from '../assets/blackjak-assets';
import type { Card } from '../game/types';
import {
  ATLAS_SHEETS,
  CARD_DECKS,
  DEALER_SPRITES,
  cardExtraRect,
  cardFaceRect,
  type AtlasSheetId,
  type CardExtraId,
  type CardThemeId,
  type DealerSpriteId,
  type SpriteRect,
} from '../data/visual-atlas';

/*
 * Precise atlas rendering via SVG viewBox cropping: the whole sheet is placed
 * in sheet-pixel coordinates and the viewBox exposes exactly one SpriteRect.
 * The browser scales the crop without sub-pixel bleed from neighbours, and the
 * sheet is decoded/cached once no matter how many sprites reference it.
 */

export interface AtlasSpriteOptions {
  /** Accessible name. Omit for decorative sprites (rendered aria-hidden). */
  readonly label?: string;
  readonly className?: string;
  /** CSS width; height follows the rect aspect ratio unless also given. */
  readonly width?: string;
  readonly height?: string;
  /** Override the sheet URL (tests, previews). */
  readonly url?: string;
}

const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function atlasViewBox(rect: SpriteRect): string {
  return `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
}

export function atlasSpriteMarkup(sheetId: AtlasSheetId, rect: SpriteRect, options: AtlasSpriteOptions = {}): string {
  const sheet = ATLAS_SHEETS[sheetId];
  const href = escapeAttr(options.url ?? assetUrl(sheetId));
  const a11y = options.label ? `role="img" aria-label="${escapeAttr(options.label)}"` : 'aria-hidden="true" focusable="false"';
  const style = [
    `aspect-ratio:${rect.width} / ${rect.height}`,
    options.width ? `width:${options.width}` : '',
    options.height ? `height:${options.height}` : '',
  ].filter(Boolean).join(';');

  return `<svg class="atlas-sprite${options.className ? ` ${escapeAttr(options.className)}` : ''}" ${a11y} xmlns="http://www.w3.org/2000/svg" viewBox="${atlasViewBox(rect)}" preserveAspectRatio="xMidYMid meet" data-atlas-sheet="${sheetId}" style="${style}"><image href="${href}" x="0" y="0" width="${sheet.width}" height="${sheet.height}" preserveAspectRatio="none"/></svg>`;
}

export function dealerSpriteMarkup(id: DealerSpriteId, options: AtlasSpriteOptions = {}): string {
  return atlasSpriteMarkup('dealer', DEALER_SPRITES[id].rect, options);
}

export function cardSpriteMarkup(theme: CardThemeId, card: Card, options: AtlasSpriteOptions = {}): string {
  return atlasSpriteMarkup(CARD_DECKS[theme].sheet, cardFaceRect(theme, card.suit, card.rank), {
    label: `${card.rank} of ${card.suit}`,
    ...options,
  });
}

export function cardExtraSpriteMarkup(theme: CardThemeId, extra: CardExtraId, options: AtlasSpriteOptions = {}): string {
  return atlasSpriteMarkup(CARD_DECKS[theme].sheet, cardExtraRect(theme, extra), {
    label: extra === 'back' ? 'Face-down card' : 'Joker',
    ...options,
  });
}
