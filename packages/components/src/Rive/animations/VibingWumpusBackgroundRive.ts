import { createRiveAnimation } from './createRiveAnimation';

export const VibingWumpusBackgroundRive = createRiveAnimation('VibingWumpusBackgroundRive', {
  src: 'https://cdn.discordapp.com/assets/content/905fd829443af468087dff86c879838d5fc2dba35ccdaa856f6481b1af1d5c74.riv',
  defaultArtboard: 'Wumpus',
  artboardProperties: { Wumpus: {}, Background: {} },
  artboardViewModelInstances: { Wumpus: [], Background: [] },
  artboardStateMachines: {
    Wumpus: ['Auto Generated State Machine'],
    Background: ['State Machine_ALT', 'State Machine 1'],
  },
});
