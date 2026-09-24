# Browser QA scripts

Playwright/Chromium integration checks used for release hardening. They run against a
production preview. They are separate from `npm test`, and GitHub Actions now runs all
three scripts as a required browser QA gate.

```sh
npm run build && npx vite preview --port 4173 &
export PW="$(npm root -g)/playwright" S=/tmp/qa   # screenshots land in $S
mkdir -p "$S"
node scripts/qa/browser-qa.cjs       # startup/intro + 320/360/390/430/768/1024/1280/1440 + landscape; menu/stats/settings/daily/tables/pause, hitboxes, keyboard, reduced motion, mute, refresh, corrupt storage, offline
node scripts/qa/gameplay-pwa-qa.cjs  # card lifecycle/input stress, split, Gold Card, PWA update (dist/sw.js is restored in finally)
node scripts/qa/refresh-qa.cjs       # 30 refresh-mid-hand trials across Classic and Jak's House
```
