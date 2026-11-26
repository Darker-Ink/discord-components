import { createRiveAnimation } from './createRiveAnimation';

export const AIVisualIdentitySmallSurfaceRive = createRiveAnimation('AIVisualIdentitySmallSurfaceRive', {
  src: 'https://cdn.discordapp.com/assets/content/72e3c4b99b3c059f834115e197341d9ca7d5d5a133ba23b6b36e8be09b0a0a12.riv',
  defaultArtboard: 'Artboard 2',
  artboardProperties: {
    'Artboard 2': {
      reducedMotion: 'boolean',
      debugMode: 'boolean',
      edgeBand: 'number',
      decayDuration: 'number',
      falloffPower: 'number',
      color: 'color',
      glyphSize: 'number',
      fpsLimit: 'number',
      centerWidth: 'number',
      radiusY: 'number',
      radiusX: 'number',
      insetRight: 'number',
      insetLeft: 'number',
      insetTop: 'number',
      insetBottom: 'number',
    },
  },
  artboardViewModelInstances: { 'Artboard 2': ['Instance'] },
  artboardStateMachines: { 'Artboard 2': ['State Machine 1'] },
});
