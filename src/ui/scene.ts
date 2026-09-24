import { assetUrl } from '../assets/blackjak-assets';
import { sceneStyleVars } from '../config/scene-layout';

/*
 * Reusable game scene shared by Classic BlackJak and Jak's House.
 *
 * Layer stack (bottom → top):
 *   1. table   – blackjak-table.png, fixed aspect, cover-cropped on narrow frames
 *   2. npc     – Jak dealer placeholder (future sprite slot), anchored on the table
 *   3. cards   – dealer + player hands, anchored to table positions
 *   4. ui      – dialogue/status + round result, spans the visible frame
 *   5. hud     – compact player resources above the table
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
  readonly dealerHand: string;
  readonly playerHands: string;
  readonly dialogue: string;
  /** Optional overlay in the UI layer (round result banner). */
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
            <div class="scene-anchor anchor-dealer-hand">${slots.dealerHand}</div>
            <div class="scene-anchor scene-span anchor-player-hands">${slots.playerHands}</div>
          </div>
          <div class="scene-layer scene-ui">
            <div class="scene-anchor scene-span anchor-dialogue">${slots.dialogue}</div>
            ${slots.overlay ?? ''}
          </div>
        </div>
      </div>
    </section>`;
}
