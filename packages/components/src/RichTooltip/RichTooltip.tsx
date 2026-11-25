import {
  isValidElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { Graphic, type GraphicProps } from '../Graphic';
import { HiddenVisually } from '../HiddenVisually';
import { Text } from '../Text';
import {
  RichTooltipProvider,
  TooltipLayer,
  useTooltip,
  useTooltipTransition,
  type RichTooltipPadding,
  type TooltipAlign,
  type TooltipCaretConfig,
  type TooltipPosition,
  type TooltipVisibilityOptions,
} from '../Tooltip';
import { assignRef, stringifyTooltipContent } from '../Tooltip/tooltipUtils';
import styles from './RichTooltip.module.css';

export type RichTooltipAssetSize = 16 | 20 | 24 | 32 | 48 | 80;

export interface RichTooltipProps extends TooltipVisibilityOptions {
  children?: ReactNode;
  title?: ReactNode;
  titleLineClamp?: number;
  body: ReactNode;
  lineClamp?: number;
  // A graphic description or any element (e.g. an icon or avatar).
  asset?: GraphicProps | ReactNode;
  assetSize?: RichTooltipAssetSize | number;
  padding?: RichTooltipPadding;
  asContainer?: boolean;
  element?: string;
  position?: TooltipPosition;
  align?: TooltipAlign;
  spacing?: number;
  caretConfig?: TooltipCaretConfig;
  targetElementRef?: Ref<HTMLElement>;
  anchorRef?: RefObject<HTMLElement | null>;
  positionKey?: string;
  ariaHidden?: boolean;
}

// A tooltip with a title, body text and an optional asset beside them.
export const RichTooltip = ({
  children,
  title,
  titleLineClamp,
  body,
  asset,
  assetSize = 48,
  padding = 'default',
  asContainer = false,
  element = 'span',
  position = 'top',
  align = 'center',
  spacing,
  caretConfig,
  targetElementRef,
  anchorRef,
  positionKey,
  ariaHidden = false,
  lineClamp,
  ...options
}: RichTooltipProps) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (anchorRef != null) setTargetElement(anchorRef.current);
  }, [anchorRef]);
  const setTargetRef = useCallback(
    (node: HTMLElement | null) => {
      if (anchorRef == null) setTargetElement(node);
      assignRef(targetElementRef, node);
    },
    [targetElementRef, anchorRef],
  );
  const {
    tooltipId,
    isVisible,
    targetElementRef: triggerElementRef,
    trigger,
  } = useTooltip({
    children,
    targetElementRef: setTargetRef,
    asContainer,
    containerTag: element,
    ariaHidden,
    ...options,
  });
  const hasTitle = title != null && (typeof title !== 'string' || title !== '');
  const isGraphic = asset != null && !isValidElement(asset);
  const content = useMemo(
    () => (
      <div
        className={clsx(styles.richTooltipContent, {
          [styles.noAsset]: asset == null,
          [styles.richTooltipContentLg]: padding === 'lg',
        })}
      >
        {asset != null && (
          <div className={styles.assetContainer} style={{ width: assetSize }}>
            {isGraphic ? <Graphic {...(asset as GraphicProps)} /> : asset}
          </div>
        )}
        <div className={styles.textContent}>
          {hasTitle && (
            <Text variant="body-sm/medium" lineClamp={titleLineClamp}>
              {title}
            </Text>
          )}
          <Text variant="body-sm/normal" color={hasTitle ? 'text-subtle' : 'text-default'} lineClamp={lineClamp}>
            {body}
          </Text>
        </div>
      </div>
    ),
    [asset, assetSize, padding, title, titleLineClamp, body, hasTitle, isGraphic, lineClamp],
  );
  const layerPositionKey = positionKey ?? `${stringifyTooltipContent(title ?? '')}|${stringifyTooltipContent(body)}`;
  const transition = useTooltipTransition({ shouldShow: isVisible });
  if (!asContainer && !isValidElement(children)) return null;
  const layer = transition((style, show) =>
    show ? (
      <RichTooltipProvider isRichTooltip richTooltipPadding={padding}>
        <TooltipLayer
          isVisible={isVisible}
          isRendered
          targetElementRef={triggerElementRef}
          targetElement={targetElement}
          anchorRef={anchorRef}
          id={tooltipId}
          content={content}
          position={position}
          align={align}
          spacing={spacing}
          caretConfig={caretConfig}
          animationStyle={style}
          positionKey={layerPositionKey}
        />
      </RichTooltipProvider>
    ) : null,
  );
  return (
    <>
      {trigger}
      {ariaHidden || content == null ? null : <HiddenVisually id={tooltipId}>{content}</HiddenVisually>}
      {layer}
    </>
  );
};

RichTooltip.displayName = 'RichTooltip';
