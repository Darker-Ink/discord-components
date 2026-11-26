import { createRiveAnimation } from './createRiveAnimation';

export const WandAndSparklesRive = createRiveAnimation('WandAndSparklesRive', {
  src: 'https://cdn.discordapp.com/assets/content/026e9c119f280f5edf3ba486ba20c26e21c5dac14dfedd0a238373298bf289f0.riv',
  defaultArtboard: 'Surprise Me',
  artboardProperties: { 'Surprise Me': { fill: 'color' } },
  artboardViewModelInstances: { 'Surprise Me': [''] },
  artboardStateMachines: { 'Surprise Me': ['State Machine 1'] },
});
