import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { HiddenVisually } from '../HiddenVisually';
import { KeyCombo } from '../KeyCombo';
import { Text } from '../Text';
import { TooltipLayer, type TooltipAlign, type TooltipCaretConfig } from './TooltipLayer';
import { assignRef, stringifyTooltipContent, type TooltipPosition } from './tooltipUtils';
import { useTooltip, type TooltipVisibilityOptions } from './useTooltip';
import { useTooltipTransition } from './useTooltipTransition';
import styles from './Tooltip.module.css';

export interface TooltipProps extends TooltipVisibilityOptions {
  children?: ReactNode;
  text?: string | null;
  keyboardShortcut?: string;
  // Escape hatch for rich content; prefer RichTooltip.
  __unsupportedReactNodeAsText?: ReactNode;
  asContainer?: boolean;
  tag?: string;
  position?: TooltipPosition;
  align?: TooltipAlign;
  spacing?: number;
  targetElementRef?: Ref<HTMLElement>;
  // Position against this element instead of the trigger.
  anchorRef?: RefObject<HTMLElement | null>;
  caretConfig?: TooltipCaretConfig;
  positionKey?: string;
  ariaHidden?: boolean;
}

export const Tooltip = ({
  children,
  text,
  keyboardShortcut,
  __unsupportedReactNodeAsText,
  asContainer = false,
  tag = 'span',
  position = 'top',
  align = 'center',
  spacing,
  targetElementRef,
  anchorRef,
  caretConfig,
  positionKey,
  ariaHidden = false,
  ...options
}: TooltipProps) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (anchorRef != null) setTargetElement(anchorRef.current);
  }, [anchorRef]);
  const setTargetRef = useCallback(
    (element: HTMLElement | null) => {
      if (anchorRef == null) setTargetElement(element);
      assignRef(targetElementRef, element);
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
    containerTag: tag,
    ariaHidden,
    ...options,
  });
  const [isRendered, setIsRendered] = useState(false);
  const content = useMemo(() => {
    if (__unsupportedReactNodeAsText != null) return __unsupportedReactNodeAsText;
    if (text == null || text === '') return null;
    if (keyboardShortcut != null && keyboardShortcut !== '') {
      return (
        <div className={styles.tooltipWithShortcut}>
          <Text variant="body-sm/medium">{text}</Text>
          <KeyCombo shortcut={keyboardShortcut} />
        </div>
      );
    }
    return text;
  }, [text, keyboardShortcut, __unsupportedReactNodeAsText]);
  const hasContent = content != null && (typeof content !== 'string' || content !== '');
  const isShown = isVisible || isRendered;
  // Stays rendered after hiding until the exit animation completes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isVisible && hasContent) setIsRendered(true);
    else if (!hasContent) setIsRendered(false);
  }, [isVisible, hasContent]);
  const handleExitComplete = useCallback(() => {
    setIsRendered(false);
  }, []);
  const transition = useTooltipTransition({ shouldShow: isVisible, onExitComplete: handleExitComplete });

  if (!hasContent && (isVisible || !isRendered)) return children;
  if (children == null || (!asContainer && !isValidElement(children))) return null;

  const layerPositionKey = positionKey ?? stringifyTooltipContent(text);
  const layer = transition((style, show) =>
    show ? (
      <TooltipLayer
        isVisible={isVisible}
        isRendered={isShown}
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
    ) : null,
  );
  return (
    <>
      {trigger}
      {ariaHidden || content == null || content === '' ? null : (
        <HiddenVisually id={tooltipId}>{content}</HiddenVisually>
      )}
      {layer}
    </>
  );
};

Tooltip.displayName = 'Tooltip';
