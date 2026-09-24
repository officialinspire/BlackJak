/*
 * Release gate for the built app (runs after build-sw.mjs):
 *  - every asset referenced by dist HTML/JS/CSS/manifest exists in dist/
 *  - every dist file is in the service-worker precache list (offline play)
 *  - all seven runtime art sheets are present as optimized WebP
 *  - raw source PNG sheets are not shipped, and image weight stays in budget
 *  - index.html carries the Content-Security-Policy and no inline scripts
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const BASE = '/BlackJak/';
const SHEETS = [
  'blackjak-sprite-sheet', 'blackjak-table', 'dialogue-status-bar', 'menu-bar',
  'blackjak-cards-standard', 'blackjak-cards-jak-theme', 'blackjak-cards-inspire-theme',
];
const IMAGE_BUDGET_BYTES = 4.5 * 1024 * 1024;
const SINGLE_IMAGE_BUDGET_BYTES = 900 * 1024;

const problems = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = (await walk(DIST)).map((file) => relative(DIST, file).split(sep).join('/'));
const fileSet = new Set(files);

const sw = await readFile(join(DIST, 'sw.js'), 'utf8');
const precache = new Set(JSON.parse(sw.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/)[1]));
for (const file of files) {
  if (file === 'sw.js') continue;
  if (!precache.has(`${BASE}${file}`)) problems.push(`not precached for offline: ${file}`);
}

const textFiles = files.filter((file) => /\.(html|js|css|webmanifest)$/.test(file));
const referenced = new Set();
for (const file of textFiles) {
  const text = await readFile(join(DIST, file), 'utf8');
  for (const match of text.matchAll(/(?:\/BlackJak\/|\.\/|\b)((?:assets|icons)\/[\w.\-]+\.(?:webp|png|svg|jpg|jpeg|avif|css|js))/g)) {
    referenced.add(match[1]);
  }
}
for (const asset of referenced) {
  if (!fileSet.has(asset)) problems.push(`referenced but missing from dist: ${asset}`);
}

for (const sheet of SHEETS) {
  const hit = files.find((file) => file.startsWith(`assets/${sheet}-`) && file.endsWith('.webp'));
  if (!hit) problems.push(`runtime sheet missing: ${sheet}.webp`);
  else if (!referenced.has(hit)) problems.push(`runtime sheet not referenced by the app: ${hit}`);
}

let imageBytes = 0;
for (const file of files.filter((name) => /\.(webp|png|jpe?g|avif|svg)$/.test(name))) {
  const { size } = await stat(join(DIST, file));
  imageBytes += size;
  if (SHEETS.some((sheet) => file.startsWith(`assets/${sheet}-`) && file.endsWith('.png'))) {
    problems.push(`raw source PNG shipped: ${file}`);
  }
  if (size > SINGLE_IMAGE_BUDGET_BYTES) problems.push(`image over ${SINGLE_IMAGE_BUDGET_BYTES / 1024} KB budget: ${file} (${Math.round(size / 1024)} KB)`);
}
const indexHtml = (await readFile(join(DIST, 'index.html'), 'utf8')).replace(/&#39;/g, "'").replace(/&quot;/g, '"');
if (!/<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self'/.test(indexHtml)) problems.push('index.html is missing the Content-Security-Policy meta tag');
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(indexHtml)) problems.push('index.html contains an inline <script> (blocked by the CSP)');

if (imageBytes > IMAGE_BUDGET_BYTES) problems.push(`total image weight ${Math.round(imageBytes / 1024)} KB exceeds ${IMAGE_BUDGET_BYTES / 1024} KB`);

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log(`verify-dist: OK — ${files.length} files, ${precache.size} precached, ${referenced.size} referenced assets, images ${Math.round(imageBytes / 1024)} KB`);
