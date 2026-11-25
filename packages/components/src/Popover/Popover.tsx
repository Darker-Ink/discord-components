import { useCallback, type ReactNode, type Ref, type RefObject } from 'react';
import clsx from 'clsx';
import type { BadgeProps, BadgeType } from '../Badge';
import type { ButtonProps } from '../Button';
import { Graphic, type GraphicProps } from '../Graphic';
import type { PopoutCloseReason, PopoutScrollBehavior } from '../Popout';
import {
  BasePopover,
  type PopoverAlignment,
  type PopoverCaretConfig,
  type PopoverGradientColor,
  type PopoverPosition,
} from './BasePopover';
import { PopoverActions } from './PopoverActions';
import { PopoverCaret } from './PopoverCaret';
import { PopoverCloseButton } from './PopoverCloseButton';
import { PopoverHeader, type PopoverTextLink } from './PopoverHeader';
import styles from './Popover.module.css';

export type PopoverSize = 'sm' | 'md';

export type PopoverProps = {
  title: ReactNode;
  body?: ReactNode | ReactNode[];
  badge?: BadgeType | BadgeProps;
  graphic?: GraphicProps;
  size?: PopoverSize;
  actions?: ButtonProps[];
  textLink?: PopoverTextLink;
  gradientColor?: PopoverGradientColor;
  onRequestClose?: (reason: PopoutCloseReason | undefined) => void;
  popoverRef?: Ref<HTMLDivElement>;
  position?: PopoverPosition;
  caretConfig?: PopoverCaretConfig;
  scrollBehavior?: PopoutScrollBehavior;
  trackTargetPosition?: boolean;
  targetElementRef: RefObject<Element | null>;
  shouldShow?: boolean;
  hasVideo?: boolean;
} & PopoverAlignment;

// A coachmark-style popover pointing at an element: optional graphic, badge, title, body, a text
// link and actions, with a close button.
export const Popover = ({
  title,
  body,
  badge,
  graphic,
  size = 'md',
  actions,
  textLink,
  gradientColor,
  onRequestClose,
  popoverRef,
  position,
  caretConfig,
  scrollBehavior,
  trackTargetPosition,
  ...props
}: PopoverProps) => {
  const handleRequestClose = useCallback(
    (_event: Event | undefined, reason: PopoutCloseReason | undefined) => {
      onRequestClose?.(reason);
    },
    [onRequestClose],
  );
  const handleClose = useCallback(() => {
    onRequestClose?.('user:explicit');
  }, [onRequestClose]);
  return (
    <BasePopover
      targetElementRef={props.targetElementRef}
      shouldShow={props.shouldShow}
      hasVideo={props.hasVideo}
      position={position}
      caretConfig={caretConfig}
      onRequestClose={handleRequestClose}
      gradientColor={gradientColor}
      scrollBehavior={scrollBehavior}
      trackTargetPosition={trackTargetPosition}
      {...(props.alignmentStrategy === 'edge'
        ? { alignmentStrategy: 'edge', align: props.align }
        : { alignmentStrategy: 'trigger-center' })}
    >
      <div ref={popoverRef} data-mana-component="popover">
        <PopoverCloseButton onClick={handleClose} variant={gradientColor != null ? 'color-mix' : undefined} />
        {graphic != null && (
          <div className={clsx(styles.graphic, { [styles[`graphic--${size}`]]: size != null })}>
            <Graphic {...graphic} aspectRatio={graphic.aspectRatio ?? (size === 'sm' ? '2/1' : '16/9')} />
          </div>
        )}
        <PopoverHeader title={title} body={body} badge={badge} textLink={textLink} />
        {actions != null && actions.length > 0 ? <PopoverActions actions={actions} /> : null}
        <PopoverCaret />
      </div>
    </BasePopover>
  );
};

Popover.displayName = 'Popover';
