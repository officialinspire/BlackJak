import './styles/main.css';
import './styles/premium.css';
import './styles/dialogue.css';
import './styles/progression.css';
import './styles/house.css';
import './styles/feedback-daily.css';
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
