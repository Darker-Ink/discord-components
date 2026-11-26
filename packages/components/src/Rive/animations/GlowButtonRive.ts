import { createRiveAnimation } from './createRiveAnimation';

export const GlowButtonRive = createRiveAnimation('GlowButtonRive', {
  src: 'https://cdn.discordapp.com/assets/content/bd712b6e0f8e5ee33f7f102f7bb02e40850fe06ccdf425523f3093c838ef6a28.riv',
  defaultArtboard: 'HoverDarkmode',
  artboardProperties: {
    HoverDarkmode: { posy: 'number', posx: 'number' },
    ButtonFillDarkmode: {},
    BaseGlowRemapped: {},
    BaseGlow: {},
    HoverLightmode: { posy: 'number', posx: 'number' },
    ButtonFillLightmode: {},
  },
  artboardViewModelInstances: {
    HoverDarkmode: ['Instance'],
    ButtonFillDarkmode: [],
    BaseGlowRemapped: [],
    BaseGlow: [],
    HoverLightmode: ['Instance'],
    ButtonFillLightmode: [],
  },
  artboardStateMachines: {
    HoverDarkmode: ['Main State Machine'],
    ButtonFillDarkmode: ['Main State Machine'],
    BaseGlowRemapped: ['State Machine 1'],
    BaseGlow: ['Main State Machine'],
    HoverLightmode: ['Main State Machine'],
    ButtonFillLightmode: ['Main State Machine'],
  },
});
