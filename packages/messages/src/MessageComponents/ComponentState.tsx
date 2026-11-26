import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMessageI18n } from '../Message/messageI18n';
import { getComponentParents, isActionComponent } from './createComponents';
import type { APIResolvedData, APIResolvedUser, APIResolvedRole, APIResolvedChannel } from './resolvers';
import {
  ComponentType,
  SelectOptionType,
  type FileUploadComponent,
  type MessageComponent,
  type SelectOptionType as SelectOptionTypeValue,
} from './types';

/** How a component looks while an interaction is in flight (the client's `ComponentVisualState`). */
export const ComponentVisualState = { NORMAL: 0, LOADING: 1, DISABLED: 2 } as const;

export type ComponentVisualState = (typeof ComponentVisualState)[keyof typeof ComponentVisualState];

/** A picked user, role or channel of a searchable select. */
export interface SelectedOption {
  type: SelectOptionTypeValue;
  value: string;
  label: string;
}

/** Local state of a component (what the user picked or typed). */
export type ComponentState =
  | { type: typeof ComponentType.StringSelect; values: string[] }
  | {
      type:
        | typeof ComponentType.UserSelect
        | typeof ComponentType.RoleSelect
        | typeof ComponentType.MentionableSelect
        | typeof ComponentType.ChannelSelect;
      selectedOptions: SelectedOption[];
    }
  | { type: typeof ComponentType.TextInput; value: string }
  | { type: typeof ComponentType.FileUpload; uploadIds: string[] }
  | { type: typeof ComponentType.RadioGroup; value: string | null }
  | { type: typeof ComponentType.CheckboxGroup; values: string[] }
  | { type: typeof ComponentType.Checkbox; value: boolean };

/** Interaction data for a message component, in the API's shape (what the bot receives as `data`). */
export interface APIMessageComponentInteractionData {
  component_type: number;
  custom_id: string;
  values?: string[];
  resolved?: APIResolvedData;
}

export interface MessageComponentInteraction<M = unknown> {
  data: APIMessageComponentInteractionData;
  /** The clicked or changed component (client record; `component.id` is its position path). */
  component: MessageComponent;
  message: M;
}

/**
 * Called when a button is clicked or a select's value changes. Return a promise to show the component as
 * loading (and the message's other components as disabled) until it settles; a rejection shows "This
 * interaction failed" (or the rejection's `message` when it is a string) under the component's row.
 */
export type OnMessageComponentInteraction<M = unknown> = (
  interaction: MessageComponentInteraction<M>,
) => void | Promise<unknown>;

interface PendingInteraction {
  componentId: string;
  status: 'pending' | 'failed';
  error?: string;
}

interface ComponentStateContextValue {
  /** Message components (a message) or modal components. */
  components: readonly MessageComponent[];
  message?: unknown;
  /** The modal's `custom_id` when rendering an interaction modal. */
  modal?: { customId: string };
  channelId?: string;
  resolved?: APIResolvedData | null;
  states: Record<string, ComponentState | undefined>;
  setState: (component: MessageComponent, state: ComponentState | null) => void;
  interaction: PendingInteraction | null;
  sendInteraction: (component: MessageComponent, state?: ComponentState | null) => void;
  shouldDisableInteractiveComponents: boolean;
  validators?: Set<() => boolean>;
  validationErrors?: Record<string, string | null>;
  setValidationErrors?: (update: (errors: Record<string, string | null>) => Record<string, string | null>) => void;
  /** Files picked in FileUpload components, by upload id. */
  uploads: Record<string, File>;
  addUploads: (files: File[]) => string[];
  removeUpload: (id: string) => void;
  autoFocusId?: string;
  /** Largest file a FileUpload accepts, in bytes. */
  maxUploadSize?: number;
  /** Shown when too many files are picked (the client opens an upload error alert). */
  onUploadError?: (title: string, help: string) => void;
}

export const ComponentStateContext = createContext<ComponentStateContextValue | null>(null);

ComponentStateContext.displayName = 'ComponentStateContext';

export const useComponentContext = () => useContext(ComponentStateContext);

const useRequiredContext = () => {
  const context = useContext(ComponentStateContext);
  if (context == null) throw new Error('Message components must be rendered inside a ComponentStateProvider');
  return context;
};

let nextUploadId = 0;

