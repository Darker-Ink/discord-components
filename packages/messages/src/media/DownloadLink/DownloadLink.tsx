import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { Anchor } from '@discord-components/components';
import { DownloadIcon } from '@discord-components/icons';
import type { FocusRingProps } from 'react-focus-rings';
import { useMediaContext } from '../MediaContext';

export interface DownloadLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  href: string;
  iconClassName?: string;
  /** `[type, subtype]` of the file (Discord reports it to analytics). */
  mimeType?: string[];
  /** Renders the file name as the link text instead of the download icon. */
  fileName?: string;
  focusProps?: FocusRingProps;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** The download link of attachments and media players. */
export const DownloadLink = ({
  href,
  className,
  iconClassName,
  rel,
  target,
  mimeType: _mimeType,
  fileName,
  focusProps,
  onClick,
  ...rest
}: DownloadLinkProps) => {
  const { i18n } = useMediaContext();
  // The client always handles the click (it reports downloads to analytics), which makes the anchor a focusable link.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => onClick?.(event);
  return fileName != null ? (
    <Anchor
      href={href}
      onClick={handleClick}
      target={target}
      rel={rel}
      className={className}
      focusProps={focusProps}
      {...rest}
    >
      {fileName}
    </Anchor>
  ) : (
    <Anchor
      href={href}
      onClick={handleClick}
      target={target}
      rel={rel}
      className={className}
      aria-label={i18n.DOWNLOAD}
      focusProps={focusProps}
      {...rest}
    >
      <DownloadIcon size="md" color="currentColor" className={iconClassName} />
    </Anchor>
  );
};

DownloadLink.displayName = 'DownloadLink';
