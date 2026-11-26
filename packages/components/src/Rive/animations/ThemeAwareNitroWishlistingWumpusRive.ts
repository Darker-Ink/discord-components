import { createRiveAnimation } from './createRiveAnimation';

export const ThemeAwareNitroWishlistingWumpusRive = createRiveAnimation('ThemeAwareNitroWishlistingWumpusRive', {
  src: 'https://cdn.discordapp.com/assets/content/53eb00aa300595b54d999e60d501f621ad4399918c568561f74b536b6f37c0ab.riv',
  defaultArtboard: 'Nitro Wishlist',
  artboardProperties: { 'Nitro Wishlist': { reducedMotion: 'boolean', logoColor: 'color' } },
  artboardViewModelInstances: { 'Nitro Wishlist': ['Instance'] },
  artboardStateMachines: { 'Nitro Wishlist': ['State Machine 1'] },
});
