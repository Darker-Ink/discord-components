import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { FocusRing, Popout, Text } from '@discord-components/components';
import { MediaLayoutType } from '../constants';
import { useMediaContext } from '../MediaContext';
import { LazyImageZoomable, type LazyImageZoomableProps } from '../LazyImage/LazyImageZoomable';
import { MediaVideo, type MediaVideoProps } from '../MediaVideo/MediaVideo';
import styles from './AltText.module.css';

const AltTextPopout = ({
  altText,
  altButtonRef,
}: {
  altText: string;
  altButtonRef: RefObject<HTMLButtonElement | null>;
}) => {
  const { i18n } = useMediaContext();
  return (
    <div
      role="dialog"
      aria-label={i18n.IMAGE_DESCRIPTION_ALT_TEXT}
      className={styles.mediaMosaicAltTextPopout}
      tabIndex={-1}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') setTimeout(() => altButtonRef.current?.focus(), 0);
      }}
    >
      <Text variant="body-xs/semibold" color="none" tag="span" className={styles.mediaMosaicAltTextPopoutTitle}>
        {i18n.IMAGE_DESCRIPTION_ALT_TEXT}
      </Text>
      <Text variant="body-md/normal" color="none" tag="span" className={styles.mediaMosaicAltTextPopoutDescription}>
        {altText}
      </Text>
    </div>
  );
};

AltTextPopout.displayName = 'AltTextPopout';

/** Whether media should show its alt text (the "Show image descriptions" setting is on and there is one). */
export const useShouldShowAltText = ({
  alt,
  disableAltTextDisplay = false,
  hiddenSpoilers = false,
}: {
  alt?: string | null;
  disableAltTextDisplay?: boolean;
  hiddenSpoilers?: boolean;
}) => {
  const { viewImageDescriptions } = useMediaContext();
  return !disableAltTextDisplay && viewImageDescriptions && alt != null && alt !== '' && !hiddenSpoilers;
};

const AltTextButton = ({
  alt,
  className,
  reducedSize,
  onMouseEnter,
  onMouseLeave,
}: {
  alt: string;
  className?: string;
  reducedSize: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) => {
  const { i18n } = useMediaContext();
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Popout
      targetElementRef={buttonRef}
      animation={Popout.Animation.FADE}
      renderPopout={() => <AltTextPopout altText={alt} altButtonRef={buttonRef} />}
    >
      {(props) => (
        <FocusRing offset={4}>
          <button
            {...props}
            type="button"
            ref={buttonRef}
            aria-label={i18n.IMAGE_DESCRIPTION_ALT_TEXT}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={clsx(styles.mediaMosaicAltText, className, { [styles.reducedSize]: reducedSize })}
          >
            {i18n.ALT}
          </button>
        </FocusRing>
      )}
    </Popout>
  );
};

AltTextButton.displayName = 'AltTextButton';

export interface MediaAltTextButtonProps {
  alt?: string | null;
  /** Video controls hide after a while; the badge hides with them unless hovered. */
  controlsVisible?: boolean;
  disableAltTextDisplay?: boolean;
  hiddenSpoilers?: boolean;
  reducedSizeAltTextButton?: boolean;
}

/** The "ALT" badge in the top corner of a mosaic video. */
export const MediaVideoAltTextButton = ({
  alt,
  controlsVisible = true,
  disableAltTextDisplay = false,
  hiddenSpoilers = false,
  reducedSizeAltTextButton = false,
}: MediaAltTextButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const show = useShouldShowAltText({ alt, disableAltTextDisplay, hiddenSpoilers });
  return (controlsVisible || hovered) && alt != null && show ? (
    <div className={styles.mediaMosaicVideoAltTextContainer}>
      <AltTextButton
        alt={alt}
        className={styles.mediaMosaicVideoAltText}
        reducedSize={reducedSizeAltTextButton}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
    </div>
  ) : null;
};

MediaVideoAltTextButton.displayName = 'MediaVideoAltTextButton';

