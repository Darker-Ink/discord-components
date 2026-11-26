import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import type { Descendant } from 'slate';
import { FocusRing } from '@discord-mana/components';
import type { MarkdownRules } from '@discord-mana/markdown/internal';
import { ChatInputLayouts, ChatInputTypes, type ChatInputType, type ChatInputTypeName } from '../../chatInputTypes';
import { EditorResolversContext, type EditorContextValue, type EditorResolvers } from '../../core/context';
import { toRichValue, toTextValue } from '../../core/serialize';
import type { CodeHighlightSpan, RichValue } from '../../core/types';
import { Autocomplete, type AutocompleteHandle } from '../Autocomplete/Autocomplete';
import { ChannelEditor, type ChannelEditorHandle } from './ChannelEditor';
import { AttachButton, ChannelTextAreaButtons } from './ChannelTextAreaButtons';
import { CharacterCount, getCharacterCountVisibility, NON_PREMIUM_MAX_MESSAGE_LENGTH } from './CharacterCount';
import styles from './ChannelTextArea.module.css';
import './chatInputVariables.css';

export type ChannelTextAreaHandle = ChannelEditorHandle;

/** What `onSubmit` may return: `false` (or `{ shouldClear: false }`) keeps the text in the input. */
export type SubmitResult = void | boolean | { shouldClear?: boolean; shouldRefocus?: boolean };

export interface ChannelTextAreaProps {
  ref?: Ref<ChannelTextAreaHandle>;
  /** The text, in message format (`<@id>`, `<:name:id>`…). Controlled when given. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, richValue: Descendant[]) => void;
  /** Enter (without Shift). The input clears afterwards when its type clears on submit. */
  onSubmit?: (value: string) => SubmitResult | Promise<SubmitResult>;
  /** Which of the client's inputs this is (`NORMAL` is the chat bar, `EDIT` the edit-message input…). */
  type?: ChatInputType | ChatInputTypeName;
  guildId?: string | null;
  channelId?: string | null;
  /** Users, roles, channels and emoji for pills and autocomplete. */
  resolvers?: EditorResolvers;
  /** Markdown rules used for styling and pills; defaults to the chat's. */
  rules?: MarkdownRules;
  highlightCode?: (code: string, lang: string) => CodeHighlightSpan[][] | null;
  placeholder?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Keeps showing the text when disabled (otherwise a disabled input is empty with a permission notice). */
  showValueWhenDisabled?: boolean;
  /** Live markdown styling (the client's "Preview emojis, mentions and markdown syntax as you type"). */
  previewMarkdown?: boolean;
  spellcheckEnabled?: boolean;
  maxCharacterCount?: number;
  showRemainingCharsAfterCount?: number;
  canUseIncreasedMessageLength?: boolean;
  allowNewLines?: boolean;
  highlighted?: boolean;
  error?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  innerClassName?: string;
  editorClassName?: string;
  characterCountClassName?: string;
  disableThemedBackground?: boolean;
  /** The "+" button; defaults to one when the type allows attachments. Return null to leave it out. */
  renderAttachButton?: (className: string) => ReactNode;
  /** The buttons on the right; defaults to the type's gift, GIF, sticker and emoji buttons. */
  renderButtons?: () => ReactNode;
  /** Return true when the paste was handled (e.g. files); the editor ignores it then. */
  onPaste?: (event: ClipboardEvent<HTMLDivElement>) => boolean;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onResize?: (height: number) => void;
  /** Rendered at the end of the chat bar. */
  children?: ReactNode;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
}

const DISABLED_PLACEHOLDER = 'You do not have permission to send messages in this channel.';

const resolveType = (type: ChatInputType | ChatInputTypeName | undefined): ChatInputType =>
  type == null ? ChatInputTypes.NORMAL : typeof type === 'string' ? ChatInputTypes[type] : type;

/**
 * The client's chat input (`ChannelTextAreaContainer`): the rich editor in the chat bar with its buttons,
 * character count and autocomplete. Every rich text area of the client is this component with a chat input type.
 */
