import { createRiveAnimation } from './createRiveAnimation';

export const ServerHubPerkRive = createRiveAnimation('ServerHubPerkRive', {
  src: 'https://cdn.discordapp.com/assets/content/67d52916de05ae5374f3644778bee66c05ae690f07026521e7d55ff97dd80850.riv',
  defaultArtboard: 'Server Hub Perk',
  artboardProperties: { 'Server Hub Perk': { on: 'boolean', reducedMotion: 'boolean' }, _Asset_Pencil: {} },
  artboardViewModelInstances: { 'Server Hub Perk': ['Instance'], _Asset_Pencil: [] },
  artboardStateMachines: { 'Server Hub Perk': ['State Machine 1'], _Asset_Pencil: ['State Machine 1'] },
});
