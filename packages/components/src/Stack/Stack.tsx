import type { CSSProperties, ElementType, HTMLAttributes, Ref } from 'react';
import clsx from 'clsx';
import styles from './Stack.module.css';

// The `--space-*` scale from the design tokens.
export type StackSpace =
  | 0
  | 4
  | 6
  | 8
  | 10
  | 12
  | 16
  | 20
  | 24
  | 26
  | 30
  | 32
  | 40
  | 48
  | 64
  | 80
  | 96
  | 128
  | 160
  | 192
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl';

export type StackDirection = 'vertical' | 'vertical-reverse' | 'horizontal' | 'horizontal-reverse';
export type StackAlign = 'start' | 'end' | 'center' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'end' | 'center' | 'space-around' | 'space-between';
export type StackPadding = StackSpace | Partial<Record<'top' | 'right' | 'bottom' | 'left', StackSpace>>;

export interface StackProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  gap?: StackSpace;
  direction?: StackDirection;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  padding?: StackPadding;
  fullWidth?: boolean;
  ref?: Ref<HTMLElement>;
}

const space = (value: StackSpace) => `var(--space-${value})`;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const paddingStyle = (padding: StackPadding): CSSProperties =>
  typeof padding === 'number' || typeof padding === 'string'
    ? { padding: space(padding) }
    : Object.fromEntries(Object.entries(padding).map(([side, value]) => [`padding${capitalize(side)}`, space(value)]));

export const Stack = ({
  as: Component = 'div',
  gap = 8,
  direction = 'vertical',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  padding = 0,
  fullWidth = true,
  style,
  className,
  children,
  ref,
  ...props
}: StackProps) => (
  <Component
    ref={ref}
    data-align={align}
    data-justify={justify}
    data-direction={direction}
    data-wrap={wrap}
    data-full-width={fullWidth}
    className={clsx(styles.stack, className)}
    style={{ ...style, gap: space(gap), ...paddingStyle(padding) }}
    {...props}
  >
    {children}
  </Component>
);

Stack.displayName = 'Stack';
