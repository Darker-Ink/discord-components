import { useContext, type ReactNode } from 'react';
import clsx from 'clsx';
import { XSmallIcon } from '@discord-components/icons';
import { ModalContext } from '../Dialog/ModalContext';
import type { FocusRingProps } from '../FocusRing';
import {
  Flex,
  FlexAlign,
  FlexDirection,
  FlexJustify,
  FlexWrap,
  type FlexAlignClass,
  type FlexDirectionClass,
  type FlexJustifyClass,
  type FlexWrapClass,
} from '../Flex';
import { HeadingLevel } from '../HeadingLevel';
import { ButtonLooks, ButtonSizes, LegacyButton } from '../LegacyButton';
import styles from './ModalRoot.module.css';

interface ModalSectionProps {
  direction?: FlexDirectionClass;
  justify?: FlexJustifyClass;
  align?: FlexAlignClass;
  wrap?: FlexWrapClass;
  className?: string;
  // Draws the separator line (default true).
  separator?: boolean;
  children?: ReactNode;
}

// A ModalRoot modal's header. Its id labels the modal unless the modal was given aria-labelledby.
export const LegacyModalHeader = ({
  direction,
  justify,
  align,
  wrap,
  className,
  separator,
  children,
}: ModalSectionProps) => {
  const { headerId, headerIdIsManaged } = useContext(ModalContext);
  return (
    <Flex
      grow={0}
      shrink={0}
      direction={direction ?? FlexDirection.HORIZONTAL}
      justify={justify ?? FlexJustify.START}
      align={align ?? FlexAlign.CENTER}
      wrap={wrap ?? FlexWrap.NO_WRAP}
      className={clsx(styles.header, className, { [styles.separator]: separator ?? true })}
      id={headerIdIsManaged ? undefined : headerId}
    >
      {children}
    </Flex>
  );
};

LegacyModalHeader.displayName = 'LegacyModalHeader';

// A ModalRoot modal's footer; its buttons are laid out right to left.
export const LegacyModalFooter = ({
  direction,
  justify,
  align,
  wrap,
  className,
  separator,
  children,
}: ModalSectionProps) => (
  <Flex
    grow={0}
    shrink={0}
    direction={direction ?? FlexDirection.HORIZONTAL_REVERSE}
    justify={justify ?? FlexJustify.START}
    align={align ?? FlexAlign.STRETCH}
    wrap={wrap ?? FlexWrap.NO_WRAP}
    className={clsx(styles.footer, className, { [styles.footerSeparator]: separator ?? true })}
  >
    <HeadingLevel>{children}</HeadingLevel>
  </Flex>
);

LegacyModalFooter.displayName = 'LegacyModalFooter';

export interface LegacyModalCloseButtonProps {
  onClick?: () => void;
  focusProps?: FocusRingProps;
  className?: string;
  innerClassName?: string;
  withCircleBackground?: boolean;
  // Hidden while the modal is full screen (on small viewports).
  hideOnFullscreen?: boolean;
}

// The close (X) button of a ModalRoot modal. Its label is the client's English "Close" string.
export const LegacyModalCloseButton = ({
  onClick,
  focusProps,
  className,
  innerClassName,
  withCircleBackground,
  hideOnFullscreen,
}: LegacyModalCloseButtonProps) => (
  <LegacyButton
    data-migration-pending
    focusProps={focusProps}
    aria-label="Close"
    look={ButtonLooks.BLANK}
    size={ButtonSizes.NONE}
    onClick={onClick}
    innerClassName={clsx(innerClassName, { [styles.closeWithCircleBackground]: withCircleBackground })}
    className={clsx(className, { [styles.hideOnFullscreen]: hideOnFullscreen, [styles.close]: !withCircleBackground })}
  >
    <XSmallIcon size="md" color="currentColor" className={clsx(innerClassName, styles.closeIcon)} />
  </LegacyButton>
);

LegacyModalCloseButton.displayName = 'LegacyModalCloseButton';
