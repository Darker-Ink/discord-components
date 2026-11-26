import { createRiveAnimation } from './createRiveAnimation';

export const CheckpointNumbersLeftAlignedRive = createRiveAnimation('CheckpointNumbersLeftAlignedRive', {
  src: 'https://cdn.discordapp.com/assets/content/b5a7e4dd53b173c7d1f38ddbd65142267a79529a228987d184c858c16c21ddf6.riv',
  defaultArtboard: 'Artboard',
  artboardProperties: {
    Artboard: { reducedMotion: 'boolean', TextColor: 'color', 'Fire CountUp': 'trigger', DisplayValue: 'number' },
  },
  artboardViewModelInstances: { Artboard: ['Instance'] },
  artboardStateMachines: { Artboard: ['State Machine 1'] },
});
