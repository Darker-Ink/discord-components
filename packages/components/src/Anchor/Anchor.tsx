import { useContext, type AnchorHTMLAttributes, type MouseEventHandler, type Ref } from 'react';
import clsx from 'clsx';
import { FocusRing, type FocusRingProps } from 'react-focus-rings';
import { BlockInteractionsContext, Clickable } from '../Clickable';
import styles from './Anchor.module.css';

export interface AnchorConfig {
  // Lets the app route links itself (Discord opens its own URLs in-app, others behind a warning).
  getDefaultLinkInterceptor: (href: string) => MouseEventHandler<HTMLElement> | undefined;
}

const anchorConfig: AnchorConfig = { getDefaultLinkInterceptor: () => undefined };

export const configureAnchor = (config: Partial<AnchorConfig>) => {
  Object.assign(anchorConfig, config);
};

// App-relative paths (and `discord://` deep links) stay in the current tab.
export const isInternalLink = (href: string) => /^(?:discord:\/)?\/[a-zA-Z0-9_-]/.test(href);

export interface AnchorProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  onClick?: MouseEventHandler<HTMLElement>;
  useDefaultUnderlineStyles?: boolean;
  focusProps?: FocusRingProps;
  ref?: Ref<HTMLAnchorElement>;
}

export const Anchor = ({
  href,
  onClick,
  className,
  children,
  rel,
  target,
  useDefaultUnderlineStyles = true,
  title,
  style,
  focusProps,
  ref,
  // Discord drops a custom role: clickable anchors are always links.
  role: _role,
  ...props
}: AnchorProps) => {
  const blockInteractions = useContext(BlockInteractionsContext);
  const handleClick = href != null && onClick == null ? anchorConfig.getDefaultLinkInterceptor(href) : onClick;

  const anchorProps: Pick<AnchorProps, 'className' | 'href' | 'onClick' | 'rel' | 'target' | 'title' | 'style'> = {
    className: clsx(styles.anchor, { [styles.anchorUnderlineOnHover]: useDefaultUnderlineStyles }, className),
    href,
    onClick: handleClick,
    rel: rel ?? undefined,
    target: target ?? undefined,
    title: title ?? undefined,
    style: style ?? undefined,
  };
  if (href != null && !isInternalLink(href)) {
    anchorProps.rel = 'noreferrer noopener';
    anchorProps.target = '_blank';
  }
  if (blockInteractions) delete anchorProps.href;

  if (handleClick != null) {
    return (
      <Clickable
        tag="a"
        {...props}
        {...anchorProps}
        onClick={handleClick}
        focusProps={focusProps}
        innerRef={ref as Ref<HTMLElement>}
        role="link"
      >
        {children}
      </Clickable>
    );
  }

  return (
    <FocusRing {...focusProps}>
      <a {...props} {...anchorProps} ref={ref}>
        {children}
      </a>
    </FocusRing>
  );
};

Anchor.displayName = 'Anchor';
