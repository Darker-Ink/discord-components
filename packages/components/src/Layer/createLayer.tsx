import {
  Children,
  Component,
  createContext,
  useCallback,
  useContext,
  type Context,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './Layer.module.css';

export type LayerContextValue = readonly [Element | null, (element: Element | null) => void];
export type LayerContext = Context<LayerContextValue>;

export const LAYER_CONTAINER_CLASS_NAME = styles.layerContainer;

// The last value is reused while the container is unchanged, so consumers don't re-render.
const memoizeLast = <A extends unknown[], R>(fn: (...args: A) => R) => {
  let lastArgs: A | null = null;
  let lastResult: R;
  return (...args: A) => {
    if (lastArgs == null || lastArgs.length !== args.length || lastArgs.some((arg, i) => arg !== args[i])) {
      lastResult = fn(...args);
    }
    lastArgs = args;
    return lastResult;
  };
};

interface LayerProviderBaseProps {
  layerContext: LayerContext;
  children?: ReactNode;
}

class LayerProviderBase extends Component<LayerProviderBaseProps, { layerContainerElement: Element | null }> {
  override state = { layerContainerElement: null as Element | null };

  setLayerContainerElement = (element: Element | null) => {
    this.setState({ layerContainerElement: element });
  };

  getContextValue = memoizeLast((element: Element | null): LayerContextValue => [
    element,
    this.setLayerContainerElement,
  ]);

  override componentWillUnmount() {
    this.state.layerContainerElement = null;
  }

  override render() {
    const { layerContext: LayerContextComponent, children } = this.props;
    return (
      <LayerContextComponent.Provider value={this.getContextValue(this.state.layerContainerElement)}>
        {children}
      </LayerContextComponent.Provider>
    );
  }
}

interface LayerContainerBaseProps {
  layerContext: LayerContext;
  className?: string;
}

const LayerContainerBase = ({ layerContext, className }: LayerContainerBaseProps) => {
  const [, setLayerContainerElement] = useContext(layerContext);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      setLayerContainerElement(element);
    },
    [setLayerContainerElement],
  );
  return <div className={clsx(styles.layerContainer, className)} ref={ref} />;
};

LayerContainerBase.displayName = 'LayerContainerBase';

export interface LayerProps {
  layerContext: LayerContext;
  children: ReactElement;
}

// Renders its only child into the layer container registered on `layerContext` (or nothing while
// there is no container).
export const Layer = ({ layerContext, children }: LayerProps) => {
  const [container] = useContext(layerContext);
  return container == null ? null : createPortal(Children.only(children), container);
};

Layer.displayName = 'Layer';

export interface CreatedLayer {
  LayerProvider: ((props: { children?: ReactNode }) => ReactElement) & { displayName: string };
  LayerContainer: ((props: { className?: string }) => ReactElement) & { displayName: string };
  Layer: ((props: { children: ReactElement }) => ReactNode) & { displayName: string };
  layerContext: LayerContext;
}

// A layer is a container rendered once near the app root (LayerContainer) that any descendant of
// the LayerProvider can portal into (Layer). Popouts, modals and other overlays each use one.
export const createLayer = (name: string): CreatedLayer => {
  const layerContext = createContext<LayerContextValue>([null, () => {}]);
  layerContext.displayName = `${name}LayerContext`;
  const LayerProvider = (props: { children?: ReactNode }) => (
    <LayerProviderBase layerContext={layerContext} {...props} />
  );
  const LayerContainer = (props: { className?: string }) => (
    <LayerContainerBase layerContext={layerContext} {...props} />
  );
  const NamedLayer = (props: { children: ReactElement }) => <Layer layerContext={layerContext} {...props} />;
  LayerProvider.displayName = `${name}LayerProvider`;
  LayerContainer.displayName = `${name}LayerContainer`;
  NamedLayer.displayName = `${name}Layer`;
  return { LayerProvider, LayerContainer, Layer: NamedLayer, layerContext };
};