const buildResolved = (
  component: MessageComponent,
  state: ComponentState | null | undefined,
  resolved: APIResolvedData | null | undefined,
) => {
  if (state == null || !('selectedOptions' in state)) return undefined;
  const result: APIResolvedData = {};
  for (const option of state.selectedOptions) {
    if (option.type === SelectOptionType.User) {
      const user = resolved?.users?.[option.value];
      (result.users ??= {})[option.value] = user ?? ({ id: option.value, username: option.label } as APIResolvedUser);
      const member = resolved?.members?.[option.value];
      if (member != null) (result.members ??= {})[option.value] = member;
    } else if (option.type === SelectOptionType.Role) {
      (result.roles ??= {})[option.value] =
        resolved?.roles?.[option.value] ?? ({ id: option.value, name: option.label, color: 0 } as APIResolvedRole);
    } else if (option.type === SelectOptionType.Channel) {
      (result.channels ??= {})[option.value] =
        resolved?.channels?.[option.value] ?? ({ id: option.value, name: option.label, type: 0 } as APIResolvedChannel);
    }
  }
  void component;
  return result;
};

/** The API interaction data for a component and its new local state. */
export const getInteractionData = (
  component: MessageComponent,
  state: ComponentState | null | undefined,
  resolved?: APIResolvedData | null,
): APIMessageComponentInteractionData => {
  const data: APIMessageComponentInteractionData = {
    component_type: component.type,
    custom_id: 'customId' in component ? (component.customId ?? '') : '',
  };
  if (state?.type === ComponentType.StringSelect) data.values = state.values;
  else if (state != null && 'selectedOptions' in state) {
    data.values = state.selectedOptions.map((option) => option.value);
    data.resolved = buildResolved(component, state, resolved);
  }
  return data;
};

export interface ComponentStateProviderProps<M = unknown> {
  components: readonly MessageComponent[];
  message?: M;
  modal?: { customId: string };
  channelId?: string;
  resolved?: APIResolvedData | null;
  onInteraction?: OnMessageComponentInteraction<M>;
  shouldDisableInteractiveComponents?: boolean;
  validators?: Set<() => boolean>;
  validationErrors?: Record<string, string | null>;
  setValidationErrors?: ComponentStateContextValue['setValidationErrors'];
  /** Controlled modal state (InteractionModal keeps it to build the submit payload). */
  states?: Record<string, ComponentState | undefined>;
  onStatesChange?: (
    update: (states: Record<string, ComponentState | undefined>) => Record<string, ComponentState | undefined>,
  ) => void;
  uploads?: Record<string, File>;
  onUploadsChange?: (update: (uploads: Record<string, File>) => Record<string, File>) => void;
  autoFocusId?: string;
  maxUploadSize?: number;
  onUploadError?: (title: string, help: string) => void;
  children: ReactNode;
}

