import { describe, expect, it } from 'vitest';
import footerCss from '../src/styles/game-footer.css?raw';
import renderSource from '../src/ui/render.ts?raw';
import startupSource from '../src/startup/startup.ts?raw';
import { gameFooterMarkup } from '../src/ui/game-footer';

describe('OFFICIAL INSPIRE game footer', () => {
  it('renders a safe, keyboard-accessible external link and Vite logo asset', () => {
    const markup = gameFooterMarkup();
    expect(markup).toContain('href="https://www.inspireclothing.art/"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('OFFICIAL INSPIRE');
    expect(markup).toContain('www.inspireclothing.art');
    expect(markup).toMatch(/<img[^>]+src="[^\"]+"[^>]+alt=""[^>]+aria-hidden="true"/);
    expect(markup).not.toContain('game-footer-compact');
  });

  it('provides a compact table variant', () => {
    expect(gameFooterMarkup('compact')).toContain('game-footer game-footer-compact');
  });

  it('is included on all six game screens but never in the startup intro', () => {
    expect(renderSource.match(/gameFooterMarkup\(/g)).toHaveLength(6);
    expect(renderSource.match(/gameFooterMarkup\('compact'\)/g)).toHaveLength(2);
    expect(startupSource).not.toContain('gameFooterMarkup');
  });

  it('stays in flow, respects safe areas, and preserves a 44px link target', () => {
    expect(footerCss).toMatch(/\.game-footer\s*{[^}]*position:\s*relative/s);
    expect(footerCss).not.toMatch(/\.game-footer\s*{[^}]*(?:position:\s*(?:fixed|sticky)|inset:)/s);
    expect(footerCss).toContain('env(safe-area-inset-bottom)');
    expect(footerCss).toMatch(/\.game-footer-link\s*{[^}]*min-height:\s*44px/s);
    expect(footerCss).toContain('@media (max-width: 420px)');
  });
});
