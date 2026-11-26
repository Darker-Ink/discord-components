import { createRiveAnimation } from './createRiveAnimation';

export const BadgeUnlockPulseRive = createRiveAnimation('BadgeUnlockPulseRive', {
  src: 'https://cdn.discordapp.com/assets/content/f9902a37a9e65cbeee19648efc6501868d5394d331eb8e8fff9405e9b42adbad.riv',
  defaultArtboard: 'Web',
  artboardProperties: { Web: { fill: 'color' }, Mobile: { fill: 'color' } },
  artboardViewModelInstances: { Web: ['Instance'], Mobile: ['Instance'] },
  artboardStateMachines: { Web: ['State Machine 1'], Mobile: ['State Machine 1'] },
});
