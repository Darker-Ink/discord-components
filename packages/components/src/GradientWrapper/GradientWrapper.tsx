import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import clsx from 'clsx';
import styles from './GradientWrapper.module.css';

export type GradientColorName = 'purple' | 'blue' | 'green' | 'pink' | 'nitro-pink' | 'nitro-green';

export interface GradientColorStops {
  start: { css: string };
  end: { css: string };
}

export interface GradientWrapperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  color?: GradientColorName | GradientColorStops;
  // How far from the bottom the gradient ends, as a fraction of the height.
  offsetBottom?: number;
  ref?: Ref<HTMLDivElement>;
}

// A container with an expressive gradient wash behind its content, fading out towards the bottom.
export const GradientWrapper = ({
  color = 'purple',
  offsetBottom = 0,
  children,
  ref,
  ...props
}: GradientWrapperProps) => {
  const isCustom = typeof color === 'object' && color != null;
  return (
    <div
      ref={ref}
      {...props}
      className={clsx(styles.container, isCustom ? undefined : styles[color], props.className)}
      style={
        {
          ...props.style,
          ...(isCustom
            ? { '--custom-gradient-color-start': color.start.css, '--custom-gradient-color-end': color.end.css }
            : {}),
          '--custom-gradient-offset-bottom': `${100 * offsetBottom}%`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
};

GradientWrapper.displayName = 'GradientWrapper';
