import type { ComponentProps } from 'react';
import { GlowButtonRive } from '../Rive/animations/GlowButtonRive';

export type ExpressiveButtonRiveProps = ComponentProps<typeof GlowButtonRive>;
export type ExpressiveButtonArtboard = NonNullable<ExpressiveButtonRiveProps['artboard']>;

/** The glow, hover and fill animations layered behind expressive buttons (Discord's GlowButtonRive). */
export const ExpressiveButtonRive = GlowButtonRive;
