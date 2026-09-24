import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../vite.config';
import { tableDockMarkup } from '../src/ui/table-dock';
import { escapeHtml } from '../src/util/html';

const sources = import.meta.glob('../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('HTML escaping', () => {
  it('neutralises markup and attribute breakouts', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & 'x'`)).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;x&#39;');
  });

  it('escapes error text rendered in the dock', () => {
    const markup = tableDockMarkup({
      phase: 'betting', stakeOptions: [10], selectedStake: 10, chips: 100, maxStake: 250, allowed: [],
      house: false, formatChips: String, error: 'Action "<b onmouseover=x>" is not allowed.',
    });
    expect(markup).toContain('Action &quot;&lt;b onmouseover=x&gt;&quot; is not allowed.');
    expect(markup).not.toContain('<b onmouseover');
  });

  it('never interpolates error or share-status text into markup unescaped', () => {
    for (const [path, source] of Object.entries(sources)) {
      expect(source, path).not.toMatch(/\$\{\s*(model\.error|model\.dailyShareStatus|input\.error)\s*\}/);
    }
  });
});

describe('Content-Security-Policy', () => {
  it('allows same-origin scripts only and blocks plugins, base hijack and form posts', () => {
    const directives = Object.fromEntries(CONTENT_SECURITY_POLICY.split('; ').map((d) => [d.split(' ')[0], d.split(' ').slice(1)]));
    expect(directives['script-src']).toEqual(["'self'"]);
    expect(directives['default-src']).toEqual(["'self'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'none'"]);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-eval|https?:|\*/);
  });
});
