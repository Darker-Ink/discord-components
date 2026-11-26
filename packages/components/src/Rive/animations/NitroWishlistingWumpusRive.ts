import { createRiveAnimation } from './createRiveAnimation';

export const NitroWishlistingWumpusRive = createRiveAnimation('NitroWishlistingWumpusRive', {
  src: 'https://cdn.discordapp.com/assets/content/7d79185ce3c3038667277ee16ba8cb835b1b012f20b92ef5428b9166c5347c59.riv',
  defaultArtboard: 'Nitro Wishlist',
  artboardProperties: { 'Nitro Wishlist': { reducedMotion: 'boolean' } },
  artboardViewModelInstances: { 'Nitro Wishlist': ['Instance'] },
  artboardStateMachines: { 'Nitro Wishlist': ['State Machine 1'] },
});
