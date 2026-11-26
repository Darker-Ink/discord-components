import { lazy, Suspense } from 'react';
import { BootSkeleton } from './viewer/BootSkeleton';

// Each page is its own chunk: the viewer (messages, media) never loads on the home page or the docs.
const Viewer = lazy(() => import('./viewer/Viewer').then((module) => ({ default: module.Viewer })));
const Home = lazy(() => import('./home/Home').then((module) => ({ default: module.Home })));
const Docs = lazy(() => import('./docs/Docs').then((module) => ({ default: module.Docs })));

export const PREVIEW_PATH_RE = /^\/p\/([^/]+)\/?$/;

export const App = () => {
  const { pathname } = window.location;
  const preview = PREVIEW_PATH_RE.exec(pathname);
  return (
    <Suspense fallback={preview != null ? <BootSkeleton /> : null}>
      {preview != null ? (
        <Viewer id={decodeURIComponent(preview[1])} />
      ) : pathname === '/docs' || pathname === '/docs/' ? (
        <Docs />
      ) : (
        <Home notFound={pathname !== '/'} />
      )}
    </Suspense>
  );
};

App.displayName = 'App';
