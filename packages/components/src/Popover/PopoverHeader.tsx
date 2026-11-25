import type { MouseEventHandler, ReactNode } from 'react';
import clsx from 'clsx';
import { Anchor } from '../Anchor';
import { Badge, toBadgeProps, type BadgeProps, type BadgeType } from '../Badge';
import { Heading } from '../Heading';
import { Text } from '../Text';
import styles from './Popover.module.css';

export interface PopoverTextLink {
  text: ReactNode;
  link?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  // Opens in a new tab (default); only applies with `link`.
  external?: boolean;
}

export interface PopoverHeaderProps {
  title: ReactNode;
  body?: ReactNode | ReactNode[];
  badge?: BadgeType | BadgeProps;
  className?: string;
  textLink?: PopoverTextLink;
}

const PopoverBadge = ({ badge }: { badge?: BadgeType | BadgeProps }) => {
  if (badge == null) return null;
  return (
    <div className={styles.badgeContainer}>
      <Badge variant="primary" {...toBadgeProps(badge)} />
    </div>
  );
};

PopoverBadge.displayName = 'PopoverBadge';

const PopoverBody = ({ body }: { body?: ReactNode | ReactNode[] }) => {
  if (body == null) return null;
  const paragraphs = Array.isArray(body) ? body : [body];
  if (paragraphs.length === 0 || paragraphs.every((paragraph) => paragraph == null || paragraph === '')) return null;
  return (
    <div className={styles.headerBody}>
      {paragraphs.map((paragraph, index) => (
        // Paragraphs have no identity beyond their order.
        <Text key={index} variant="body-sm/normal" color="none">
          {paragraph}
        </Text>
      ))}
    </div>
  );
};

PopoverBody.displayName = 'PopoverBody';

export const PopoverHeader = ({ title, body, badge, className, textLink }: PopoverHeaderProps) => {
  const external = textLink?.external ?? true;
  return (
    <div className={clsx(styles.header, className)}>
      <div>
        <PopoverBadge badge={badge} />
        <Heading variant="heading-sm/semibold" className={styles.title}>
          {title}
        </Heading>
      </div>
      <PopoverBody body={body} />
      {textLink != null && (
        <Anchor
          onClick={textLink.onClick}
          href={textLink.link}
          target={external && textLink.link != null ? '_blank' : undefined}
          rel={external && textLink.link != null ? 'noopener noreferrer' : undefined}
        >
          <Text variant="body-sm/normal" className={styles.footerLink}>
            {textLink.text}
          </Text>
        </Anchor>
      )}
    </div>
  );
};

PopoverHeader.displayName = 'PopoverHeader';
