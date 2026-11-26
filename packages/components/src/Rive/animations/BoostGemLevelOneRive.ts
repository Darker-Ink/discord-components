import { createRiveAnimation } from './createRiveAnimation';

export const BoostGemLevelOneRive = createRiveAnimation('BoostGemLevelOneRive', {
  src: 'https://cdn.discordapp.com/assets/content/43b5fa41a3e3cada2b5bb7dfdc456d22a834d01c2947ffc986b4996ee40c063b.riv',
  defaultArtboard: 'Gem L1',
  artboardProperties: {
    'Gem L1': { reducedMotion: 'boolean' },
    Sparkle_Tiny: { reducedMotion: 'boolean' },
    Sparkle: { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: { 'Gem L1': ['Instance'], Sparkle_Tiny: ['Instance'], Sparkle: ['Instance'] },
  artboardStateMachines: { 'Gem L1': ['SM_Hover'], Sparkle_Tiny: ['SparkleSM'], Sparkle: ['SparkleSM'] },
});
