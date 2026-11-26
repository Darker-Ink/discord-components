import { useMemo, useState, type FormEvent } from 'react';
import {
  Avatar,
  AvatarSizes,
  BaseModal,
  InlineNotice,
  ModalActionBar,
  ModalBody,
  ModalHeader,
  openModal,
  type ModalTransitionStateValue,
} from '@discord-components/components';
import { useMessageI18n } from '../Message/messageI18n';
import { ComponentStateProvider, type ComponentState } from '../MessageComponents/ComponentState';
import { createComponents } from '../MessageComponents/createComponents';
import { renderComponents } from '../MessageComponents/MessageComponents';
import {
  createResolver,
  MessageResolversContext,
  useMessageResolvers,
  type APIResolvedData,
  type MessageResolvers,
} from '../MessageComponents/resolvers';
import { MessageMarkdownRendererContext, type RenderMessageMarkdown } from '../Message/markdown';
import { ComponentType, type APIModalComponent, type MessageComponent } from '../MessageComponents/types';
import styles from './InteractionModal.module.css';

/** A modal an app responds with (the `data` of an interaction response of type MODAL). */
export interface APIModalInteractionResponseCallbackData {
  custom_id: string;
  title: string;
  components: APIModalComponent[];
}

/** A component's value in a modal submission, in the API's shape. */
export type ModalSubmitComponent =
  | { type: typeof ComponentType.ActionRow; components: ModalSubmitComponent[] }
  | { type: typeof ComponentType.Label; component: ModalSubmitComponent }
  | { type: typeof ComponentType.TextDisplay }
  | { type: typeof ComponentType.TextInput; custom_id: string; value: string | null }
  | {
      type:
        | typeof ComponentType.StringSelect
        | typeof ComponentType.UserSelect
        | typeof ComponentType.RoleSelect
        | typeof ComponentType.MentionableSelect
        | typeof ComponentType.ChannelSelect
        | typeof ComponentType.CheckboxGroup;
      custom_id: string;
      values: string[] | null;
    }
  | { type: typeof ComponentType.FileUpload; custom_id: string; values: number[] | null }
  | { type: typeof ComponentType.RadioGroup; custom_id: string; value: string | null }
  | { type: typeof ComponentType.Checkbox; custom_id: string; value: boolean };

/** What the app receives as the MODAL_SUBMIT interaction's `data` (plus the picked files). */
export interface APIModalSubmission {
  custom_id: string;
  components: ModalSubmitComponent[];
  /** Files of FileUpload components; their `values` index into this list. */
  attachments?: File[];
  resolved?: APIResolvedData;
}

/** The app the modal belongs to: its name and icon head the modal. */
export interface InteractionModalApplication {
  id: string;
  name: string;
  icon?: string | null;
  /** Overrides the icon URL (the CDN app icon, or the default avatar without one). */
  icon_url?: string;
}

const buildSubmission = (
  components: readonly MessageComponent[],
  states: Record<string, ComponentState | undefined>,
  uploadIds: string[],
): ModalSubmitComponent[] =>
  components.map((component): ModalSubmitComponent => {
    const state = states[component.id];
    switch (component.type) {
      case ComponentType.ActionRow:
        return { type: component.type, components: buildSubmission(component.components, states, uploadIds) };
      case ComponentType.TextInput:
        return {
          type: component.type,
          custom_id: component.customId,
          value: state?.type === component.type ? state.value : null,
        };
      case ComponentType.FileUpload:
        return {
          type: component.type,
          custom_id: component.customId,
          values: state?.type === component.type ? state.uploadIds.map((id) => uploadIds.indexOf(id)) : null,
        };
      case ComponentType.StringSelect:
        return {
          type: component.type,
          custom_id: component.customId,
          values: state?.type === component.type ? state.values : null,
        };
      case ComponentType.UserSelect:
      case ComponentType.RoleSelect:
      case ComponentType.MentionableSelect:
      case ComponentType.ChannelSelect:
        return {
          type: component.type,
          custom_id: component.customId,
          values:
            state != null && 'selectedOptions' in state ? state.selectedOptions.map((option) => option.value) : null,
        };
      case ComponentType.TextDisplay:
        return { type: component.type };
      case ComponentType.Label:
        return { type: component.type, component: buildSubmission([component.component], states, uploadIds)[0] };
      case ComponentType.RadioGroup:
        return {
          type: component.type,
          custom_id: component.customId,
          value: state?.type === component.type ? state.value : null,
        };
      case ComponentType.CheckboxGroup:
        return {
          type: component.type,
          custom_id: component.customId,
          values: state?.type === component.type ? state.values : null,
        };
      case ComponentType.Checkbox:
        return {
          type: component.type,
          custom_id: component.customId,
          value: state?.type === component.type && state.value,
        };
      default:
        throw new Error('unreachable');
    }
  });

