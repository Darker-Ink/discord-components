import { lazy, Suspense, type ComponentProps } from 'react';

// Stands in for the components package's ExpressiveButtonRive (see vite.config.ts): the Rive runtime behind it is
// a large share of the bundle, and only expressive buttons use it, which messages never render. It loads on
// first use instead.
const LazyExpressiveButtonRive = lazy(() =>
  import('../../../../components/src/Button/ExpressiveButtonRive').then((module) => ({
    default: module.ExpressiveButtonRive,
  })),
);

export type {
  ExpressiveButtonArtboard,
  ExpressiveButtonRiveProps,
} from '../../../../components/src/Button/ExpressiveButtonRive';

export const ExpressiveButtonRive = (props: ComponentProps<typeof LazyExpressiveButtonRive>) => (
  <Suspense fallback={null}>
    <LazyExpressiveButtonRive {...props} />
  </Suspense>
);

ExpressiveButtonRive.displayName = 'ExpressiveButtonRive';
