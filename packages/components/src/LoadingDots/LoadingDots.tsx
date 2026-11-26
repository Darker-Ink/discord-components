import { memo, useEffect, useRef, type Ref } from 'react';
import clsx from 'clsx';
import { animated, type SpringValue } from '@react-spring/web';
import { useSpring, useTransition } from '../hooks';
import { useRootElementContext } from '../RootElementContext';
import styles from './LoadingDots.module.css';

const CYCLE_START = 2.8;

const ENTER_TRANSITION = {
  config: { friction: 50, tension: 900, mass: 1 },
  unique: true,
  initial: { dotPosition: 1 },
  from: { dotPosition: 0 },
  enter: { dotPosition: 1 },
  leave: { dotPosition: 0 },
};

// Folds the ever-growing cycle value into a 0→1→0 triangle wave.
const wave = (value: number) => {
  const t = value % 2;
  return t > 1 ? 1 - (t - 1) : t;
};

export interface DotsProps {
  dotRadius: number;
  dotPosition?: SpringValue<number>;
  fill?: string;
  spacing?: number;
}

// The three circles; they pulse only while the window has focus.
export const Dots = memo(({ dotRadius, dotPosition, fill = 'currentColor', spacing = 2.5 }: DotsProps) => {
  const { focused } = useRootElementContext();
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const [{ dotCycle }] = useSpring(
    () => ({
      config: { duration: 2400 },
      from: { dotCycle: CYCLE_START },
      reset: true,
      to: async (next: (props: { dotCycle: number; immediate: boolean }) => Promise<unknown>) => {
        let cycle = CYCLE_START;
        while (mounted.current) {
          if (focused) {
            cycle += 4;
            await next({ dotCycle: cycle, immediate: false });
          } else if (cycle !== CYCLE_START) {
            cycle = CYCLE_START;
            await next({ dotCycle: cycle, immediate: true });
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      },
    }),
    'animate-always',
    [focused],
  );
  const center = (2 * dotRadius * 3 + (dotRadius / 4) * 2) / 2;
  return [0, 1, 2].map((index) => {
    const delay = 0.25 * index;
    const cx = dotRadius + dotRadius * spacing * index;
    return (
      <animated.circle
        key={index}
        cx={dotPosition != null ? dotPosition.to([0, 1], [center, cx]) : cx}
        cy={dotRadius}
        r={dotCycle
          .to((value: number) => wave(value - delay))
          .to([0, 0.4, 0.8, 1], [0.8 * dotRadius, 0.8 * dotRadius, dotRadius, dotRadius])
          .to((value: number) => (focused ? value : dotRadius))}
        fill={fill}
        style={{
          opacity: dotCycle
            .to((value: number) => wave(value - delay))
            .to([0, 0.4, 0.8, 1], [0.3, 0.3, 1, 1])
            .to((value: number) => (focused ? value : 1)),
        }}
      />
    );
  });
});

Dots.displayName = 'Dots';

export interface LoadingDotsProps {
  dotRadius: number;
  x?: number;
  y?: number;
  hide?: boolean;
  /** Uses the text color instead of white. */
  themed?: boolean;
  className?: string;
  ref?: Ref<SVGSVGElement>;
}

export const LoadingDots = memo(
  ({ dotRadius, x, y, hide = false, themed = false, className, ref }: LoadingDotsProps) => {
    const { focused } = useRootElementContext();
    const transition = useTransition(
      hide,
      { ...ENTER_TRANSITION, key: (value: boolean) => (value ? 'true' : 'false') },
      focused ? 'animate-always' : 'animate-never',
    );
    return transition(({ dotPosition }, hidden, { key }) =>
      hidden ? null : (
        <svg
          key={key}
          ref={ref}
          x={x}
          y={y}
          width={2 * dotRadius * 3 + (dotRadius / 2) * 2}
          height={2 * dotRadius}
          className={clsx(className, styles.dots, themed ? styles.themed : null)}
        >
          <animated.g style={{ opacity: dotPosition.to((value: number) => Math.min(1, Math.max(value, 0))) }}>
            <Dots dotRadius={dotRadius} dotPosition={dotPosition} />
          </animated.g>
        </svg>
      ),
    );
  },
);

LoadingDots.displayName = 'LoadingDots';
