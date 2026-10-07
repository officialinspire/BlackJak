/** Anonymous, best-effort capture. Never stores identifiers or observes the DOM. */
const TOKEN = 'phc_wpvFbvptidYWtnkJG8EdMMhaXn6s2ZDznzNUha5V4KRm'; // public project token
const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
const allowed = new Set(['game_opened', 'game_started', 'round_started', 'round_completed', 'game_over', 'achievement_unlocked', 'error_encountered']);
const fields = new Set(['mode', 'round', 'score', 'achievement', 'error_type', 'error_name', 'outcome']);
const seen = new Set<string>();
let id: string | undefined;
let sequence = 0;
let initialized = false;
let context: () => Record<string, unknown> = () => ({});

export function setAnalyticsContext(provider: () => Record<string, unknown>): void { context = provider; }

export function trackGameEvent(event: string, details: Record<string, unknown> = {}, once?: string): void {
  try {
    if (!allowed.has(event) || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.onLine === false) return;
    const key = once === undefined ? null : `${event}:${once}`;
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    id ||= crypto.randomUUID();
    const properties: Record<string, unknown> = {
      brand: 'inspire', game: 'BlackJak', game_version: '0.6.0',
      $process_person_profile: false, $geoip_disable: true, $session_id: id, event_sequence: ++sequence,
    };
    let current: Record<string, unknown> = {};
    try { current = context(); } catch { /* optional context */ }
    for (const [name, value] of Object.entries({ ...current, ...details })) {
      if (fields.has(name) && ((typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.length <= 60))) properties[name] = value;
    }
    const timestamp = new Date().toISOString();
    setTimeout(() => {
      try {
        void fetch(ENDPOINT, {
          method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: TOKEN, distinct_id: id, event, properties, timestamp }),
        }).catch(() => {});
      } catch { /* network failure cannot affect play */ }
    }, 0);
  } catch { /* analytics cannot affect play */ }
}

export function initAnalytics(): void {
  try {
    if (initialized) return;
    initialized = true;
    for (const [type, category] of [['error', 'uncaught_error'], ['unhandledrejection', 'unhandled_rejection']]) {
      window.addEventListener(type, (event) => {
        const error = event instanceof ErrorEvent ? event.error : (event as PromiseRejectionEvent).reason;
        const name = error?.name;
        const error_name = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError'].includes(name) ? name : 'UnknownError';
        trackGameEvent('error_encountered', { error_type: category, error_name }, `${category}:${error_name}`);
      });
    }
    trackGameEvent('game_opened', {}, 'page-load');
  } catch { /* optional instrumentation */ }
}
