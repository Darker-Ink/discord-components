import { createRiveAnimation } from './createRiveAnimation';

export const GiftRive = createRiveAnimation('GiftRive', {
  src: 'https://cdn.discordapp.com/assets/content/8e353d3c072ce1dabfe758985f12a0a7b2648fb0ea4d1451ce341be8ac045e8b.riv',
  defaultArtboard: 'Icon Gift',
  artboardProperties: { 'Icon Gift': { reducedMotion: 'boolean', fill: 'color' } },
  artboardViewModelInstances: { 'Icon Gift': ['Instance'] },
  artboardStateMachines: { 'Icon Gift': ['State Machine 1'] },
});