/** Holds the local state of a message's (or modal's) components and runs their interactions. */
export const ComponentStateProvider = <M,>({
  components,
  message,
  modal,
  channelId,
  resolved,
  onInteraction,
  shouldDisableInteractiveComponents = false,
  validators,
  validationErrors,
  setValidationErrors,
  states: controlledStates,
  onStatesChange,
  uploads: controlledUploads,
  onUploadsChange,
  autoFocusId,
  maxUploadSize,
  onUploadError,
  children,
}: ComponentStateProviderProps<M>) => {
  const i18n = useMessageI18n();
  const [localStates, setLocalStates] = useState<Record<string, ComponentState | undefined>>({});
  const [localUploads, setLocalUploads] = useState<Record<string, File>>({});
  const [interaction, setInteraction] = useState<PendingInteraction | null>(null);
  const states = controlledStates ?? localStates;
  const updateStates = onStatesChange ?? setLocalStates;
  const uploads = controlledUploads ?? localUploads;
  const updateUploads = onUploadsChange ?? setLocalUploads;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const onInteractionRef = useRef(onInteraction);
  useLayoutEffect(() => {
    onInteractionRef.current = onInteraction;
  });

  const setState = useCallback(
    (component: MessageComponent, state: ComponentState | null) =>
      updateStates((current) => ({ ...current, [component.id]: state ?? undefined })),
    [updateStates],
  );

  const sendInteraction = useCallback(
    (component: MessageComponent, state?: ComponentState | null) => {
      if (state !== undefined) setState(component, state);
      const handler = onInteractionRef.current;
      if (handler == null) return;
      const result = handler({
        data: getInteractionData(component, state, resolved),
        component,
        message: message as M,
      });
      if (result == null || typeof (result as Promise<unknown>).then !== 'function') return;
      setInteraction({ componentId: component.id, status: 'pending' });
      (result as Promise<unknown>).then(
        () => {
          if (mounted.current) setInteraction((current) => (current?.componentId === component.id ? null : current));
        },
        (error: unknown) => {
          if (!mounted.current) return;
          const text =
            typeof error === 'string'
              ? error
              : error instanceof Error && error.message !== ''
                ? error.message
                : undefined;
          setInteraction({ componentId: component.id, status: 'failed', error: text });
        },
      );
    },
    [message, resolved, setState],
  );

  const addUploads = useCallback(
    (files: File[]) => {
      const ids = files.map(() =>
        JSON.stringify({ type: 'component-upload', containerId: modal?.customId ?? '', uniqueId: `${++nextUploadId}` }),
      );
      updateUploads((current) => ({ ...current, ...Object.fromEntries(ids.map((id, index) => [id, files[index]])) }));
      return ids;
    },
    [modal?.customId, updateUploads],
  );
  const removeUpload = useCallback(
    (id: string) =>
      updateUploads((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      }),
    [updateUploads],
  );

  const value = useMemo<ComponentStateContextValue>(
    () => ({
      components,
      message,
      modal,
      channelId,
      resolved,
      states,
      setState,
      interaction,
      sendInteraction,
      shouldDisableInteractiveComponents,
      validators,
      validationErrors,
      setValidationErrors,
      uploads,
      addUploads,
      removeUpload,
      autoFocusId,
      maxUploadSize,
      onUploadError,
    }),
    [
      components,
      message,
      modal,
      channelId,
      resolved,
      states,
      setState,
      interaction,
      sendInteraction,
      shouldDisableInteractiveComponents,
      validators,
      validationErrors,
      setValidationErrors,
      uploads,
      addUploads,
      removeUpload,
      autoFocusId,
      maxUploadSize,
      onUploadError,
    ],
  );
  void i18n;
  return <ComponentStateContext.Provider value={value}>{children}</ComponentStateContext.Provider>;
};

ComponentStateProvider.displayName = 'ComponentStateProvider';

/** Whether a select with no value is acceptable: in modals unless required, in messages if min is 0. */
export const isSelectOptional = (
  { minValues, required }: { minValues?: number; required?: boolean },
  location: 'modal' | 'message',
) => (location === 'modal' ? !required : minValues === 0);

const useValidator = (component: MessageComponent, state: ComponentState | null | undefined) => {
  const context = useRequiredContext();
  const i18n = useMessageI18n();
  const location = context.modal != null ? 'modal' : 'message';
  const { setValidationErrors, validators } = context;
  const validate = useCallback(
    (value: ComponentState | null | undefined) => {
      let error: string | null = null;
      switch (component.type) {
        case ComponentType.StringSelect:
        case ComponentType.UserSelect:
        case ComponentType.RoleSelect:
        case ComponentType.MentionableSelect:
        case ComponentType.ChannelSelect: {
          const { minValues, maxValues, required } = component;
          const count =
            value == null
              ? 0
              : value.type === ComponentType.StringSelect
                ? value.values.length
                : 'selectedOptions' in value
                  ? value.selectedOptions.length
                  : 0;
          if (count === 0) error = isSelectOptional({ minValues, required }, location) ? null : i18n.FIELD_REQUIRED;
          else if (minValues != null && count < minValues) error = i18n.SELECT_AT_LEAST(minValues);
          else if (maxValues != null && count > maxValues) error = i18n.SELECT_AT_MOST(maxValues);
          break;
        }
        case ComponentType.TextInput: {
          const { minLength, maxLength, required } = component;
          const text = value?.type === ComponentType.TextInput ? value.value : '';
          if (text.length === 0) error = required ? i18n.FIELD_REQUIRED : null;
          else if ((minLength != null && text.length < minLength) || (maxLength != null && text.length > maxLength))
            error = i18n.TEXT_LENGTH_RANGE(minLength ?? 0, maxLength ?? 4000);
          break;
        }
        case ComponentType.FileUpload: {
          const { minValues, maxValues, required } = component as FileUploadComponent;
          const count = value?.type === ComponentType.FileUpload ? value.uploadIds.length : 0;
          if (count === 0) error = required ? i18n.FIELD_REQUIRED : null;
          else if (minValues != null && count < minValues) error = i18n.FILE_UPLOAD_MIN(minValues);
          else if (maxValues != null && count > maxValues) error = i18n.FILE_UPLOAD_MAX(maxValues);
          break;
        }
        case ComponentType.RadioGroup:
          error =
            value?.type !== ComponentType.RadioGroup || value.value == null
              ? component.required
                ? i18n.FIELD_REQUIRED
                : null
              : null;
          break;
        case ComponentType.CheckboxGroup: {
          const { minValues, maxValues, required } = component;
          const count = value?.type === ComponentType.CheckboxGroup ? value.values.length : 0;
          if (count === 0) error = required ? i18n.FIELD_REQUIRED : null;
          else if (minValues != null && count < minValues) error = i18n.SELECT_AT_LEAST(minValues);
          else if (maxValues != null && count > maxValues) error = i18n.SELECT_AT_MOST(maxValues);
          break;
        }
        default:
          error = null;
      }
      setValidationErrors?.((errors) => ({ ...errors, [component.id]: error }));
      return error == null;
    },
    [component, i18n, location, setValidationErrors],
  );
  useEffect(() => {
    if (validators == null) return;
    const check = () => validate(state);
    validators.add(check);
    return () => {
      validators.delete(check);
    };
  }, [validators, validate, state]);
  return { error: context.validationErrors?.[component.id] ?? null, validate };
};

