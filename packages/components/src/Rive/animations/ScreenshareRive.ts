import { createRiveAnimation } from './createRiveAnimation';

export const ScreenshareRive = createRiveAnimation('ScreenshareRive', {
  src: 'https://cdn.discordapp.com/assets/content/81335b0dc82d36c4619b28807eff4e3a0970ec1254f30432306b1f0789ea720f.riv',
  defaultArtboard: 'Icon Screenshare',
  artboardProperties: { 'Icon Screenshare': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' } },
  artboardViewModelInstances: { 'Icon Screenshare': ['Off', 'On'] },
  artboardStateMachines: { 'Icon Screenshare': ['State Machine 1'] },
});
