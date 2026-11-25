import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type MouseEvent, type Ref } from 'react';
import clsx from 'clsx';
import { animated, useSpringValue } from '@react-spring/web';
import { formatDuration } from './formatDuration';
import styles from './MediaBar.module.css';

export const MediaBarTypes = {
  DURATION: 'DURATION',
  VOLUME: 'VOLUME',
} as const;

export type MediaBarType = (typeof MediaBarTypes)[keyof typeof MediaBarTypes];

// The client animates the grabber with a React Native style spring (friction 14, tension 200).
const SPRING_CONFIG = { friction: 14, tension: 200 };

export interface MediaBarHandle {
  /** Moves the progress to `value` (0–1), springing to it unless `animate` is false. */
  setGrabber: (value: number, animate?: boolean) => void;
}

export interface MediaBarProps {
  type: MediaBarType;
  /** Total duration in seconds (for the hover bubble); for volume bars, the max value. */
  value: number;
  buffers?: [start: number, length: number][];
  className?: string;
  sliderClassName?: string;
  onDrag: (value: number, type: MediaBarType) => void;
  onDragStart: (type: MediaBarType) => void;
  onDragEnd: () => void;
  currentWindow?: Window;
  ref?: Ref<MediaBarHandle>;
}

const toPercent = (value: number) => `${value * 100}%`;

/** Discord's seek / volume bar: buffered ranges, hover preview, a grabber and a time bubble. */
export const MediaBar = ({
  type,
  value,
  buffers,
  className,
  sliderClassName,
  onDrag,
  onDragStart,
  onDragEnd,
  currentWindow = window,
  ref,
}: MediaBarProps) => {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const valueRef = useRef(value);
  useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  // The bubble follows the pointer while hovering and the grabber while dragging.
  const updateBubble = (position: number) => {
    if (bubbleRef.current != null) bubbleRef.current.innerText = formatDuration(position * valueRef.current);
  };
  const progress = useSpringValue(0, {
    config: SPRING_CONFIG,
    onChange: (result) => {
      if (draggingRef.current) updateBubble(result.value as number);
    },
  });
  const preview = useSpringValue(0, {
    onChange: (result) => {
      if (!draggingRef.current) updateBubble(result.value as number);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      setGrabber: (next, animate = true) => {
        if (animate) progress.start(next);
        else progress.set(next);
      },
    }),
    [progress],
  );

  const calculatePercentage = useCallback(
    (clientX: number, clientY: number) => {
      const wrapper = wrapperRef.current;
      if (wrapper == null) return 0;
      const { left, width, bottom, height } = wrapper.getBoundingClientRect();
      return Math.min(
        1,
        Math.max(0, type === MediaBarTypes.VOLUME ? (bottom - clientY) / height : (clientX - left) / width),
      );
    },
    [type],
  );

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (dragging) return;
    preview.set(calculatePercentage(event.clientX, event.clientY));
  };

  const handleDragStart = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (wrapperRef.current == null) return;
    const { clientX, clientY } = event;
    setDragging(true);
    draggingRef.current = true;
    onDragStart(type);
    onDrag(calculatePercentage(clientX, clientY), type);
    const handleDragMove = (moveEvent: globalThis.MouseEvent) =>
      onDrag(calculatePercentage(moveEvent.clientX, moveEvent.clientY), type);
    const handleDragEnd = () => {
      onDragEnd();
      currentWindow.removeEventListener('mouseup', handleDragEnd, false);
      currentWindow.removeEventListener('mousemove', handleDragMove, false);
      setDragging(false);
      draggingRef.current = false;
      preview.set(progress.get());
    };
    currentWindow.addEventListener('mouseup', handleDragEnd, false);
    currentWindow.addEventListener('mousemove', handleDragMove, false);
  };

  const bubblePosition = dragging ? progress : preview;

  return (
    <div className={clsx(className, type === MediaBarTypes.VOLUME ? styles.vertical : styles.horizontal)}>
      <div
        className={clsx(
          sliderClassName,
          dragging ? styles.mediaBarInteractionDragging : styles.mediaBarInteraction,
          type === MediaBarTypes.VOLUME ? styles.mediaBarInteractionVolume : null,
        )}
        onMouseDown={handleDragStart}
        onMouseMove={handleMouseMove}
        ref={wrapperRef}
      >
        <div
          className={clsx(
            styles.mediaBarWrapper,
            styles.fakeEdges,
            type === MediaBarTypes.VOLUME ? styles.mediaBarWrapperVolume : null,
          )}
        >
          {buffers != null
            ? buffers.map(([start, length], index) => (
                <div
                  key={index}
                  className={clsx(styles.buffer, styles.fakeEdges)}
                  style={{ width: `${100 * length}%`, left: `${100 * start}%` }}
                />
              ))
            : null}
          {type === MediaBarTypes.DURATION ? (
            <animated.div
              className={clsx(styles.mediaBarPreview, styles.fakeEdges)}
              style={{ width: preview.to(toPercent) }}
            />
          ) : null}
          <animated.div
            className={clsx(styles.mediaBarProgress, styles.fakeEdges)}
            style={{ width: progress.to(toPercent) }}
          >
            <span className={styles.mediaBarGrabber} />
          </animated.div>
          {type === MediaBarTypes.DURATION ? (
            <animated.div ref={bubbleRef} className={styles.bubble} style={{ left: bubblePosition.to(toPercent) }} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

MediaBar.displayName = 'MediaBar';
MediaBar.Types = MediaBarTypes;
