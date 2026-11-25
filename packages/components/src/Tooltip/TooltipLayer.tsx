import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { animated, type SpringValues } from '@react-spring/web';
import clsx from 'clsx';
import { FloatingLayer, getFloatingLayerPlacement, getFloatingLayerSide } from '../FloatingLayer';
import { Text } from '../Text';
import { useRichTooltipContext } from './RichTooltipContext';
import { getCaretPosition, type TooltipPosition } from './tooltipUtils';
import styles from './Tooltip.module.css';
import caretStyles from './TooltipCaret.module.css';

export type TooltipAlign = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type TooltipCaretAlign = 'start' | 'center' | 'end' | 'custom';

export interface TooltipCaretConfig {
  position?: TooltipPosition;
  align?: TooltipCaretAlign;
  // With align 'custom': the caret's offset from the center, in px.
  customOffset?: number;
}

const TooltipCaretIcon = () => (
  <svg
    width="16"
    height="10"
    viewBox="0 0 16 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.caretIcon}
  >
    <path
      className={styles.caretFill}
      d="M10.3426 7.0715C9.14163 8.57272 6.85837 8.57272 5.65739 7.0715L0 -0.000244141L16 -0.000244141L10.3426 7.0715Z"
    />
    <mask
      id="mask0_tooltip_caret"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="-1"
      width="16"
      height="10"
    >
      <path
        d="M10.3426 7.0715C9.14163 8.57272 6.85837 8.57272 5.65739 7.0715L0 -0.000244141L16 -0.000244141L10.3426 7.0715Z"
        className={styles.caretFill}
      />
    </mask>
    <g mask="url(#mask0_tooltip_caret)">
      <path
        className={styles.caretStroke}
        d="M9.93457 6.84546C8.93433 8.06766 7.06567 8.06766 6.06543 6.84546L0.0546875 -0.500244L15.9453 -0.500244L9.93457 6.84546Z"
      />
    </g>
  </svg>
);

TooltipCaretIcon.displayName = 'TooltipCaretIcon';

// Keeps a custom caret within the tooltip's maximum width (minus the caret itself).
const clampCaretOffset = (offset: number, isRichTooltip: boolean, isLargePadding: boolean) => {
  const limit = (isRichTooltip ? (isLargePadding ? 372 : 272) : 200) / 2 - 8;
  return Math.max(-limit, Math.min(limit, offset));
};

export const TooltipCaret = ({ caretConfig }: { caretConfig: TooltipCaretConfig }) => {
  const { position, align, customOffset } = caretConfig;
  const { isRichTooltip, richTooltipPadding } = useRichTooltipContext();
  const isLargePadding = richTooltipPadding === 'lg';
  if (position == null) return null;
  const style =
    align === 'custom' && customOffset != null
      ? ({
          '--custom-caret-offset-x': ['top', 'bottom'].includes(position)
            ? `${clampCaretOffset(customOffset, isRichTooltip, isLargePadding)}px`
            : '0px',
          '--custom-caret-offset-y': ['left', 'right'].includes(position)
            ? `${clampCaretOffset(customOffset, isRichTooltip, isLargePadding)}px`
            : '0px',
        } as CSSProperties)
      : undefined;
  return (
    <div
      className={clsx(caretStyles.caret, caretStyles[`caret--${position}`], caretStyles[`caret--${align}`])}
      style={style}
    >
      <TooltipCaretIcon />
    </div>
  );
};

TooltipCaret.displayName = 'TooltipCaret';

export interface TooltipLayerProps {
  isVisible: boolean;
  isRendered?: boolean;
  targetElementRef: RefObject<HTMLElement | null>;
  targetElement?: HTMLElement | null;
  anchorRef?: RefObject<HTMLElement | null>;
  id?: string;
  content: ReactNode;
  position?: TooltipPosition;
  align?: TooltipAlign;
  spacing?: number;
  caretConfig?: TooltipCaretConfig;
  animationStyle?: SpringValues<{ scale: number; opacity: number }>;
  // Re-positions automatically while set (e.g. when the content can change size).
  positionKey?: string;
}

// The positioned tooltip bubble: a FloatingLayer around the target with the caret pointing at it.
// When the layer is shifted to stay on screen, the caret moves the other way to keep pointing at
// the target.
export const TooltipLayer = ({
  isVisible,
  isRendered = isVisible,
  targetElementRef,
  targetElement,
  anchorRef,
  id,
  content,
  position = 'top',
  align = 'center',
  spacing = 11,
  caretConfig,
  animationStyle,
  positionKey,
}: TooltipLayerProps) => {
  const { isRichTooltip } = useRichTooltipContext();
  const [ownerDocument, setOwnerDocument] = useState(targetElement?.ownerDocument);
  useLayoutEffect(() => {
    setOwnerDocument(
      anchorRef?.current?.ownerDocument ?? targetElement?.ownerDocument ?? targetElementRef.current?.ownerDocument,
    );
  }, [anchorRef, targetElement, targetElementRef]);
  if (!isRendered) return null;
  const placement = getFloatingLayerPlacement(position, align);
  // Read at render: the trigger has mounted by the time the tooltip shows.
  // eslint-disable-next-line react-hooks/refs
  const reference = targetElement ?? targetElementRef.current;
  return (
    <FloatingLayer
      className={styles.tooltipLayer}
      open={isRendered}
      dismissOnEscapeKey={false}
      spacing={spacing}
      placement={placement}
      reference={reference}
      ownerDocument={ownerDocument}
      autoUpdate={positionKey != null}
      renderLayer={({ placement: resolvedPlacement, shift }) => {
        const nudge = -(shift?.x ?? 0);
        const side = getFloatingLayerSide(resolvedPlacement) ?? position;
        const caretAlign = caretConfig?.align ?? (nudge != null && nudge !== 0 ? 'custom' : 'center');
        const caretOffset = caretConfig?.customOffset ?? nudge ?? 0;
        const caret: TooltipCaretConfig = {
          position: caretConfig?.position ?? getCaretPosition(side),
          align: caretAlign,
          customOffset: caretAlign === 'custom' ? caretOffset : undefined,
        };
        const tooltip = (
          <div
            id={id}
            className={clsx(styles.tooltip, { [styles.richTooltip]: isRichTooltip })}
            role="tooltip"
            data-position={side}
            data-mana-component="tooltip"
          >
            <TooltipCaret caretConfig={caret} />
            <div className={styles.tooltipContent}>
              {typeof content === 'string' ? <Text variant="body-sm/medium">{content}</Text> : content}
            </div>
          </div>
        );
        return animationStyle ? <animated.div style={animationStyle}>{tooltip}</animated.div> : tooltip;
      }}
    >
      {() => null}
    </FloatingLayer>
  );
};

TooltipLayer.displayName = 'TooltipLayer';
