/*
 * Release gate for the built app (runs after build-sw.mjs):
 *  - every asset referenced by dist HTML/JS/CSS/manifest exists in dist/
 *  - core app files are precached for offline play; large media is runtime-cached
 *  - all seven runtime art sheets are present as optimized WebP
 *  - the intro video + both music tracks are emitted and referenced
 *  - raw source PNG sheets are not shipped, and image/media weights stay in budget
 *  - index.html carries the Content-Security-Policy and no inline scripts
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const BASE = '/BlackJak/';
const SHEETS = [
  'blackjak-sprite-sheet', 'blackjak-table', 'dialogue-status-bar', 'menu-bar',
  'blackjak-cards-standard', 'blackjak-cards-jak-theme', 'blackjak-cards-inspire-theme',
];
const REQUIRED_MEDIA = [
  { stem: "Jak Gold's Table", ext: '.mp3' },
  { stem: 'Minimal Gameplay Background', ext: '.mp3' },
  { stem: 'inspiresoftwareintro', ext: '.mp4' },
];
const MEDIA_EXTENSIONS = new Set(['.mp3', '.mp4', '.ogg', '.wav', '.webm']);
const IMAGE_BUDGET_BYTES = 4.5 * 1024 * 1024;
const SINGLE_IMAGE_BUDGET_BYTES = 900 * 1024;
const MEDIA_BUDGET_BYTES = 7 * 1024 * 1024;
const SINGLE_MEDIA_BUDGET_BYTES = 3.2 * 1024 * 1024;

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
const isMedia = (file) => MEDIA_EXTENSIONS.has(extname(file).toLowerCase());

const sw = await readFile(join(DIST, 'sw.js'), 'utf8');
const precacheMatch = sw.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/);
if (!precacheMatch) problems.push('service worker is missing PRECACHE_URLS');
const precache = new Set(precacheMatch ? JSON.parse(precacheMatch[1]) : []);

for (const file of files) {
  if (file === 'sw.js') continue;
  const url = `${BASE}${file}`;
  if (isMedia(file)) {
    if (precache.has(url)) problems.push(`large media should be runtime-cached, not precached: ${file}`);
  } else if (!precache.has(url)) {
    problems.push(`core file not precached for offline: ${file}`);
  }
}

if (!sw.includes("const MEDIA_CACHE_PREFIX = \"blackjak-media-\"")) problems.push('service worker is missing the runtime media cache');
if (!sw.includes('MEDIA_EXTENSIONS')) problems.push('service worker is missing media request routing');
if (!sw.includes('runtimeMedia(request)')) problems.push('service worker is missing runtime media fetch/cache handling');

const textFiles = files.filter((file) => /\.(html|js|css|webmanifest)$/.test(file));
const referenced = new Set();
const texts = [];
for (const file of textFiles) {
  const text = await readFile(join(DIST, file), 'utf8');
  texts.push(text);
  for (const match of text.matchAll(/(?:\/BlackJak\/|\.\/|\b)((?:assets|icons)\/[\w.\-]+\.(?:webp|png|svg|jpg|jpeg|avif|css|js))/g)) {
    referenced.add(match[1]);
  }
}
const bundledText = texts.join('\n');

for (const asset of referenced) {
  if (!fileSet.has(asset)) problems.push(`referenced but missing from dist: ${asset}`);
}

for (const sheet of SHEETS) {
  const hit = files.find((file) => file.startsWith(`assets/${sheet}-`) && file.endsWith('.webp'));
  if (!hit) problems.push(`runtime sheet missing: ${sheet}.webp`);
  else if (!referenced.has(hit)) problems.push(`runtime sheet not referenced by the app: ${hit}`);
}

const mediaFiles = files.filter(isMedia);
for (const requirement of REQUIRED_MEDIA) {
  const hit = mediaFiles.find((file) => file.startsWith(`assets/${requirement.stem}-`) && file.endsWith(requirement.ext));
  if (!hit) {
    problems.push(`required production media missing: ${requirement.stem}${requirement.ext}`);
    continue;
  }
  const encoded = encodeURI(hit);
  if (!bundledText.includes(hit) && !bundledText.includes(encoded)) {
    problems.push(`required production media not referenced by the app: ${hit}`);
  }
}

let imageBytes = 0;
for (const file of files.filter((name) => /\.(webp|png|jpe?g|avif|svg)$/.test(name))) {
  const { size } = await stat(join(DIST, file));
  imageBytes += size;
  if (SHEETS.some((sheet) => file.startsWith(`assets/${sheet}-`) && file.endsWith('.png'))) {
    problems.push(`raw source PNG shipped: ${file}`);
  }
  if (size > SINGLE_IMAGE_BUDGET_BYTES) {
    problems.push(`image over ${SINGLE_IMAGE_BUDGET_BYTES / 1024} KB budget: ${file} (${Math.round(size / 1024)} KB)`);
  }
}

let mediaBytes = 0;
for (const file of mediaFiles) {
  const { size } = await stat(join(DIST, file));
  mediaBytes += size;
  if (size > SINGLE_MEDIA_BUDGET_BYTES) {
    problems.push(`media over ${Math.round(SINGLE_MEDIA_BUDGET_BYTES / 1024)} KB budget: ${file} (${Math.round(size / 1024)} KB)`);
  }
}
if (mediaBytes > MEDIA_BUDGET_BYTES) problems.push(`total media weight ${Math.round(mediaBytes / 1024)} KB exceeds ${MEDIA_BUDGET_BYTES / 1024} KB`);

const indexHtml = (await readFile(join(DIST, 'index.html'), 'utf8')).replace(/&#39;/g, "'").replace(/&quot;/g, '"');
if (!/<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self'/.test(indexHtml)) {
  problems.push('index.html is missing the Content-Security-Policy meta tag');
}
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(indexHtml)) problems.push('index.html contains an inline <script> (blocked by the CSP)');
if (imageBytes > IMAGE_BUDGET_BYTES) problems.push(`total image weight ${Math.round(imageBytes / 1024)} KB exceeds ${IMAGE_BUDGET_BYTES / 1024} KB`);

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n - ${problems.join('\n - ')}`);
  process.exit(1);
}

console.log(
  `verify-dist: OK — ${files.length} files, ${precache.size} core precached, ${mediaFiles.length} media runtime-cached, ${referenced.size} referenced assets, images ${Math.round(imageBytes / 1024)} KB, media ${Math.round(mediaBytes / 1024)} KB`,
);
