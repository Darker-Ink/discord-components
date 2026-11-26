import { useMemo } from 'react';
import clsx from 'clsx';
import { MediaLayoutType } from '../media/constants';
import { GifFavoriteButtonContext, MediaMosaicItem } from './MediaMosaicItem';
import { isVisualMediaType, type MediaMosaicItemProps } from './types';
import styles from './MediaMosaic.module.css';

// Grid gap between tiles (`grid-gap: 4px` in the CSS).
const GAP = 4;
const TILE_MAX_HEIGHT = 173;

interface MosaicLayoutItemProps {
  props: MediaMosaicItemProps<unknown, unknown>;
  maxWidth?: number;
  maxHeight?: number;
  useFullWidth?: boolean;
  isSingleItem?: boolean;
  displayGridItem?: boolean;
}

const MosaicLayoutItem = ({
  props,
  maxWidth = 550,
  maxHeight = 350,
  useFullWidth = true,
  isSingleItem = false,
  displayGridItem,
}: MosaicLayoutItemProps) => {
  const { type } = props.item;
  const itemProps = {
    ...props,
    ...(type === 'IMAGE' && {
      className: clsx(props.className, styles.itemContentContainer),
      imgContainerClassName: styles.lazyImgContainer,
      imgClassName: styles.lazyImg,
    }),
    ...((type === 'VIDEO' || type === 'CLIP') && { className: clsx(props.className, styles.lazyImg) }),
    displayGridItem,
    mediaLayoutType: MediaLayoutType.MOSAIC,
    maxWidth,
    maxHeight,
    useFullWidth,
    isSingleMosaicItem: isSingleItem,
  };
  return (
    <GifFavoriteButtonContext.Provider value={props.gifFavoriteButton ?? (() => null)}>
      <MediaMosaicItem {...itemProps} />
    </GifFavoriteButtonContext.Provider>
  );
};

MosaicLayoutItem.displayName = 'MosaicLayoutItem';

interface LayoutProps {
  itemsForLayout: MediaMosaicItemProps<unknown, unknown>[];
  maxWidth: number;
}

const OneByOneLayout = ({ itemsForLayout, maxWidth, isSingleImage }: LayoutProps & { isSingleImage?: boolean }) => (
  <div
    className={clsx(styles.oneByOneGrid, {
      [styles.oneByOneGridSingle]: isSingleImage,
      [styles.oneByOneGridMosaic]: !isSingleImage,
    })}
  >
    <MosaicLayoutItem props={itemsForLayout[0]} useFullWidth={!isSingleImage} isSingleItem maxWidth={maxWidth} />
  </div>
);

OneByOneLayout.displayName = 'OneByOneLayout';

const OneByTwoLayout = ({ itemsForLayout, maxWidth }: LayoutProps) => {
  const tileSize = Math.round((maxWidth - GAP) / 2);
  return (
    <div className={styles.oneByTwoGrid}>
      {itemsForLayout.map((item) => (
        <div key={item.item.uniqueId} className={styles.oneByTwoGridItem}>
          <MosaicLayoutItem props={item} maxWidth={tileSize} maxHeight={tileSize} />
        </div>
      ))}
    </div>
  );
};

OneByTwoLayout.displayName = 'OneByTwoLayout';

