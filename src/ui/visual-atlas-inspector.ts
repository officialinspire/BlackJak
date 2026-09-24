import '../styles/atlas-inspector.css';
import { assetUrl } from '../assets/blackjak-assets';
import {
  ATLAS_SHEETS,
  ATLAS_SHEET_IDS,
  listAtlasEntries,
  validateAtlas,
  type AtlasEntry,
  type AtlasSheetId,
} from '../data/visual-atlas';
import { atlasSpriteMarkup } from './atlas';
import { CARD_ART_ISSUES } from '../data/card-atlas';

/*
 * Developer-only visual atlas inspector, opened with ?debugVisuals=1.
 * Overlays every mapped rect on its source sheet and shows each crop exactly
 * as the atlas renderer produces it. It never touches game state.
 */

const ROOT_ID = 'visual-atlas-inspector';

/** Atlas keys (card:theme:suit:rank) of sheet cells flagged as unusable art. */
const FLAGGED = new Map<string, string>(CARD_ART_ISSUES.map((issue) => {
  const [rank, suit] = issue.key.split('-');
  return [`card:${issue.theme}:${suit}:${rank}`, issue.issue] as const;
}));

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sheetOverlayMarkup(sheetId: AtlasSheetId, entries: readonly AtlasEntry[]): string {
  const sheet = ATLAS_SHEETS[sheetId];
  const outlines = entries.map((entry) => {
    const { x, y, width, height } = entry.rect;
    const flag = FLAGGED.get(entry.key);
    return `<rect class="vai-rect vai-kind-${entry.kind}${flag ? ' is-flagged' : ''}" data-key="${escapeHtml(entry.key)}" x="${x}" y="${y}" width="${width}" height="${height}"><title>${escapeHtml(`${entry.key} — ${x},${y} ${width}×${height}${flag ? ` — FLAGGED: ${flag}` : ''}`)}</title></rect>`;
  }).join('');

  return `<svg class="vai-sheet" viewBox="0 0 ${sheet.width} ${sheet.height}" role="img" aria-label="${escapeHtml(sheet.file)} with atlas rects">
      <image href="${escapeHtml(assetUrl(sheetId))}" width="${sheet.width}" height="${sheet.height}"/>
      ${outlines}
    </svg>`;
}

function cropGridMarkup(entries: readonly AtlasEntry[]): string {
  return entries.map((entry) => {
    const { x, y, width, height } = entry.rect;
    const flag = FLAGGED.get(entry.key);
    return `<button type="button" class="vai-crop${flag ? ' is-flagged' : ''}" data-key="${escapeHtml(entry.key)}"${flag ? ` title="${escapeHtml(flag)}"` : ''}>
        ${atlasSpriteMarkup(entry.sheet, entry.rect)}
        <span class="vai-crop-label">${flag ? '⚠ ' : ''}${escapeHtml(entry.label)}</span>
        <code>${x},${y} ${width}×${height}</code>
      </button>`;
  }).join('');
}

function renderSheet(root: HTMLElement, sheetId: AtlasSheetId, allEntries: readonly AtlasEntry[]): void {
  const sheet = ATLAS_SHEETS[sheetId];
  const entries = allEntries.filter((entry) => entry.sheet === sheetId);
  const body = root.querySelector<HTMLElement>('.vai-body');
  if (!body) return;

  body.innerHTML = `
    <p class="vai-meta"><strong>${escapeHtml(sheet.file)}</strong> · ${sheet.width}×${sheet.height} · ${sheet.alpha ? 'RGBA' : 'RGB (opaque)'} · ${entries.length} rects<br>${escapeHtml(sheet.notes)}</p>
    ${sheetOverlayMarkup(sheetId, entries)}
    <div class="vai-grid">${cropGridMarkup(entries)}</div>`;

  root.querySelectorAll<HTMLButtonElement>('.vai-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', String(tab.dataset.sheet === sheetId));
  });
}

function highlight(root: HTMLElement, key: string): void {
  root.querySelectorAll('.vai-rect.is-active').forEach((node) => node.classList.remove('is-active'));
  root.querySelectorAll('.vai-crop.is-active').forEach((node) => node.classList.remove('is-active'));
  const selector = `[data-key="${CSS.escape(key)}"]`;
  root.querySelectorAll(`.vai-rect${selector}, .vai-crop${selector}`).forEach((node) => node.classList.add('is-active'));
}

export function mountVisualAtlasInspector(): void {
  if (document.getElementById(ROOT_ID)) return;

  const entries = listAtlasEntries();
  const issues = validateAtlas(entries);
  const root = document.createElement('aside');
  root.id = ROOT_ID;
  root.setAttribute('aria-label', 'Visual atlas inspector (debug)');
  root.innerHTML = `
    <header class="vai-header">
      <h2>Visual atlas</h2>
      <span class="vai-status ${issues.length ? 'is-bad' : 'is-ok'}">${issues.length ? `${issues.length} issue(s)` : `${entries.length} rects OK`}</span>
      <button type="button" class="vai-close" aria-label="Close visual atlas inspector">×</button>
    </header>
    ${issues.length ? `<ul class="vai-issues">${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>` : ''}
    <nav class="vai-tabs">${ATLAS_SHEET_IDS.map((id) => `<button type="button" class="vai-tab" data-sheet="${id}" aria-pressed="false">${id}</button>`).join('')}</nav>
    <div class="vai-body"></div>`;

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target.closest('.vai-close')) {
      root.remove();
      return;
    }
    const tab = target.closest<HTMLButtonElement>('.vai-tab');
    if (tab?.dataset.sheet) {
      renderSheet(root, tab.dataset.sheet as AtlasSheetId, entries);
      return;
    }
    const keyed = target.closest<HTMLElement | SVGElement>('[data-key]');
    if (keyed?.dataset.key) highlight(root, keyed.dataset.key);
  });

  document.body.append(root);
  renderSheet(root, 'dealer', entries);
}
