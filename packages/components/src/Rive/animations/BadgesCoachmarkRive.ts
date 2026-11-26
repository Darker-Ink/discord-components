import { createRiveAnimation } from './createRiveAnimation';

export const BadgesCoachmarkRive = createRiveAnimation('BadgesCoachmarkRive', {
  src: 'https://cdn.discordapp.com/assets/content/478c4e2368b95b01e5322800305a95640e4044e34f0da08b51845bc91b51526e.riv',
  defaultArtboard: 'Badges Coachmark',
  artboardProperties: { 'Badges Coachmark': { on: 'boolean', reducedMotion: 'boolean' } },
  artboardViewModelInstances: { 'Badges Coachmark': ['Instance'] },
  artboardStateMachines: { 'Badges Coachmark': ['State Machine 1'] },
});
