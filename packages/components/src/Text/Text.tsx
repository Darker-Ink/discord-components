import type { CSSProperties, ElementType, HTMLAttributes, Ref } from 'react';
import clsx from 'clsx';
import { SemanticColors, type SemanticColor } from '@discord-mana/tokens';
import styles from './Text.module.css';
import type { TextVariant } from './textVariants';
import variantStyles from './TextVariants.module.css';

export type TextColor = SemanticColor | 'currentColor' | 'none';

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  variant: TextVariant;
  tag?: ElementType;
  selectable?: boolean;
  lineClamp?: number;
  color?: TextColor;
  tabularNumbers?: boolean;
  scaleFontToUserSetting?: boolean;
  ref?: Ref<HTMLElement>;
}

const semanticColors = new Set<string>(SemanticColors);

const resolveColor = (color: TextColor) => {
  if (color === 'currentColor') return 'currentColor';
  if (color === 'none' || !semanticColors.has(color)) return undefined;
  return `var(--${color})`;
};

export const Text = ({
  variant,
  tag: Tag = 'div',
  selectable = false,
  className,
  lineClamp,
  color,
  tabularNumbers = false,
  scaleFontToUserSetting = false,
  ref,
  ...props
}: TextProps) => {
  let lineClampClassName: string | undefined;
  let lineClampStyle: CSSProperties = {};
  if (lineClamp != null) {
    if (lineClamp === 1) {
      lineClampClassName = styles.lineClamp1;
    } else {
      lineClampClassName = styles.lineClamp2Plus;
      lineClampStyle = { lineClamp, WebkitLineClamp: lineClamp };
    }
  }

  const style: CSSProperties = {
    color: color !== undefined ? resolveColor(color) : undefined,
    ...lineClampStyle,
    ...props.style,
  };

  return (
    <Tag
      ref={ref}
      className={clsx(
        {
          [styles.defaultColor]: color === undefined,
          [styles.selectable]: selectable,
          [styles.tabularNumbers]: tabularNumbers,
          [variantStyles.fontScaling]: scaleFontToUserSetting,
        },
        lineClampClassName,
        variantStyles[variant],
        className,
      )}
      {...props}
      style={Object.values(style).filter(Boolean).length > 0 ? style : undefined}
      data-text-variant={variant}
    />
  );
};

Text.displayName = 'Text';