export interface ComponentStateResult<S extends ComponentState = ComponentState> {
  state: S | null;
  /** Validates and stores the state; in messages it also sends the interaction. Returns whether it was valid. */
  executeStateUpdate: (state: S | null) => boolean;
  visualState: ComponentVisualState;
  isDisabled: boolean;
  error: string | null;
}

/** The client's `useComponentState`: local state, interaction state and validation for one component. */
export const useComponentState = <S extends ComponentState = ComponentState>(
  component: MessageComponent,
  defaultState?: S,
): ComponentStateResult<S> => {
  const context = useRequiredContext();
  const stored = context.states[component.id] as S | undefined;
  const isModal = context.modal != null;
  const [initial] = useState(defaultState);
  const { error, validate } = useValidator(component, stored ?? (isModal ? initial : undefined));
  const { setState, sendInteraction } = context;

  // Modals store the default value right away so it is submitted even if the user never touches it.
  const seeded = useRef(false);
  useEffect(() => {
    if (!isModal || seeded.current) return;
    seeded.current = true;
    if (stored == null && initial != null) setState(component, initial);
  }, [isModal, stored, initial, component, setState]);

  const executeStateUpdate = useCallback(
    (state: S | null) => {
      if (isModal) {
        if (state == null) return true;
        setState(component, state);
        return validate(state);
      }
      if (!validate(state)) return false;
      sendInteraction(component, state);
      return true;
    },
    [isModal, component, setState, validate, sendInteraction],
  );

  if (isModal)
    return {
      state: stored ?? initial ?? null,
      executeStateUpdate,
      isDisabled: false,
      visualState: ComponentVisualState.NORMAL,
      error,
    };

  const disabledByContext = context.shouldDisableInteractiveComponents;
  let visualState: ComponentVisualState = ComponentVisualState.NORMAL;
  const pending = context.interaction;
  if (pending != null && pending.status !== 'failed') {
    if (pending.componentId === component.id) visualState = ComponentVisualState.LOADING;
    else if (isActionComponent(component)) visualState = ComponentVisualState.DISABLED;
  }
  if (disabledByContext && isActionComponent(component)) visualState = ComponentVisualState.DISABLED;
  return {
    state: stored ?? null,
    executeStateUpdate,
    isDisabled: disabledByContext && isActionComponent(component),
    visualState,
    error,
  };
};

/** The failed interaction's error to show under a row or section that contains the failed component. */
export const useComponentError = (container: MessageComponent) => {
  const context = useComponentContext();
  const i18n = useMessageI18n();
  const interaction = context?.interaction;
  if (interaction == null || interaction.status !== 'failed') return null;
  const contains = (component: MessageComponent): boolean =>
    component.id === interaction.componentId ||
    ('components' in component && component.components.some(contains)) ||
    ('accessory' in component && contains(component.accessory));
  return contains(container) ? (interaction.error ?? i18n.INTERACTION_FAILED) : null;
};

/** The chain of parents of a component in the current message or modal. */
export const useComponentParents = (component: MessageComponent) => {
  const context = useRequiredContext();
  return getComponentParents(context.components, component);
};
