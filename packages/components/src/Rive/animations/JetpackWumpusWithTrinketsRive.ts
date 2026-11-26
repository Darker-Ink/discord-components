import { createRiveAnimation } from './createRiveAnimation';

export const JetpackWumpusWithTrinketsRive = createRiveAnimation('JetpackWumpusWithTrinketsRive', {
  src: 'https://cdn.discordapp.com/assets/content/3889308dc0ac18c0008d95e338fff015d0d1c4070c161205ad826896c82af71c.riv',
  defaultArtboard: 'Base',
  artboardProperties: {
    Base: { EntryTrigger: 'trigger', ExitTrigger: 'trigger', PosX: 'number', PosY: 'number' },
    'Nitro Illustration — Star': {},
    'Nitro Illustration — Key': {},
    'Nitro Illustration — Battery': {},
    'Nitro Illustration — Box': {},
    Wumpus: {},
    'Nitro Illustration — Power Jar': {},
    'Nitro Illustration — Lightning': {},
    'Nitro Illustration — Spaceship': {},
  },
  artboardViewModelInstances: {
    Base: ['Instance'],
    'Nitro Illustration — Star': [],
    'Nitro Illustration — Key': [],
    'Nitro Illustration — Battery': [],
    'Nitro Illustration — Box': [],
    Wumpus: [],
    'Nitro Illustration — Power Jar': [],
    'Nitro Illustration — Lightning': [],
    'Nitro Illustration — Spaceship': [],
  },
  artboardStateMachines: {
    Base: ['State Machine 1'],
    'Nitro Illustration — Star': ['State Machine 1'],
    'Nitro Illustration — Key': ['State Machine 1'],
    'Nitro Illustration — Battery': ['State Machine 1'],
    'Nitro Illustration — Box': ['State Machine 1'],
    Wumpus: ['State Machine 1'],
    'Nitro Illustration — Power Jar': ['State Machine 1'],
    'Nitro Illustration — Lightning': ['State Machine 1'],
    'Nitro Illustration — Spaceship': ['State Machine 1'],
  },
});
