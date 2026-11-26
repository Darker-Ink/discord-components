import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  ButtonColors,
  ButtonSizes,
  CustomColorPicker,
  LegacyButton,
  Menu,
  MenuItem,
  TextInput,
  Tooltip,
} from '@discord-mana/components';
import {
  DragIcon,
  EyeDropperIcon,
  EyeSlashIcon,
  ImageIcon,
  ImageTextIcon,
  LinkIcon,
  MinusIcon,
  PlusSmallIcon,
  ReactionIcon,
  SettingsIcon,
  TrashIcon,
  VideoIcon,
  WidgetsIcon,
  WindowLaunchIcon,
} from '@discord-mana/icons';
import { Emoji, type APIMessageComponentEmoji } from '@discord-mana/messages';
import {
  isComponentAllowed,
  useBuilderRestrictions,
  useBuilderNode,
  useNodeIssues,
  type ButtonNode,
  type ContainerNode,
  type MediaGalleryItemNode,
  type MediaGalleryNode,
  type SectionNode,
  type SelectOptionNode,
  type SeparatorNode,
  type StringSelectNode,
} from '../core';
import { NodeToolbarButton, NodeToolbarPopoutButton } from './NodeToolbar';
import { getMediaSize, isMediaBroken, useMediaSizes } from './mediaSize';
import { AnchoredPopout, NodeSwitch, NodeTextInput, PopoutPanel, RemoveButton } from './popouts';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './componentTools.module.css';

const SUGGESTED_COLORS = [
  '#5865f2',
  '#57f287',
  '#fee75c',
  '#eb459e',
  '#ed4245',
  '#f0b232',
  '#00a8fc',
  '#9b59b6',
  '#1abc9c',
  '#ffffff',
];

// ---------------------------------------------------------------------------------------------------------
// Emoji

const CUSTOM_EMOJI = /^<?(a)?:?([\w~]{2,32}):(\d{17,20})>?$/;
const COMMON_EMOJI = ['👍', '✅', '❌', '⭐', '🔥', '🎉', '❤️', '👀', '📌', '🔗', '📢', '🎮', '🛒', '📝', '⚙️', '❓'];

/** Unicode emoji, `<:name:id>`, `<a:name:id>`, `name:id` or a bare id, as a component emoji. */
export const parseEmoji = (text: string): APIMessageComponentEmoji | undefined => {
  const value = text.trim();
  if (value === '') return undefined;
  const custom = CUSTOM_EMOJI.exec(value);
  if (custom != null) return { id: custom[3], name: custom[2], ...(custom[1] != null ? { animated: true } : {}) };
  if (/^\d{17,20}$/.test(value)) return { id: value };
  return { name: value };
};

export const formatEmoji = (emoji: APIMessageComponentEmoji | undefined) => {
  if (emoji == null) return '';
  if (emoji.id != null) return `<${emoji.animated === true ? 'a' : ''}:${emoji.name ?? '_'}:${emoji.id}>`;
  return emoji.name ?? '';
};

const EmojiEditor = ({ uid, field = 'emoji' }: { uid: string; field?: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode(uid) as { emoji?: APIMessageComponentEmoji } | null;
  const [text, setText] = useState(() => formatEmoji(node?.emoji));
  const issues = useNodeIssues(uid).filter((issue) => issue.field?.startsWith(field));
  const set = (value: string) => {
    setText(value);
    actions.update(uid, { [field]: parseEmoji(value) }, { coalesce: `${uid}:${field}` });
  };
  return (
    <>
      <TextInput
        label="Emoji"
        value={text}
        placeholder="😀 or <:name:123456789012345678>"
        onChange={set}
        errorMessage={issues.map((issue) => issue.message).join(' ') || undefined}
        autoFocus
      />
      <div className={styles.emojiGrid} role="group" aria-label="Common emoji">
        {COMMON_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.emojiButton}
            aria-label={emoji}
            aria-pressed={node?.emoji?.name === emoji && node.emoji.id == null}
            onClick={() => set(emoji)}
          >
            <Emoji emojiName={emoji} />
          </button>
        ))}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------
