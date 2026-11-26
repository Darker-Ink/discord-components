import { createContext, Fragment, useContext, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { HiddenVisually, Menu, MenuItem } from '@discord-mana/components';
import { PlusSmallIcon } from '@discord-mana/icons';
import {
  ActionRow,
  AutoMeasuredNestedContainer,
  ComponentButton,
  ComponentLayoutRoot,
  ComponentMediaGallery,
  ComponentSearchableSelect,
  ComponentStateProvider,
  ComponentType,
  Container,
  createComponent,
  File,
  MessageMarkdownRendererContext,
  messageComponentsStyles,
  Section,
  Separator,
  StringSelect,
  TextDisplay,
  Thumbnail,
  UnknownComponent,
  useMeasuredWidth,
  type APIMessageComponent,
  type MessageComponent,
} from '@discord-mana/messages';
import {
  useAllowedTemplates,
  findNode,
  nodeToJSON,
  slotChildren,
  useBuilderNode,
  useBuilderSelector,
  type BuilderDocument,
  type BuilderNode,
  type NodeKind,
  type SlotName,
  type TemplateType,
} from '../core';
import { BuilderTextField } from './BuilderTextField';
import { ButtonLabelEditor } from './ButtonLabelEditor';
import {
  ButtonTools,
  ContainerTools,
  FileTools,
  GalleryItemsEditor,
  SectionAccessoryGhost,
  SectionTools,
  SelectTools,
  SeparatorTools,
  ThumbnailTools,
} from './componentTools';
import { KIND_ICONS, PALETTE_ITEMS } from './meta';
import { NodeFrame } from './NodeFrame';
import { AnchoredPopout } from './popouts';
import { NodeToolbarSeparator } from './NodeToolbar';
import { prepareMedia, useMediaSizes } from './mediaSize';
import type { AttachmentResolver } from './attachments';
import { useAttachmentResolver } from './files';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import { listKey, useBuilderUI, useBuilderUIStore } from './uiStore';
import styles from './EditableComponents.module.css';

// The message's components drawn with @discord-mana/messages' own layout components (ActionRow, Section,
// Container…), whose `renderComponents` props hand each child to `EditableComponent`, so every node gets its
// editing frame while the DOM inside stays the client's.

interface Records {
  byUid: Map<string, MessageComponent>;
  uidOf: WeakMap<MessageComponent, string>;
  top: MessageComponent[];
}

const RecordsContext = createContext<Records | null>(null);

RecordsContext.displayName = 'RecordsContext';

const kindOf = (doc: BuilderDocument, node: BuilderNode) => findNode(doc, node.uid)?.kind ?? 'unknown';

const prepare = (api: Record<string, unknown>, resolve: AttachmentResolver): APIMessageComponent => {
  const result = { ...api };
  if (result.media != null) result.media = prepareMedia(result.media as never, resolve);
  if (result.file != null) {
    const file = resolve(String((result.file as { url?: string }).url ?? ''));
    result.file = prepareMedia(result.file as never, resolve);
    if (file != null) Object.assign(result, { name: result.name ?? file.filename, size: result.size ?? file.size });
  }
  if (Array.isArray(result.items))
    result.items = (result.items as { media: never }[]).map((item) => ({
      ...item,
      media: prepareMedia(item.media, resolve),
    }));
  return result as unknown as APIMessageComponent;
};

// A section without an accessory yet still renders (with a placeholder where the accessory goes).
const PLACEHOLDER_ACCESSORY = 'placeholder-accessory';

/**
 * The client's component records for the document, keyed by node. Lists are rebuilt from the nodes, so an empty
 * row or container (invalid, but a step on the way) still has a record to draw.
 */
const buildRecords = (doc: BuilderDocument, resolve: AttachmentResolver): Records => {
  const byUid = new Map<string, MessageComponent>();
  const uidOf = new WeakMap<MessageComponent, string>();
  const build = (node: BuilderNode, kind: NodeKind, path: number[]): MessageComponent | null => {
    const id = path.join(',');
    const children = (slot: SlotName) =>
      slotChildren(node, slot)
        .map((child, index) => build(child, kindOf(doc, child), [...path, index]))
        .filter((child) => child != null);
    let record: MessageComponent | null;
    switch (kind) {
      case 'actionRow':
        record = { type: ComponentType.ActionRow, id, components: children('components') } as MessageComponent;
        break;
      case 'container': {
        const value = node as unknown as { accent_color?: number | null; spoiler?: boolean };
        record = {
          type: ComponentType.Container,
          id,
          accentColor: value.accent_color,
          spoiler: value.spoiler,
          components: children('components'),
        } as MessageComponent;
        break;
      }
      case 'section': {
        const components = children('components');
        const accessoryNode = (node as unknown as { accessory?: BuilderNode }).accessory;
        const accessory =
          accessoryNode != null ? build(accessoryNode, kindOf(doc, accessoryNode), [...path, components.length]) : null;
        record = {
          type: ComponentType.Section,
          id,
          components,
          accessory: accessory ?? ({ type: ComponentType.Thumbnail, id: PLACEHOLDER_ACCESSORY } as MessageComponent),
        } as MessageComponent;
        break;
      }
      case 'unknown':
        record = { type: (node as { type: number }).type, id } as unknown as MessageComponent;
        break;
      default:
        record = createComponent(prepare(nodeToJSON(node, kind), resolve), path);
    }
    if (record != null) {
      byUid.set(node.uid, record);
      uidOf.set(record, node.uid);
    }
    return record;
  };
  const top = doc.components
    .map((node, index) => build(node, kindOf(doc, node), [index]))
    .filter((record) => record != null);
  return { byUid, uidOf, top };
};

const useRecords = () => {
  const records = useContext(RecordsContext);
  if (records == null) throw new Error('EditableComponent must be rendered inside EditableComponents.');
  return records;
};

/** Children of a list, each followed by the client's hidden comma (like its `renderComponents`). */
const renderChildrenOf =
  ({ uidOf }: Records) =>
  (components: readonly MessageComponent[]): ReactNode =>
    components.map((component) => {
      const uid = uidOf.get(component);
      if (uid == null) return null;
      return (
        <Fragment key={uid}>
          <EditableComponent uid={uid} />
          <HiddenVisually>,</HiddenVisually>
        </Fragment>
      );
    });

const useRenderChildren = () => renderChildrenOf(useRecords());

export interface EditableComponentsProps {
  /** The message the components belong to (interaction context and the media viewer). */
  message?: { id?: string; channel_id?: string; flags?: number };
}

/**
 * The message's components, laid out exactly like `<MessageComponents>`, each one editable. Renders the
 * document's top-level components (action rows in classic messages, any layout component in Components v2).
 */
export const EditableComponents = ({ message }: EditableComponentsProps) => {
  const doc = useBuilderSelector((state) => state.doc);
  const sizes = useMediaSizes();
  const resolve = useAttachmentResolver();
  // `sizes` changes when media sizes arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => buildRecords(doc, resolve), [doc, sizes, resolve]);
  if (records.top.length === 0) return null;
  return <ComponentsLayout records={records} message={message} isComponentsV2={doc.mode === 'cv2'} />;
};

EditableComponents.displayName = 'EditableComponents';

// Mounted only with components, so its width is measured from the moment its element exists.
const ComponentsLayout = ({
  records,
  message,
  isComponentsV2,
}: {
  records: Records;
  message: EditableComponentsProps['message'];
  isComponentsV2: boolean;
}) => {
  const [ref, outerWidth] = useMeasuredWidth();
  return (
    <RecordsContext.Provider value={records}>
      <ComponentStateProvider components={records.top} message={message ?? {}} channelId={message?.channel_id}>
        <ComponentLayoutRoot containerInnerWidth={outerWidth}>
          <div style={{ width: '100%' }} ref={ref}>
            <AutoMeasuredNestedContainer>
              {(innerRef) => (
                <div
                  ref={innerRef}
                  className={clsx([
                    messageComponentsStyles.container,
                    { [messageComponentsStyles.isComponentsV2]: isComponentsV2 },
                  ])}
                >
                  {renderChildrenOf(records)(records.top)}
                </div>
              )}
            </AutoMeasuredNestedContainer>
          </div>
        </ComponentLayoutRoot>
      </ComponentStateProvider>
    </RecordsContext.Provider>
  );
};

ComponentsLayout.displayName = 'ComponentsLayout';

/** An empty list (a row, container or gallery with nothing in it yet): where things can be dropped or added. */
const EmptyList = ({
  parentId,
  slot,
  hint,
  className,
}: {
  parentId: string;
  slot: SlotName;
  hint: string;
  className?: string;
}) => {
  const ui = useBuilderUIStore();
  return (
    <div
      className={clsx(styles.empty, className)}
      ref={(element) => {
        if (element != null) ui.lists.set(listKey(parentId, slot), element);
        else ui.lists.delete(listKey(parentId, slot));
      }}
    >
      <span>{hint}</span>
      <AddChildButton parentId={parentId} slot={slot} />
    </div>
  );
};

/** "+" with a menu of what can go in a list (only what is allowed there right now). */
export const AddChildButton = ({
  parentId,
  slot,
  label = 'Add',
  variant = 'inline',
}: {
  parentId: string;
  slot?: SlotName;
  label?: string;
  variant?: 'inline' | 'toolbar';
}) => {
  const { actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const items = useAllowedTemplates({ parentId, slot });
  if (items.length === 0) return null;
  const add = (template: TemplateType) => {
    const uid = actions.insert(parentId, slot, -1, template);
    if (uid != null) ui.set({ selectedId: uid, pendingFocus: { uid } });
  };
  return (
    <AnchoredPopout
      position="bottom"
      align="left"
      renderPopout={({ closePopout }) => (
        <Menu navId={`builder-add-${parentId}`} aria-label={label} onClose={closePopout} onSelect={() => undefined}>
          {items.map((template) => {
            const item = PALETTE_ITEMS.find((entry) => entry.template === template);
            const Icon = item?.icon ?? KIND_ICONS.unknown;
            return (
              <MenuItem
                key={template}
                id={template}
                label={item?.label ?? template}
                subtext={item?.description}
                icon={Icon}
                action={() => add(template)}
              />
            );
          })}
        </Menu>
      )}
    >
      {(props) => (
        <button
          type="button"
          data-builder-ui
          data-builder-nodrag
          className={variant === 'toolbar' ? styles.addToolbar : styles.add}
          aria-label={label}
          {...props}
        >
          <PlusSmallIcon size="xs" color="currentColor" />
          {variant === 'inline' ? <span>{label}</span> : null}
        </button>
      )}
    </AnchoredPopout>
  );
};

AddChildButton.displayName = 'AddChildButton';

/** One component of the message, editable: chosen by its kind, drawn by @discord-mana/messages. */
export const EditableComponent = ({ uid }: { uid: string }) => {
  const { byUid } = useRecords();
  const node = useBuilderNode(uid);
  const kind = useBuilderSelector((state) => findNode(state.doc, uid)?.kind ?? 'unknown');
  const { readOnly, renderMessageMarkdown } = useBuilderRender();
  const renderChildren = useRenderChildren();
  const record = byUid.get(uid);
  const selected = useBuilderUI((state) => state.selectedId === uid);
  if (node == null || record == null) return null;
  const disabled = readOnly;

  switch (kind) {
    case 'actionRow': {
      const row = record as Extract<MessageComponent, { type: 1 }>;
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          tools={
            !disabled ? (
              <AddChildButton parentId={uid} slot="components" variant="toolbar" label="Add to row" />
            ) : undefined
          }
        >
          {row.components.length > 0 ? (
            <ActionRow {...row} renderComponents={renderChildren} />
          ) : (
            <EmptyList parentId={uid} slot="components" hint="Empty action row" />
          )}
        </NodeFrame>
      );
    }
    case 'button':
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          className={styles.inline}
          tools={<ButtonTools uid={uid} />}
        >
          <ComponentButton
            {...(record as Extract<MessageComponent, { type: 2 }>)}
            label={
              selected && !disabled ? (record as { label?: string }).label || '​' : (record as { label?: string }).label
            }
          />
          {selected && !disabled ? <ButtonLabelEditor uid={uid} /> : null}
        </NodeFrame>
      );
    case 'stringSelect':
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          className={styles.select}
          tools={<SelectTools uid={uid} />}
        >
          <StringSelect {...(record as Extract<MessageComponent, { type: 3 }>)} />
        </NodeFrame>
      );
    case 'userSelect':
    case 'roleSelect':
    case 'mentionableSelect':
    case 'channelSelect':
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          className={styles.select}
          tools={<SelectTools uid={uid} />}
        >
          <ComponentSearchableSelect {...(record as Extract<MessageComponent, { type: 5 }>)} />
        </NodeFrame>
      );
    case 'section': {
      const section = record as Extract<MessageComponent, { type: 9 }>;
      return (
        <NodeFrame uid={uid} kind={kind} disabled={disabled} tools={<SectionTools uid={uid} />}>
          <Section
            {...section}
            renderComponents={renderChildren}
            renderAccessory={(accessory) =>
              accessory.id === PLACEHOLDER_ACCESSORY ? <SectionAccessoryGhost uid={uid} /> : renderChildren([accessory])
            }
          />
        </NodeFrame>
      );
    }
    case 'textDisplay':
      return (
        <NodeFrame uid={uid} kind={kind} disabled={disabled}>
          <MessageMarkdownRendererContext.Provider
            value={(text, context) => (
              <BuilderTextField
                uid={uid}
                kind="textDisplay"
                field="content"
                multiline
                placeholder="Write something…"
                renderPreview={(value) => renderMessageMarkdown(value, context)}
                aria-label="Text"
                isFirstField
                disabled={disabled}
              />
            )}
          >
            <TextDisplay {...(record as Extract<MessageComponent, { type: 10 }>)} />
          </MessageMarkdownRendererContext.Provider>
        </NodeFrame>
      );
    case 'thumbnail':
      return (
        <NodeFrame uid={uid} kind={kind} disabled={disabled} tools={<ThumbnailTools uid={uid} />}>
          <Thumbnail {...(record as Extract<MessageComponent, { type: 11 }>)} />
        </NodeFrame>
      );
    case 'mediaGallery': {
      const record_ = record as Extract<MessageComponent, { type: 12 }>;
      // Items without a URL yet are edited in the strip; the gallery shows the others.
      const gallery = {
        ...record_,
        items: record_.items.filter((item) => item.media?.url != null && item.media.url !== ''),
      };
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          selectedChildren={!disabled ? <GalleryItemsEditor uid={uid} /> : null}
        >
          {gallery.items.length > 0 ? (
            <ComponentMediaGallery {...gallery} />
          ) : (
            <EmptyList parentId={uid} slot="items" hint={record_.items.length > 0 ? 'No image URL' : 'Empty gallery'} />
          )}
        </NodeFrame>
      );
    }
    case 'file':
      return (
        <NodeFrame uid={uid} kind={kind} disabled={disabled} tools={<FileTools uid={uid} />}>
          <File {...(record as Extract<MessageComponent, { type: 13 }>)} />
        </NodeFrame>
      );
    case 'separator':
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          className={styles.separator}
          tools={<SeparatorTools uid={uid} />}
        >
          <Separator {...(record as Extract<MessageComponent, { type: 14 }>)} />
        </NodeFrame>
      );
    case 'container': {
      const container = record as Extract<MessageComponent, { type: 17 }>;
      return (
        <NodeFrame
          uid={uid}
          kind={kind}
          disabled={disabled}
          tools={
            <>
              <ContainerTools uid={uid} />
              <NodeToolbarSeparator />
              <AddChildButton parentId={uid} slot="components" variant="toolbar" label="Add to container" />
            </>
          }
        >
          {container.components.length > 0 ? (
            <Container {...container} renderComponents={renderChildren} />
          ) : (
            <EmptyList parentId={uid} slot="components" hint="Empty container" className={styles.emptyContainer} />
          )}
        </NodeFrame>
      );
    }
    default:
      return (
        <NodeFrame uid={uid} kind="unknown" disabled={disabled}>
          <UnknownComponent />
        </NodeFrame>
      );
  }
};

EditableComponent.displayName = 'EditableComponent';
