import { useContext, type MouseEventHandler, type SVGProps } from 'react';
import clsx from 'clsx';
import { Clickable } from '@discord-components/components';
import { PlayIcon } from '@discord-components/icons';
import { useEmbedI18n } from './embedI18n';
import { useMediaContext } from '../media/MediaContext';
import { MediaInteractionContext } from '../media/MediaInteractionContext';
import type { RenderLinkComponent } from './renderProps';
import styles from './VideoPlayPill.module.css';

const ExternalLinkIcon = ({
  width = 16,
  height = 16,
  color = 'currentColor',
  foreground,
  ...props
}: Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { width?: number; height?: number; foreground?: string }) => (
  <svg
    {...props}
    aria-hidden={props['aria-hidden'] ?? props['aria-label'] == null}
    role={props.role ?? 'img'}
    width={width}
    height={height}
    viewBox="0 0 24 24"
  >
    <path
      className={foreground}
      fill={color}
      transform="translate(3.000000, 4.000000)"
      d="M16 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H2V4h14v10h-4v2h4c1.1 0 2-.9 2-2V2a2 2 0 0 0-2-2zM9 6l-4 4h3v6h2v-6h3L9 6z"
    />
  </svg>
);

ExternalLinkIcon.displayName = 'ExternalLinkIcon';

export interface VideoPlayPillProps {
  onPlay?: MouseEventHandler<HTMLElement> | null;
  externalURL?: string;
  className?: string;
  renderLinkComponent: RenderLinkComponent;
  /** Shows a non-interactive play icon when there's nothing to play. */
  inactive?: boolean;
  messageId?: string;
  channelId?: string;
}

/** The dark pill over a video thumbnail: a play button and/or a link to the video's page. */
export const VideoPlayPill = ({
  onPlay,
  externalURL,
  className,
  renderLinkComponent,
  inactive,
  messageId,
  channelId,
}: VideoPlayPillProps) => {
  const { disableInteractions } = useContext(MediaInteractionContext);
  const i18n = useEmbedI18n();
  const mediaI18n = useMediaContext().i18n;
  return (
    <div className={clsx(className, styles.wrapper, { [styles.disableInteractions]: disableInteractions })}>
      {inactive && onPlay == null ? (
        <div className={styles.iconWrapper}>
          <PlayIcon size="xs" color="currentColor" className={clsx(styles.iconPlay, styles.icon)} />
        </div>
      ) : null}
      {onPlay != null ? (
        <Clickable
          onClick={onPlay}
          className={clsx(styles.iconWrapperActive, styles.iconWrapper)}
          tabIndex={inactive ? -1 : 0}
          aria-label={mediaI18n.PLAY}
        >
          <PlayIcon size="xs" color="currentColor" className={clsx(styles.iconPlay, styles.icon)} />
        </Clickable>
      ) : null}
      {externalURL != null
        ? renderLinkComponent({
            href: externalURL,
            target: '_blank',
            rel: 'noreferrer noopener',
            className: clsx(styles.iconWrapperActive, styles.iconWrapper),
            children: (
              <ExternalLinkIcon
                aria-label={i18n.OPEN_LINK}
                className={
                  onPlay != null
                    ? clsx(styles.iconExternalMargins, styles.icon)
                    : clsx(styles.iconExternal, styles.icon)
                }
              />
            ),
            messageId,
            channelId,
          })
        : null}
    </div>
  );
};

VideoPlayPill.displayName = 'VideoPlayPill';