// Buttons

const BUTTON_STYLES = [
  { style: 1, label: 'Primary', color: ButtonColors.BRAND },
  { style: 2, label: 'Secondary', color: ButtonColors.PRIMARY },
  { style: 3, label: 'Success', color: ButtonColors.GREEN },
  { style: 4, label: 'Danger', color: ButtonColors.RED },
  { style: 5, label: 'Link', color: ButtonColors.PRIMARY },
  { style: 6, label: 'Premium', color: ButtonColors.BRAND },
] as const;

const randomId = () => Math.random().toString(36).slice(2, 8);

/** The patch that turns a button into another style, moving it between `custom_id`, `url` and `sku_id`. */
export const restyleButton = (node: ButtonNode, style: number): Record<string, unknown> => {
  const value = node as unknown as Record<string, unknown>;
  if (style === 5)
    return { style, url: value.url ?? 'https://discord-mana.dev', custom_id: undefined, sku_id: undefined };
  if (style === 6)
    return {
      style,
      sku_id: value.sku_id ?? '',
      custom_id: undefined,
      url: undefined,
      label: undefined,
      emoji: undefined,
    };
  return { style, custom_id: value.custom_id ?? `button-${randomId()}`, url: undefined, sku_id: undefined };
};

const ButtonStylePopout = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<ButtonNode>(uid);
  const restrictions = useBuilderRestrictions();
  if (node == null) return null;
  return (
    <PopoutPanel title="Style" width={268}>
      <div className={styles.styleGrid} role="radiogroup" aria-label="Button style">
        {BUTTON_STYLES.filter(({ style }) => isComponentAllowed(restrictions, { type: 2, style })).map(
          ({ style, label, color }) => (
            <LegacyButton
              key={style}
              role="radio"
              aria-checked={node.style === style}
              color={color}
              size={ButtonSizes.SMALL}
              className={clsx(styles.styleOption, { [styles.styleSelected]: node.style === style })}
              onClick={() => actions.update(uid, restyleButton(node, style))}
            >
              <span className={styles.styleLabel}>
                {label}
                {style === 5 ? <WindowLaunchIcon size="xs" color="currentColor" /> : null}
              </span>
            </LegacyButton>
          ),
        )}
      </div>
    </PopoutPanel>
  );
};

const ButtonActionPopout = ({ uid }: { uid: string }) => {
  const node = useBuilderNode<ButtonNode>(uid);
  if (node == null) return null;
  return (
    <PopoutPanel title={node.style === 5 ? 'Link' : node.style === 6 ? 'SKU' : 'Interaction'}>
      {node.style === 5 ? (
        <NodeTextInput uid={uid} field="url" label="URL" placeholder="https://…" autoFocus />
      ) : node.style === 6 ? (
        <NodeTextInput uid={uid} field="sku_id" label="SKU ID" placeholder="123456789012345678" autoFocus />
      ) : (
        <NodeTextInput uid={uid} field="custom_id" label="Custom ID" autoFocus />
      )}
      <NodeSwitch uid={uid} field="disabled" label="Disabled" />
    </PopoutPanel>
  );
};

