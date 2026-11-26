import { createRiveAnimation } from './createRiveAnimation';

export const WaveformRive = createRiveAnimation('WaveformRive', {
  src: 'https://cdn.discordapp.com/assets/content/0f3523839791b44911dc38f385a0e19425660f7f8ab266f4a5f57078d7ded04b.riv',
  defaultArtboard: 'Icon Waveform',
  artboardProperties: {
    'Icon Waveform': { reducedMotion: 'boolean', fill: 'color', on: 'boolean' },
    Lottie_HoverOnOff_NoiseSuppression_nested_comp_2: {},
  },
  artboardViewModelInstances: { 'Icon Waveform': ['Off', 'On'], Lottie_HoverOnOff_NoiseSuppression_nested_comp_2: [] },
  artboardStateMachines: { 'Icon Waveform': ['State Machine 1'], Lottie_HoverOnOff_NoiseSuppression_nested_comp_2: [] },
});
