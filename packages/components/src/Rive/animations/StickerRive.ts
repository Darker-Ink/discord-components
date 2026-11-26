import { createRiveAnimation } from './createRiveAnimation';

export const StickerRive = createRiveAnimation('StickerRive', {
  src: 'https://cdn.discordapp.com/assets/content/a216dbb295723b9f8ac54d1cd10511fac12a2fb99fa73c04a5e4f84c3adbe8ba.riv',
  defaultArtboard: 'Icon Sticker',
  artboardProperties: {
    'Icon Sticker': { reducedMotion: 'boolean', fill: 'color' },
    Lottie_HoverOn_Sticker_nested_comp_0: {},
  },
  artboardViewModelInstances: { 'Icon Sticker': ['Instance'], Lottie_HoverOn_Sticker_nested_comp_0: [] },
  artboardStateMachines: { 'Icon Sticker': ['State Machine 1'], Lottie_HoverOn_Sticker_nested_comp_0: [] },
});
