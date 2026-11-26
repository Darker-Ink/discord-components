import type { ReactNode } from 'react';
import type { BadgeType } from '../Badge';
import type { GradientColorName } from '../GradientWrapper';
import type { GraphicProps } from '../Graphic';
import { BaseModal, type BaseModalProps } from './BaseModal';
import { ModalActionBar, type ModalAction } from './ModalActionBar';
import { ModalBody } from './ModalBody';
import { ExpressiveModalHeader, type ModalSubtitle } from './ModalHeader';

export interface ExpressiveModalProps extends Omit<BaseModalProps, 'paddingSize' | 'children'> {
  gradientColor?: GradientColorName;
  // An illustration above the title.
  graphic?: GraphicProps;
  badge?: BadgeType;
  title: string;
  subtitle?: ModalSubtitle;
  actionBarInput?: ReactNode;
  actions?: ModalAction[];
  children?: ReactNode;
}

// A modal with a gradient, centered header, an optional graphic and badge, for announcements and
// upsells.
export const ExpressiveModal = ({
  size = 'md',
  gradientColor = 'purple',
  graphic,
  badge,
  title,
  subtitle,
  actionBarInput,
  actions,
  children,
  'aria-label': ariaLabel,
  ...props
}: ExpressiveModalProps) => (
  <BaseModal {...props} aria-label={ariaLabel ?? title} size={size} paddingSize="lg">
    <ExpressiveModalHeader
      gradientColor={gradientColor}
      graphic={graphic}
      badge={badge}
      title={title}
      subtitle={subtitle}
    />
    <ModalBody>{children}</ModalBody>
    <ModalActionBar leading={actionBarInput} actions={actions} actionsFullWidth={actionBarInput == null} />
  </BaseModal>
);

ExpressiveModal.displayName = 'ExpressiveModal';
