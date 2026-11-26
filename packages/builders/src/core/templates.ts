import { createUid } from './json';
import { isComponentAllowed, type BuilderRestrictions } from './restrictions';
import type { BuilderMode, BuilderNode, ButtonNode, NodeKind, TextDisplayNode, ThumbnailNode } from './types';

export type TemplateType =
  | 'embed'
  | 'field'
  | 'action-row'
  | 'button'
  | 'link-button'
  | 'premium-button'
  | 'string-select'
  | 'user-select'
  | 'role-select'
  | 'mentionable-select'
  | 'channel-select'
  | 'option'
  | 'text-display'
  | 'section'
  | 'thumbnail'
  | 'media-gallery'
  | 'gallery-item'
  | 'file'
  | 'separator'
  | 'container';

export interface TemplateInfo {
  type: TemplateType;
  kind: NodeKind;
  label: string;
  description: string;
  /** Message modes the node can be used in. */
  modes: readonly BuilderMode[];
  /** Components the node adds to the message's total (nested ones included). */
  componentCount: number;
}

/** A short id suffix for generated `custom_id`s and option values. */
const shortId = () => Math.random().toString(36).slice(2, 8);

const textDisplay = (content = ''): TextDisplayNode => ({ uid: createUid(), type: 10, content });

const factories: Record<TemplateType, (restrictions?: BuilderRestrictions) => BuilderNode> = {
  embed: () => ({ uid: createUid(), description: '', fields: [] }),
  field: () => ({ uid: createUid(), name: '', value: '' }),
  'action-row': () => ({ uid: createUid(), type: 1, components: [] }),
  button: () => ({ uid: createUid(), type: 2, style: 2, label: 'Button', custom_id: `button-${shortId()}` }),
  'link-button': () => ({ uid: createUid(), type: 2, style: 5, label: 'Link', url: 'https://discord.com' }),
  'premium-button': () => ({ uid: createUid(), type: 2, style: 6, sku_id: '' }),
  'string-select': () => ({
    uid: createUid(),
    type: 3,
    custom_id: `select-${shortId()}`,
    placeholder: 'Make a selection',
    options: [{ uid: createUid(), label: 'Option 1', value: 'option-1' }],
  }),
  'user-select': () => ({ uid: createUid(), type: 5, custom_id: `user-select-${shortId()}` }),
  'role-select': () => ({ uid: createUid(), type: 6, custom_id: `role-select-${shortId()}` }),
  'mentionable-select': () => ({ uid: createUid(), type: 7, custom_id: `mentionable-select-${shortId()}` }),
  'channel-select': () => ({ uid: createUid(), type: 8, custom_id: `channel-select-${shortId()}` }),
  option: () => {
    const id = shortId();
    return { uid: createUid(), label: 'Option', value: `option-${id}` };
  },
  'text-display': () => textDisplay(),
  section: (restrictions) => {
    // The first accessory the builder allows: a button, a link button, then a thumbnail.
    const accessories: (ButtonNode | ThumbnailNode)[] = [
      { uid: createUid(), type: 2, style: 2, label: 'Button', custom_id: `button-${shortId()}` },
      { uid: createUid(), type: 2, style: 5, label: 'Link', url: 'https://discord.com' },
      { uid: createUid(), type: 11, media: { url: '' } },
    ];
    const accessory = accessories.find((node) => isComponentAllowed(restrictions, node));
    return { uid: createUid(), type: 9, components: [textDisplay()], ...(accessory ? { accessory } : {}) };
  },
  thumbnail: () => ({ uid: createUid(), type: 11, media: { url: '' } }),
  'media-gallery': () => ({ uid: createUid(), type: 12, items: [{ uid: createUid(), media: { url: '' } }] }),
  'gallery-item': () => ({ uid: createUid(), media: { url: '' } }),
  file: () => ({ uid: createUid(), type: 13, file: { url: 'attachment://' } }),
  separator: () => ({ uid: createUid(), type: 14, divider: true, spacing: 1 }),
  container: (restrictions) => ({
    uid: createUid(),
    type: 17,
    components: isComponentAllowed(restrictions, 'textDisplay') ? [textDisplay()] : [],
  }),
};

