import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import clsx from 'clsx';
import { AppRoot, Heading, HeaderBar, Text, tokens, useHasAnyModalOpen } from '@discord-mana/components';
import { LockIcon, TextIcon } from '@discord-mana/icons';
import { MediaViewerProvider, type APIMessage } from '@discord-mana/messages';
import { readOptions, type ApiErrorBody, type PreviewContent, type ResizeMessage } from '../../shared/api';
import { BootSkeleton } from './BootSkeleton';
import { MessageList } from './MessageList';
import { useInteractions } from './useInteractions';
import { THEME_CLASSES, parseViewParams, type ViewParams } from '../viewParams';
import styles from './Viewer.module.css';
import welcomeStyles from './ChannelWelcome.module.css';

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
          const content = (await response.json()) as PreviewContent;
          setState({ status: 'ready', content: { ...content, options: readOptions(content.options) } });
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
  // Messages the embedding page adds, changes or removes (interactions) live only in this state.
  const setMessages = useCallback<Dispatch<SetStateAction<APIMessage[]>>>(
    (update) =>
      setState((current) => {
        if (current.status !== 'ready') return current;
        const messages = current.content.messages as APIMessage[];
        const next = typeof update === 'function' ? update(messages) : update;
        return { ...current, content: { ...current.content, messages: next } };
      }),
    [],
  );
  return [state, setMessages] as const;
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

const ERRORS: Record<string, { title: string; text: string }> = {
  missing_signature: { title: 'This preview is private', text: 'Open it through the signed link you were given.' },
  expired_signature: {
    title: 'This link has expired',
    text: 'Signed links only work for a while. Ask whoever shared it for a new one.',
  },
  invalid_signature: {
    title: "This link isn't valid",
    text: 'Part of it may be missing. Copy the whole link and try again.',
  },
  not_found: { title: 'Preview not found', text: 'It may have expired or been deleted.' },
};

const ErrorState = ({ httpStatus, code, message }: { httpStatus: number; code: string; message: string }) => {
  const copy = ERRORS[code] ?? { title: "This preview couldn't be loaded", text: message };
  return (
    <div className={styles.state} role="alert" data-error={code}>
      <div className={styles.stateIcon}>
        {httpStatus === 403 ? (
          <LockIcon size="custom" width={36} height={36} color={tokens.colors.ICON_STRONG} />
        ) : (
          <TextIcon size="custom" width={36} height={36} color={tokens.colors.ICON_STRONG} />
        )}
      </div>
      <Text variant="heading-xl/semibold" color="text-strong" tag="h1">
        {copy.title}
      </Text>
      <Text variant="body-md/normal" color="text-muted" tag="p" className={styles.stateText}>
        {copy.text}
      </Text>
    </div>
  );
};

ErrorState.displayName = 'ErrorState';

const rangeFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const describeRange = (messages: APIMessage[]) => {
  const first = new Date(messages[0]?.timestamp ?? NaN);
  const last = new Date(messages[messages.length - 1]?.timestamp ?? NaN);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return null;
  return rangeFormat.formatRange(first, last);
};

const ViewerHeader = ({ title, messages }: { title: string; messages: APIMessage[] | null }) => {
  const range = messages != null ? describeRange(messages) : null;
  return (
    <HeaderBar className={styles.header} aria-label={`#${title}`}>
      <HeaderBar.ChannelIcon icon={TextIcon} aria-label="Text channel" disabled />
      <HeaderBar.Title>{title}</HeaderBar.Title>
      {messages != null ? (
        <>
          <HeaderBar.Divider />
          <Text variant="body-sm/normal" color="text-muted" className={styles.headerMeta}>
            {messages.length === 1 ? '1 message' : `${messages.length.toLocaleString()} messages`}
            {range != null ? <span className={styles.headerRange}>, {range}</span> : null}
          </Text>
        </>
      ) : null}
    </HeaderBar>
  );
};

ViewerHeader.displayName = 'ViewerHeader';