export const ButtonTools = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<ButtonNode>(uid);
  if (node == null) return null;
  const color = BUTTON_STYLES.find((entry) => entry.style === node.style);
  const emoji = 'emoji' in node ? node.emoji : undefined;
  return (
    <>
      <NodeToolbarPopoutButton
        icon={WidgetsIcon}
        label={`Style: ${color?.label ?? 'Unknown'}`}
        renderPopout={() => <ButtonStylePopout uid={uid} />}
      >
        <span className={styles.styleDot} data-style={node.style} />
      </NodeToolbarPopoutButton>
      {node.style !== 6 ? (
        <NodeToolbarPopoutButton
          icon={ReactionIcon}
          label="Emoji"
          active={emoji != null}
          renderPopout={() => (
            <PopoutPanel
              title="Emoji"
              footer={
                emoji != null ? (
                  <RemoveButton label="Remove" onClick={() => actions.update(uid, { emoji: undefined })} />
                ) : null
              }
            >
              <EmojiEditor uid={uid} />
            </PopoutPanel>
          )}
        >
          {emoji != null ? (
            <Emoji emojiName={emoji.name ?? undefined} emojiId={emoji.id ?? undefined} animated={emoji.animated} />
          ) : null}
        </NodeToolbarPopoutButton>
      ) : null}
      <NodeToolbarPopoutButton
        icon={node.style === 5 ? LinkIcon : SettingsIcon}
        label={node.style === 5 ? 'Link' : node.style === 6 ? 'SKU' : 'Custom ID'}
        renderPopout={() => <ButtonActionPopout uid={uid} />}
      />
    </>
  );
};

ButtonTools.displayName = 'ButtonTools';

// ---------------------------------------------------------------------------------------------------------
// Sortable lists inside popouts and strips (select options, gallery items)

const useListSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

const SortableList = ({
  parentId,
  slot,
  uids,
  horizontal = false,
  children,
}: {
  parentId: string;
  slot: 'options' | 'items';
  uids: string[];
  horizontal?: boolean;
  children: ReactNode;
}) => {
  const { actions } = useBuilderContext();
  const sensors = useListSensors();
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over == null || active.id === over.id) return;
    const index = uids.indexOf(String(over.id));
    if (index >= 0) actions.move(String(active.id), { parentId, slot, index });
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'To reorder, press Space, move with the arrow keys, then press Space again. Escape cancels.',
        },
      }}
    >
      <SortableContext items={uids} strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
};

const useSortableItem = (uid: string) => {
  const sortable = useSortable({ id: uid });
  return {
    ...sortable,
    style: { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition },
  };
};

// ---------------------------------------------------------------------------------------------------------
// Selects

const OptionRow = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<SelectOptionNode>(uid);
  const { setNodeRef, attributes, listeners, style, isDragging } = useSortableItem(uid);
  if (node == null) return null;
  return (
    <li ref={setNodeRef} style={style} className={clsx(styles.option, { [styles.dragging]: isDragging })}>
      <button type="button" className={styles.grip} aria-label={`Move ${node.label}`} {...attributes} {...listeners}>
        <DragIcon size="xs" color="currentColor" />
      </button>
      <div className={styles.optionFields}>
        <div className={styles.row}>
          <NodeTextInput uid={uid} field="label" label="Label" />
          <NodeTextInput uid={uid} field="value" label="Value" />
        </div>
        <NodeTextInput uid={uid} field="description" label="Description" placeholder="Optional" />
        <NodeTextInput
          uid={uid}
          field="emoji"
          label="Emoji"
          placeholder="Optional"
          format={(value) => formatEmoji(value as APIMessageComponentEmoji | undefined)}
          parse={parseEmoji}
        />
        <NodeSwitch uid={uid} field="default" label="Selected by default" />
      </div>
      <Tooltip text="Remove option">
        <button
          type="button"
          className={styles.removeOption}
          aria-label={`Remove ${node.label}`}
          onClick={() => actions.remove(uid)}
        >
          <TrashIcon size="xs" color="currentColor" />
        </button>
      </Tooltip>
    </li>
  );
};

