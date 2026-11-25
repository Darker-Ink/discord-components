import type { Ref } from 'react';
import { createLayer } from './createLayer';
import { ReferencePositionLayer, type ReferencePositionLayerProps } from './ReferencePositionLayer';

// The app's main layer: popouts render here unless they are given another layer context.
const { Layer, LayerContainer, LayerProvider, layerContext } = createLayer('App');

export {
  Layer as AppLayer,
  LayerContainer as AppLayerContainer,
  LayerProvider as AppLayerProvider,
  layerContext as appLayerContext,
};

export const AppReferencePositionLayer = ({
  ref,
  ...props
}: ReferencePositionLayerProps & { ref?: Ref<ReferencePositionLayer> }) => (
  <Layer>
    <ReferencePositionLayer ref={ref} {...props} />
  </Layer>
);

AppReferencePositionLayer.displayName = 'AppReferencePositionLayer';
