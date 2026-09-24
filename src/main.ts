import './styles/main.css';
import './styles/premium.css';
import './styles/dialogue.css';
import './styles/progression.css';
import './styles/house.css';
import './styles/feedback-daily.css';
import './styles/pwa.css';
import './styles/qa.css';
import './styles/scene.css';
import './styles/dealer.css';
import { registerPWA } from './pwa/register';
import { initializeUI } from './ui/render';

function boot(): void {
  try {
    initializeUI();
  } catch (error) {
    const root = document.querySelector<HTMLElement>('#app');
    if (root) {
      root.innerHTML = `
        <main id="app-main" class="screen fatal-screen">
          <h1>BLACKJAK</h1>
          <p>Something went wrong while starting the table.</p>
          <button type="button" id="reload-app">Reload</button>
        </main>`;
      document.querySelector('#reload-app')?.addEventListener('click', () => window.location.reload());
    }
    console.error('BlackJak failed to initialize.', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

registerPWA();

// Dev aid: ?debugVisuals=1 opens the visual atlas inspector (lazy chunk, no game impact).
if (new URLSearchParams(window.location.search).get('debugVisuals') === '1') {
  void import('./ui/visual-atlas-inspector')
    .then(({ mountVisualAtlasInspector }) => mountVisualAtlasInspector())
    .catch((error) => console.error('Visual atlas inspector failed to load.', error));
}
