import { Component, createRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { LayerContext, ReferenceAlign, ReferencePosition, AvoidancePadding } from '../Layer';
import { Spinner } from '../Spinner';
import {
  BasePopout,
  type BasePopoutProps,
  type PopoutCloseReason,
  type PopoutRenderProps,
  type PopoutScrollBehavior,
  type PopoutTriggerProps,
  type PopoutTriggerState,
} from './BasePopout';
import { PopoutAnimator } from './PopoutAnimator';
import styles from './Popout.module.css';

const PopoutAnimation = { NONE: '1', TRANSLATE: '2', SCALE: '3', FADE: '4' } as const;

export type PopoutAnimationType = (typeof PopoutAnimation)[keyof typeof PopoutAnimation];

const ANIMATOR_TYPES = Object.freeze({
  [PopoutAnimation.TRANSLATE]: PopoutAnimator.Types.TRANSLATE,
  [PopoutAnimation.SCALE]: PopoutAnimator.Types.SCALE,
  [PopoutAnimation.FADE]: PopoutAnimator.Types.FADE,
});

const getDefaultAlign = (position: ReferencePosition): ReferenceAlign => {
  switch (position) {
    case 'top':
    case 'bottom':
      return 'left';
    case 'left':
    case 'right':
      return 'top';
    case 'center':
    case 'window_center':
      return 'center';
  }
  throw Error(`Unexpected position: ${position}`);
};

export interface PopoutProps {
  children: (props: PopoutTriggerProps, state: PopoutTriggerState) => ReactNode;
  renderPopout?: (props: PopoutRenderProps) => ReactNode;
  targetElementRef?: { current: Element | null };
  shouldShow?: boolean;
  onRequestOpen?: () => void;
  onRequestClose?: (event: Event | undefined, reason: PopoutCloseReason | undefined) => unknown;
  onShiftClick?: (event: { shiftKey?: boolean }) => void;
  position?: ReferencePosition;
  align?: ReferenceAlign;
  // Animate as if the popout were on this side, whatever side it ends up on.
  animationPosition?: ReferencePosition;
  animation?: PopoutAnimationType;
  autoInvert?: boolean;
  nudgeAlignIntoViewport?: boolean;
  avoidancePadding?: AvoidancePadding;
  useRawTargetDimensions?: boolean;
  spacing?: number;
  fixed?: boolean;
  positionKey?: string;
  popoutKey?: string;
  preload?: () => Promise<unknown>;
  loadingComponent?: ReactNode;
  disablePointerEvents?: boolean;
  ignoreModalClicks?: boolean;
  scrollBehavior?: PopoutScrollBehavior;
  useMouseEnter?: boolean;
  layerContext?: LayerContext;
  clickTrap?: boolean;
}

// A popout attached to a trigger: `children` renders the trigger with the props it needs, and
// `renderPopout` renders the content next to it with an enter animation.
export class Popout extends Component<PopoutProps> {
  static displayName = 'Popout';

  static Animation = PopoutAnimation;

  ref = createRef<BasePopout>();

  override render() {
    const {
      children,
      shouldShow,
      onRequestOpen,
      onRequestClose,
      align,
      fixed,
      useRawTargetDimensions,
      onShiftClick,
      positionKey,
      popoutKey,
      preload,
      loadingComponent,
      disablePointerEvents,
      ignoreModalClicks,
      scrollBehavior,
      useMouseEnter,
      renderPopout,
      layerContext,
      position = 'right',
      autoInvert = true,
      nudgeAlignIntoViewport = true,
      avoidancePadding,
      spacing = 8,
      clickTrap = false,
    } = this.props;
    return (
      <BasePopout
        ref={this.ref}
        targetElementRef={this.props.targetElementRef}
        preload={preload}
        loadingComponent={loadingComponent}
        position={position}
        align={align != null ? align : getDefaultAlign(position)}
        autoInvert={autoInvert}
        fixed={fixed}
        nudgeAlignIntoViewport={nudgeAlignIntoViewport}
        avoidancePadding={avoidancePadding}
        useRawTargetDimensions={useRawTargetDimensions}
        renderPopout={this.renderPopout}
        spacing={spacing}
        shouldShow={renderPopout != null && (shouldShow as boolean)}
        onRequestOpen={onRequestOpen}
        onRequestClose={onRequestClose}
        onShiftClick={onShiftClick}
        positionKey={positionKey}
        popoutKey={popoutKey}
        disablePointerEvents={disablePointerEvents}
        ignoreModalClicks={ignoreModalClicks}
        scrollBehavior={scrollBehavior}
        useMouseEnter={useMouseEnter}
        layerContext={layerContext}
        clickTrap={clickTrap}
      >
        {children}
      </BasePopout>
    );
  }

  renderPopout = (props: PopoutRenderProps) => {
    const { renderPopout, animation = PopoutAnimation.TRANSLATE, animationPosition } = this.props;
    if (animationPosition != null && props.position != null) props.position = animationPosition;
    switch (animation) {
      case PopoutAnimation.TRANSLATE:
      case PopoutAnimation.SCALE:
      case PopoutAnimation.FADE:
        return (
          <PopoutAnimator position={props.position} type={ANIMATOR_TYPES[animation]}>
            {renderPopout?.(props)}
          </PopoutAnimator>
        );
      case PopoutAnimation.NONE:
        return renderPopout?.(props);
    }
    throw Error(`Unsupported animation config: ${JSON.stringify(animation)}`);
  };
}

type RenderPopout = (props: PopoutRenderProps) => ReactNode;

export interface LazyPopoutProps extends Omit<PopoutProps, 'renderPopout'> {
  // Loads the popout's render function (e.g. from a lazily imported module).
  renderPopout: () => Promise<RenderPopout>;
}

// A Popout whose content is code-split: it starts loading shortly after mounting, and if the
// popout opens before it arrives, shows a spinner for loads over 300ms.
export const LazyPopout = ({ renderPopout, ...props }: LazyPopoutProps) => {
  const popoutRef = useRef<Popout>(null);
  const [renderCount, setRenderCount] = useState(0);
  const startedRef = useRef(false);
  // The loaded render function (or the spinner while a slow load is pending); until then the
  // popout renders nothing and starts the load.
  const [loadedRender, setLoadedRender] = useState<RenderPopout | null>(null);

  const showLoaded = (render: RenderPopout) => {
    setLoadedRender(() => render);
    setRenderCount((count) => count + 1);
  };

  const renderLoader = () => {
    const target = popoutRef.current?.ref.current?.domElementRef.current as HTMLElement | null | undefined;
    const width = Math.max(100, target == null ? 100 : target.offsetWidth - 20);
    return (
      <div className={styles.loader} style={{ width }}>
        <Spinner />
      </div>
    );
  };

  const renderLoading: RenderPopout = () => {
    void (async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const timeout = setTimeout(() => showLoaded(renderLoader), 300);
      const loaded = await renderPopout();
      showLoaded(loaded);
      clearTimeout(timeout);
    })();
    return <></>;
  };

  useLayoutEffect(() => {
    if (renderCount > 0) popoutRef.current?.ref.current?.layerRef.current?.updatePosition();
  }, [renderCount]);

  useEffect(() => {
    const timeout = setTimeout(renderPopout, 20 + 20 * Math.random());
    return () => clearTimeout(timeout);
    // Preloads once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!startedRef.current) return;
    // A new loader replaces the content once it resolves.
    void renderPopout().then(showLoaded);
  }, [renderPopout]);

  return <Popout ref={popoutRef} {...props} renderPopout={loadedRender ?? renderLoading} />;
};

LazyPopout.displayName = 'LazyPopout';
LazyPopout.Animation = PopoutAnimation;

export type { BasePopoutProps };
