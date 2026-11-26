import {
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { Clickable, FocusRing, Text } from '@discord-mana/components';
import { ImageReadyState, MediaLayoutType } from '../constants';
import { useMediaContext } from '../MediaContext';
import { fit, type Dimensions } from '../sizing';
import { getDevicePixelRatio } from '../mediaUrl';
import { ImageLoadingOverlay } from './ImageLoadingOverlay';
import { useImageDialogDescriptionId } from './imageDialogDescription';
import styles from './Image.module.css';
import illustrationStyles from './Illustration.module.css';

export interface ImageRenderProps {
  src: string;
  size: Dimensions;
  alt?: string | null;
  className?: string;
  mediaLayoutType?: MediaLayoutType;
  /** Only passed by LazyImage for animated media. */
  animating?: boolean;
}

export interface ImageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick' | 'placeholder'> {
  className?: string;
  imageClassName?: string;
  readyState?: ImageReadyState;
  src: string;
  placeholder?: string | null;
  placeholderVersion?: number | null;
  alt?: string | null;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  mediaLayoutType?: MediaLayoutType;
  limitResponsiveWidth?: boolean;
  accessory?: ReactNode;
  zoomable?: boolean;
  /** Original URL; renders a hidden link to it (for "Copy Link" and drag & drop). */
  original?: string;
  children?: (props: ImageRenderProps) => ReactNode;
  renderAccessory?: () => ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  tabIndex?: number;
  dataSafeSrc?: string;
  useFullWidth?: boolean;
  srcIsAnimated?: boolean;
  disableLoadingSpinner?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export const getMediaStyle = (size: Dimensions, mediaLayoutType?: MediaLayoutType): CSSProperties => {
  switch (mediaLayoutType) {
    case MediaLayoutType.MOSAIC:
      return {
        display: 'block',
        objectFit: 'cover',
        minWidth: '100%',
        minHeight: '100%',
        maxWidth: getDevicePixelRatio() === 1 ? 'calc(100% + 1px)' : '100%',
      };
    case MediaLayoutType.RESPONSIVE:
      return getResponsiveStyle(size);
    default:
      return size;
  }
};

const getResponsiveStyle = ({ width, height }: Dimensions): CSSProperties => ({
  maxWidth: width,
  maxHeight: height,
  width: '100%',
  display: 'block',
  aspectRatio: `${width} / ${height}`,
});

const getWrapperStyle = (
  size: Dimensions,
  limitResponsiveWidth: boolean,
  useFullWidth: boolean,
  mediaLayoutType?: MediaLayoutType,
): CSSProperties =>
  mediaLayoutType === MediaLayoutType.MOSAIC
    ? {
        display: 'block',
        maxHeight: 'inherit',
        margin: 'auto',
        width: useFullWidth ? '100%' : size.width,
        height: '100%',
      }
    : mediaLayoutType === MediaLayoutType.RESPONSIVE
      ? {
          maxWidth: limitResponsiveWidth ? size.width : undefined,
          width: '100%',
          aspectRatio: `${size.width} / ${size.height}`,
        }
      : size;

const ERROR_ILLUSTRATION =
  'https://cdn.discordapp.com/assets/content/9704f78db46554d26701d9fdb7e758c796cea63014fb2633f39bec487a3322b6.svg';

const ImageErrorIllustration = ({ alt }: { alt: string }) => (
  <img
    style={{ width: 'auto', height: 'auto', aspectRatio: '288 / 162' }}
    src={ERROR_ILLUSTRATION}
    className={illustrationStyles.contain}
    alt={alt}
    role="img"
  />
);

ImageErrorIllustration.displayName = 'ImageErrorIllustration';

const ImageError = ({
  size,
  mediaLayoutType,
  alt,
}: {
  size: Dimensions;
  mediaLayoutType?: MediaLayoutType;
  alt?: string | null;
}) => {
  const { i18n } = useMediaContext();
  const style: CSSProperties =
    mediaLayoutType === MediaLayoutType.MOSAIC
      ? {
          width: '100%',
          height: '100%',
          aspectRatio: `${size.width} / ${size.height}`,
          display: 'flex',
          maxHeight: 'inherit',
        }
      : mediaLayoutType === MediaLayoutType.RESPONSIVE
        ? { ...getResponsiveStyle(size), display: 'flex' }
        : size;
  return (
    <div className={styles.imageErrorWrapper} style={style}>
      <div className={styles.imageErrorIllustration}>
        <ImageErrorIllustration alt={alt ?? i18n.IMAGE} />
      </div>
      <Text className={styles.imageErrorText} variant="body-sm/medium" color="text-subtle">
        {i18n.IMAGE_FAILED_TO_LOAD}
      </Text>
    </div>
  );
};

ImageError.displayName = 'ImageError';

/** Discord's `Image`: a sized media wrapper with loading placeholder, error state, click target and accessory. */
export const Image = ({
  className,
  imageClassName,
  readyState = ImageReadyState.READY,
  src,
  placeholder,
  placeholderVersion,
  alt,
  width,
  height,
  maxWidth = width,
  maxHeight = height,
  minWidth = 0,
  minHeight = 0,
  mediaLayoutType,
  limitResponsiveWidth = true,
  accessory,
  zoomable = true,
  original,
  children,
  renderAccessory,
  onClick,
  tabIndex,
  dataSafeSrc,
  useFullWidth = false,
  srcIsAnimated: _srcIsAnimated,
  disableLoadingSpinner = false,
  ref,
  ...rest
}: ImageProps) => {
  const { i18n } = useMediaContext();
  const ringTarget = useRef<HTMLAnchorElement>(null);
  const focusTarget = useRef<HTMLElement>(null);
  const describedBy = useImageDialogDescriptionId(onClick != null);
  const size = useMemo(
    () => fit({ width, height, maxWidth, maxHeight, minWidth, minHeight }),
    [width, height, maxWidth, maxHeight, minWidth, minHeight],
  );
  if (width === 1 && height === 1) return null;

  const aspectRatio = size.width !== 0 ? size.width / size.height : 1;
  const renderMedia =
    children ??
    (({ src: mediaSrc, size: mediaSize, alt: mediaAlt, className: mediaClassName, mediaLayoutType: layout }) => (
      <img
        className={mediaClassName ?? undefined}
        alt={mediaAlt ?? i18n.IMAGE}
        src={mediaSrc}
        style={getMediaStyle(mediaSize, layout)}
      />
    ));

  let media: ReactNode = null;
  if (src !== '' && readyState !== ImageReadyState.ERROR) {
    media = renderMedia({ src, size, alt, className: imageClassName, mediaLayoutType });
  } else if (readyState !== ImageReadyState.LOADING) {
    media = <ImageError size={size} mediaLayoutType={mediaLayoutType} alt={alt} />;
  }
  media = (
    <ImageLoadingOverlay
      disableSpinner={disableLoadingSpinner}
      readyState={readyState}
      aspectRatio={aspectRatio}
      placeholder={placeholder}
      placeholderVersion={placeholderVersion}
      placeholderStyle={getMediaStyle(size, mediaLayoutType)}
    >
      {media}
    </ImageLoadingOverlay>
  );

  const accessoryNode = (renderAccessory != null ? renderAccessory() : null) ?? accessory;

  return (
    <FocusRing ringTarget={ringTarget} focusTarget={focusTarget}>
      <div
        ref={ref}
        className={clsx(
          'imageWrapper',
          styles.imageWrapper,
          {
            [styles.imageZoom]: zoomable,
            [styles.imageWrapperBackground]: readyState !== ImageReadyState.READY,
            [styles.clickable]: onClick != null,
          },
          className,
        )}
        style={getWrapperStyle(size, limitResponsiveWidth, useFullWidth, mediaLayoutType)}
        {...rest}
      >
        {original != null && (
          <a
            tabIndex={-1}
            onClick={onClick}
            aria-hidden
            className={styles.originalLink}
            href={original}
            ref={ringTarget}
            data-role="img"
            data-safe-src={dataSafeSrc ?? src}
          />
        )}
        {onClick != null ? (
          <Clickable
            className={styles.clickableWrapper}
            tabIndex={tabIndex ?? 0}
            onClick={onClick}
            aria-label={alt ?? i18n.IMAGE}
            aria-describedby={describedBy}
            innerRef={focusTarget}
            focusProps={{ enabled: false }}
          >
            {media}
          </Clickable>
        ) : (
          media
        )}
        {accessoryNode != null ? <div className={styles.imageAccessory}>{accessoryNode}</div> : null}
      </div>
    </FocusRing>
  );
};

Image.displayName = 'Image';
