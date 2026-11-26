import type { Ref } from 'react';
import clsx from 'clsx';
import {
  AdvancedScrollerAuto,
  AdvancedScrollerNone,
  AdvancedScrollerThin,
  type AdvancedScrollerHandle,
  type AdvancedScrollerProps,
} from '../AdvancedScroller';
import { HeadingLevel } from '../HeadingLevel';
import { ListThin, type ListScrollerHandle, type ListScrollerProps } from '../ListScroller';
import styles from './ModalRoot.module.css';

export type ModalScrollbarType = 'thin' | 'auto' | 'none';

export interface ModalContentProps extends Omit<AdvancedScrollerProps, 'ref'> {
  scrollerRef?: Ref<AdvancedScrollerHandle>;
  scrollbarType?: ModalScrollbarType;
}

const SCROLLERS = {
  thin: AdvancedScrollerThin,
  auto: AdvancedScrollerAuto,
  none: AdvancedScrollerNone,
} as const;

// The scrolling content area of a ModalRoot modal.
export const ModalContent = ({
  className,
  children,
  scrollerRef,
  scrollbarType,
  scrollbarGutter,
  ...props
}: ModalContentProps) => {
  const type = scrollbarType ?? 'thin';
  const Scroller = SCROLLERS[type];
  const gutterClassName =
    scrollbarGutter === false || type === 'none'
      ? undefined
      : type === 'auto'
        ? styles.contentScrollbarGutterAuto
        : styles.contentScrollbarGutter;
  return (
    <Scroller
      data-migration-pending
      className={clsx(styles.content, gutterClassName, className)}
      scrollbarGutter={scrollbarGutter}
      ref={scrollerRef}
      {...props}
    >
      <HeadingLevel>{children}</HeadingLevel>
    </Scroller>
  );
};

ModalContent.displayName = 'ModalContent';

export interface ModalListContentProps extends Omit<ListScrollerProps, 'ref'> {
  scrollerRef?: Ref<ListScrollerHandle>;
}

// A virtualized list as a ModalRoot modal's content.
export const ModalListContent = ({ className, scrollerRef, ...props }: ModalListContentProps) => (
  <ListThin className={className} ref={scrollerRef} {...props} />
);

ModalListContent.displayName = 'ModalListContent';
