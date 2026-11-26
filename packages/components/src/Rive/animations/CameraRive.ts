import { createRiveAnimation } from './createRiveAnimation';

export const CameraRive = createRiveAnimation('CameraRive', {
  src: 'https://cdn.discordapp.com/assets/content/68db361d2b44a8fb84b26d6a1bb67b206a4c22839ea414a95fdb8090859ceb15.riv',
  defaultArtboard: 'Icon Camera',
  artboardProperties: {
    'Icon Camera': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' },
    'Animation Main': {},
  },
  artboardViewModelInstances: { 'Icon Camera': ['CamOff', 'CamOn'], 'Animation Main': [] },
  artboardStateMachines: { 'Icon Camera': ['State Machine 1'], 'Animation Main': [] },
});
