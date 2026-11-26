import { createRiveAnimation } from './createRiveAnimation';

export const EndCallRive = createRiveAnimation('EndCallRive', {
  src: 'https://cdn.discordapp.com/assets/content/24517e002f370e7845f6f88a6ee9c756141fdd109882cf2c259d913cf1742362.riv',
  defaultArtboard: 'Icon EndCall',
  artboardProperties: { 'Icon EndCall': { reducedMotion: 'boolean', fill: 'color' } },
  artboardViewModelInstances: { 'Icon EndCall': ['Instance'] },
  artboardStateMachines: { 'Icon EndCall': ['State Machine 1'] },
});
