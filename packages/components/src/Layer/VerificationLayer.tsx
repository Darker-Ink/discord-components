import { createLayer } from './createLayer';

// A layer above the App layer for verification flows (e.g. captchas) that must stay on top of
// everything else, modals included.
const { Layer, LayerContainer, LayerProvider, layerContext } = createLayer('Verification');

export {
  Layer as VerificationLayer,
  LayerContainer as VerificationLayerContainer,
  LayerProvider as VerificationLayerProvider,
  layerContext as verificationLayerContext,
};
