import { createRiveAnimation } from './createRiveAnimation';

export const OrbsIllustration_HandsRive = createRiveAnimation('OrbsIllustration_HandsRive', {
  src: 'https://cdn.discordapp.com/assets/content/1f36d546a4ac8054dbd6ab0384a6aa4bf3c574c8b435c58e0e4e8d922a0a4cce.riv',
  defaultArtboard: 'Bounties Illo Hands',
  artboardProperties: {
    'Bounties Illo Hands': { reducedMotion: 'boolean' },
    'Orb shine': { reducedMotion: 'boolean' },
  },
  artboardViewModelInstances: { 'Bounties Illo Hands': ['Instance'], 'Orb shine': ['Instance'] },
  artboardStateMachines: { 'Bounties Illo Hands': ['State Machine 1'], 'Orb shine': ['SM_Orb'] },
});
