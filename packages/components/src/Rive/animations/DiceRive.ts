import { createRiveAnimation } from './createRiveAnimation';

export const DiceRive = createRiveAnimation('DiceRive', {
  src: 'https://cdn.discordapp.com/assets/content/b02469d463aaa6b145fab2e70084146735951008acc87c49261038a2e5864994.riv',
  defaultArtboard: 'Icon Dice',
  artboardProperties: { 'Icon Dice': { fill: 'color', muted: 'boolean' } },
  artboardViewModelInstances: { 'Icon Dice': [''] },
  artboardStateMachines: { 'Icon Dice': ['State Machine 1'] },
});
