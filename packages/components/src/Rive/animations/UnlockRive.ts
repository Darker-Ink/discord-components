import { createRiveAnimation } from './createRiveAnimation';

export const UnlockRive = createRiveAnimation('UnlockRive', {
  src: 'https://cdn.discordapp.com/assets/content/bee5073bff85cffaf0f4236456029b067925cd9de6742c5bb582f0ce39f1fa49.riv',
  defaultArtboard: 'Icon Unlock',
  artboardProperties: { 'Icon Unlock': { reducedMotion: 'boolean', locked: 'boolean', fill: 'color' } },
  artboardViewModelInstances: { 'Icon Unlock': ['locked', 'unlock'] },
  artboardStateMachines: { 'Icon Unlock': ['State Machine 1'] },
});
