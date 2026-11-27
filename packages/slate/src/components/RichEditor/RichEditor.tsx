import { Component, createRef, type ClipboardEvent, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Descendant, NodeEntry, Range } from 'slate';
import { markupStyles, obscuredContentStyles } from '@discord-mana/messages';
import {
  Editable,
  ReactEditor,
  Slate,
  type RenderElementProps,
  type RenderLeafProps,
  type RenderPlaceholderProps,
} from '../../slate-react';
import { HistoryUtils } from '../../core/history';
import { EditorUtils, PathUtils, RangeUtils } from '../../core/slateUtils';
import { SlateTransforms } from '../../core/transforms';
import { toRichValue } from '../../core/serialize';
import type { DiscordEditor, RichElement } from '../../core/types';
import {
  ChannelMentionPill,
  CommandMentionPill,
  EditorCustomEmoji,
  EditorEmoji,
  InlineVoid,
  RoleMentionPill,
  TextMentionPill,
  TimestampPill,
  UserMentionPill,
} from './InlineElements';
import inlineStyles from './inlineElements.module.css';
import decorationStyles from './markupDecorations.module.css';
import styles from './RichEditor.module.css';

// The client's base Slate editor component: Slate + Editable with the chat's element and leaf renderers, its own
// placeholder, and IME, selection and clipboard fixes. The chat input, edit input and every other rich text area
// render through it.

/** Leaf decoration flags to class names. */
const DECORATION_CLASSES: Record<string, string> = {
  strong: decorationStyles.bold,
  em: decorationStyles.italics,
  u: decorationStyles.underline,
  s: decorationStyles.strikethrough,
  inlineCode: decorationStyles.inlineCode,
  link: decorationStyles.fakeLink,
  url: decorationStyles.fakeLink,
  autolink: decorationStyles.fakeLink,
  silentPrefix: decorationStyles.silentPrefix,
  spoiler: clsx(
    obscuredContentStyles.spoilerContent,
    obscuredContentStyles.spoilerMarkdownContent,
    obscuredContentStyles.obscuredTextContent,
    decorationStyles.spoiler,
  ),
  staticRouteLink: decorationStyles.fakeLink,
  syntaxBefore: decorationStyles.syntaxBefore,
  syntaxAfter: decorationStyles.syntaxAfter,
  codeBlockText: decorationStyles.codeBlockText,
  codeBlockSyntax: decorationStyles.codeBlockSyntax,
  codeBlockLang: decorationStyles.codeBlockLang,
  subtext: decorationStyles.subtext,
};

const LINK_FLAGS = new Set(['link', 'url', 'autolink']);

export interface RichEditorRenderElementProps extends RenderElementProps {
  element: RichElement;
}

export interface RichEditorProps {
  editor: DiscordEditor;
  /**
   * `inline` renders only the editable element (as `as`), without the chat's markup and editor classes or the
   * wrapper around it, so it takes the typography of `className` (see `InlineEditor`).
   */
  appearance?: 'default' | 'inline';
  /** The editable element's tag in the inline appearance. */
  as?: React.ElementType;
  style?: React.CSSProperties;
  id?: string;
  className?: string;
  containerClassName?: string;
  placeholder?: string;
  readOnly?: boolean;
  spellCheck?: boolean;
  autoFocus?: boolean;
  /** False makes the editor unfocusable (disabled inputs): selections inside it are dropped. */
  canFocus?: boolean;
  decorate?: (entry: NodeEntry) => Range[];
  renderExtraElement?: (props: RenderElementProps) => ReactNode | null;
  renderExtraLeaf?: (props: RenderLeafProps) => ReactNode | null;
  onChange?: (value: Descendant[]) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLDivElement>) => void;
  'aria-multiline'?: boolean;
  'aria-owns'?: string;
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup'];
  'aria-expanded'?: boolean;
  'aria-activedescendant'?: string;
  'aria-controls'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-autocomplete'?: React.AriaAttributes['aria-autocomplete'];
  'aria-required'?: boolean;
}

interface RichEditorState {
  initialValue: Descendant[];
  showPlaceholder: boolean;
}

const decorationClassName = (flags: Record<string, unknown> | undefined) =>
  Object.entries(flags ?? {})
    .filter(([key]) => key !== 'anchor' && key !== 'focus')
    .map(([key, value]) => (value === true && key in DECORATION_CLASSES ? DECORATION_CLASSES[key] : null))
    .filter((name) => name != null)
    .join(' ');

