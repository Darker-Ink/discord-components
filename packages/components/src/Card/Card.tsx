import type { HTMLAttributes, Ref } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

// Each type is the class that colors the card; CUSTOM adds nothing so the caller can style it.
export const CardTypes = {
  PRIMARY: 'cardPrimary',
  DANGER: 'cardDanger',
  WARNING: 'cardWarning',
  SUCCESS: 'cardSuccess',
  BRAND: 'cardBrand',
  CUSTOM: 'card',
} as const;

export type CardType = (typeof CardTypes)[keyof typeof CardTypes];

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  outline?: boolean;
  // Accepted but unused by Discord's Card.
  editable?: boolean;
  type?: CardType;
  ref?: Ref<HTMLDivElement>;
}

export const Card = ({
  children,
  outline = false,
  editable: _editable,
  type = CardTypes.PRIMARY,
  className,
  ref,
  ...props
}: CardProps) => (
  <div ref={ref} className={clsx(className, styles.card, styles[type], { [styles.cardOutline]: outline })} {...props}>
    {children}
  </div>
);

Card.displayName = 'Card';
Card.Types = CardTypes;
