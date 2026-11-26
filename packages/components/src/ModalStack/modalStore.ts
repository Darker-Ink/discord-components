import type { ComponentType, ReactElement, ReactNode } from 'react';
import { create } from 'zustand';
import { DEFAULT_MODAL_CONTEXT, type ModalTransitionStateValue } from '../Dialog/ModalContext';
import { renderModalSpinner } from '../ModalRoot/ModalSpinner';

export const POPOUT_MODAL_CONTEXT = 'popout';

export type ModalContextKey = typeof DEFAULT_MODAL_CONTEXT | typeof POPOUT_MODAL_CONTEXT;

const MODAL_CONTEXTS: readonly ModalContextKey[] = [DEFAULT_MODAL_CONTEXT, POPOUT_MODAL_CONTEXT];

export const BackdropStyles = {
  DARK: 'DARK',
  LIGHTBOX: 'LIGHTBOX',
  IMMERSIVE: 'IMMERSIVE',
  BLUR: 'BLUR',
} as const;

export type BackdropStyle = (typeof BackdropStyles)[keyof typeof BackdropStyles];

// 'stack' keeps the modal below visible, 'replace' hides it until this one closes, 'replaceAll'
// hides every modal below.
export type ModalStackingBehavior = 'stack' | 'replace' | 'replaceAll';

export interface ModalRenderProps {
  transitionState: ModalTransitionStateValue | null;
  onClose: () => Promise<void>;
  dismissable: boolean | undefined;
}

export type ModalRender = (props: ModalRenderProps) => ReactNode;

// The layer a modal renders in: the App layer unless given another one (e.g. the Verification layer).
export type ModalLayerComponent = ComponentType<{ children: ReactElement }>;

export interface OpenModalOptions {
  modalKey?: string;
  // When false, Escape and backdrop clicks don't close the modal.
  dismissable?: boolean;
  // Skips the enter and exit transitions.
  instant?: boolean;
  Layer?: ModalLayerComponent;
  // Called instead of closing the modal when the user asks to close it (Escape, backdrop click).
  onCloseRequest?: () => void;
  onCloseCallback?: () => void;
  backdropStyle?: BackdropStyle;
  stackingBehavior?: ModalStackingBehavior;
  // Modals opened on top of this one stack (instead of replacing it) unless they say otherwise.
  stackNextByDefault?: boolean;
  // Whether the app may navigate while this modal is the top one.
  allowsNavigation?: boolean;
}

export interface ModalStackEntry {
  key: string;
  dismissable: boolean | undefined;
  Layer: ModalLayerComponent | undefined;
  render: ModalRender;
  onCloseRequest: () => void;
  onCloseCallback: (() => void) | undefined;
  instant: boolean | undefined;
  backdropStyle: BackdropStyle | undefined;
  stackingBehavior: ModalStackingBehavior;
  stackNextByDefault: boolean | undefined;
  allowsNavigation: boolean | undefined;
}

export type ModalStoreState = Record<ModalContextKey, ModalStackEntry[]>;

export const useModalsStore = create<ModalStoreState>(() => ({
  [DEFAULT_MODAL_CONTEXT]: [],
  [POPOUT_MODAL_CONTEXT]: [],
}));

// Like lodash's uniqueId, which the client uses for modal keys.
let lastModalId = 0;
const uniqueModalKey = () => String(++lastModalId);

// Discord's client maps the window a modal is opened from to a modal context (the main window and
// the overlay use 'default', pop-out windows 'popout'). Without the client there is only one window.
export const getCurrentModalContext = (): ModalContextKey => DEFAULT_MODAL_CONTEXT;

export const openModal = (
  render: ModalRender,
  options: OpenModalOptions = Object.freeze({}),
  contextKey: ModalContextKey = getCurrentModalContext(),
): string => {
  const {
    modalKey,
    dismissable,
    instant,
    Layer,
    onCloseRequest,
    onCloseCallback,
    backdropStyle,
    stackingBehavior,
    stackNextByDefault,
    allowsNavigation,
  } = options;
  const key = modalKey ?? uniqueModalKey();
  useModalsStore.setState((state) => {
    const stack = state[contextKey];
    if (stack !== undefined && stack.some((entry) => entry.key === key)) return state;
    const behavior = stackingBehavior ?? (stack.at(-1)?.stackNextByDefault === true ? 'stack' : 'replace');
    return {
      ...state,
      [contextKey]: [
        ...stack,
        {
          key,
          dismissable,
          Layer,
          render,
          onCloseRequest: onCloseRequest ?? (() => closeModal(key, contextKey)),
          onCloseCallback,
          instant,
          backdropStyle,
          stackingBehavior: behavior,
          stackNextByDefault,
          allowsNavigation,
        },
      ],
    };
  });
  return key;
};

export const closeModal = (key: string, contextKey: ModalContextKey = getCurrentModalContext()): boolean => {
  const entry = useModalsStore.getState()[contextKey]?.find((modal) => modal.key === key) ?? null;
  useModalsStore.setState((state) =>
    state[contextKey] === undefined
      ? state
      : { ...state, [contextKey]: state[contextKey].filter((modal) => modal.key !== key) },
  );
  entry?.onCloseCallback?.();
  return entry != null;
};

