import { assetUrl } from '../assets/blackjak-assets';
import { sceneStyleVars } from '../config/scene-layout';

/*
 * Reusable game scene shared by Classic BlackJak and Jak's House.
 *
 * Layer stack (bottom → top):
 *   1. table   – blackjak-table.png, fixed aspect, cover-cropped on narrow frames
 *   2. npc     – Jak dealer placeholder (future sprite slot), anchored on the table
 *   3. cards   – dealer + player hands, anchored to table positions
 *   4. ui      – optional overlay inside the frame
 *   5. hud     – compact player resources above the table
 * The dialogue/status panel sits in a bar directly under the frame, tucked
 * over its bottom rail, so the felt stays clear for cards.
 * Controls stay ordinary DOM buttons rendered by the caller below the scene.
 */

export type SceneMode = 'classic' | 'house';

export interface GameSceneSlots {
  readonly mode: SceneMode;
  readonly label: string;
  /** Extra classes on the scene root (e.g. round tone). */
  readonly className?: string;
  readonly hud: string;
  readonly npc: string;
  readonly shoe: string;
  readonly dealerHand: string;
  readonly playerHands: string;
  /** Dialogue/status panel rendered in the bar under the table frame. */
  readonly dialogue: string;
  /** Optional overlay in the frame's UI layer. */
  readonly overlay?: string;
}

export function gameSceneMarkup(slots: GameSceneSlots): string {
  return `
    <section class="game-scene scene-${slots.mode}${slots.className ? ` ${slots.className}` : ''}" data-scene-mode="${slots.mode}" style="${sceneStyleVars()}" aria-label="${slots.label}">
      <div class="scene-layer scene-hud">${slots.hud}</div>
      <div class="scene-frame">
        <div class="scene-stage">
          <img class="scene-layer scene-table" src="${assetUrl('table')}" alt="" aria-hidden="true" draggable="false" decoding="async" fetchpriority="high">
          <div class="scene-layer scene-npc"><div class="scene-anchor anchor-npc">${slots.npc}</div></div>
          <div class="scene-layer scene-cards">
            <div class="scene-anchor anchor-shoe">${slots.shoe}</div>
            <div class="scene-anchor anchor-dealer-hand">${slots.dealerHand}</div>
            <div class="scene-anchor scene-span anchor-player-hands">${slots.playerHands}</div>
          </div>
          <div class="scene-layer scene-ui">${slots.overlay ?? ''}</div>
        </div>
      </div>
      <div class="scene-layer scene-dialogue-bar">${slots.dialogue}</div>
    </section>`;
}
