import '@discord-mana/tokens';
import './global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, PREVIEW_PATH_RE } from './App';

document.documentElement.dataset.page = PREVIEW_PATH_RE.test(window.location.pathname) ? 'viewer' : 'site';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
