# Browser QA scripts

Dev-only Playwright checks used for the sprite-build QA pass. They run against a
production preview and are not part of `npm test` (they need a browser).

```sh
npm run build && npx vite preview --port 4173 &
export PW="$(npm root -g)/playwright" S=/tmp/qa   # screenshots land in $S
mkdir -p "$S"
node scripts/qa/browser-qa.cjs       # widths 320–1440 + landscape, hitboxes, keyboard, reduced motion, mute, refresh, corrupt storage, offline
node scripts/qa/gameplay-pwa-qa.cjs  # hidden card, layering, split, Gold Card, PWA update (edits dist/sw.js — rebuild afterwards)
node scripts/qa/refresh-qa.cjs       # 30 refresh-mid-hand trials across Classic and Jak's House
```
