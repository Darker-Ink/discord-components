import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from '@discord-mana/components';
import { ImageReadyState } from '../constants';
import { placeholderToDataURL } from '../thumbhash';
import styles from './Image.module.css';

export interface ImageLoadingOverlayProps {
  readyState: ImageReadyState;
  aspectRatio: number;
  placeholder?: string | null;
  placeholderVersion?: number | null;
  placeholderStyle?: CSSProperties;
  children?: ReactNode;
  disableSpinner?: boolean;
}

// The ThumbHash placeholder is only decoded for media that mounted while still loading.
const usePlaceholderSrc = (
  placeholder: string | null | undefined,
  version: number | null | undefined,
  enabled: boolean,
) => {
  const shouldDecode = enabled && version === 1 && placeholder != null;
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    if (shouldDecode) {
      // Discord decodes in a worker, so the placeholder shows up a tick after mount.
      Promise.resolve()
        .then(() => placeholderToDataURL(placeholder))
        .then(
          (png) => {
            if (!canceled) setSrc(png);
          },
          () => {},
        );
    }
    return () => {
      canceled = true;
    };
  }, [placeholder, shouldDecode]);
  return src;
};

export const ImageLoadingOverlay = ({
  readyState,
  aspectRatio,
  placeholder,
  placeholderVersion,
  placeholderStyle,
  children,
  disableSpinner = false,
}: ImageLoadingOverlayProps) => {
  const loading = readyState === ImageReadyState.LOADING;
  const [mountedLoading] = useState(loading);
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const [mountedAt] = useState(() => Date.now());
  const placeholderSrc = usePlaceholderSrc(placeholder, placeholderVersion, mountedLoading);
  // Fast fade when the image arrived right away, so cached images don't flash the placeholder.
  // eslint-disable-next-line react-hooks/purity
  const fastFade = readyState === ImageReadyState.READY && Date.now() - mountedAt < 200;

  useEffect(() => {
    if (disableSpinner) return;
    const timeout = setTimeout(() => setSpinnerVisible(true), 2000);
    return () => clearTimeout(timeout);
  }, [disableSpinner, mountedLoading]);

  return (
    <div className={styles.loadingOverlay} style={{ aspectRatio }}>
      {children}
      {placeholderSrc != null && (
        <img
          style={placeholderStyle}
          className={clsx(styles.imagePlaceholder, {
            [styles.imagePlaceholderVisible]: loading,
            [styles.imagePlaceholderHidden]: !loading,
            [styles.imagePlaceholderFastFade]: fastFade,
          })}
          src={placeholderSrc}
          alt=""
        />
      )}
      {disableSpinner || !loading ? null : (
        <div
          aria-hidden={!spinnerVisible}
          className={clsx(styles.imageLoadingOverlay, { [styles.imageLoadingOverlayVisible]: spinnerVisible })}
        >
          <Spinner
            type={Spinner.Type.SPINNING_CIRCLE_SIMPLE}
            animated={spinnerVisible}
            className={styles.cornerLoadingSpinner}
          />
        </div>
      )}
    </div>
  );
};

ImageLoadingOverlay.displayName = 'ImageLoadingOverlay';
