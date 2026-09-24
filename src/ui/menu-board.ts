import { MENU_BOARD_FRAME, menuBoardStyleVars, menuHitboxStyleVars, type MenuBoardSlot } from '../config/menu-board-layout';
import { atlasSpriteMarkup } from './atlas';

/*
 * Wooden menu board built on menu-bar.png: the artwork is a decorative layer,
 * and real <button>s sit over the header plaque and the four planks at
 * normalized hit areas. Used by the main menu and the in-game pause board.
 */

export interface MenuBoardButton {
  readonly slot: MenuBoardSlot;
  readonly label: string;
  /** Small secondary text on the plank. */
  readonly detail?: string;
  /** Extra attributes (data-*, aria-*), already escaped by the caller. */
  readonly attributes: string;
}

export interface MenuBoardStatic {
  readonly slot: MenuBoardSlot;
  /** Pre-built semantic content for a non-interactive slot (e.g. a heading + summary). */
  readonly html: string;
}

export interface MenuBoardInput {
  readonly className?: string;
  /** Wrapper element: a <nav> for the main menu, a plain <div> inside dialogs. */
  readonly as: 'nav' | 'div';
  readonly label?: string;
  readonly items: readonly (MenuBoardButton | MenuBoardStatic)[];
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function itemMarkup(item: MenuBoardButton | MenuBoardStatic): string {
  const position = menuHitboxStyleVars(item.slot);
  if ('html' in item) {
    return `<div class="menu-board-hit menu-board-static slot-${item.slot}" data-slot="${item.slot}" style="${position}">${item.html}</div>`;
  }
  return `<button type="button" class="menu-board-hit menu-board-item slot-${item.slot}" data-slot="${item.slot}" style="${position}" ${item.attributes}><span class="menu-board-label">${escapeHtml(item.label)}</span>${item.detail ? `<span class="menu-board-detail">${escapeHtml(item.detail)}</span>` : ''}</button>`;
}

export function menuBoardMarkup(input: MenuBoardInput): string {
  const tag = input.as;
  return `
    <div class="menu-board-wrap${input.className ? ` ${input.className}` : ''}">
      <${tag} class="menu-board" style="${menuBoardStyleVars()}"${input.label ? ` aria-label="${escapeHtml(input.label)}"` : ''}>
        <div class="menu-board-art" aria-hidden="true">${atlasSpriteMarkup('menuBar', MENU_BOARD_FRAME)}</div>
        ${input.items.map(itemMarkup).join('')}
      </${tag}>
    </div>`;
}
