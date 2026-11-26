import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import clsx from 'clsx';
import { Clickable } from '@discord-mana/components';
import { VoiceLowIcon, VoiceNormalIcon, VoiceXIcon } from '@discord-mana/icons';
import type { FocusRingProps } from 'react-focus-rings';
import { useMediaContext } from '../MediaContext';
import { MediaBar, MediaBarTypes, type MediaBarHandle } from './MediaBar';
import styles from './VolumeButton.module.css';

export interface VolumeButtonHandle {
  blur: () => void;
}

export interface VolumeButtonProps {
  focusProps?: FocusRingProps;
  iconClassName?: string;
  iconColor?: string;
  className?: string;
  sliderWrapperClassName?: string;
  sliderClassName?: string;
  currentWindow?: Window;
  muted: boolean;
  minValue?: number;
  maxValue?: number;
  value: number;
  onValueChange?: (value: number) => void;
  onToggleMute?: () => void;
  onVolumeShow?: () => void;
  onVolumeHide?: () => void;
  ref?: Ref<VolumeButtonHandle>;
}

/** The speaker button of the media player; hovering it shows a vertical volume slider. */
export const VolumeButton = ({
  focusProps,
  iconClassName,
  iconColor,
  className,
  sliderWrapperClassName,
  sliderClassName,
  currentWindow = window,
  muted,
  minValue = 0,
  maxValue = 100,
  value,
  onValueChange,
  onToggleMute,
  onVolumeShow,
  onVolumeHide,
  ref,
}: VolumeButtonProps) => {
  const { i18n } = useMediaContext();
  const mediaBar = useRef<MediaBarHandle>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  useImperativeHandle(ref, () => ({ blur: () => setFocused(false) }), []);

  useEffect(() => {
    mediaBar.current?.setGrabber(muted ? 0 : value / maxValue);
  }, [muted, value, maxValue]);

  useEffect(() => () => clearTimeout(hoverTimeout.current), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 0.05 * (maxValue - minValue);
    switch (event.key) {
      case 'ArrowUp':
        event.stopPropagation();
        event.preventDefault();
        if (!focused) {
          setFocused(true);
          break;
        }
        onValueChange?.(Math.min(maxValue, value + step));
        break;
      case 'ArrowDown':
        event.stopPropagation();
        event.preventDefault();
        if (!focused) {
          setFocused(true);
          break;
        }
        onValueChange?.(Math.max(minValue, value - step));
        break;
      case 'Escape':
        setFocused(false);
        event.stopPropagation();
        event.preventDefault();
    }
  };

  const Icon = muted || value === minValue ? VoiceXIcon : value < maxValue / 2 ? VoiceLowIcon : VoiceNormalIcon;

  return (
    <div
      className={clsx(className, styles.container)}
      onMouseEnter={() => {
        clearTimeout(hoverTimeout.current);
        setHovered(true);
        onVolumeShow?.();
      }}
      onMouseLeave={() => {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
          setHovered(false);
          onVolumeHide?.();
        }, 150);
      }}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
    >
      <div
        className={clsx(styles.volumeButtonSlider, sliderWrapperClassName, {
          [styles.sliderVisible]: hovered || focused || dragging,
        })}
        onMouseEnter={() => {
          clearTimeout(hoverTimeout.current);
          setHovered(true);
        }}
        onMouseLeave={() => {
          clearTimeout(hoverTimeout.current);
          hoverTimeout.current = setTimeout(() => setHovered(false), 150);
        }}
      >
        <MediaBar
          className={styles.mediaBar}
          sliderClassName={sliderClassName}
          type={MediaBarTypes.VOLUME}
          value={value / maxValue}
          onDrag={(next) => onValueChange?.(next * maxValue)}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          currentWindow={currentWindow}
          ref={mediaBar}
        />
      </div>
      <Clickable
        focusProps={focusProps}
        className={styles.volumeButton}
        aria-label={i18n.CONTROL_VOLUME}
        onClick={() => onToggleMute?.()}
      >
        <Icon color={iconColor} className={iconClassName} />
      </Clickable>
    </div>
  );
};

VolumeButton.displayName = 'VolumeButton';
