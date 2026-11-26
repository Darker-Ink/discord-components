import '@discord-mana/tokens';
// Highlights code blocks in every language Discord does.
import '@discord-mana/markdown/languages/all';
import { setRiveAssetUrlResolver } from '@discord-mana/components';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Playground } from './Playground';
import { collections } from './stories';

// Discord's CDN only allows its Rive files to be fetched from discord.com, so the playground serves
// copies of them (public/rive, named like on the CDN).
const RIVE_CDN = /^https:\/\/cdn\.discordapp\.com\/assets\/content\/([0-9a-f]+\.riv)$/;
setRiveAssetUrlResolver((url) => url.replace(RIVE_CDN, '/rive/$1'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground collections={collections} />
  </StrictMode>,
);