export interface MediaImageProps extends LazyImageZoomableProps {
  hiddenSpoilers?: boolean;
  renderAdjacentContent?: () => ReactNode;
  containerClassName?: string;
  imageContainerClassName?: string;
  disableAltTextDisplay?: boolean;
  reducedSizeAltTextButton?: boolean;
  imageContainerStyle?: CSSProperties;
  /** Shows alt text as the ALT badge (mosaic style) even outside a mosaic. */
  mosaicStyleAlt?: boolean;
}

/** The client's `renderImageComponent`: a zoomable lazy image with its alt text and adjacent hover actions. */
export const MediaImage = (props: MediaImageProps) => {
  const {
    alt,
    hiddenSpoilers,
    renderAdjacentContent,
    containerClassName,
    imageContainerClassName,
    disableAltTextDisplay = false,
    reducedSizeAltTextButton = false,
    mediaLayoutType,
    imageContainerStyle,
    mosaicStyleAlt,
    ...imageProps
  } = props;
  const mosaicAlt = mediaLayoutType === MediaLayoutType.MOSAIC || mosaicStyleAlt === true;
  const showAlt = useShouldShowAltText({ alt, disableAltTextDisplay, hiddenSpoilers: hiddenSpoilers === true });
  return (
    <div className={clsx(styles.imageContent, containerClassName)}>
      <div className={clsx(styles.imageContainer, imageContainerClassName)} style={imageContainerStyle}>
        <LazyImageZoomable {...imageProps} alt={alt} mediaLayoutType={mediaLayoutType} />
        {renderAdjacentContent != null && renderAdjacentContent()}
      </div>
      {mosaicAlt && showAlt && alt != null && (
        <div className={styles.mediaMosaicAltTextContainer}>
          <AltTextButton alt={alt} reducedSize={reducedSizeAltTextButton} />
        </div>
      )}
      {!mosaicAlt && showAlt && (
        <Text variant="body-xs/medium" color="text-muted" tag="span" className={styles.altText}>
          {alt}
        </Text>
      )}
    </div>
  );
};

MediaImage.displayName = 'MediaImage';

export interface MediaVideoWithAltTextProps extends MediaVideoProps {
  renderAdjacentContent?: () => ReactNode;
  disableAltTextDisplay?: boolean;
  hiddenSpoilers?: boolean;
  mosaicStyleAlt?: boolean;
  reducedSizeAltTextButton?: boolean;
}

/** The client's `renderVideoComponent`: a MediaVideo with alt text and adjacent hover actions. */
export const MediaVideoWithAltText = ({
  alt,
  renderAdjacentContent,
  renderOverlayContent,
  disableAltTextDisplay = false,
  hiddenSpoilers,
  mosaicStyleAlt,
  mediaLayoutType,
  reducedSizeAltTextButton,
  // The client replaces these with its own handlers for the ALT badge, so callers' handlers never run.
  onControlsHide: _onControlsHide,
  onControlsShow: _onControlsShow,
  ...props
}: MediaVideoWithAltTextProps) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const mosaicAlt = mediaLayoutType === MediaLayoutType.MOSAIC || mosaicStyleAlt === true;
  const showInlineAlt =
    useShouldShowAltText({ alt, disableAltTextDisplay, hiddenSpoilers: hiddenSpoilers === true }) && controlsVisible;
  return (
    <>
      <MediaVideo
        {...props}
        alt={alt ?? undefined}
        mediaLayoutType={mediaLayoutType}
        onControlsHide={() => setControlsVisible(false)}
        onControlsShow={() => setControlsVisible(true)}
        renderOverlayContent={renderOverlayContent}
      />
      {renderAdjacentContent != null && renderAdjacentContent()}
      {mosaicAlt && (
        <MediaVideoAltTextButton
          alt={alt}
          controlsVisible={controlsVisible}
          disableAltTextDisplay={disableAltTextDisplay}
          hiddenSpoilers={hiddenSpoilers}
          reducedSizeAltTextButton={reducedSizeAltTextButton}
        />
      )}
      {!mosaicAlt && showInlineAlt && (
        <Text variant="body-xs/medium" color="text-muted" tag="span" className={styles.altText}>
          {alt}
        </Text>
      )}
    </>
  );
};

MediaVideoWithAltText.displayName = 'MediaVideoWithAltText';
