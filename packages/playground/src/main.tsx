import '@discord-components/tokens';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Playground } from './Playground';
import { collections } from './stories';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground collections={collections} />
  </StrictMode>,
);
