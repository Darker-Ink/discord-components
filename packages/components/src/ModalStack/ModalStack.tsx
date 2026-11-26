import { Fragment, PureComponent, useCallback, useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import clsx from 'clsx';
import { ModalTransitionState, type ModalTransitionStateValue } from '../Dialog/ModalContext';
import { AppLayer } from '../Layer/AppLayer';
import { VerificationLayer } from '../Layer/VerificationLayer';
import { ComponentActions, windowDispatch } from '../Popout/windowDispatch';
import { Backdrop } from './Backdrop';
import {
  BackdropStyles,
  closeModal,
  getCurrentModalContext,
  useModalsStore,
  type ModalLayerComponent,
  type ModalRender,
  type ModalStackEntry,
} from './modalStore';
import styles from './ModalStack.module.css';
import { TransitionGroup } from './TransitionGroup';

const TRANSITION_DURATION = 300;

interface ModalStackItemProps {
  modalKey: string;
  LayerComponent: ModalLayerComponent;
  isVisible: boolean;
  isTopModal: boolean;
  render: ModalRender;
  closeModal: (key: string) => void;
  instant: boolean | undefined;
  dismissable: boolean | undefined;
}

interface ModalStackItemState {
  transitionState: ModalTransitionStateValue | null;
}

// One open modal: tracks its transition state for the TransitionGroup and renders it in its layer.
class ModalStackItem extends PureComponent<ModalStackItemProps, ModalStackItemState> {
  override state: ModalStackItemState = { transitionState: null };

  componentWillAppear = (done?: () => void) => {
    this.componentWillEnter(done);
  };

  componentWillEnter = (done?: () => void) => {
    const { instant } = this.props;
    this.setState({ transitionState: ModalTransitionState.ENTERING });
    setTimeout(
      () => {
        this.setState({ transitionState: ModalTransitionState.ENTERED });
        done?.();
      },
      instant ? 0 : TRANSITION_DURATION,
    );
  };

  componentWillLeave = (done: () => void) => {
    const { instant } = this.props;
    this.setState({ transitionState: ModalTransitionState.EXITING });
    setTimeout(
      () => {
        this.setState({ transitionState: ModalTransitionState.EXITED });
        done();
      },
      instant ? 0 : TRANSITION_DURATION,
    );
  };

  override componentDidUpdate(prevProps: ModalStackItemProps) {
    if (prevProps.isVisible === this.props.isVisible) return;
    const { transitionState } = this.state;
    if (transitionState === ModalTransitionState.HIDDEN && this.props.isVisible) this.componentWillEnter();
    if (
      !this.props.isVisible &&
      (transitionState === ModalTransitionState.ENTERING || transitionState === ModalTransitionState.ENTERED)
    ) {
      this.setState({ transitionState: ModalTransitionState.HIDDEN });
    }
  }

  close = () =>
    new Promise<void>((resolve) => {
      this.props.closeModal(this.props.modalKey);
      setTimeout(() => resolve(), TRANSITION_DURATION);
    });

  override render() {
    const { render, LayerComponent, isTopModal, instant, dismissable } = this.props;
    const modal = render({
      transitionState: instant ? ModalTransitionState.ENTERED : this.state.transitionState,
      onClose: this.close,
      dismissable,
    });
    return (
      <LayerComponent>
        <div className={clsx(styles.layer, !isTopModal && styles.inactive)}>{modal}</div>
      </LayerComponent>
    );
  }
}

const LAYERS: readonly ModalLayerComponent[] = [AppLayer, VerificationLayer];

const EMPTY_STACK: ModalStackEntry[] = [];

const isInLayer = (modal: ModalStackEntry, Layer: ModalLayerComponent) =>
  modal.Layer === Layer || (modal.Layer == null && Layer === AppLayer);

// A modal replaced by the one above it (or by any modal above one that replaces all) stays mounted
// but hidden.
const withVisibility = (stack: ModalStackEntry[]) => {
  const result: (ModalStackEntry & { isVisible: boolean })[] = [];
  let hiddenByReplaceAll = false;
  for (let i = stack.length - 1; i >= 0; i--) {
    const modal = stack[i];
    const replacedByNext = hiddenByReplaceAll || stack[i + 1]?.stackingBehavior === 'replace';
    result.unshift({ ...modal, isVisible: !replacedByNext });
    if (modal.stackingBehavior === 'replaceAll') hiddenByReplaceAll = true;
  }
  return result;
};

// Renders the open modals of the current modal context, each in its layer above a backdrop, and
// closes the top one on Escape (MODAL_CLOSE) or a backdrop click. Render it once near the app root,
// inside the layer providers (Discord's client renders it right before the layer containers).
export const ModalStack = (): ReactElement => {
  const contextKey = getCurrentModalContext();
  const stack = useModalsStore((state) => state[contextKey] ?? EMPTY_STACK);
  const modals = useMemo(() => withVisibility(stack), [stack]);
  const topModalRef = useRef<ModalStackEntry | undefined>(undefined);
  useLayoutEffect(() => {
    topModalRef.current = stack[stack.length - 1];
  }, [stack]);

  const hasModals = stack.length > 0;
  useLayoutEffect(() => {
    if (!hasModals) return;
    const onModalClose = () => {
      const top = topModalRef.current;
      if (top != null && top.onCloseRequest != null && top.dismissable !== false) top.onCloseRequest();
    };
    windowDispatch.subscribe(ComponentActions.MODAL_CLOSE, onModalClose);
    return () => {
      windowDispatch.unsubscribe(ComponentActions.MODAL_CLOSE, onModalClose);
    };
  }, [hasModals]);

  const onBackdropClick = useCallback(() => {
    if (topModalRef.current?.dismissable !== false) windowDispatch.dispatch(ComponentActions.MODAL_CLOSE);
  }, []);
  const close = useCallback(
    (key: string) => {
      closeModal(key, contextKey);
    },
    [contextKey],
  );
  const layerHasModals = LAYERS.map((Layer) => stack.some((modal) => isInLayer(modal, Layer)));

  return (
    <TransitionGroup component={Fragment}>
      {LAYERS.map((Layer, index) => {
        const top = stack.findLast((modal) => isInLayer(modal, Layer));
        const backdropStyle = top?.backdropStyle ?? BackdropStyles.DARK;
        return (
          <Layer key={`layer-${index}`}>
            <Backdrop
              variant={
                backdropStyle === BackdropStyles.LIGHTBOX || backdropStyle === BackdropStyles.IMMERSIVE
                  ? 'lightbox'
                  : backdropStyle === BackdropStyles.BLUR
                    ? 'experimental_blur'
                    : 'default'
              }
              animationVariant={top?.instant ? 'instant' : 'default'}
              isVisible={layerHasModals[index]}
              onClick={onBackdropClick}
            />
          </Layer>
        );
      })}
      {modals.map(({ key, Layer, render, instant, isVisible, dismissable }, index) => (
        <ModalStackItem
          key={key}
          modalKey={key}
          LayerComponent={Layer ?? AppLayer}
          isVisible={isVisible}
          isTopModal={index === modals.length - 1}
          render={render}
          closeModal={close}
          instant={instant}
          dismissable={dismissable}
        />
      ))}
    </TransitionGroup>
  );
};

ModalStack.displayName = 'ModalStack';
