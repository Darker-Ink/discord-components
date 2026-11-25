import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { Clickable, IconButton, Text, tokens } from '@discord-components/components';
import { EyeIcon, EyeSlashIcon, ImageWarningIcon } from '@discord-components/icons';
import { ObscureReason, SENSITIVE_OBSCURE_REASONS } from '../constants';
import { useMediaContext } from '../MediaContext';
import styles from './ObscuredContent.module.css';

export const ObscuredContentTypes = {
  TEXT: 'text',
  ATTACHMENT: 'attachment',
  EMBED: 'embed',
} as const;

export type ObscuredContentType = (typeof ObscuredContentTypes)[keyof typeof ObscuredContentTypes];

/** Reveals every obscured descendant (e.g. a message the user has chosen to show). */
export const ObscuredContentRevealContext = createContext(false);

ObscuredContentRevealContext.displayName = 'ObscuredContentRevealContext';

export interface ObscuredContentProps {
  type?: ObscuredContentType;
  reason?: ObscureReason;
  /** Renders the content; receives whether it is still hidden. */
  children: (hidden: boolean) => ReactNode;
  className?: string;
  /** Inline attachments (too small for the overlay) are only blurred, without the label. */
  inline?: boolean;
  containerStyles?: CSSProperties;
  /** When false, the content starts revealed. */
  obscured?: boolean;
  isSingleMosaicItem?: boolean;
  obscurityControlClassName?: string;
  onReveal?: () => void;
  onToggleObscurity?: (event: MouseEvent<HTMLElement>) => void;
  /** Text spoilers: wraps each rendered child element. */
  renderTextElement?: (element: ReactElement, visible: boolean) => ReactNode;
  hovered?: boolean;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  /** Discord asks unverified users to verify their age before revealing; there is no flow for that here. */
  shouldAgeVerify?: boolean;
  /** Verified teens can't reveal sensitive media, so the reveal toggle is hidden. */
  isVerifiedTeen?: boolean;
}

// Tab stops inside hidden text are taken out of the tab order until it is revealed.
const useBlockFocus = (ref: RefObject<HTMLElement | null>, blocked: boolean) => {
  const attribute = `data-focus-blocked-${useId().replace(/:/g, '')}`;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!blocked || node == null) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (element) =>
        (element as HTMLElement).tabIndex >= 0 && !(element as HTMLButtonElement).disabled
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP,
    });
    let current: Node | null = walker.currentNode;
    while (current != null) {
      const element = current as HTMLElement;
      element.setAttribute(attribute, String(element.tabIndex));
      element.tabIndex = -1;
      current = walker.nextNode();
    }
    return () => {
      node.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
        const tabIndex = element.getAttribute(attribute);
        if (tabIndex != null) {
          element.tabIndex = parseInt(tabIndex, 10);
          element.removeAttribute(attribute);
        }
      });
    };
  }, [ref, blocked, attribute]);
};

