import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

// Tracks whether a nested container fills its parent, so sections only cap their accessory's width when the
// layout is width-limited (the client's ComponentLayoutLimitContext).
interface LayoutLimit {
  isParentWidthLimited: boolean;
  parentContainerInnerWidth: number;
}

const ComponentLayoutContext = createContext<LayoutLimit | null>(null);

ComponentLayoutContext.displayName = 'ComponentLayoutContext';

const useLayoutLimit = () => {
  const value = useContext(ComponentLayoutContext);
  if (value == null) throw new Error('Cannot use the ComponentLayoutLimitContext system when not within the context');
  return value;
};

/** Measures an element: `[ref, outer width incl. margins, inner width excl. padding and borders]`. */
export const useMeasuredWidth = <T extends HTMLElement = HTMLDivElement>(
  measureInner = false,
): [RefObject<T | null>, number, number] => {
  const ref = useRef<T>(null);
  const [outer, setOuter] = useState(0);
  const [inner, setInner] = useState(0);
  useLayoutEffect(() => {
    if (ref.current == null) return;
    const observer = new ResizeObserver(() => {
      const node = ref.current!;
      const width = node.getBoundingClientRect().width;
      const style = getComputedStyle(node);
      setOuter(width + (parseFloat(style.marginLeft) + parseFloat(style.marginRight)));
      if (measureInner)
        setInner(
          width -
            (parseFloat(style.paddingLeft) +
              parseFloat(style.paddingRight) +
              parseFloat(style.borderLeftWidth) +
              parseFloat(style.borderRightWidth)),
        );
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measureInner]);
  return [ref, outer, inner];
};

export const ComponentLayoutRoot = ({
  containerInnerWidth,
  children,
}: {
  containerInnerWidth: number;
  children: ReactNode;
}) => {
  const value = useMemo(
    () => ({ isParentWidthLimited: true, parentContainerInnerWidth: containerInnerWidth }),
    [containerInnerWidth],
  );
  return <ComponentLayoutContext.Provider value={value}>{children}</ComponentLayoutContext.Provider>;
};

ComponentLayoutRoot.displayName = 'ComponentLayoutRoot';

const NestedContainer = ({
  containerOuterWidth,
  containerInnerWidth,
  children,
}: {
  containerOuterWidth: number;
  containerInnerWidth: number;
  children: ReactNode;
}) => {
  const { isParentWidthLimited, parentContainerInnerWidth } = useLayoutLimit();
  const limited = isParentWidthLimited && parentContainerInnerWidth === containerOuterWidth;
  const value = useMemo(
    () => ({ isParentWidthLimited: limited, parentContainerInnerWidth: containerInnerWidth }),
    [limited, containerInnerWidth],
  );
  return <ComponentLayoutContext.Provider value={value}>{children}</ComponentLayoutContext.Provider>;
};

NestedContainer.displayName = 'NestedContainer';

export const AutoMeasuredNestedContainer = ({
  children,
}: {
  children: (ref: RefObject<HTMLDivElement | null>) => ReactNode;
}) => {
  const [ref, outer, inner] = useMeasuredWidth(true);
  return (
    <NestedContainer containerOuterWidth={outer} containerInnerWidth={inner}>
      {children(ref)}
    </NestedContainer>
  );
};

AutoMeasuredNestedContainer.displayName = 'AutoMeasuredNestedContainer';

/** Whether an element of this outer width fills a width-limited parent. */
export const useIsWidthLimited = (outerWidth: number) => {
  const { isParentWidthLimited, parentContainerInnerWidth } = useLayoutLimit();
  return isParentWidthLimited && parentContainerInnerWidth === outerWidth;
};
