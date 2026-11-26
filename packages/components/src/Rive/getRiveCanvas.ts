import type { Rive } from '@rive-app/react-canvas';

// The canvas of an animation, unless it renders offscreen (a worker's OffscreenCanvas).
export const getRiveCanvas = (rive: Rive) => {
  const { canvas } = rive as unknown as { canvas: HTMLCanvasElement | OffscreenCanvas | null };
  return canvas != null && 'ownerDocument' in canvas ? canvas : null;
};
