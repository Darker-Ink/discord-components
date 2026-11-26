import '@discord-mana/tokens';
// Highlights code blocks in every language Discord does.
import '@discord-mana/markdown/languages/all';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Playground } from './Playground';
import { collections } from './stories';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground collections={collections} />
  </StrictMode>,
);
