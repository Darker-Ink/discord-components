import { createRiveAnimation } from './createRiveAnimation';

export const VibingWumpusRive = createRiveAnimation('VibingWumpusRive', {
  src: 'https://cdn.discordapp.com/assets/content/354f49a6e211c21e698aad050121ad8b21a568e18f0e117346fded7089ebc51b.riv',
  defaultArtboard: 'Wumpus',
  artboardProperties: { Wumpus: {}, Background: {} },
  artboardViewModelInstances: { Wumpus: [], Background: [] },
  artboardStateMachines: { Wumpus: ['SM_Vibing_Wumpus'], Background: ['State Machine_ALT', 'State Machine 1'] },
});
