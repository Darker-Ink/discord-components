import { createRiveAnimation } from './createRiveAnimation';

export const TabHoverGradientRive = createRiveAnimation('TabHoverGradientRive', {
  src: 'https://cdn.discordapp.com/assets/content/068d7e953bf2dd5c6e2e63bb703245f76c75d991e7f3d14d3216f6e8175d7c79.riv',
  defaultArtboard: 'Tab Gradient Dawn',
  artboardProperties: {
    'Tab Gradient Dawn': {
      Color_GradientCenter: 'color',
      Color_InnerRing: 'color',
      Color_OuterRing: 'color',
      DimmerWidth: 'number',
      NitroVFX: 'boolean',
      posX: 'number',
    },
    'Nitro VFX': {},
  },
  artboardViewModelInstances: {
    'Tab Gradient Dawn': [
      '3rdParty 1 DarkTheme',
      '3rdParty 1 LightTheme',
      'Nitro DarkTheme',
      'Nitro LightTheme',
      'Standard DarkTheme',
      'Standard LightTheme',
    ],
    'Nitro VFX': [],
  },
  artboardStateMachines: { 'Tab Gradient Dawn': ['State Machine 1'], 'Nitro VFX': ['State Machine 1'] },
});