const renderDefaultElement = (props: RenderElementProps, spellCheck: boolean | undefined) => {
  const { attributes, children } = props;
  const element = props.element as RichElement;
  const decorations = props.decorations as Record<string, unknown>[] | undefined;
  const className = decorationClassName(decorations?.[0]);
  switch (element.type) {
    case 'line':
      if (element.codeBlockState?.isInCodeBlock)
        return (
          <div
            className={decorationStyles.codeLine}
            spellCheck={spellCheck !== false && (element.codeBlockState == null || element.codeBlockState.lang == null)}
            {...attributes}
          >
            {children}
          </div>
        );
      return <div {...attributes}>{children}</div>;
    case 'blockQuote':
      return (
        <div {...attributes} className={clsx(markupStyles.blockquoteContainer, markupStyles.slateBlockquoteContainer)}>
          <span contentEditable={false} className={markupStyles.blockquoteDivider} />
          <blockquote>{children}</blockquote>
        </div>
      );
    case 'emoji':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <EditorEmoji emoji={element.emoji} />
          {children}
        </InlineVoid>
      );
    case 'customEmoji':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <EditorCustomEmoji emoji={element.emoji} />
          {children}
        </InlineVoid>
      );
    case 'textMention':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <TextMentionPill text={element.name} />
          {children}
        </InlineVoid>
      );
    case 'userMention':
      return (
        <InlineVoid attributes={attributes} className={className} preventSelection>
          <UserMentionPill id={element.userId} />
          {children}
        </InlineVoid>
      );
    case 'roleMention':
      return (
        <InlineVoid attributes={attributes} className={className} preventSelection>
          <RoleMentionPill id={element.roleId} />
          {children}
        </InlineVoid>
      );
    case 'channelMention':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <ChannelMentionPill id={element.channelId} />
          {children}
        </InlineVoid>
      );
    case 'commandMention':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <CommandMentionPill text={element.commandName} id={element.commandId} />
          {children}
        </InlineVoid>
      );
    case 'timestamp':
      return (
        <InlineVoid attributes={attributes} className={className}>
          <TimestampPill timestamp={element.parsed} />
          {children}
        </InlineVoid>
      );
    case 'staticRouteLink':
    case 'soundboard':
    case 'gameMention':
    case 'hostInlineVoid':
      // Server guide links, soundmoji and game mentions need app data this package doesn't model; they keep
      // their place (and serialize) but render empty.
      return (
        <InlineVoid attributes={attributes} className={className}>
          {children}
        </InlineVoid>
      );
    default:
      return null;
  }
};

const renderDefaultLeaf = (editor: DiscordEditor, props: RenderLeafProps) => {
  const { attributes, children, leaf, text } = props;
  const linksDisabled = editor.chatInputType.markdown?.disableLinks === true;
  let spellCheck: boolean | undefined = false;
  let className: string | undefined;
  let style: React.CSSProperties | undefined;
  const [parent] = EditorUtils.node(editor, PathUtils.parent(EditorUtils.findPath(editor, text)));
  const parentType = EditorUtils.isEditor(parent) ? 'editor' : (parent as RichElement).type;
  if (parentType === 'line' || parentType === 'blockQuote') {
    spellCheck = undefined;
    className = Object.entries(leaf)
      .filter(([key]) => key !== 'text')
      .flatMap(([key, value]) => {
        if (key === 'hljsTypes') return value as string[];
        if (key === 'ansiStyle') return [];
        if (value === true) {
          if (key === 'codeBlockLang' || key === 'codeBlockSyntax') spellCheck = false;
          if (key.startsWith('before_') || key.startsWith('after_'))
            return [(decorationStyles as Record<string, string>)[key]];
          if (linksDisabled && LINK_FLAGS.has(key)) return [];
          if (key in DECORATION_CLASSES) return [DECORATION_CLASSES[key]];
          throw Error(`Slate: Unknown decoration attribute: ${key}`);
        }
        return [];
      })
      .filter((name) => name != null)
      .join(' ');
    style = leaf.ansiStyle as React.CSSProperties | undefined;
    className = clsx(className, { [decorationStyles.syntaxOverride]: leaf.text === '||' || leaf.text === '\\' });
  } else spellCheck = undefined;
  className = clsx(className, { [inlineStyles.emptyText]: text.text === '' });
  return (
    <span {...attributes} className={className} style={style} spellCheck={spellCheck}>
      {children}
    </span>
  );
};

