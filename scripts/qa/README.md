# Browser QA scripts

Playwright/Chromium integration checks used for release hardening. They run against a
production preview. They are separate from `npm test`, and GitHub Actions now runs all
four scripts as a required browser QA gate.

```sh
npm run build && npx vite preview --port 4173 &
export PW="$(npm root -g)/playwright" S=/tmp/qa   # screenshots land in $S
mkdir -p "$S"
node scripts/qa/browser-qa.cjs       # startup/intro (+ failed/stalled intro) + 320–1440 + landscape; tables, dialogue bar vs dock, pause, hitboxes, keyboard, reduced motion, mute, music (one track, background tab), refresh, corrupt + blocked storage, HUD/dock controls within the viewport (betting and playing), offline + media Range 206
node scripts/qa/gameplay-pwa-qa.cjs  # card lifecycle/input stress, split, Gold Card, PWA update (dist/sw.js is restored in finally)
node scripts/qa/refresh-qa.cjs       # 30 refresh-mid-hand trials across Classic and Jak's House
node scripts/qa/achievements-qa.cjs  # logbook at 320–1280 (89 entries, in-place type/lock filters vs full render, touch targets, focus, redraw time), chip/REP ladders at startup, table-max bet, first House round, log-in streak, first-hand, deck, refill and Daily Hand unlock toasts, mid-hand unlock save safety, 60-hand performance
```

Each script closes Chromium in `finally` and exits non-zero on any failure or thrown error, so
a broken check fails CI quickly instead of hanging until the job times out.
