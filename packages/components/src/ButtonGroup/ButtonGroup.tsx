import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { ButtonSize } from '../Button';
import { ButtonGroupContext } from '../Button/ButtonGroupContext';
import { Stack, type StackAlign, type StackDirection, type StackJustify, type StackPadding } from '../Stack';

export interface ButtonGroupProps {
  size?: ButtonSize;
  direction?: StackDirection;
  justify?: StackJustify;
  align?: StackAlign;
  padding?: StackPadding;
  className?: string;
  children?: ReactNode;
  /** Lets buttons wrap; a horizontal group whose labels get truncated stacks vertically instead. */
  wrap?: boolean;
  fullWidth?: boolean;
  fullWidthContainer?: boolean;
}

// Becomes true (and stays true) once any button label in the group is cut off.
const useHasTruncatedLabel = (ref: RefObject<HTMLElement | null>, direction: StackDirection, wrap: boolean) => {
  const [truncated, setTruncated] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (ref.current == null || !wrap || direction.includes('vertical')) return;
    const check = () => {
      const labels = Array.from(
        ref.current?.querySelectorAll('[data-mana-component="button"] [data-text-variant]') ?? [],
      );
      const isTruncated = labels.some((label) => label.scrollWidth > label.clientWidth);
      setTruncated((previous) => previous || isTruncated);
    };
    const observer = new MutationObserver(check);
    check();
    observer.observe(ref.current, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [ref, direction, wrap]);
  return truncated;
};

export const ButtonGroup = ({
  size = 'md',
  direction = 'horizontal',
  justify,
  align,
  padding,
  className,
  children,
  wrap = true,
  fullWidth = false,
  fullWidthContainer = false,
}: ButtonGroupProps) => {
  const context = useMemo(() => ({ size, fullWidth }), [size, fullWidth]);
  const ref = useRef<HTMLElement>(null);
  const truncated = useHasTruncatedLabel(ref, direction, wrap);
  const resolvedDirection = truncated ? (direction.replace('horizontal', 'vertical') as StackDirection) : direction;
  return (
    <Stack
      direction={resolvedDirection}
      gap={8}
      justify={justify}
      align={align}
      wrap={wrap}
      padding={padding}
      className={className}
      fullWidth={fullWidthContainer || fullWidth}
      ref={ref}
    >
      <ButtonGroupContext.Provider value={context}>{children}</ButtonGroupContext.Provider>
    </Stack>
  );
};

ButtonGroup.displayName = 'ButtonGroup';
