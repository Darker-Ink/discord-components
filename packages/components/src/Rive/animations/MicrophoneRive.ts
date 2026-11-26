import { createRiveAnimation } from './createRiveAnimation';

export const MicrophoneRive = createRiveAnimation('MicrophoneRive', {
  src: 'https://cdn.discordapp.com/assets/content/b233c7200b1252c48d61fdecf9171fa0692336a9d7134111408bf02e5a07cbb0.riv',
  defaultArtboard: 'Icon Microphone',
  artboardProperties: {
    'Icon Microphone': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' },
    'Animation Main': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' },
  },
  artboardViewModelInstances: { 'Icon Microphone': ['Off', 'On'], 'Animation Main': ['Off', 'On'] },
  artboardStateMachines: { 'Icon Microphone': ['State Machine 1'], 'Animation Main': [] },
});