const SelectPopout = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<StringSelectNode>(uid);
  if (node == null) return null;
  const options = 'options' in node && Array.isArray(node.options) ? node.options : null;
  const number = (text: string) => (text.trim() === '' ? undefined : Number(text));
  return (
    <PopoutPanel
      title={options != null ? 'Select menu' : 'Select'}
      width={380}
      height={options != null ? 'min(560px, calc(100vh - 32px))' : undefined}
      footer={
        options != null ? (
          <Button
            variant="secondary"
            size="sm"
            icon={{ type: 'icon', asset: PlusSmallIcon }}
            text="Add option"
            onClick={() => actions.insert(uid, 'options', -1, 'option')}
          />
        ) : null
      }
    >
      <NodeTextInput uid={uid} field="placeholder" label="Placeholder" placeholder="Make a selection" />
      <NodeTextInput uid={uid} field="custom_id" label="Custom ID" />
      <div className={styles.row}>
        <NodeTextInput uid={uid} field="min_values" label="Min" type="number" parse={number} />
        <NodeTextInput uid={uid} field="max_values" label="Max" type="number" parse={number} />
      </div>
      <NodeSwitch uid={uid} field="disabled" label="Disabled" />
      {options != null ? (
        <SortableList parentId={uid} slot="options" uids={options.map((option) => option.uid)}>
          <ol className={styles.options} aria-label="Options">
            {options.map((option) => (
              <OptionRow key={option.uid} uid={option.uid} />
            ))}
          </ol>
        </SortableList>
      ) : null}
    </PopoutPanel>
  );
};

export const SelectTools = ({ uid }: { uid: string }) => (
  <NodeToolbarPopoutButton
    icon={SettingsIcon}
    label="Options and settings"
    renderPopout={() => <SelectPopout uid={uid} />}
  />
);

SelectTools.displayName = 'SelectTools';

// ---------------------------------------------------------------------------------------------------------
// Media: thumbnails, files and gallery items

const MediaFields = ({ uid, field, label }: { uid: string; field: 'media' | 'file'; label: string }) => (
  <>
    <NodeTextInput
      uid={uid}
      field={`${field}.url`}
      label={label}
      placeholder={field === 'file' ? 'attachment://report.pdf' : 'https://… or attachment://name.png'}
      autoFocus
    />
    {field === 'media' ? (
      <NodeTextInput uid={uid} field="description" label="Alt text" placeholder="Describe the image" />
    ) : null}
    <NodeSwitch uid={uid} field="spoiler" label="Spoiler" />
  </>
);

export const ThumbnailTools = ({ uid }: { uid: string }) => (
  <NodeToolbarPopoutButton
    icon={ImageIcon}
    label="Image"
    renderPopout={() => (
      <PopoutPanel title="Thumbnail">
        <MediaFields uid={uid} field="media" label="Image URL" />
      </PopoutPanel>
    )}
  />
);

ThumbnailTools.displayName = 'ThumbnailTools';

export const FileTools = ({ uid }: { uid: string }) => (
  <NodeToolbarPopoutButton
    icon={SettingsIcon}
    label="File"
    renderPopout={() => (
      <PopoutPanel title="File">
        <MediaFields uid={uid} field="file" label="File" />
      </PopoutPanel>
    )}
  />
);

FileTools.displayName = 'FileTools';

const GalleryTile = ({ uid, index }: { uid: string; index: number }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<MediaGalleryItemNode>(uid);
  useMediaSizes();
  const { setNodeRef, attributes, listeners, style, isDragging } = useSortableItem(uid);
  if (node == null) return null;
  const url = node.media?.url ?? '';
  const size = getMediaSize(url);
  const broken = isMediaBroken(url);
  return (
    <li ref={setNodeRef} style={style} className={clsx(styles.tile, { [styles.dragging]: isDragging })}>
      <AnchoredPopout
        position="bottom"
        align="center"
        renderPopout={() => (
          <PopoutPanel
            title={`Item ${index + 1}`}
            footer={<RemoveButton label="Remove" onClick={() => actions.remove(uid)} />}
          >
            <MediaFields uid={uid} field="media" label="Image or video URL" />
          </PopoutPanel>
        )}
      >
        {(props) => (
          <button
            type="button"
            className={styles.tileButton}
            aria-label={`Item ${index + 1}: ${url || 'no URL'}. Press Space to reorder.`}
            {...attributes}
            {...listeners}
            {...props}
          >
            {size?.kind === 'image' && !broken ? (
              <img src={url} alt="" className={styles.tileImage} draggable={false} />
            ) : (
              <span className={styles.tileIcon}>
                {size?.kind === 'video' ? (
                  <VideoIcon size="sm" color="currentColor" />
                ) : (
                  <ImageIcon size="sm" color="currentColor" />
                )}
              </span>
            )}
            {node.spoiler === true ? (
              <span className={styles.tileBadge}>
                <EyeSlashIcon size="xxs" color="currentColor" />
              </span>
            ) : null}
          </button>
        )}
      </AnchoredPopout>
    </li>
  );
};

