import { createRiveAnimation } from './createRiveAnimation';

export const BoostGemLevelThreeRive = createRiveAnimation('BoostGemLevelThreeRive', {
  src: 'https://cdn.discordapp.com/assets/content/3f8d8cb2278b39eb8975ff5c252ed36a67addd54ae228a2b0d34691ddffa9104.riv',
  defaultArtboard: 'Gem L3',
  artboardProperties: {
    'Gem L3': { reducedMotion: 'boolean' },
    Sparkle: { reducedMotion: 'boolean' },
    Sparkle_Tiny: { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: { 'Gem L3': ['Instance'], Sparkle: ['Instance'], Sparkle_Tiny: ['Instance'] },
  artboardStateMachines: { 'Gem L3': ['SM_Hover'], Sparkle: ['SparkleSM'], Sparkle_Tiny: ['SparkleSM'] },
});