const ObscuredTextInner = ({ hidden, children }: { hidden: boolean; children: ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useBlockFocus(ref, hidden);
  return (
    <span ref={ref} aria-hidden={hidden} className={styles.obscuredTextContentInner}>
      {children}
    </span>
  );
};

ObscuredTextInner.displayName = 'ObscuredTextInner';

const SpoilerWarning = ({ className }: { className?: string }) => {
  const { i18n } = useMediaContext();
  return <div className={clsx(styles.spoilerWarning, styles.obscureWarning, className)}>{i18n.SPOILER}</div>;
};

SpoilerWarning.displayName = 'SpoilerWarning';

const SensitiveContentWarning = ({
  className,
  isSingleMosaicItem,
  obscureOnly,
}: {
  className?: string;
  isSingleMosaicItem?: boolean;
  obscureOnly?: boolean;
}) => {
  const { i18n } = useMediaContext();
  return (
    <div className={clsx(styles.explicitContentWarning, styles.obscureWarning, className)}>
      {obscureOnly ? null : (
        <>
          <ImageWarningIcon size="lg" color={tokens.colors.WHITE} />
          {isSingleMosaicItem && (
            <Text variant="body-sm/normal" color="text-overlay-light" className={styles.explicitContentWarningText}>
              {i18n.MAY_CONTAIN_SENSITIVE_CONTENT}
            </Text>
          )}
        </>
      )}
    </div>
  );
};

SensitiveContentWarning.displayName = 'SensitiveContentWarning';

const ObscureWarning = ({
  reason = ObscureReason.SPOILER,
  className,
  isSingleMosaicItem = false,
}: {
  reason?: ObscureReason;
  className?: string;
  isSingleMosaicItem?: boolean;
}) => {
  switch (reason) {
    case ObscureReason.SPOILER:
      return <SpoilerWarning className={className} />;
    case ObscureReason.EXPLICIT_CONTENT:
    case ObscureReason.GORE_CONTENT:
    case ObscureReason.SELF_HARM_CONTENT:
      return <SensitiveContentWarning isSingleMosaicItem={isSingleMosaicItem} className={className} />;
    case ObscureReason.POTENTIAL_EXPLICIT_CONTENT:
      return <SensitiveContentWarning isSingleMosaicItem={isSingleMosaicItem} className={className} obscureOnly />;
  }
};

ObscureWarning.displayName = 'ObscureWarning';

const ObscureToggle = ({
  reason,
  isVisible,
  onToggle,
  className,
}: {
  reason: ObscureReason;
  isVisible: boolean;
  onToggle: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
}) => {
  const { i18n } = useMediaContext();
  if (
    reason !== ObscureReason.EXPLICIT_CONTENT &&
    reason !== ObscureReason.GORE_CONTENT &&
    reason !== ObscureReason.SELF_HARM_CONTENT
  )
    return null;
  return (
    <div className={clsx(styles.obscureButtonContainer, className)}>
      <IconButton
        icon={isVisible ? EyeIcon : EyeSlashIcon}
        variant="overlay-secondary"
        size="sm"
        onClick={onToggle}
        aria-label={i18n.REVEAL_SENSITIVE_CONTENT}
      />
    </div>
  );
};

ObscureToggle.displayName = 'ObscureToggle';

/**
 * Discord's spoiler / sensitive-media wrapper. Spoilers blur the content behind a "SPOILER" pill until clicked;
 * sensitive media adds a warning and an eye toggle.
 */
export const ObscuredContent = ({
  type = ObscuredContentTypes.TEXT,
  reason = ObscureReason.SPOILER,
  children,
  className,
  inline,
  containerStyles,
  obscured = true,
  isSingleMosaicItem = false,
  obscurityControlClassName,
  onReveal,
  onToggleObscurity,
  renderTextElement,
  hovered = false,
  onMouseEnter,
  onMouseLeave,
  shouldAgeVerify = false,
  isVerifiedTeen = false,
}: ObscuredContentProps) => {
  const { i18n } = useMediaContext();
  const forceRevealed = useContext(ObscuredContentRevealContext);
  const [visible, setVisible] = useState(false);

  const ariaLabel =
    reason === ObscureReason.SPOILER
      ? i18n.SPOILER
      : reason === ObscureReason.POTENTIAL_EXPLICIT_CONTENT
        ? i18n.MAY_CONTAIN_SENSITIVE_CONTENT
        : i18n.CONTENT_WARNING_SENSITIVE;

  const removeObscurity = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (visible) return;
      event.preventDefault();
      event.stopPropagation();
      setVisible(true);
      onReveal?.();
    },
    [visible, onReveal],
  );

  const handleToggleObscurity = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      event.nativeEvent.stopPropagation();
      if (shouldAgeVerify) return;
      onToggleObscurity?.(event);
      setVisible((current) => !current);
    },
    [shouldAgeVerify, onToggleObscurity],
  );

  if (type === ObscuredContentTypes.ATTACHMENT) {
    const shown = forceRevealed || visible || !obscured;
    if (SENSITIVE_OBSCURE_REASONS.has(reason) && !inline) {
      return (
        <div
          aria-label={shown ? undefined : ariaLabel}
          aria-expanded={shown}
          style={containerStyles}
          className={clsx(
            className,
            styles.spoilerContent,
            styles.spoilerContainer,
            styles.attachmentContainer,
            styles.opaque,
            { [styles.hidden]: !shown, [styles.constrainedObscureContent]: isSingleMosaicItem },
          )}
          role={shown ? 'presentation' : 'button'}
          tabIndex={shown ? -1 : 0}
        >
          {shown ? null : <ObscureWarning reason={reason} isSingleMosaicItem={isSingleMosaicItem} />}
          <div aria-hidden={!shown} inert={!shown} className={styles.spoilerInnerContainer}>
            {children(!shown)}
          </div>
          {isVerifiedTeen ? null : (
            <ObscureToggle
              reason={reason}
              isVisible={visible}
              onToggle={handleToggleObscurity}
              className={obscurityControlClassName}
            />
          )}
        </div>
      );
    }
    return (
      <Clickable
        onClick={shown ? undefined : removeObscurity}
        aria-label={shown ? undefined : ariaLabel}
        aria-expanded={shown}
        style={containerStyles}
        className={clsx(className, styles.spoilerContent, styles.spoilerContainer, styles.attachmentContainer, {
          [styles.hidden]: !shown,
          [styles.hiddenSpoiler]: !shown,
        })}
        role={shown ? 'presentation' : 'button'}
        tabIndex={shown ? -1 : 0}
      >
        {shown || inline ? null : <ObscureWarning reason={reason} isSingleMosaicItem={isSingleMosaicItem} />}
        <div aria-hidden={!shown} inert={!shown} className={styles.spoilerInnerContainer}>
          {children(!shown)}
        </div>
      </Clickable>
    );
  }

  if (type === ObscuredContentTypes.EMBED) {
    const shown = forceRevealed || visible;
    if (SENSITIVE_OBSCURE_REASONS.has(reason)) {
      return (
        <div
          aria-label={visible ? undefined : ariaLabel}
          aria-expanded={shown}
          style={containerStyles}
          className={clsx(
            className,
            styles.spoilerContent,
            styles.spoilerContainer,
            styles.embedContainer,
            styles.opaque,
            {
              [styles.hidden]: !shown,
            },
          )}
          role={shown ? 'presentation' : 'button'}
          tabIndex={shown ? -1 : 0}
        >
          {shown ? null : <ObscureWarning reason={reason} isSingleMosaicItem={isSingleMosaicItem} />}
          <div aria-hidden={!shown} inert={!shown} className={styles.spoilerInnerContainer}>
            {children(!shown)}
          </div>
          {isVerifiedTeen ? null : (
            <ObscureToggle
              reason={reason}
              isVisible={visible}
              onToggle={handleToggleObscurity}
              className={obscurityControlClassName}
            />
          )}
        </div>
      );
    }
    return (
      <Clickable
        aria-label={ariaLabel}
        aria-expanded={shown}
        className={clsx(className, styles.spoilerContent, styles.spoilerContainer, styles.embedContainer, {
          [styles.hidden]: !shown,
        })}
        onClick={shown ? undefined : removeObscurity}
        style={containerStyles}
        role={shown ? 'presentation' : 'button'}
        tabIndex={shown ? -1 : 0}
      >
        {shown ? null : <ObscureWarning reason={reason} className={styles.embed} />}
        <div aria-hidden={!shown} inert={!shown}>
          {children(!shown)}
        </div>
      </Clickable>
    );
  }

  const shown = forceRevealed || visible || !obscured;
  const rendered = Children.toArray(children(shown));
  const elements = Children.map(rendered, (child) =>
    isValidElement(child) && renderTextElement != null ? renderTextElement(child, shown) : child,
  );
  return (
    <Clickable
      tag="span"
      onClick={shown ? undefined : removeObscurity}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={shown ? undefined : ariaLabel}
      aria-expanded={shown}
      tabIndex={shown ? -1 : 0}
      role={shown ? 'presentation' : 'button'}
      className={clsx('obscured', className, styles.spoilerContent, styles.spoilerMarkdownContent, {
        [styles.hidden]: !shown,
        [styles.hovered]: hovered,
      })}
    >
      <span className={styles.obscuredTextContent}>
        <ObscuredTextInner hidden={!shown}>{elements}</ObscuredTextInner>
      </span>
    </Clickable>
  );
};

ObscuredContent.displayName = 'ObscuredContent';
ObscuredContent.Types = ObscuredContentTypes;
ObscuredContent.Reasons = ObscureReason;
