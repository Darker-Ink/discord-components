// Discord reads these from platform.js; only the product and OS family matter here.
const TABLET_PRODUCTS = /\b(iPad|Kindle|Kindle Fire|Nook|PlayBook)\b|Silk/;
const MOBILE_OS = /Android|iPhone|iPod|iPad|Windows Phone/;

const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

const isIPadOS =
  typeof navigator !== 'undefined' &&
  navigator.platform === 'MacIntel' &&
  (navigator as Navigator & { standalone?: boolean }).standalone !== undefined &&
  navigator.maxTouchPoints > 1;

export const isTablet = TABLET_PRODUCTS.test(userAgent) || isIPadOS;

export const isMobile = !isTablet && MOBILE_OS.test(userAgent);