export const updateModal = (
  key: string,
  render: ModalRender,
  onCloseRequest?: () => void,
  onCloseCallback?: () => void,
  contextKey: ModalContextKey = getCurrentModalContext(),
) => {
  useModalsStore.setState((state) =>
    state[contextKey] === undefined
      ? state
      : {
          ...state,
          [contextKey]: state[contextKey].map((modal) =>
            modal.key === key
              ? {
                  ...modal,
                  render,
                  onCloseRequest: onCloseRequest ?? (() => closeModal(key, contextKey)),
                  onCloseCallback,
                }
              : modal,
          ),
        },
  );
};

export const isModalOpenInState = (
  state: ModalStoreState,
  key: string,
  contextKey: ModalContextKey = DEFAULT_MODAL_CONTEXT,
) => state[contextKey]?.some((modal) => modal.key === key) ?? false;

export const isModalOpen = (key: string, contextKey?: ModalContextKey) =>
  isModalOpenInState(useModalsStore.getState(), key, contextKey);

export const useIsModalOpen = (key: string, contextKey?: ModalContextKey) =>
  isModalOpenInState(useModalsStore(), key, contextKey);

export const hasAnyModalOpenInState = (state: ModalStoreState) =>
  MODAL_CONTEXTS.some((context) => (state[context]?.length ?? 0) > 0);

export const hasAnyModalOpen = () => hasAnyModalOpenInState(useModalsStore.getState());

export const useHasAnyModalOpen = () => hasAnyModalOpenInState(useModalsStore());

export const useIsModalAtTop = (key: string) => {
  const { [DEFAULT_MODAL_CONTEXT]: main, [POPOUT_MODAL_CONTEXT]: popout } = useModalsStore();
  return popout.length > 0 ? popout.at(-1)?.key === key : main.at(-1)?.key === key;
};

export const getOpenModalKeys = () => {
  const state = useModalsStore.getState();
  const keys = new Set<string>();
  for (const context of MODAL_CONTEXTS) for (const modal of state[context] ?? []) keys.add(modal.key);
  return keys;
};

// Whether a modal is open that isn't one of `keys` (e.g. one opened after a popout).
export const hasModalOpenNotIn = (keys: Set<string>) => {
  const state = useModalsStore.getState();
  return MODAL_CONTEXTS.some((context) => (state[context] ?? []).some((modal) => !keys.has(modal.key)));
};

export const closeAllModalsInContext = (contextKey: ModalContextKey = getCurrentModalContext()) => {
  const stack = useModalsStore.getState()[contextKey];
  if (stack != null) for (const modal of stack) closeModal(modal.key, contextKey);
};

export const closeAllModals = () => {
  const state = useModalsStore.getState();
  for (const context of MODAL_CONTEXTS) for (const modal of state[context]) closeModal(modal.key, context);
};

export const closeModalInAllContexts = (key: string) => {
  const state = useModalsStore.getState();
  const entries = MODAL_CONTEXTS.map((context) => state[context]?.find((modal) => modal.key === key) ?? null);
  if (!entries.some((entry) => entry != null)) return;
  useModalsStore.setState((current) => {
    const next = { ...current };
    for (const context of MODAL_CONTEXTS) next[context] = next[context]?.filter((modal) => modal.key !== key);
    return next;
  });
  entries.forEach((entry) => entry?.onCloseCallback?.());
};

export const doesTopModalAllowNavigation = () => {
  const state = useModalsStore.getState();
  const context = getCurrentModalContext();
  if (context !== DEFAULT_MODAL_CONTEXT && (state[context]?.length ?? 0) > 0) return false;
  const stack = state[DEFAULT_MODAL_CONTEXT];
  return stack == null || stack.length <= 0 || (stack.at(-1)?.allowsNavigation ?? false);
};

export const subscribeToModals = (listener: (state: ModalStoreState, previous: ModalStoreState) => void) =>
  useModalsStore.subscribe(listener);

export const openModalLazy = async (
  load: () => Promise<ModalRender>,
  options: OpenModalOptions & { contextKey?: ModalContextKey } = {},
): Promise<string> => {
  const { contextKey = getCurrentModalContext(), ...modalOptions } = options;
  const key = options.modalKey ?? uniqueModalKey();
  let showedLoading = false;
  // A spinner modal stands in when loading takes long enough to notice.
  const timeout = setTimeout(() => {
    showedLoading = true;
    openModal(renderModalSpinner, { ...modalOptions, modalKey: key }, contextKey);
  }, 300);
  const render = await load();
  clearTimeout(timeout);
  if (showedLoading) {
    if (isModalOpen(key, contextKey))
      updateModal(key, render, modalOptions.onCloseRequest, modalOptions.onCloseCallback, contextKey);
  } else {
    openModal(render, { ...modalOptions, modalKey: key }, contextKey);
  }
  return key;
};
