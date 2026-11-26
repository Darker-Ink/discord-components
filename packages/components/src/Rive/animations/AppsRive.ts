import { createRiveAnimation } from './createRiveAnimation';

export const AppsRive = createRiveAnimation('AppsRive', {
  src: 'https://cdn.discordapp.com/assets/content/ed34d9609815cf4a74f2f10677bcf6f003fd636317fbf116f8ac432b341f39ec.riv',
  defaultArtboard: 'Icon Apps',
  artboardProperties: {
    'Icon Apps': { triggerHover: 'trigger', reducedMotion: 'boolean', fill: 'color' },
    'Shapes-ButtonDark 2_nested_comp_0': {},
  },
  artboardViewModelInstances: { 'Icon Apps': ['Instance'], 'Shapes-ButtonDark 2_nested_comp_0': [] },
  artboardStateMachines: { 'Icon Apps': ['State Machine 1'], 'Shapes-ButtonDark 2_nested_comp_0': [] },
});