export const ChannelTextArea = ({
  ref,
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  type: typeProp,
  guildId = null,
  channelId = null,
  resolvers,
  rules,
  highlightCode,
  placeholder,
  accessibilityLabel,
  disabled = false,
  showValueWhenDisabled = false,
  previewMarkdown = true,
  spellcheckEnabled = true,
  maxCharacterCount = NON_PREMIUM_MAX_MESSAGE_LENGTH,
  showRemainingCharsAfterCount,
  canUseIncreasedMessageLength = false,
  allowNewLines = true,
  highlighted = false,
  error,
  required,
  id,
  className,
  innerClassName,
  editorClassName,
  characterCountClassName,
  disableThemedBackground = false,
  renderAttachButton,
  renderButtons,
  onPaste,
  onFocus,
  onBlur,
  onKeyDown,
  onResize,
  children,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
}: ChannelTextAreaProps) => {
  const type = resolveType(typeProp);
  const editorRef = useRef<ChannelEditorHandle>(null);
  const autocompleteRef = useRef<AutocompleteHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => editorRef.current!, []);

  const context = useMemo<EditorContextValue>(
    () => ({ guildId, channelId, resolvers: resolvers ?? {}, rules, highlightCode }),
    [guildId, channelId, resolvers, rules, highlightCode],
  );

  // Text and rich value travel together like the client's draft; a new `value` from the parent becomes lines
  // (the editor turns its mentions into pills).
  const [state, setState] = useState(() => {
    const text = value ?? defaultValue;
    return { textValue: text, richValue: toRichValue(text) as Descendant[] };
  });
  let current = state;
  if (value != null && value !== state.textValue) {
    current = { textValue: value, richValue: toRichValue(value) };
    setState(current);
  }
  const { textValue, richValue } = current;
  const [submitting, setSubmitting] = useState(false);
  const [editorHeight, setEditorHeight] = useState(0);
  const [popup, setPopup] = useState<{ id: string | null; activeDescendant: string | null }>({
    id: null,
    activeDescendant: null,
  });
  const emptyRichValue = useMemo(() => toRichValue(''), []);

  const handleChange = useCallback(
    (text: string, rich: Descendant[]) => {
      setState({ textValue: text, richValue: rich });
      onChange?.(text, rich);
    },
    [onChange],
  );

  const clear = useCallback(() => handleChange('', toRichValue('')), [handleChange]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (submitting || onSubmit == null) return;
      if (text.trim() === '' && !type.submit?.allowEmptyMessage) return;
      setSubmitting(true);
      try {
        const result = await onSubmit(text);
        const shouldClear = result !== false && (typeof result !== 'object' || result.shouldClear !== false);
        if (shouldClear && type.submit?.clearOnSubmit) clear();
        if (typeof result === 'object' && result.shouldRefocus) editorRef.current?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [clear, onSubmit, submitting, type.submit],
  );

  const handleResize = useCallback(
    (height: number) => {
      setEditorHeight(height ?? 0);
      onResize?.(height);
    },
    [onResize],
  );

  const inline = type.layout === ChatInputLayouts.INLINE;
  const flush = type.layout === ChatInputLayouts.FLUSH;
  const showDisabledStyles = disabled || (submitting && type.submit?.useDisabledStylesOnSubmit === true);
  const isEdit = type === ChatInputTypes.EDIT;
  const attachButton =
    disabled || !type.attachments ? null : renderAttachButton != null ? (
      renderAttachButton(styles.attachButton)
    ) : (
      <AttachButton className={styles.attachButton} />
    );
  const { isVisible, showsUpsell } = getCharacterCountVisibility({
    type,
    textValue,
    maxCharacterCount,
    showRemainingCharsAfterCount,
    canUseIncreasedMessageLength,
  });
  const showCharacterCount = !disabled && type.showCharacterCount === true;
  const buttons =
    renderButtons != null ? (
      renderButtons()
    ) : (
      <ChannelTextAreaButtons
        type={type}
        disabled={disabled}
        isEmpty={textValue.trim().length === 0}
        onSubmit={() => editorRef.current?.submit()}
      />
    );
  const placeholderText = disabled ? (showValueWhenDisabled ? '' : DISABLED_PLACEHOLDER) : placeholder;

  return (
    <EditorResolversContext.Provider value={context}>
      <div
        ref={containerRef}
        className={clsx(className, styles.channelTextArea, {
          [styles.charCountShowing]: isVisible && showCharacterCount,
          [styles.charCountUpsellShowing]: showsUpsell && showCharacterCount,
          [styles.channelTextAreaDisabled]: showDisabledStyles,
          [styles.highlighted]: highlighted,
          [styles.inlineContainer]: inline,
          [styles.flushContainer]: flush,
          [styles.error]: error != null,
        })}
      >
        <div
          ref={scrollerRef}
          className={clsx(innerClassName, styles.scrollableContainer, {
            [styles.themedBackground]: !disableThemedBackground,
          })}
        >
          <div
            className={clsx(styles.inner, {
              [styles.innerDisabled]: showDisabledStyles,
              [styles.sansAttachButton]: !isEdit && (attachButton != null || showDisabledStyles),
              [styles.sansAttachButtonCreateThread]: type === ChatInputTypes.THREAD_CREATION,
              [styles.sansAttachButtonCreatePost]:
                type === ChatInputTypes.CREATE_FORUM_POST || type === ChatInputTypes.FORWARD_MESSAGE_INPUT,
              [styles.sansAttachButtonUserProfileReply]: type === ChatInputTypes.USER_PROFILE_REPLY,
            })}
            onMouseDown={() => editorRef.current?.focus()}
          >
            {attachButton}
            <FocusRing ringTarget={containerRef} ringClassName={styles.focusRing}>
              <ChannelEditor
                ref={editorRef}
                value={disabled && !showValueWhenDisabled ? emptyRichValue : (richValue as RichValue)}
                type={type}
                context={context}
                className={clsx(
                  {
                    [styles.textAreaThreadCreation]: type === ChatInputTypes.THREAD_CREATION,
                    [styles.profileBioInput]: type === ChatInputTypes.PROFILE_BIO_INPUT,
                    [styles.overlayInlineReply]: type === ChatInputTypes.OVERLAY_INLINE_REPLY,
                  },
                  editorClassName,
                  styles.textArea,
                  styles.textAreaSlate,
                  { [styles.textAreaDisabled]: disabled || submitting },
                )}
                id={id}
                placeholder={placeholderText ?? undefined}
                required={required}
                disabled={disabled}
                submitting={submitting}
                previewMarkdown={previewMarkdown}
                spellcheckEnabled={spellcheckEnabled}
                disableAutoFocus={type.disableAutoFocus ?? false}
                disableEnterToSubmit={type.submit?.disableEnterToSubmit ?? false}
                allowNewLines={allowNewLines}
                textAreaPaddingClassName={clsx({
                  [styles.textAreaForPostCreation]: type === ChatInputTypes.CREATE_FORUM_POST,
                  [styles.textAreaCustomGift]: type === ChatInputTypes.CUSTOM_GIFT,
                  [styles.textAreaForUserProfile]: type === ChatInputTypes.USER_PROFILE,
                  [styles.textAreaForOverlayInlineReply]: type === ChatInputTypes.OVERLAY_INLINE_REPLY,
                })}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onPaste={onPaste}
                onResize={handleResize}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onTab={() => autocompleteRef.current?.onTabOrEnter(false) ?? false}
                onEnter={() => autocompleteRef.current?.onTabOrEnter(true) ?? false}
                onSpace={() => autocompleteRef.current?.onSpace() ?? false}
                moveSelection={(delta) => autocompleteRef.current?.onMoveSelection(delta) ?? false}
                maybeShowAutocomplete={() => autocompleteRef.current?.onMaybeShowAutocomplete()}
                hideAutocomplete={() => autocompleteRef.current?.onHideAutocomplete()}
                aria-controls={popup.id ?? undefined}
                aria-haspopup="listbox"
                aria-expanded={popup.id !== null || undefined}
                aria-activedescendant={popup.activeDescendant ?? undefined}
                aria-invalid={textValue.length > maxCharacterCount}
                aria-describedby={ariaDescribedBy}
                aria-labelledby={ariaLabelledBy ?? (accessibilityLabel != null ? undefined : undefined)}
                aria-autocomplete="list"
              />
            </FocusRing>
            {buttons}
            <div className={styles.hiddenAppLauncherAnchor} />
          </div>
        </div>
        <Autocomplete
          ref={autocompleteRef}
          editorRef={editorRef}
          type={type}
          textValue={textValue}
          targetRef={containerRef}
          editorHeight={editorHeight}
          onPopupChange={setPopup}
        />
        {showCharacterCount ? (
          <CharacterCount
            type={type}
            textValue={textValue}
            className={characterCountClassName}
            maxCharacterCount={maxCharacterCount}
            showRemainingCharsAfterCount={showRemainingCharsAfterCount}
            canUseIncreasedMessageLength={canUseIncreasedMessageLength}
          />
        ) : null}
        {children}
      </div>
    </EditorResolversContext.Provider>
  );
};

ChannelTextArea.displayName = 'ChannelTextArea';

/** The text of a rich value as the editor would send it. */
export const richValueToText = (value: Descendant[], resolvers?: EditorResolvers) =>
  toTextValue(value, { mode: 'raw', ignoreTrailingEmptyNodes: true, resolvers });
