import { describe, expect, it } from 'vitest';
import manifest from '../src/assets/runtime/manifest.json';
import { ATLAS_SHEETS, ATLAS_SHEET_IDS, type AtlasSheetId } from '../src/data/visual-atlas';

const webps = import.meta.glob('../src/assets/runtime/*.webp', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const pngs = import.meta.glob('../*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;

const bytesOf = (dataUrl: string): Uint8Array => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0));

/** Canvas size from a WebP RIFF header (VP8X extended, VP8 lossy, or VP8L lossless). */
function webpSize(bytes: Uint8Array): { width: number; height: number } {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  expect(ascii(0, 4)).toBe('RIFF');
  expect(ascii(8, 12)).toBe('WEBP');
  const chunk = ascii(12, 16);
  const u24 = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  if (chunk === 'VP8X') return { width: u24(24) + 1, height: u24(27) + 1 };
  if (chunk === 'VP8L') {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('optimized runtime art', () => {
  it.each(ATLAS_SHEET_IDS)('%s ships as WebP with the exact source dimensions', (id: AtlasSheetId) => {
    const sheet = ATLAS_SHEETS[id];
    const entry = manifest[sheet.file as keyof typeof manifest];
    expect(entry, sheet.file).toBeDefined();
    const dataUrl = webps[`../src/assets/runtime/${entry.webp}`];
    expect(dataUrl, entry.webp).toBeDefined();
    expect(webpSize(bytesOf(dataUrl))).toEqual({ width: sheet.width, height: sheet.height });
  });

  it('was generated from the current source PNGs (not stale)', async () => {
    for (const [file, entry] of Object.entries(manifest)) {
      const png = pngs[`../${file}`];
      expect(png, file).toBeDefined();
      expect(await sha256(bytesOf(png)), `${file} changed: rerun scripts/optimize-assets.py`).toBe(entry.sha256);
    }
  });

  it('keeps quality high and cuts weight substantially', () => {
    let png = 0;
    let webp = 0;
    for (const entry of Object.values(manifest)) {
      expect(entry.quality).toBeGreaterThanOrEqual(90);
      png += entry.pngBytes;
      webp += entry.webpBytes;
    }
    expect(webp).toBeLessThan(png * 0.35);
  });
});
