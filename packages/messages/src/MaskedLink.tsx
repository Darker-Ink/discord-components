import { memo, useCallback, type MouseEvent, type MouseEventHandler, type ReactNode } from 'react';
import { Anchor, type AnchorProps } from '@discord-components/components';

/** Drops script-running urls, like the client's link sanitizer. */
export const sanitizeUrl = (url: string | undefined) => {
  if (url == null) return null;
  try {
    const { protocol } = new URL(url, 'https://localhost');
    if (protocol.startsWith('javascript:') || protocol.startsWith('vbscript:') || protocol.startsWith('data:')) {
      return null;
    }
  } catch {
    return null;
  }
  return url;
};

export interface MaskedLinkProps extends Omit<AnchorProps, 'onClick' | 'children'> {
  href?: string;
  title?: string;
  children?: ReactNode;
  /** The client opens untrusted links behind a confirmation; apps can hook in here. */
  onClick?: MouseEventHandler<HTMLElement>;
  trusted?: boolean;
  messageId?: string;
  channelId?: string;
}

/** A link from message content or an embed: always opens in a new tab and goes through the click handler. */
export const MaskedLink = memo(
  ({
    onClick,
    trusted: _trusted,
    title,
    href,
    children,
    messageId: _messageId,
    channelId: _channelId,
    ...props
  }: MaskedLinkProps) => {
    const handleClick = useCallback((event: MouseEvent<HTMLElement>) => onClick?.(event), [onClick]);
    const handleAuxClick = useCallback(
      (event: MouseEvent<HTMLElement>) => {
        if (event.button === 1) handleClick(event);
      },
      [handleClick],
    );
    return (
      <Anchor
        {...props}
        title={title}
        target="_blank"
        rel="noreferrer noopener"
        href={sanitizeUrl(href) ?? undefined}
        onClick={handleClick}
        onAuxClick={handleAuxClick}
      >
        {children ?? title}
      </Anchor>
    );
  },
);

MaskedLink.displayName = 'MaskedLink';
