import { createRiveAnimation } from './createRiveAnimation';

export const PulseGradientRive = createRiveAnimation('PulseGradientRive', {
  src: 'https://cdn.discordapp.com/assets/content/5ff46e6a38cbffb1450e062ca9e8dcabf8452f6890907b70dc0489fb3ec489de.riv',
  defaultArtboard: 'Artboard',
  artboardProperties: { Artboard: {} },
  artboardViewModelInstances: { Artboard: [] },
  artboardStateMachines: { Artboard: ['stateMachine'] },
});
