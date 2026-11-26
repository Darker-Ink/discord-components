import { createRiveAnimation } from './createRiveAnimation';

export const BoostThisServerRive = createRiveAnimation('BoostThisServerRive', {
  src: 'https://cdn.discordapp.com/assets/content/4e02ee0451e556464805350795ce905d3f1fae8d476d249189c0d236fd312029.riv',
  defaultArtboard: 'Boost Server',
  artboardProperties: {
    'Boost Server': { reducedMotion: 'boolean' },
    'Boost Crystal': { reducedMotion: 'boolean' },
    'Crystal Side B': {},
    'Crystal Side A': {},
    'Boost Saved': { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: {
    'Boost Server': ['Instance'],
    'Boost Crystal': ['Instance'],
    'Crystal Side B': [],
    'Crystal Side A': [],
    'Boost Saved': ['Instance'],
  },
  artboardStateMachines: {
    'Boost Server': ['State Machine 1'],
    'Boost Crystal': ['State Machine 1'],
    'Crystal Side B': ['State Machine 1'],
    'Crystal Side A': ['State Machine 1'],
    'Boost Saved': ['State Machine 1'],
  },
});
