import { createRiveAnimation } from './createRiveAnimation';

export const AVSurveyFacesRive = createRiveAnimation('AVSurveyFacesRive', {
  src: 'https://cdn.discordapp.com/assets/content/087fb34ba986c4c0e0ed4973e0a2e7cc730de3a715dfed275d9533742484f3b4.riv',
  defaultArtboard: 'Emoji Neg',
  artboardProperties: { 'Emoji Neg': {}, 'Emoji Mid': {}, 'Emoji Happy': {} },
  artboardViewModelInstances: { 'Emoji Neg': [], 'Emoji Mid': [], 'Emoji Happy': [] },
  artboardStateMachines: {
    'Emoji Neg': ['State Machine'],
    'Emoji Mid': ['State Machine'],
    'Emoji Happy': ['State Machine'],
  },
});
