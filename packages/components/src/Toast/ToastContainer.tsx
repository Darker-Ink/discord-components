import { useCallback, useContext, useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { tokens, useToken } from '../tokens';
import { createStore, useStore } from './createStore';
import { Toast } from './Toast';
import { DEFAULT_TOAST_SURFACE, popToast, toastStore, useToastStore, type ToastEntry } from './toastStore';
import { useToastTopOffset } from './toastTopOffset';
import styles from './ToastContainer.module.css';

const DEFAULT_DURATION_MS = 3000;

// Several containers can be mounted for one surface; only the most recently mounted shows toasts.
const containerStore = createStore<{ containerIdsBySurface: Map<string, string[]> }>({
  containerIdsBySurface: new Map(),
});

let lastAnnouncedKey = 0;

const useToastEntry = (surface: string) => {
  const id = useId();
  useEffect(() => {
    containerStore.setState((state) => {
      const containerIdsBySurface = new Map(state.containerIdsBySurface);
      containerIdsBySurface.set(surface, [...(containerIdsBySurface.get(surface) ?? []), id]);
      return { containerIdsBySurface };
    });
    return () => {
      containerStore.setState((state) => {
        const containerIdsBySurface = new Map(state.containerIdsBySurface);
        const ids = (containerIdsBySurface.get(surface) ?? []).filter((other) => other !== id);
        if (ids.length === 0) containerIdsBySurface.delete(surface);
        else containerIdsBySurface.set(surface, ids);
        return { containerIdsBySurface };
      });
    };
  }, [surface, id]);
  const isActive = useStore(containerStore, (state) => {
    const ids = state.containerIdsBySurface.get(surface);
    return ids != null && ids[ids.length - 1] === id;
  });
  const current = useToastStore((state) => state.currentToastMap.get(surface));
  const entry = (isActive ? current : undefined) ?? null;

  // The container keeps the last toast's position while it animates out.
  const [position, setPosition] = useState(entry?.toast.position ?? 'top');
  const nextPosition = entry != null ? (entry.toast.position ?? 'top') : position;
  if (nextPosition !== position) setPosition(nextPosition);

  const { minToastDurationMs } = useContext(AccessibilityPreferencesContext);
  const duration = Math.max(entry?.toast.duration ?? DEFAULT_DURATION_MS, minToastDurationMs);
  useEffect(() => {
    if (entry == null) return;
    const timeout = setTimeout(() => {
      if (toastStore.getState().currentToastMap.get(surface) === entry) popToast(surface);
    }, duration);
    return () => clearTimeout(timeout);
  }, [entry, duration, surface]);

  useEffect(() => {
    const text = entry?.toast.text;
    if (entry == null || entry.key === lastAnnouncedKey || text == null || text === '') return;
    lastAnnouncedKey = entry.key;
    if (typeof text === 'string')
      AccessibilityAnnouncer.announce(text, entry.toast.variant === 'critical' ? 'assertive' : 'polite');
  }, [entry]);

  return { entry, position };
};

interface ToastTransitionState {
  entry: ToastEntry | null;
  leaving: ToastEntry | null;
  isDelayed: boolean;
}

export interface ToastContainerOffset {
  top?: number | string;
  bottom?: number | string;
}

export interface ToastContainerProps {
  surface?: string;
  // Space to keep clear above top toasts and below bottom ones.
  offset?: ToastContainerOffset;
}

const toCssLength = (value: number | string | undefined) => (typeof value === 'number' ? `${value}px` : value);

// Shows the current toast of a surface, sliding it in and the previous one out. A toast that replaces
// another waits for the queue delay before it comes in.
export const ToastContainer = ({ surface = DEFAULT_TOAST_SURFACE, offset }: ToastContainerProps) => {
  const { entry, position } = useToastEntry(surface);
  const [state, setState] = useState<ToastTransitionState>({ entry, leaving: null, isDelayed: false });
  if (entry !== state.entry) setState({ entry, leaving: state.entry ?? state.leaving, isDelayed: state.entry != null });
  const onLeft = useCallback(() => setState((current) => ({ ...current, leaving: null })), []);
  const animationDuration = useToken(tokens.modules.toast.ANIMATION_DURATION_MS) as number;
  const queueEnterDelay = useToken(tokens.modules.toast.QUEUE_ENTER_DELAY_MS) as number;
  return (
    <div
      aria-hidden
      className={clsx(styles.container, styles[position])}
      style={
        {
          '--custom-toast-animation-duration': `${animationDuration}ms`,
          '--custom-toast-queue-enter-delay': `${queueEnterDelay}ms`,
          '--toast-container-offset-top': toCssLength(offset?.top),
          '--toast-container-offset-bottom': toCssLength(offset?.bottom),
        } as CSSProperties
      }
    >
      {state.leaving != null && (
        <div key={state.leaving.key} className={clsx(styles.toast, styles.leave)} onAnimationEnd={onLeft}>
          <Toast {...state.leaving.toast} />
        </div>
      )}
      {state.entry != null && (
        <div key={state.entry.key} className={clsx(styles.toast, styles.enter, { [styles.delayed]: state.isDelayed })}>
          <Toast {...state.entry.toast} />
        </div>
      )}
    </div>
  );
};

ToastContainer.displayName = 'ToastContainer';

export type ToastAppContext = 'APP' | 'OVERLAY' | 'POPOUT' | 'CALL_TILE_POPOUT';

const SURFACES: Record<ToastAppContext, string> = {
  APP: 'app',
  OVERLAY: 'overlay',
  POPOUT: 'popout',
  CALL_TILE_POPOUT: 'call-tile-popout',
};

export interface AppToastContainerProps {
  appContext: ToastAppContext;
}

// The toast container an app window renders: in the main app, toasts sit below the title bar (or
// whatever registered a lower top edge) and above the bottom 132px.
export const AppToastContainer = ({ appContext }: AppToastContainerProps) => {
  const surface = SURFACES[appContext];
  const topOffset = useToastTopOffset(surface);
  const offset = useMemo(() => {
    if (appContext === 'APP') return { top: topOffset ?? 'var(--custom-app-top-bar-height)', bottom: 132 };
    return topOffset != null ? { top: topOffset } : undefined;
  }, [appContext, topOffset]);
  return <ToastContainer surface={surface} offset={offset} />;
};

AppToastContainer.displayName = 'AppToastContainer';
