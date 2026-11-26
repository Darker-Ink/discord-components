import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { Text, type TextVariant } from '../Text';
import styles from './MarqueeText.module.css';

export interface MarqueeTextProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: TextVariant;
}

/**
 * Text truncated with an ellipsis that scrolls to reveal the rest while its row (an element with
 * `MarqueeText.rowClassName`) is hovered or has `data-marquee-active="true"`.
 */
export const MarqueeText = ({ children, className, style, variant = 'body-sm/medium' }: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState<number | null>(null);
  const measure = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (container == null || text == null) return;
    const amount = text.scrollWidth - container.clientWidth;
    setOverflow(amount > 0 ? amount : null);
  }, []);
  useResizeObserver(containerRef, measure, [children]);
  return (
    <div
      ref={containerRef}
      className={clsx(styles.container, className)}
      data-marquee-overflow={overflow != null}
      style={style}
    >
      <Text
        variant={variant}
        color="none"
        tag="span"
        ref={textRef}
        className={styles.text}
        style={
          overflow != null
            ? ({
                '--custom-marquee-overflow': `${overflow}px`,
                '--custom-marquee-duration': `${overflow / 60}s`,
              } as CSSProperties)
            : undefined
        }
      >
        {children}
      </Text>
    </div>
  );
};

MarqueeText.displayName = 'MarqueeText';
MarqueeText.rowClassName = styles.row;