export interface InteractionModalProps {
  /** The modal, as the app sends it. */
  modal: APIModalInteractionResponseCallbackData;
  application: InteractionModalApplication;
  /**
   * Called with the submission once every component validates. Return a promise to keep the Submit button
   * loading; the modal closes when it resolves and shows "Something went wrong" when it rejects.
   */
  onSubmit?: (submission: APIModalSubmission) => void | Promise<unknown>;
  /** Passed by `openModal`. */
  transitionState: ModalTransitionStateValue | null | undefined;
  onClose: () => void;
  /** Data for the modal's user, role and channel selects (as the API resolves it for apps). */
  resolved?: APIResolvedData;
  resolvers?: MessageResolvers;
  renderMarkdown?: RenderMessageMarkdown;
  /** Largest file a FileUpload accepts, in bytes (defaults to Discord's 10 MB). */
  maxUploadSize?: number;
}

const APP_ICON_SIZE = 24;

/** An app's modal, drawn like the client's: app icon and title, the submission warning, the components. */
export const InteractionModal = ({
  modal,
  application,
  onSubmit,
  transitionState,
  onClose,
  resolved,
  resolvers,
  renderMarkdown,
  maxUploadSize,
}: InteractionModalProps) => {
  const i18n = useMessageI18n();
  const parentResolvers = useMessageResolvers();
  const mergedResolvers = useMemo(
    () => (resolvers != null ? { ...parentResolvers, ...resolvers } : parentResolvers),
    [parentResolvers, resolvers],
  );
  const resolver = createResolver(mergedResolvers, resolved);
  const components = useMemo(() => createComponents(modal.components), [modal.components]);
  const [states, setStates] = useState<Record<string, ComponentState | undefined>>({});
  const [uploads, setUploads] = useState<Record<string, File>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const [validators] = useState(() => new Set<() => boolean>());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalContext = useMemo(() => ({ customId: modal.custom_id }), [modal.custom_id]);
  const iconURL =
    application.icon_url ??
    (application.icon != null
      ? `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.webp?size=${APP_ICON_SIZE * 2}`
      : resolver.avatarURL(
          { id: application.id, username: application.name, discriminator: '0000', bot: true },
          APP_ICON_SIZE,
        ));

  const submit = async () => {
    setError(null);
    let valid = true;
    validators.forEach((validate) => {
      if (!validate()) valid = false;
    });
    if (!valid) return;
    const uploadIds = Object.keys(uploads);
    const submission: APIModalSubmission = {
      custom_id: modal.custom_id,
      components: buildSubmission(components, states, uploadIds),
    };
    if (uploadIds.length > 0) submission.attachments = uploadIds.map((id) => uploads[id]);
    const result = onSubmit?.(submission);
    if (result == null || typeof (result as Promise<unknown>).then !== 'function') {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await result;
      onClose();
    } catch {
      setError(i18n.SOMETHING_WENT_WRONG);
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void submit();
      }}
    >
      <BaseModal transitionState={transitionState} onClose={onClose} aria-label={modal.title}>
        <ModalHeader
          leading={
            <Avatar
              src={iconURL}
              size={AvatarSizes.SIZE_24}
              aria-label={application.name}
              className={styles.applicationIcon}
            />
          }
          title={modal.title}
          titleTextVariant="heading-xl/semibold"
        />
        <ModalBody>
          {error != null && error !== '' ? (
            <div className={styles.submissionWarning}>
              <InlineNotice type="critical" message={error} role="alert" />
            </div>
          ) : null}
          <div className={styles.submissionWarning}>
            <InlineNotice type="warning" message={i18n.MODAL_SUBMISSION_WARNING(application.name)} role="none" />
          </div>
          <div className={styles.components}>
            <ComponentStateProvider
              components={components}
              modal={modalContext}
              resolved={resolved}
              validators={validators}
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
              states={states}
              onStatesChange={setStates}
              uploads={uploads}
              onUploadsChange={setUploads}
              maxUploadSize={maxUploadSize}
            >
              {renderComponents(components)}
            </ComponentStateProvider>
          </div>
        </ModalBody>
        <ModalActionBar
          actions={[
            { variant: 'secondary', text: i18n.CANCEL, onClick: onClose, autoFocus: false },
            {
              variant: 'primary',
              text: i18n.SUBMIT,
              loading: submitting,
              onClick: () => void submit(),
              autoFocus: false,
            },
          ]}
          actionsFullWidth
        />
      </BaseModal>
    </form>
  );
  return (
    <MessageResolversContext.Provider value={mergedResolvers}>
      {renderMarkdown != null ? (
        <MessageMarkdownRendererContext.Provider value={renderMarkdown}>{body}</MessageMarkdownRendererContext.Provider>
      ) : (
        body
      )}
    </MessageResolversContext.Provider>
  );
};

InteractionModal.displayName = 'InteractionModal';

export type OpenInteractionModalOptions = Omit<InteractionModalProps, 'transitionState' | 'onClose'>;

/** Opens an app's modal on the modal stack (stacking on top of open modals, like the client); returns its key. */
export const openInteractionModal = (options: OpenInteractionModalOptions) =>
  openModal((props) => <InteractionModal {...props} {...options} />, { stackNextByDefault: true });
