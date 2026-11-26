import { createRiveAnimation } from './createRiveAnimation';

export const SettingsRive = createRiveAnimation('SettingsRive', {
  src: 'https://cdn.discordapp.com/assets/content/fc07c76f16c51e32dd37d78bbc9f751da250e2c2b2411fcd56d9d42aea3a0594.riv',
  defaultArtboard: 'Icon Settings',
  artboardProperties: { 'Icon Settings': { reducedMotion: 'boolean', fill: 'color' } },
  artboardViewModelInstances: { 'Icon Settings': ['Instance'] },
  artboardStateMachines: { 'Icon Settings': ['State Machine 1'] },
});
