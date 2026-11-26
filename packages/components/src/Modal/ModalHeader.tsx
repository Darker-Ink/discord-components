import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import clsx from 'clsx';
import type { IconProps } from '@discord-components/icons';
import { Badge, toBadgeProps, type BadgeType } from '../Badge';
import { CloseButton } from '../CloseButton';
import { GradientWrapper, type GradientColorName } from '../GradientWrapper';
import { Graphic, isAnimatedGraphic, type GraphicProps } from '../Graphic';
import { Heading } from '../Heading';
import { ProgressBar, type ProgressBarProps } from '../ProgressBar';
import { Stack } from '../Stack';
import { Text, type TextVariant } from '../Text';
import { tokens } from '../tokens';
import { useModalContext } from './ManaModalContext';
import styles from './Modal.module.css';

export interface ModalCloseButtonProps {
  // Blends the button into a gradient header.
  shouldColorMix?: boolean;
}

// The header's close button; hidden when the modal isn't dismissable.
export const ModalCloseButton = ({ shouldColorMix = false }: ModalCloseButtonProps) => {
  const { dismissable, onClose } = useModalContext();
  if (dismissable === false) return null;
  return <CloseButton onClick={onClose} variant={shouldColorMix ? 'color-mix' : undefined} />;
};

ModalCloseButton.displayName = 'ModalCloseButton';

interface HeaderLayoutProps {
  leading?: ReactNode;
  trailing?: ReactNode;
  hasGradient: boolean;
  children: ReactNode;
}

const HeaderLayout = ({ leading, trailing, hasGradient, children }: HeaderLayoutProps) => (
  <>
    {leading != null && <div className={styles.headerLeading}>{leading}</div>}
    {children}
    <div className={styles.headerTrailing}>
      {trailing != null && trailing}
      <ModalCloseButton shouldColorMix={hasGradient} />
    </div>
  </>
);

HeaderLayout.displayName = 'HeaderLayout';

// Centered headers with an animated graphic keep the leading and trailing parts out of the flow.
const CenteredAbsoluteHeaderLayout = ({ leading, trailing, hasGradient, children }: HeaderLayoutProps) => (
  <>
    {leading != null && <div className={clsx(styles.headerLeading, styles.headerLeadingAbsolute)}>{leading}</div>}
    {children}
    <div className={clsx(styles.headerTrailing, styles.headerTrailingAbsolute)}>
      {trailing != null && trailing}
      <ModalCloseButton shouldColorMix={hasGradient} />
    </div>
  </>
);

CenteredAbsoluteHeaderLayout.displayName = 'CenteredAbsoluteHeaderLayout';

// Centered headers reserve the same space on both sides (the larger of the leading and trailing
// parts) so the title stays centered.
const CenteredHeaderLayout = ({ leading, trailing, hasGradient, children }: HeaderLayoutProps) => {
  const [height, setHeight] = useState(24);
  const [width, setWidth] = useState(24);
  const leadingRef = useRef<HTMLDivElement>(null);
  const trailingRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const view = (leadingRef.current ?? trailingRef.current)?.ownerDocument?.defaultView ?? window;
    const observer = new view.ResizeObserver(() => {
      let maxHeight = 0;
      let maxWidth = 0;
      if (leadingRef.current != null) {
        const rect = leadingRef.current.getBoundingClientRect();
        maxHeight = Math.max(maxHeight, rect.height);
        maxWidth = Math.max(maxWidth, rect.width);
      }
      if (trailingRef.current != null) {
        const rect = trailingRef.current.getBoundingClientRect();
        maxHeight = Math.max(maxHeight, rect.height);
        maxWidth = Math.max(maxWidth, rect.width);
      }
      setWidth(Math.ceil(maxWidth));
      setHeight(Math.ceil(maxHeight));
    });
    if (leadingRef.current != null) observer.observe(leadingRef.current);
    if (trailingRef.current != null) observer.observe(trailingRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={leadingRef} className={clsx(styles.headerLeading, styles.headerLeadingAbsolute)}>
        {leading}
      </div>
      <div className={styles.headerLeadingSpacer} style={{ height, width }} />
      {children}
      <div className={styles.headerTrailingSpacer} style={{ height, width }} />
      <div ref={trailingRef} className={clsx(styles.headerTrailing, styles.headerTrailingAbsolute)}>
        {trailing != null && trailing}
        <ModalCloseButton shouldColorMix={hasGradient} />
      </div>
    </>
  );
};

CenteredHeaderLayout.displayName = 'CenteredHeaderLayout';

export type ModalSubtitle = ReactNode | { text: ReactNode; leadingIcon?: ComponentType<IconProps<'color'>> };

export type ModalBadgePosition = 'top' | 'end';

const ModalHeaderBadge = ({ badge, position }: { badge: BadgeType | undefined; position: ModalBadgePosition }) => {
  if (badge == null) return null;
  const badgeProps = toBadgeProps(badge);
  return (
    <div className={styles.headerBadge} data-position={position}>
      <Badge variant="primary" {...badgeProps} />
    </div>
  );
};