/** The items of a selected gallery, under it: reorder by dragging, click one to edit it, add more. */
export const GalleryItemsEditor = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const node = useBuilderNode<MediaGalleryNode>(uid);
  if (node == null) return null;
  const uids = node.items.map((item) => item.uid);
  return (
    <div className={styles.strip} data-builder-ui data-builder-nodrag>
      <SortableList parentId={uid} slot="items" uids={uids} horizontal>
        <ol className={styles.tiles} aria-label="Gallery items">
          {node.items.map((item, index) => (
            <GalleryTile key={item.uid} uid={item.uid} index={index} />
          ))}
        </ol>
      </SortableList>
      {node.items.length < 10 ? (
        <Tooltip text="Add an image or video">
          <button
            type="button"
            className={styles.addTile}
            aria-label="Add an image or video"
            onClick={() => {
              const item = actions.insert(uid, 'items', -1, 'gallery-item');
              if (item != null) ui.set({ selectedId: uid });
            }}
          >
            <PlusSmallIcon size="sm" color="currentColor" />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
};

GalleryItemsEditor.displayName = 'GalleryItemsEditor';

// ---------------------------------------------------------------------------------------------------------
// Sections

/** Where a section's accessory goes when it has none yet: pick a thumbnail or a button. */
export const SectionAccessoryGhost = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const restrictions = useBuilderRestrictions();
  const add = (type: 'thumbnail' | 'button') => {
    const accessory = actions.insert(uid, 'accessory', 0, type);
    if (accessory != null) ui.set({ selectedId: accessory });
  };
  return (
    <div className={styles.accessoryGhost} data-builder-ui data-builder-nodrag>
      {isComponentAllowed(restrictions, 'thumbnail') ? (
        <button type="button" className={styles.accessoryChoice} onClick={() => add('thumbnail')}>
          <ImageIcon size="xs" color="currentColor" />
          Thumbnail
        </button>
      ) : null}
      {isComponentAllowed(restrictions, 'secondaryButton') ? (
        <button type="button" className={styles.accessoryChoice} onClick={() => add('button')}>
          <WidgetsIcon size="xs" color="currentColor" />
          Button
        </button>
      ) : null}
    </div>
  );
};

SectionAccessoryGhost.displayName = 'SectionAccessoryGhost';

/** Switches a section's accessory between a thumbnail and a button (or adds one). */
export const SectionTools = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const node = useBuilderNode<SectionNode>(uid);
  const restrictions = useBuilderRestrictions();
  const current = node?.accessory?.type === 11 ? 'thumbnail' : node?.accessory?.type === 2 ? 'button' : null;
  const set = (type: 'thumbnail' | 'button' | 'link-button') => {
    const accessory = actions.batch(() => {
      if (node?.accessory != null) actions.remove(node.accessory.uid);
      return actions.insert(uid, 'accessory', 0, type);
    });
    if (accessory != null) ui.set({ selectedId: accessory });
  };
  return (
    <AnchoredPopout
      position="bottom"
      align="center"
      renderPopout={({ closePopout }) => (
        <Menu
          navId={`builder-accessory-${uid}`}
          aria-label="Accessory"
          onClose={closePopout}
          onSelect={() => undefined}
        >
          {isComponentAllowed(restrictions, 'thumbnail') ? (
            <MenuItem
              id="thumbnail"
              label="Thumbnail"
              icon={ImageIcon}
              action={() => set('thumbnail')}
              disabled={current === 'thumbnail'}
            />
          ) : null}
          {isComponentAllowed(restrictions, 'secondaryButton') ? (
            <MenuItem
              id="button"
              label="Button"
              icon={WidgetsIcon}
              action={() => set('button')}
              disabled={current === 'button'}
            />
          ) : null}
          {isComponentAllowed(restrictions, 'linkButton') ? (
            <MenuItem id="link-button" label="Link button" icon={LinkIcon} action={() => set('link-button')} />
          ) : null}
          {node?.accessory != null ? (
            <MenuItem
              id="remove"
              label="Remove accessory"
              icon={TrashIcon}
              color="danger"
              action={() => actions.remove(node.accessory!.uid)}
            />
          ) : null}
        </Menu>
      )}
    >
      {(props) => (
        <Tooltip text="Accessory">
          <button type="button" data-builder-nodrag className={styles.toolbarText} aria-label="Accessory" {...props}>
            <ImageTextIcon size="sm" color="currentColor" />
            <span>{current === 'thumbnail' ? 'Thumbnail' : current === 'button' ? 'Button' : 'Accessory'}</span>
          </button>
        </Tooltip>
      )}
    </AnchoredPopout>
  );
};

