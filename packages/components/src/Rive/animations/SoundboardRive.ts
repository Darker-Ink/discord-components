import { createRiveAnimation } from './createRiveAnimation';

export const SoundboardRive = createRiveAnimation('SoundboardRive', {
  src: 'https://cdn.discordapp.com/assets/content/288f3e1773a2d5ecd66b085e33a1c3d56c16032e6f111012d891ac91c2080b7e.riv',
  defaultArtboard: 'Icon Soundboard',
  artboardProperties: {
    'Icon Soundboard': { reducedMotion: 'boolean', fill: 'color' },
    Lottie_HoverOn_Soundboard_nested_comp_0: {},
  },
  artboardViewModelInstances: { 'Icon Soundboard': ['Instance'], Lottie_HoverOn_Soundboard_nested_comp_0: [] },
  artboardStateMachines: { 'Icon Soundboard': ['State Machine 1'], Lottie_HoverOn_Soundboard_nested_comp_0: [] },
});