const isRangeCollapsed = (
  container: Node,
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
) => startContainer === endContainer && startOffset === endOffset && container != null;

const hasDomParent = (node: Node | null, parent: Node | null) =>
  parent != null && node != null && parent.contains(node);

export class RichEditor extends Component<RichEditorProps, RichEditorState> {
  static displayName = 'RichEditor';

  containerRef = createRef<HTMLDivElement>();

  getContainer(): HTMLElement | null {
    if (this.props.appearance !== 'inline') return this.containerRef.current;
    try {
      return EditorUtils.toDOMNode(this.props.editor, this.props.editor);
    } catch {
      return null;
    }
  }

  constructor(props: RichEditorProps) {
    super(props);
    this.state = EditorUtils.isEditorEmpty(props.editor)
      ? { initialValue: toRichValue(''), showPlaceholder: true }
      : { initialValue: EditorUtils.richValue(props.editor), showPlaceholder: false };
  }

  override componentDidMount() {
    this.props.editor.events.addListener('onChange', this.handleOnChange);
  }

  override componentDidUpdate(previous: RichEditorProps) {
    if (previous.editor !== this.props.editor) {
      previous.editor.events.removeListener('onChange', this.handleOnChange);
      this.props.editor.events.addListener('onChange', this.handleOnChange);
    }
  }

  override componentWillUnmount() {
    this.props.editor.events.removeListener('onChange', this.handleOnChange);
  }

  override componentDidCatch(error: unknown) {
    console.error(error);
    this.setState({ initialValue: [...this.props.editor.children] });
  }

  renderElement = (props: RenderElementProps) => {
    const { renderExtraElement, spellCheck } = this.props;
    const { attributes, children } = props;
    if (attributes.dir === 'rtl')
      (attributes as { style?: React.CSSProperties }).style = {
        ...(attributes as { style?: React.CSSProperties }).style,
        textAlign: 'right',
      };
    const element = renderExtraElement?.(props) ?? renderDefaultElement(props, spellCheck);
    return (element ?? <div {...attributes}>{children}</div>) as React.JSX.Element;
  };

  renderLeaf = (props: RenderLeafProps) => {
    const { editor, renderExtraLeaf } = this.props;
    const leaf = renderExtraLeaf?.(props) ?? renderDefaultLeaf(editor, props);
    return (leaf ?? <span {...props.attributes}>{props.children}</span>) as React.JSX.Element;
  };

  handleOnChange = () => {
    const { editor } = this.props;
    const showPlaceholder = EditorUtils.isEditorEmpty(editor) && editor.composition == null;
    if (showPlaceholder !== this.state.showPlaceholder) this.setState({ showPlaceholder });
    this.props.onChange?.(EditorUtils.richValue(editor));
    if (this.props.canFocus === false) {
      const selection = (EditorUtils.findDocumentOrShadowRoot(editor) as Document).getSelection();
      if (selection != null && this.isSelectionPartiallyInside(selection)) selection.removeAllRanges();
    }
  };

  handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (this.props.editor.composition != null) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.props.onKeyDown?.(event);
  };

  handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (this.props.editor.composition != null) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.props.onKeyUp?.(event);
  };

  // Chrome replaces selected text through `beforeinput` without Slate seeing a matching selection.
  handleBeforeInput = (event: InputEvent) => {
    const { editor } = this.props;
    const selection = (EditorUtils.findDocumentOrShadowRoot(editor) as Document).getSelection();
    const domRange = selection != null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    let target: StaticRange | Range | globalThis.Range | null = event.getTargetRanges()[0] ?? null;
    if (editor.composition != null) return;
    if (
      typeof navigator !== 'undefined' &&
      /Chrome/i.test(navigator.userAgent) &&
      (event.inputType === 'insertText' || event.inputType === 'insertReplacementText')
    ) {
      if (target == null) target = domRange;
      if (target != null) {
        const range = EditorUtils.toSlateRange(editor, target as StaticRange, {
          exactMatch: false,
          suppressThrow: true,
        });
        if (range != null && event.data != null) {
          if (RangeUtils.isExpanded(range))
            HistoryUtils.withSingleEntry(editor, () => {
              editor.selection = range;
              editor.deleteFragment();
              editor.insertText(event.data!);
              event.preventDefault();
            });
          else {
            editor.insertText(event.data);
            event.preventDefault();
          }
        }
      }
    }
    if (event.inputType.startsWith('deleteContent') && domRange != null && !domRange.collapsed) {
      const range = EditorUtils.toSlateRange(editor, domRange, { exactMatch: true, suppressThrow: true });
      if (range != null && RangeUtils.isExpanded(range)) {
        editor.selection = range;
        editor.deleteFragment(event.inputType.endsWith('Backward') ? 'backward' : 'forward');
        event.preventDefault();
      }
    }
  };

  handleCompositionStart = () => {
    const { editor } = this.props;
    const composition = { insertedPrefix: false, startedInsideInline: false };
    if (this.state.showPlaceholder) this.setState({ showPlaceholder: false });
    const leaf =
      editor.selection != null && RangeUtils.isCollapsed(editor.selection)
        ? EditorUtils.leaf(editor, editor.selection.anchor.path)
        : null;
    if (leaf == null) {
      editor.composition = composition;
      return;
    }
    if (
      editor.selection != null &&
      RangeUtils.isCollapsed(editor.selection) &&
      EditorUtils.above(editor, { at: leaf[1], match: (node) => EditorUtils.isInline(editor, node), mode: 'lowest' }) !=
        null
    )
      composition.startedInsideInline = true;
    // An empty editor gets a zero-width character first, so the composition has a text node to go into.
    if (EditorUtils.isEditorEmpty(editor)) {
      SlateTransforms.insertNodes(editor, { text: '﻿' }, { select: true });
      composition.insertedPrefix = true;
      editor.composition = composition;
      return;
    }
    const selection = (EditorUtils.findDocumentOrShadowRoot(editor) as Document).getSelection();
    const domRange = (selection?.rangeCount ?? 0) > 0 ? selection?.getRangeAt(0) : null;
    if (
      (domRange != null
        ? EditorUtils.toSlateRange(editor, domRange, { exactMatch: true, suppressThrow: true })
        : null) == null &&
      domRange != null
    ) {
      const range = EditorUtils.toSlateRange(editor, domRange, { exactMatch: false, suppressThrow: true });
      editor.selection = null;
      if (range != null) SlateTransforms.select(editor, range);
      else SlateTransforms.select(editor, EditorUtils.end(editor, []));
    }
    editor.composition = composition;
  };

  handleCompositionEnd = () => {
    const { editor } = this.props;
    if (editor.composition == null) return;
    const { insertedPrefix } = editor.composition;
    if (insertedPrefix && editor.selection != null && RangeUtils.isCollapsed(editor.selection)) {
      const path = editor.selection.anchor.path;
      const leaf = EditorUtils.leaf(editor, path)[0];
      EditorUtils.withoutNormalizing(editor, () => {
        const text = leaf.text.replace(/^\uFEFF/, '');
        SlateTransforms.delete(editor, { unit: 'offset', distance: leaf.text.length, reverse: true });
        EditorUtils.insertText(editor, text);
      });
    }
    editor.composition = null;
  };

  handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    this.props.onFocus?.(event);
  };

  handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const { editor, onBlur } = this.props;
    const related = event.relatedTarget as Node | null;
    const root = EditorUtils.findDocumentOrShadowRoot(editor) as Document;
    const context = root.getElementById('textarea-context');
    const toolbar = root.getElementById('slate-toolbar');
    if (related != null && !hasDomParent(related, context) && !hasDomParent(related, toolbar)) {
      const selection = root.getSelection();
      if (selection != null && this.isSelectionEscaping(selection)) selection.removeAllRanges();
    }
    onBlur?.(event);
  };

  isSelectionPartiallyInside(selection: Selection) {
    const container = this.getContainer();
    if (container == null) return false;
    for (let i = selection.rangeCount - 1; i >= 0; i--) {
      const range = selection.getRangeAt(i);
      if (
        hasDomParent(range.startContainer, container) ||
        (!isRangeCollapsed(container, range.startContainer, range.startOffset, range.endContainer, range.endOffset) &&
          hasDomParent(range.endContainer, container))
      )
        return true;
    }
    return false;
  }

  // Whether the DOM selection spans from inside the editor to outside it (it is dropped on blur then).
  isSelectionEscaping(selection: Selection) {
    const container = this.getContainer();
    let inside = false;
    let outside = false;
    if (container == null) return false;
    for (let i = selection.rangeCount - 1; i >= 0; i--) {
      const range = selection.getRangeAt(i);
      const check = (node: Node) => {
        if (hasDomParent(node, container)) {
          if (outside) return true;
          inside = true;
        } else {
          if (inside) return true;
          outside = true;
        }
        return false;
      };
      if (check(range.startContainer)) return true;
      if (
        !isRangeCollapsed(container, range.startContainer, range.startOffset, range.endContainer, range.endOffset) &&
        check(range.startContainer)
      )
        return true;
    }
    return false;
  }

  handleContextMenu = () => {
    // The desktop app's spellcheck context menu isn't part of the web client.
  };

  handlePasteCapture = (event: ClipboardEvent<HTMLDivElement>) => {
    const { editor, onPaste, readOnly } = this.props;
    onPaste?.(event);
    if (!event.isDefaultPrevented() && !event.isPropagationStopped() && !readOnly) {
      editor.insertData(event.clipboardData);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  override render() {
    const {
      editor,
      className,
      containerClassName,
      canFocus,
      autoFocus,
      placeholder,
      decorate,
      'aria-label': ariaLabel = placeholder,
      'aria-multiline': ariaMultiline = true,
      onChange: _onChange,
      onFocus: _onFocus,
      onBlur: _onBlur,
      onKeyDown: _onKeyDown,
      onKeyUp: _onKeyUp,
      renderExtraElement: _renderExtraElement,
      renderExtraLeaf: _renderExtraLeaf,
      editor: _editor,
      appearance = 'default',
      as,
      style,
      ...rest
    } = { ...this.props, editor: this.props.editor };
    const handlers = {
      decorate,
      renderElement: this.renderElement,
      renderLeaf: this.renderLeaf,
      onFocusCapture: this.handleFocusCapture,
      onBlurCapture: this.handleBlurCapture,
      onContextMenu: this.handleContextMenu,
      onKeyDown: this.handleKeyDown,
      onKeyUp: this.handleKeyUp,
      onDOMBeforeInput: this.handleBeforeInput,
      onCompositionStart: this.handleCompositionStart,
      onCompositionEnd: this.handleCompositionEnd,
      onPasteCapture: this.handlePasteCapture,
      autoFocus: autoFocus && canFocus !== false,
      autoComplete: 'off',
      autoCorrect: 'off',
      'data-can-focus': canFocus !== false,
      'aria-label': ariaLabel,
      'aria-multiline': ariaMultiline,
    };
    if (appearance === 'inline')
      return (
        <Slate editor={editor} value={[...this.state.initialValue]}>
          <Editable
            {...rest}
            {...handlers}
            as={as}
            className={className}
            placeholder={placeholder}
            renderPlaceholder={renderInlinePlaceholder}
            disableDefaultStyles
            style={{
              position: 'relative',
              outline: 'none',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              ...style,
            }}
          />
        </Slate>
      );
    return (
      <div ref={this.containerRef} className={containerClassName}>
        {this.state.showPlaceholder ? (
          <div className={clsx(styles.placeholder, className)} aria-hidden data-slate-placeholder="true">
            {placeholder}
          </div>
        ) : null}
        <Slate editor={editor} value={[...this.state.initialValue]}>
          <Editable {...rest} className={clsx(markupStyles.markup, styles.editor, className)} {...handlers} />
        </Slate>
      </div>
    );
  }
}

// The placeholder of the inline appearance: Slate's own (inside the first line, so it keeps the host's
// typography), in the chat input's placeholder color.
const renderInlinePlaceholder = ({ attributes, children }: RenderPlaceholderProps) => (
  <span
    {...attributes}
    className={styles.inlinePlaceholder}
    style={{ ...attributes.style, opacity: 1, width: 'auto', maxWidth: '100%', whiteSpace: 'nowrap' }}
  >
    {children}
  </span>
);

/** Focuses an editor without moving its selection (the client's `focus`). */
export const focusEditor = (editor: DiscordEditor) => EditorUtils.focus(editor);

/** Blurs an editor. */
export const blurEditor = (editor: DiscordEditor) => ReactEditor.blur(editor);