/** The client's start-of-channel header, above the first message. */
const ChannelWelcome = ({ title }: { title: string }) => (
  <div className={clsx(welcomeStyles.container, styles.welcome)}>
    <div className={clsx(welcomeStyles.emptyChannelIcon, welcomeStyles.emptyChannelIconComponent)}>
      <TextIcon color={tokens.colors.ICON_STRONG} size="custom" width={42} height={42} />
    </div>
    <Heading aria-hidden className={welcomeStyles.header} variant="heading-xxl/semibold">
      Welcome to #{title}!
    </Heading>
    <Text variant="body-md/normal" color="none" className={welcomeStyles.description}>
      This is the start of the #{title} channel.
    </Text>
  </div>
);

ChannelWelcome.displayName = 'ChannelWelcome';

const ViewerFrame = ({
  params,
  header,
  children,
}: {
  params: ViewParams;
  header: ReactNode;
  children: (showChrome: boolean) => ReactNode;
}) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const id = window.location.pathname.split('/')[2] ?? '';
  useResizeMessages(id, element);
  const showChrome = params.chrome ?? !isFramed;
  // An open modal needs room even when the transcript is short, so the auto-height iframe grows for it.
  const modalOpen = useHasAnyModalOpen();
  return (
    <div
      ref={setElement}
      className={clsx(styles.frame, {
        [styles.transparent]: params.bg === 'transparent',
        [styles.framed]: isFramed,
        [styles.modalOpen]: isFramed && modalOpen,
      })}
      data-testid="preview-frame"
    >
      {showChrome ? header : null}
      <main className={styles.body} style={{ padding: params.padding }}>
        {children(showChrome)}
      </main>
    </div>
  );
};

ViewerFrame.displayName = 'ViewerFrame';

export const Viewer = ({ id }: { id: string }) => {
  const params = useMemo(() => parseViewParams(new URLSearchParams(window.location.search)), []);
  const [state, setMessages] = usePreviewContent(id);
  useDocumentSettings(params);
  const content = state.status === 'ready' ? state.content : null;
  // Interactions need both opt-ins: the creator's (`options.interactions`) and the embedder's (`interactions=1`).
  const interactionsEnabled = isFramed && params.interactions && content?.options.interactions === true;
  const messagesRef = useRef<APIMessage[]>([]);
  useLayoutEffect(() => {
    messagesRef.current = (content?.messages ?? []) as APIMessage[];
  });
  const getMessages = useCallback(() => messagesRef.current, []);
  const onInteraction = useInteractions({
    enabled: interactionsEnabled,
    previewId: id,
    allowedOrigins: content?.options.allowedOrigins ?? null,
    setMessages,
    getMessages,
    timeouts: { response: params.responseTimeout, deferred: params.deferredTimeout },
  });
  const theme = params.theme ?? content?.options.theme ?? 'dark';
  const title = content?.options.title ?? 'preview';

  useEffect(() => {
    document.title = state.status === 'error' ? 'Preview unavailable' : `#${title}`;
  }, [state.status, title]);

  const messages = (content?.messages ?? null) as APIMessage[] | null;
  // Error pages stand on their own; a channel header there would name a channel that isn't shown.
  const header = state.status === 'error' ? null : <ViewerHeader title={title} messages={messages} />;

  return (
    <AppRoot
      theme={THEME_CLASSES[theme]}
      density={params.density}
      saturation={params.saturation}
      reducedMotion={params.reducedMotion == null ? 'auto' : params.reducedMotion ? 'reduce' : 'no-preference'}
    >
      <ViewerFrame params={params} header={header}>
        {(showChrome) =>
          state.status === 'loading' ? (
            <BootSkeleton />
          ) : state.status === 'error' ? (
            <ErrorState {...state} />
          ) : (
            <MediaViewerProvider>
              {(params.welcome ?? showChrome) ? <ChannelWelcome title={title} /> : null}
              <MessageList
                messages={state.content.messages as APIMessage[]}
                interactive={state.content.options.interactive || interactionsEnabled}
                onInteraction={interactionsEnabled ? onInteraction : undefined}
                showDates={params.dates}
              />
            </MediaViewerProvider>
          )
        }
      </ViewerFrame>
    </AppRoot>
  );
};

Viewer.displayName = 'Viewer';
