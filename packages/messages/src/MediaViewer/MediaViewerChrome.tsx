import { memo, useContext, type ReactNode } from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '@discord-mana/components';
import { useMediaViewerZoom } from './MediaViewerZoomContext';
import styles from './Chrome.module.css';

export const MediaViewerChromeMode = {
  DEFAULT: 'DEFAULT',
  FOCUS_SENSITIVE: 'FOCUS_SENSITIVE',
  PINNED: 'PINNED',
} as const;

export type MediaViewerChromeMode = (typeof MediaViewerChromeMode)[keyof typeof MediaViewerChromeMode];

/**
 * The viewer's controls fade in on open and out while zoomed (unless pinned, focused in keyboard mode, or
 * focus-sensitive and focused). Children receive the class to apply.
 */
export const MediaViewerChrome = memo(
  ({
    children,
    mode = MediaViewerChromeMode.DEFAULT,
  }: {
    children: (className: string) => ReactNode;
    mode?: MediaViewerChromeMode;
  }) => {
    const { zoomed } = useMediaViewerZoom();
    const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
    return children(
      clsx(styles.base, {
        [styles.hidden]: zoomed && !keyboardModeEnabled && mode !== MediaViewerChromeMode.PINNED,
        [styles.focusSensitive]: mode === MediaViewerChromeMode.FOCUS_SENSITIVE,
      }),
    );
  },
);

MediaViewerChrome.displayName = 'MediaViewerChrome';
