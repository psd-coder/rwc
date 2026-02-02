import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="app">
      <h1>rwc</h1>
      <p>Dev environment ready.</p>
    </main>
  `;
}
