interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NoticeKind = 'install' | 'update' | 'offline';

function removeNotice(kind: NoticeKind): void {
  document.querySelector(`[data-pwa-notice="${kind}"]`)?.remove();
}

function showNotice(
  kind: NoticeKind,
  message: string,
  actionLabel?: string,
  action?: () => void,
): void {
  removeNotice(kind);

  const notice = document.createElement('aside');
  notice.className = `pwa-notice pwa-notice-${kind}`;
  notice.dataset.pwaNotice = kind;
  notice.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.textContent = message;
  notice.append(text);

  if (actionLabel && action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = actionLabel;
    button.addEventListener('click', action, { once: true });
    notice.append(button);
  }

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'pwa-notice-dismiss';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', () => notice.remove());
  notice.append(dismiss);

  document.body.append(notice);
}

function setupInstallPrompt(): void {
  let deferred: BeforeInstallPromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;

    showNotice('install', 'Install BlackJak for a full-screen app experience.', 'Install', () => {
      if (!deferred) return;
      const promptEvent = deferred;
      deferred = null;
      void promptEvent.prompt()
        .then(() => promptEvent.userChoice)
        .finally(() => removeNotice('install'));
    });
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    removeNotice('install');
  });
}

function setupNetworkStatus(): void {
  const showOffline = (): void => {
    showNotice('offline', 'Offline mode active. Cached BlackJak play and local progress are still available.');
  };

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', () => removeNotice('offline'));

  if (!navigator.onLine) showOffline();
}

export function registerPWA(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  setupInstallPrompt();
  setupNetworkStatus();

  window.addEventListener('load', () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;
    const scope = import.meta.env.BASE_URL;
    let reloadForUpdate = false;

    void navigator.serviceWorker.register(serviceWorkerUrl, { scope }).then((registration) => {
      const offerUpdate = (worker: ServiceWorker): void => {
        showNotice('update', 'A newer BlackJak build is ready.', 'Update', () => {
          reloadForUpdate = true;
          worker.postMessage({ type: 'SKIP_WAITING' });
        });
      };

      if (registration.waiting) offerUpdate(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            offerUpdate(installing);
          }
        });
      });

      void registration.update().catch(() => undefined);
    }).catch((error) => {
      console.warn('BlackJak service worker registration failed.', error);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloadForUpdate) return;
      reloadForUpdate = false;
      window.location.reload();
    });
  });
}