const OneByTwoLayoutThree = ({ itemsForLayout, maxWidth }: LayoutProps) => {
  const soloWidth = Math.round((2 * (maxWidth - GAP)) / 3);
  const duoWidth = soloWidth / 2;
  return (
    <div className={clsx(styles.oneByTwoGrid, styles.oneByTwoLayoutThreeGrid)}>
      <div className={styles.oneByTwoSoloItem}>
        <MosaicLayoutItem props={itemsForLayout[0]} maxWidth={soloWidth} />
      </div>
      <div className={styles.oneByTwoDuoItem}>
        <div className={styles.twoByOneGrid}>
          {itemsForLayout.slice(1).map((item) => (
            <div key={item.item.uniqueId} className={styles.twoByOneGridItem}>
              <MosaicLayoutItem props={item} maxWidth={duoWidth} maxHeight={TILE_MAX_HEIGHT} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

OneByTwoLayoutThree.displayName = 'OneByTwoLayoutThree';

const TwoByTwoLayout = ({ itemsForLayout, maxWidth }: LayoutProps) => {
  const tileSize = Math.round((maxWidth - GAP) / 2);
  return (
    <div className={styles.twoByTwoGrid}>
      {itemsForLayout.map((item) => (
        <MosaicLayoutItem
          key={item.item.uniqueId}
          props={item}
          maxWidth={tileSize}
          maxHeight={TILE_MAX_HEIGHT}
          displayGridItem
        />
      ))}
    </div>
  );
};

TwoByTwoLayout.displayName = 'TwoByTwoLayout';

const ThreeByThreeLayout = ({ itemsForLayout, maxWidth }: LayoutProps) => {
  const tileSize = Math.round((maxWidth - 2 * GAP) / 3);
  return (
    <div className={styles.threeByThreeGrid}>
      {itemsForLayout.map((item) => (
        <MosaicLayoutItem
          key={item.item.uniqueId}
          props={item}
          maxWidth={tileSize}
          maxHeight={tileSize}
          displayGridItem
        />
      ))}
    </div>
  );
};

ThreeByThreeLayout.displayName = 'ThreeByThreeLayout';

/**
 * Picks the grid for the number of visual items: 1 alone, 2 side by side, 3 as one large + two stacked, 4 as 2×2,
 * and from 5 on rows of three, with the remainder (1 or 2) as a first row on top.
 */
const MosaicLayout = ({
  visualMediaItems,
  maxWidth,
}: {
  visualMediaItems: LayoutProps['itemsForLayout'];
  maxWidth: number;
}) => {
  const count = visualMediaItems.length;
  if (count === 1) return <OneByOneLayout itemsForLayout={visualMediaItems} isSingleImage maxWidth={maxWidth} />;
  if (count === 2) return <OneByTwoLayout itemsForLayout={visualMediaItems} maxWidth={maxWidth} />;
  if (count === 3) return <OneByTwoLayoutThree itemsForLayout={visualMediaItems} maxWidth={maxWidth} />;
  if (count === 4) return <TwoByTwoLayout itemsForLayout={visualMediaItems} maxWidth={maxWidth} />;
  const remainder = count % 3;
  return (
    <>
      {remainder === 1 && <OneByOneLayout itemsForLayout={visualMediaItems.slice(0, remainder)} maxWidth={maxWidth} />}
      {remainder === 2 && <OneByTwoLayout itemsForLayout={visualMediaItems.slice(0, remainder)} maxWidth={maxWidth} />}
      {remainder === 0 ? (
        <ThreeByThreeLayout itemsForLayout={visualMediaItems} maxWidth={maxWidth} />
      ) : (
        <ThreeByThreeLayout itemsForLayout={visualMediaItems.slice(remainder)} maxWidth={maxWidth} />
      )}
    </>
  );
};

MosaicLayout.displayName = 'MosaicLayout';

export interface MediaMosaicProps<T = unknown, M = unknown> {
  items: MediaMosaicItemProps<T, M>[];
  /** Components v2 media galleries are up to 600px wide instead of 550px. */
  isInAppComponentsV2?: boolean;
  /** Discord shows a clips upsell under messages with clips; it needs the client's stores, so it never renders. */
  hideClipMessageNotice?: boolean;
}

/** Discord's attachment media mosaic: images and videos in a grid, other files listed under it. */
export const MediaMosaic = <T, M>({ items, isInAppComponentsV2 = false }: MediaMosaicProps<T, M>) => {
  const { visualMediaItems, nonVisualMediaItems } = useMemo(() => {
    const visual: MediaMosaicItemProps<T, M>[] = [];
    const nonVisual: MediaMosaicItemProps<T, M>[] = [];
    for (const item of items) (isVisualMediaType(item.item.type) ? visual : nonVisual).push(item);
    return { visualMediaItems: visual, nonVisualMediaItems: nonVisual };
  }, [items]);
  return (
    <>
      {visualMediaItems.length > 0 && (
        <div
          className={clsx(styles.visualMediaItemContainer, {
            [styles.isInAppComponentsV2]: isInAppComponentsV2,
            [styles.isClipEmbed]: visualMediaItems.length === 1 && visualMediaItems[0].item.type === 'CLIP',
          })}
        >
          <MosaicLayout
            visualMediaItems={visualMediaItems as LayoutProps['itemsForLayout']}
            maxWidth={isInAppComponentsV2 ? 600 : 550}
          />
        </div>
      )}
      {nonVisualMediaItems.length > 0 && (
        <div className={styles.nonVisualMediaItemContainer}>
          {nonVisualMediaItems.map((item) => (
            <div key={item.item.uniqueId} className={styles.nonVisualMediaItem}>
              <MosaicLayoutItem props={item as LayoutProps['itemsForLayout'][number]} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

MediaMosaic.displayName = 'MediaMosaic';
