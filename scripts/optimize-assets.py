#!/usr/bin/env python3
"""Build optimized runtime art from the original PNG source sheets.

The PNGs at the repository root stay the untouched source of truth. This writes
high-quality WebP copies (lossy colour, lossless alpha, identical pixel size so
every atlas coordinate still applies) to src/assets/runtime/, plus a manifest
with each source's SHA-256 so tests can detect stale runtime assets.

Card sheets use a higher quality because their corner indices are small, saturated
text. Chroma subsampling is the limiting factor, and at 4x zoom q92/q95 is visually
indistinguishable from the PNG.

The dealer sheet is also de-bled: its poses overlap on the sheet (hands, hair, a
flicked card), so inside each pose's atlas rect any pixels belonging to a
*different* pose are cleared. Poses never show pixels outside their own rect, so
nothing visible is lost; the source PNG is untouched.

Requires: pip install pillow numpy scipy   (dev-only; not part of the build)
Usage:    python3 scripts/optimize-assets.py
"""
import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets' / 'runtime'

SHEETS = {
    'blackjak-sprite-sheet.png': 92,
    'blackjak-table.png': 92,
    'dialogue-status-bar.png': 92,
    'menu-bar.png': 92,
    'blackjak-cards-standard.png': 95,
    'blackjak-cards-jak-theme.png': 95,
    'blackjak-cards-inspire-theme.png': 95,
}


DEALER_SHEET = 'blackjak-sprite-sheet.png'


def dealer_rects() -> list[tuple[int, int, int, int]]:
    """Dealer pose rects, read straight from the atlas source of truth."""
    source = (ROOT / 'src' / 'data' / 'visual-atlas.ts').read_text()
    block = source[source.index('export const DEALER_SPRITES'):source.index('// Card decks')]
    return [tuple(map(int, m)) for m in re.findall(r"r\((\d+), (\d+), (\d+), (\d+)\)\)", block)]


def debleed_dealer(image: Image.Image) -> Image.Image:
    rgba = np.array(image.convert('RGBA'))
    alpha = rgba[..., 3]
    labels, count = ndimage.label(alpha > 32)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    rects = dealer_rects()

    # Each labelled component belongs to the pose rect holding most of its pixels.
    owner = np.full(count + 1, -1)
    for component in range(1, count + 1):
        if sizes[component - 1] < 20:
            continue
        mask = labels == component
        overlap = [mask[y:y + h, x:x + w].sum() for (x, y, w, h) in rects]
        owner[component] = int(np.argmax(overlap))
    pixel_owner = owner[labels]

    cleared = 0
    for index, (x, y, w, h) in enumerate(rects):
        region_owner = pixel_owner[y:y + h, x:x + w]
        foreign = (region_owner >= 0) & (region_owner != index)
        # Include the anti-aliased fringe of foreign shapes, but never this pose's own pixels.
        foreign = ndimage.binary_dilation(foreign, iterations=2) & (region_owner != index)
        cleared += int(foreign.sum())
        rgba[y:y + h, x:x + w][foreign] = 0
    print(f"  de-bled dealer sheet: cleared {cleared} foreign pixels across {len(rects)} poses")
    return Image.fromarray(rgba, 'RGBA')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, quality in SHEETS.items():
        source = ROOT / name
        data = source.read_bytes()
        image = Image.open(source)
        if name == DEALER_SHEET:
            image = debleed_dealer(image)
        target = OUT / (source.stem + '.webp')
        image.save(target, 'WEBP', quality=quality, method=6, alpha_quality=100, exact=False)
        manifest[name] = {
            'webp': target.name,
            'sha256': hashlib.sha256(data).hexdigest(),
            'width': image.width,
            'height': image.height,
            'quality': quality,
            'pngBytes': len(data),
            'webpBytes': target.stat().st_size,
        }
        print(f"{name}: {len(data) // 1024} KB -> {target.stat().st_size // 1024} KB (q{quality})")
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
