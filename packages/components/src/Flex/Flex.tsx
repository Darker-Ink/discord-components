import {
  Children,
  cloneElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './Flex.module.css';
import utilities from './FlexUtilities.module.css';

// Discord's legacy flexbox helpers. Like LegacyButton, the option values are class names.
export const FlexDirection = {
  VERTICAL: utilities.vertical,
  HORIZONTAL: styles.horizontal,
  HORIZONTAL_REVERSE: styles.horizontalReverse,
} as const;

export const FlexJustify = {
  START: utilities.justifyStart,
  END: utilities.justifyEnd,
  CENTER: utilities.justifyCenter,
  BETWEEN: utilities.justifyBetween,
  AROUND: utilities.justifyAround,
} as const;

export const FlexAlign = {
  START: utilities.alignStart,
  END: utilities.alignEnd,
  CENTER: utilities.alignCenter,
  STRETCH: utilities.alignStretch,
  BASELINE: utilities.alignBaseline,
} as const;

export const FlexWrap = {
  NO_WRAP: utilities.noWrap,
  WRAP: utilities.wrap,
  WRAP_REVERSE: utilities.wrapReverse,
} as const;

export type FlexDirectionClass = (typeof FlexDirection)[keyof typeof FlexDirection];
export type FlexJustifyClass = (typeof FlexJustify)[keyof typeof FlexJustify];
export type FlexAlignClass = (typeof FlexAlign)[keyof typeof FlexAlign];
export type FlexWrapClass = (typeof FlexWrap)[keyof typeof FlexWrap];

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: FlexDirectionClass;
  justify?: FlexJustifyClass;
  align?: FlexAlignClass;
  wrap?: FlexWrapClass;
  shrink?: CSSProperties['flexShrink'];
  grow?: CSSProperties['flexGrow'];
  basis?: CSSProperties['flexBasis'];
}

export const Flex = ({
  children,
  className,
  direction = FlexDirection.HORIZONTAL,
  justify = FlexJustify.START,
  align = FlexAlign.STRETCH,
  wrap = FlexWrap.NO_WRAP,
  shrink = 1,
  grow = 1,
  basis = 'auto',
  style,
  ...rest
}: FlexProps) => (
  <div
    style={{ flexShrink: shrink, flexGrow: grow, flexBasis: basis, ...style }}
    className={clsx(styles.flex, direction, justify, align, wrap, className)}
    {...rest}
  >
    {children}
  </div>
);

Flex.displayName = 'Flex';

export interface FlexChildProps extends HTMLAttributes<HTMLElement> {
  shrink?: CSSProperties['flexShrink'];
  grow?: CSSProperties['flexGrow'];
  basis?: CSSProperties['flexBasis'];
  // Wrap the children in a div instead of merging the flex styles into a single child.
  wrap?: boolean;
}

interface MergeableProps {
  className?: string;
  style?: CSSProperties;
}

const FlexChild = ({
  children,
  className,
  shrink = 1,
  grow = 1,
  basis = 'auto',
  style,
  wrap = false,
  ...rest
}: FlexChildProps) => {
  const childClassName = className ?? styles.flexChild;
  const props = {
    className: childClassName,
    style: { flexGrow: grow, flexShrink: shrink, flexBasis: basis, ...style },
    ...rest,
  };
  if (!wrap && typeof children !== 'string' && Children.count(children) === 1) {
    const child = Children.only(children) as ReactElement<MergeableProps>;
    return cloneElement(child, {
      ...props,
      style: { ...props.style, ...child.props.style },
      className: clsx(child.props.className, childClassName),
    });
  }
  return <div {...props}>{children as ReactNode}</div>;
};

FlexChild.displayName = 'Flex.Child';

Flex.Child = FlexChild;
Flex.Direction = FlexDirection;
Flex.Align = FlexAlign;
Flex.Justify = FlexJustify;
Flex.Wrap = FlexWrap;
