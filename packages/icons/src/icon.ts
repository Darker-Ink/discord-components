import type { ComponentProps } from 'react';

export const IconSizes = {
  xxs: 12,
  xs: 16,
  sm: 18,
  md: 24,
  lg: 32,
  custom: undefined,
  refresh_sm: 20,
} as const;

export type IconSize = keyof typeof IconSizes;

/** A CSS color string, or a color token object (anything with a `css` value such as `var(--icon-strong)`). */
export type IconColor = string | { css: string };

type ColorProp<Name extends string> = Name extends `${string}Class` ? string : IconColor;

/**
 * Props of an icon. `Colors` lists the color props the icon destructures (`color`, `colorClass`,
 * `secondaryColor`, …); everything else is spread onto the `<svg>`.
 */
export type IconProps<Colors extends string = never> = Omit<ComponentProps<'svg'>, 'width' | 'height' | Colors> & {
  /** `custom` uses `width` and `height`; any other size ignores them. */
  size?: IconSize;
  width?: number | string;
  height?: number | string;
} & { [Name in Colors]?: ColorProp<Name> };

export const getIconSize = (size: IconSize) => {
  if (size === 'custom') return null;
  const value = IconSizes[size];
  return { width: value, height: value };
};

export const resolveIconColor = (color: IconColor) => (typeof color === 'string' ? color : color.css);

// Icons are decorative unless labeled.
export const iconA11yProps = <Props extends Pick<ComponentProps<'svg'>, 'aria-label' | 'aria-hidden' | 'role'>>(
  props: Props,
) => ({
  ...props,
  'aria-hidden': props['aria-hidden'] ?? props['aria-label'] == null,
  role: props.role ?? 'img',
});
