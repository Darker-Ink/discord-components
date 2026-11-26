import { lazy, Suspense } from 'react';
import { Viewer } from './viewer/Viewer';

const Home = lazy(() => import('./home/Home').then((module) => ({ default: module.Home })));

export const PREVIEW_PATH_RE = /^\/p\/([^/]+)\/?$/;

export const App = () => {
  const preview = PREVIEW_PATH_RE.exec(window.location.pathname);
  if (preview != null) return <Viewer id={decodeURIComponent(preview[1])} />;
  return (
    <Suspense fallback={null}>
      <Home notFound={window.location.pathname !== '/'} />
    </Suspense>
  );
};

App.displayName = 'App';