ModalHeaderBadge.displayName = 'ModalHeaderBadge';

const isSubtitleObject = (subtitle: ModalSubtitle): subtitle is Exclude<ModalSubtitle, ReactNode> =>
  typeof subtitle === 'object' && subtitle != null && 'text' in subtitle;

const ModalHeaderSubtitle = ({ subtitle }: { subtitle: ModalSubtitle }) => {
  if (subtitle == null) return null;
  const text = (
    <Text className={styles.headerSubtitle} variant="body-md/normal" color="text-subtle">
      {isSubtitleObject(subtitle) ? subtitle.text : subtitle}
    </Text>
  );
  const LeadingIcon =
    typeof subtitle === 'object' && subtitle != null && 'leadingIcon' in subtitle ? subtitle.leadingIcon : undefined;
  return (
    <div className={styles.headerSubtitleWrapper}>
      {LeadingIcon != null && (
        <LeadingIcon className={styles.headerSubtitleIcon} color={tokens.colors.TEXT_SUBTLE} size="sm" />
      )}
      {text}
    </div>
  );
};

ModalHeaderSubtitle.displayName = 'ModalHeaderSubtitle';

export interface ModalHeaderProps {
  // Puts the header on a gradient.
  gradientColor?: GradientColorName;
  // An illustration above the title.
  graphic?: GraphicProps;
  badge?: BadgeType;
  badgePosition?: ModalBadgePosition;
  title?: ReactNode;
  titleTextVariant?: TextVariant;
  subtitle?: ModalSubtitle;
  alignCenter?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  // Shows a step indicator above the title (multi-step modals).
  progressBarProps?: ProgressBarProps;
}

export const ModalHeader = ({
  gradientColor,
  graphic,
  badge,
  badgePosition = 'top',
  title,
  titleTextVariant,
  subtitle,
  alignCenter = false,
  leading,
  trailing,
  progressBarProps,
}: ModalHeaderProps) => {
  const { headingId } = useModalContext();
  const hasGradient = gradientColor != null;
  const animatedGraphic = isAnimatedGraphic(graphic);
  const graphicElement = graphic != null && (
    <div className={clsx(styles.headerGraphic, { [styles.headerGraphicAnimated]: animatedGraphic })}>
      <div className={styles.headerGraphicContainer}>
        <Graphic {...graphic} />
      </div>
    </div>
  );
  let heading: ReactNode = (
    <Heading
      className={styles.headerTitle}
      id={headingId}
      variant={titleTextVariant ?? 'heading-lg/semibold'}
      color="text-strong"
    >
      {title}
    </Heading>
  );
  if (badgePosition === 'end') {
    heading = (
      <Stack direction="horizontal" gap={8} align="center">
        {heading}
        <ModalHeaderBadge badge={badge} position={badgePosition} />
      </Stack>
    );
  }
  const main = graphic != null ? graphicElement : heading;
  const Layout = alignCenter ? (animatedGraphic ? CenteredAbsoluteHeaderLayout : CenteredHeaderLayout) : HeaderLayout;
  const header = (
    <header className={clsx(styles.section, styles.header, { [styles.headerCentered]: alignCenter })}>
      <Stack gap={8}>
        <div className={styles.headerLayout}>
          <Layout leading={leading} trailing={trailing} hasGradient={hasGradient}>
            <div className={styles.headerMain}>
              {progressBarProps != null && (
                <div className={styles.headerStepIndicator}>
                  <ProgressBar {...progressBarProps} />
                </div>
              )}
              {main}
            </div>
          </Layout>
        </div>
        {badgePosition === 'top' && <ModalHeaderBadge badge={badge} position={badgePosition} />}
        {graphic != null && title != null && heading}
        {subtitle != null && <ModalHeaderSubtitle subtitle={subtitle} />}
      </Stack>
    </header>
  );
  return hasGradient ? (
    <GradientWrapper color={gradientColor} className={styles.headerGradient}>
      {header}
    </GradientWrapper>
  ) : (
    header
  );
};

ModalHeader.displayName = 'ModalHeader';

export type ExpressiveModalHeaderProps = Omit<ModalHeaderProps, 'titleTextVariant' | 'alignCenter'>;

// The centered header of expressive modals, with a larger title.
export const ExpressiveModalHeader = ({
  gradientColor,
  graphic,
  badge,
  title,
  subtitle,
  ...props
}: ExpressiveModalHeaderProps) => (
  <ModalHeader
    {...props}
    gradientColor={gradientColor}
    graphic={graphic}
    badge={badge}
    title={title}
    titleTextVariant="heading-xl/semibold"
    subtitle={subtitle}
    alignCenter
  />
);

ExpressiveModalHeader.displayName = 'ExpressiveModalHeader';
