import { createRiveAnimation } from './createRiveAnimation';

export const CheckpointIntroRive = createRiveAnimation('CheckpointIntroRive', {
  src: 'https://cdn.discordapp.com/assets/content/756c8e37a14fc267712502cc0892be86b2e98d9132fe075f9ba75fd9e9a0aa48.riv',
  defaultArtboard: 'Checkpoint Intro Desktop',
  artboardProperties: {
    'Checkpoint Intro Desktop': {
      reducedMotion: 'boolean',
      Subtitle: 'string',
      'StartButton Pressed': 'boolean',
      StartButton: 'string',
    },
    Globe: { reducedMotion: 'boolean', Subtitle: 'string', 'StartButton Pressed': 'boolean', StartButton: 'string' },
    'Globe Single Line': {},
    'Looping Checkboard': {},
    CheckRow: {},
    Entry: { reducedMotion: 'boolean', Subtitle: 'string', 'StartButton Pressed': 'boolean', StartButton: 'string' },
    'Start Button': {
      reducedMotion: 'boolean',
      Subtitle: 'string',
      'StartButton Pressed': 'boolean',
      StartButton: 'string',
    },
  },
  artboardViewModelInstances: {
    'Checkpoint Intro Desktop': ['Instance'],
    Globe: ['Instance'],
    'Globe Single Line': [],
    'Looping Checkboard': [],
    CheckRow: [],
    Entry: ['Instance'],
    'Start Button': ['Instance'],
  },
  artboardStateMachines: {
    'Checkpoint Intro Desktop': ['State Machine 1'],
    Globe: ['State Machine 1'],
    'Globe Single Line': ['State Machine 1'],
    'Looping Checkboard': ['State Machine 1'],
    CheckRow: ['State Machine 1'],
    Entry: ['State Machine 1'],
    'Start Button': ['State Machine 1'],
  },
});
