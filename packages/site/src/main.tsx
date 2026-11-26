import '@discord-mana/tokens';
import './global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App notFound={document.documentElement.hasAttribute('data-not-found')} />
  </StrictMode>,
);