/**
 * A new node of a template type with fresh uids and defaults: buttons and selects get a unique `custom_id`,
 * text fields start empty so the editor shows its placeholders. With `restrictions`, default children are
 * ones the builder allows (a section gets a thumbnail when buttons are off).
 */
export const createNode = <T extends BuilderNode = BuilderNode>(
  type: TemplateType,
  restrictions?: BuilderRestrictions,
): T => factories[type](restrictions) as T;

const CLASSIC_AND_CV2: readonly BuilderMode[] = ['classic', 'cv2'];
const CV2: readonly BuilderMode[] = ['cv2'];
const CLASSIC: readonly BuilderMode[] = ['classic'];

/** What each template makes, for palettes and "add" menus (labels are English defaults). */
export const TEMPLATES: readonly TemplateInfo[] = [
  { type: 'embed', kind: 'embed', label: 'Embed', description: 'A rich embed', modes: CLASSIC, componentCount: 0 },
  {
    type: 'field',
    kind: 'embedField',
    label: 'Field',
    description: 'A name and value in an embed',
    modes: CLASSIC,
    componentCount: 0,
  },
  {
    type: 'action-row',
    kind: 'actionRow',
    label: 'Action Row',
    description: 'Up to 5 buttons or one select menu',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'button',
    kind: 'button',
    label: 'Button',
    description: 'Sends an interaction to your app',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'link-button',
    kind: 'button',
    label: 'Link Button',
    description: 'Opens a URL',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'premium-button',
    kind: 'button',
    label: 'Premium Button',
    description: 'Buys an SKU of your app',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'string-select',
    kind: 'stringSelect',
    label: 'String Select',
    description: 'A menu of your own options',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'user-select',
    kind: 'userSelect',
    label: 'User Select',
    description: 'Pick server members',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'role-select',
    kind: 'roleSelect',
    label: 'Role Select',
    description: 'Pick roles',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'mentionable-select',
    kind: 'mentionableSelect',
    label: 'Mentionable Select',
    description: 'Pick members and roles',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'channel-select',
    kind: 'channelSelect',
    label: 'Channel Select',
    description: 'Pick channels',
    modes: CLASSIC_AND_CV2,
    componentCount: 1,
  },
  {
    type: 'option',
    kind: 'selectOption',
    label: 'Option',
    description: 'A choice in a string select',
    modes: CLASSIC_AND_CV2,
    componentCount: 0,
  },
  {
    type: 'text-display',
    kind: 'textDisplay',
    label: 'Text Display',
    description: 'Markdown text',
    modes: CV2,
    componentCount: 1,
  },
  {
    type: 'section',
    kind: 'section',
    label: 'Section',
    description: 'Text with a thumbnail or button beside it',
    modes: CV2,
    componentCount: 3,
  },
  {
    type: 'thumbnail',
    kind: 'thumbnail',
    label: 'Thumbnail',
    description: 'A small image beside a section',
    modes: CV2,
    componentCount: 1,
  },
  {
    type: 'media-gallery',
    kind: 'mediaGallery',
    label: 'Media Gallery',
    description: 'Up to 10 images or videos',
    modes: CV2,
    componentCount: 1,
  },
  {
    type: 'gallery-item',
    kind: 'mediaGalleryItem',
    label: 'Gallery Item',
    description: 'An image or video in a gallery',
    modes: CV2,
    componentCount: 0,
  },
  { type: 'file', kind: 'file', label: 'File', description: 'An uploaded file', modes: CV2, componentCount: 1 },
  {
    type: 'separator',
    kind: 'separator',
    label: 'Separator',
    description: 'Spacing, with or without a line',
    modes: CV2,
    componentCount: 1,
  },
  {
    type: 'container',
    kind: 'container',
    label: 'Container',
    description: 'A box with an accent colour around components',
    modes: CV2,
    componentCount: 2,
  },
];

export const TEMPLATE_INFO = Object.fromEntries(TEMPLATES.map((info) => [info.type, info])) as Record<
  TemplateType,
  TemplateInfo
>;

export const isTemplateType = (value: unknown): value is TemplateType =>
  typeof value === 'string' && value in TEMPLATE_INFO;