SectionTools.displayName = 'SectionTools';

// ---------------------------------------------------------------------------------------------------------
// Separators and containers

export const SeparatorTools = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<SeparatorNode>(uid);
  if (node == null) return null;
  const divider = node.divider ?? true;
  const large = node.spacing === 2;
  return (
    <>
      <NodeToolbarButton
        icon={MinusIcon}
        label={divider ? 'Hide the line' : 'Show a line'}
        active={divider}
        onClick={() => actions.update(uid, { divider: divider ? false : undefined })}
      />
      <NodeToolbarButton
        icon={ImageTextIcon}
        label={large ? 'Small spacing' : 'Large spacing'}
        active={large}
        onClick={() => actions.update(uid, { spacing: large ? undefined : 2 })}
      >
        <span className={styles.toolbarLabel}>{large ? 'Large' : 'Small'}</span>
      </NodeToolbarButton>
    </>
  );
};

SeparatorTools.displayName = 'SeparatorTools';

const toHex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export const ContainerTools = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode<ContainerNode>(uid);
  if (node == null) return null;
  const color = node.accent_color ?? null;
  return (
    <>
      <NodeToolbarPopoutButton
        icon={EyeDropperIcon}
        label="Accent colour"
        renderPopout={() => (
          <CustomColorPicker
            value={color ?? 0x5865f2}
            eagerUpdate
            onChange={(next) => actions.update(uid, { accent_color: next }, { coalesce: `${uid}:accent` })}
            onClose={() => actions.checkpoint()}
            suggestedColors={SUGGESTED_COLORS}
            showEyeDropper
            footer={
              color != null ? (
                <Button
                  variant="secondary"
                  size="sm"
                  text="No colour"
                  fullWidth
                  onClick={() => actions.update(uid, { accent_color: undefined })}
                />
              ) : null
            }
          />
        )}
      >
        <span className={styles.swatch} style={{ background: color != null ? toHex(color) : undefined }} />
      </NodeToolbarPopoutButton>
      <NodeToolbarButton
        icon={EyeSlashIcon}
        label={node.spoiler === true ? 'Spoiler: on' : 'Spoiler: off'}
        active={node.spoiler === true}
        onClick={() => actions.update(uid, { spoiler: node.spoiler === true ? undefined : true })}
      />
    </>
  );
};

ContainerTools.displayName = 'ContainerTools';
