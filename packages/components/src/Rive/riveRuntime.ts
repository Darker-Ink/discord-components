import * as riveReactCanvas from '@rive-app/react-canvas';

type RiveReactCanvas = typeof riveReactCanvas;

// @rive-app/react-canvas is CommonJS and re-exports the canvas runtime in a way Node's ES module loader can't
// detect, so named imports of these fail when the package runs unbundled (server rendering with external
// dependencies). Bundlers see them as exports; Node only has them on the module's default export.
const runtime: RiveReactCanvas =
  'RuntimeLoader' in riveReactCanvas
    ? riveReactCanvas
    : (riveReactCanvas as unknown as { default: RiveReactCanvas }).default;

export const { Alignment, EventType, Fit, Layout, RiveFile, RuntimeLoader, decodeImage } = runtime;
export type Alignment = riveReactCanvas.Alignment;
export type Fit = riveReactCanvas.Fit;
