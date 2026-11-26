import { createRiveAnimation } from './createRiveAnimation';

export const NitroCoinRive = createRiveAnimation('NitroCoinRive', {
  src: 'https://cdn.discordapp.com/assets/content/fac02dd925a746a61291e1f604a8affff663e9d8a22cd9b21749991ff745f1f2.riv',
  defaultArtboard: 'STACKED COINS',
  artboardProperties: { 'STACKED COINS': {}, 'SINGLE COIN': {} },
  artboardViewModelInstances: { 'STACKED COINS': [], 'SINGLE COIN': [] },
  artboardStateMachines: { 'STACKED COINS': ['State Machine 1'], 'SINGLE COIN': ['State Machine 1'] },
});
