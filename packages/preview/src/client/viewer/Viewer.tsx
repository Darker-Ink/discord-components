import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AppRoot, HeaderBar, Spinner, Text } from '@discord-mana/components';
import { CircleErrorIcon, LockIcon, TextIcon } from '@discord-mana/icons';
import { MediaViewerProvider, type APIMessage } from '@discord-mana/messages';
import type { ApiErrorBody, PreviewContent, ResizeMessage } from '../../shared/api';
import { MessageList } from './MessageList';
import { THEME_CLASSES, parseViewParams, type ViewParams } from '../viewParams';
import styles from './Viewer.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; content: PreviewContent }
  | { status: 'error'; httpStatus: number; code: string; message: string };

const isFramed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const usePreviewContent = (id: string) => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams(window.location.search);
    const query = new URLSearchParams();
    for (const name of ['exp', 'sig']) {
      const value = search.get(name);
      if (value != null) query.set(name, value);
    }
    const url = `/api/previews/${encodeURIComponent(id)}/content${query.size > 0 ? `?${query}` : ''}`;
    fetch(url, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (response.ok) {
          setState({ status: 'ready', content: (await response.json()) as PreviewContent });
          return;
        }
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setState({
          status: 'error',
          httpStatus: response.status,
          code: body?.error.code ?? 'error',
          message: body?.error.message ?? 'This preview could not be loaded.',
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', httpStatus: 0, code: 'network_error', message: String(error) });
      });
    return () => controller.abort();
  }, [id]);
  return state;
};

// Root-level settings Discord applies to <html>: message group spacing and the chat font size.
const useDocumentSettings = (params: ViewParams) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const spacingClass = `group-spacing-${params.spacing}`;
    root.classList.add(spacingClass);
    root.style.fontSize = params.fontScale === 1 ? '' : `${params.fontScale * 100}%`;
    root.dataset.background = params.bg;
    return () => {
      root.classList.remove(spacingClass);
      root.style.fontSize = '';
      delete root.dataset.background;
    };
  }, [params.spacing, params.fontScale, params.bg]);
};

/** Tells the embedding page how tall the preview is whenever that changes. */
const useResizeMessages = (id: string, element: HTMLElement | null) => {
  useEffect(() => {
    if (!isFramed || element == null) return;
    let last = -1;
    const post = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      const message: ResizeMessage = { type: 'discord-mana:resize', id, height };
      window.parent.postMessage(message, '*');
    };
    const observer = new ResizeObserver(post);
    observer.observe(element);
    post();
    return () => observer.disconnect();
  }, [id, element]);
};

const ERROR_TITLES: Record<number, string> = {
  403: 'This preview is private',
  404: 'Preview not found',
};

const ErrorState = ({ httpStatus, code, message }: { httpStatus: number; code: string; message: string }) => (
  <div className={styles.state} role="alert" data-error={code}>
    <div className={styles.stateIcon}>
      {httpStatus === 403 ? (
        <LockIcon size="lg" color="currentColor" />
      ) : (
        <CircleErrorIcon size="lg" color="currentColor" />
      )}
    </div>
    <Text variant="heading-lg/semibold" color="text-strong" tag="h1">
      {ERROR_TITLES[httpStatus] ?? 'Something went wrong'}
    </Text>
    <Text variant="body-md/normal" color="text-muted" tag="p" className={styles.stateText}>
      {httpStatus === 404 ? 'It may have expired or been deleted.' : message}
    </Text>
  </div>
);

ErrorState.displayName = 'ErrorState';

const ViewerHeader = ({ title, messageCount }: { title: string; messageCount: number | null }) => (
  <HeaderBar className={styles.header}>
    <HeaderBar.ChannelIcon icon={TextIcon} aria-label="Channel" disabled />
    <HeaderBar.Title>{title}</HeaderBar.Title>
    {messageCount != null ? (
      <>
        <HeaderBar.Divider />
        <Text variant="body-sm/normal" color="text-muted" className={styles.headerMeta}>
          {messageCount === 1 ? '1 message' : `${messageCount} messages`}
        </Text>
      </>
    ) : null}
  </HeaderBar>
);

ViewerHeader.displayName = 'ViewerHeader';

const ViewerFrame = ({ params, header, children }: { params: ViewParams; header: ReactNode; children: ReactNode }) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const id = window.location.pathname.split('/')[2] ?? '';
  useResizeMessages(id, element);
  const showChrome = params.chrome ?? !isFramed;
  return (
    <div
      ref={setElement}
      className={clsx(styles.frame, { [styles.transparent]: params.bg === 'transparent' })}
      data-testid="preview-frame"
    >
      {showChrome ? header : null}
      <main className={styles.body} style={{ padding: params.padding }}>
        {children}
      </main>
    </div>
  );
};

ViewerFrame.displayName = 'ViewerFrame';

export const Viewer = ({ id }: { id: string }) => {
  const params = useMemo(() => parseViewParams(new URLSearchParams(window.location.search)), []);
  const state = usePreviewContent(id);
  useDocumentSettings(params);
  const content = state.status === 'ready' ? state.content : null;
  const theme = params.theme ?? content?.options.theme ?? 'dark';
  const title = content?.options.title ?? 'preview';

  useEffect(() => {
    document.title = state.status === 'error' ? 'Preview unavailable' : `#${title}`;
  }, [state.status, title]);

  const header = <ViewerHeader title={title} messageCount={content?.messages.length ?? null} />;

  return (
    <AppRoot
      theme={THEME_CLASSES[theme]}
      density={params.density}
      saturation={params.saturation}
      reducedMotion={params.reducedMotion == null ? 'auto' : params.reducedMotion ? 'reduce' : 'no-preference'}
    >
      <ViewerFrame params={params} header={header}>
        {state.status === 'loading' ? (
          <div className={styles.state}>
            <Spinner />
          </div>
        ) : state.status === 'error' ? (
          <ErrorState {...state} />
        ) : (
          <MediaViewerProvider>
            <MessageList
              messages={state.content.messages as APIMessage[]}
              interactive={state.content.options.interactive}
              showDates={params.dates}
            />
          </MediaViewerProvider>
        )}
      </ViewerFrame>
    </AppRoot>
  );
};

Viewer.displayName = 'Viewer';
