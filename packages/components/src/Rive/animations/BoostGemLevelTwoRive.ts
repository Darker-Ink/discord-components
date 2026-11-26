import { createRiveAnimation } from './createRiveAnimation';

export const BoostGemLevelTwoRive = createRiveAnimation('BoostGemLevelTwoRive', {
  src: 'https://cdn.discordapp.com/assets/content/f6be7075b3756dfb89ce77617b82d7a9a863a31483e03dfedb07377038197910.riv',
  defaultArtboard: 'Gem L2',
  artboardProperties: {
    'Gem L2': { reducedMotion: 'boolean' },
    Sparkle: { reducedMotion: 'boolean' },
    Sparkle_Tiny: { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: { 'Gem L2': ['Instance'], Sparkle: ['Instance'], Sparkle_Tiny: ['Instance'] },
  artboardStateMachines: { 'Gem L2': ['SM_Hover'], Sparkle: ['SparkleSM'], Sparkle_Tiny: ['SparkleSM'] },
});
