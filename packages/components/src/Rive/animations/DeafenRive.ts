import { createRiveAnimation } from './createRiveAnimation';

export const DeafenRive = createRiveAnimation('DeafenRive', {
  src: 'https://cdn.discordapp.com/assets/content/970a59ccae327b43fa4f1a8326739e99af8bdba1d0bc39a5563025286c3d1da3.riv',
  defaultArtboard: 'Icon Deafen',
  artboardProperties: {
    'Icon Deafen': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' },
    'Animation Main': {},
  },
  artboardViewModelInstances: { 'Icon Deafen': ['Off', 'On'], 'Animation Main': [] },
  artboardStateMachines: { 'Icon Deafen': ['State Machine 1'], 'Animation Main': [] },
});
