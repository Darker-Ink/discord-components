// Restrictions: what a particular builder allows, on top of Discord's rules. A tag builder might allow only
// text, a support form only one container. Restrictions can turn things off and tighten Discord's limits,
// never loosen them.
import { limits, MessageFlag } from './limits';
import type { BuilderMode, IssueSeverity, ValidationIssue, WebhookMessagePayload } from './types';

/**
 * Components a restriction can name. Buttons and selects also have a name per style/type; `button` and
 * `select` cover all of them (the specific name wins when both are given).
 */
export type ComponentName =
  | 'actionRow'
  | 'button'
  | 'primaryButton'
  | 'secondaryButton'
  | 'successButton'
  | 'dangerButton'
  | 'linkButton'
  | 'premiumButton'
  | 'select'
  | 'stringSelect'
  | 'userSelect'
  | 'roleSelect'
  | 'mentionableSelect'
  | 'channelSelect'
  | 'section'
  | 'textDisplay'
  | 'thumbnail'
  | 'mediaGallery'
  | 'file'
  | 'separator'
  | 'container';

/** Embed properties that can be turned off. */
export type EmbedPart =
  'title' | 'description' | 'url' | 'color' | 'timestamp' | 'author' | 'footer' | 'image' | 'thumbnail' | 'fields';

/** Payload fields that can be turned off (`attachments` covers file uploads). */
export type MessageField =
  | 'content'
  | 'username'
  | 'avatar_url'
  | 'tts'
  | 'thread_name'
  | 'applied_tags'
  | 'allowed_mentions'
  | 'poll'
  | 'attachments'
  | 'flags';

/** Limits a builder can lower. Values above Discord's own limits are ignored. */
export interface RestrictionLimits {
  /** Message content characters. */
  content?: number;
  embeds?: number;
  embedTitle?: number;
  embedDescription?: number;
  /** Fields per embed. */
  embedFields?: number;
  fieldName?: number;
  fieldValue?: number;
  footerText?: number;
  authorName?: number;
  /** Characters across all embeds. */
  embedTotal?: number;
  /** Components in the message, nested ones included. */
  components?: number;
  /** Characters per text display. */
  textDisplay?: number;
  /** Characters across all text displays. */
  textDisplayTotal?: number;
  buttonLabel?: number;
  /** Buttons per action row. */
  actionRowButtons?: number;
  /** Text displays per section. */
  sectionComponents?: number;
  /** Items per media gallery. */
  galleryItems?: number;
  /** Options per string select. */
  selectOptions?: number;
  username?: number;
  threadName?: number;
}

export interface BuilderRestrictions {
  /** Message modes the builder can make. Default: both. */
  modes?: readonly BuilderMode[];
  /**
   * Which components are allowed: `{ file: false }` turns files off; `{ default: false, textDisplay: true }`
   * allows only text displays. Specific names (`linkButton`) win over groups (`button`), groups over `default`.
   */
  components?: Partial<Record<ComponentName | 'default', boolean>>;
  /** `false` turns embeds off; an object turns parts of them off (`{ image: false }`). */
  embeds?: boolean | Partial<Record<EmbedPart, boolean>>;
  /** Payload fields: `{ content: false, username: false, attachments: false }`. */
  message?: Partial<Record<MessageField, boolean>>;
  /** How many of a component the message can have: `{ container: 1 }`. Groups count all their members. */
  counts?: Partial<Record<ComponentName, number>>;
  /** Lower limits than Discord's. */
  limits?: RestrictionLimits;
}

/** Ready-made restrictions. Combine them with your own through `mergeRestrictions`. */
export const restrictionPresets = {
  /** Text only: content, text displays in containers, separators and text-only embeds. No media or files. */
  textOnly: {
    components: { default: false, textDisplay: true, container: true, separator: true },
    embeds: { image: false, thumbnail: false },
    message: { attachments: false, poll: false },
  },
  /**
   * What webhooks not owned by an application can send: no buttons that send interactions and no selects
   * (link buttons and all layout and content components are fine).
   */
  nonInteractive: {
    components: { button: false, linkButton: true, select: false },
  },
} satisfies Record<string, BuilderRestrictions>;

const DISCORD_LIMITS: Record<keyof RestrictionLimits, number> = {
  content: limits.message.content,
  embeds: limits.message.embeds,
  embedTitle: limits.embed.title,
  embedDescription: limits.embed.description,
  embedFields: limits.embed.fields,
  fieldName: limits.embed.fieldName,
  fieldValue: limits.embed.fieldValue,
  footerText: limits.embed.footerText,
  authorName: limits.embed.authorName,
  embedTotal: limits.embed.total,
  components: limits.components.total,
  textDisplay: limits.textDisplay.content,
  textDisplayTotal: limits.textDisplay.total,
  buttonLabel: limits.button.label,
  actionRowButtons: limits.actionRow.buttons,
  sectionComponents: limits.section.maxComponents,
  galleryItems: limits.mediaGallery.maxItems,
  selectOptions: limits.select.options,
  username: limits.webhook.username,
  threadName: limits.webhook.threadName,
};

/** A limit with the restrictions applied: the lower of Discord's and the builder's. */
export const effectiveLimit = (restrictions: BuilderRestrictions | undefined, key: keyof RestrictionLimits) => {
  const own = restrictions?.limits?.[key];
  const discord = DISCORD_LIMITS[key];
  return own != null && own >= 0 && own < discord ? Math.floor(own) : discord;
};

/** Whether the builder lowers a limit below Discord's. */
export const isTightened = (restrictions: BuilderRestrictions | undefined, key: keyof RestrictionLimits) =>
  effectiveLimit(restrictions, key) < DISCORD_LIMITS[key];

const BUTTON_NAMES: Record<number, ComponentName> = {
  1: 'primaryButton',
  2: 'secondaryButton',
  3: 'successButton',
  4: 'dangerButton',
  5: 'linkButton',
  6: 'premiumButton',
};

const TYPE_NAMES: Record<number, ComponentName> = {
  1: 'actionRow',
  3: 'stringSelect',
  5: 'userSelect',
  6: 'roleSelect',
  7: 'mentionableSelect',
  8: 'channelSelect',
  9: 'section',
  10: 'textDisplay',
  11: 'thumbnail',
  12: 'mediaGallery',
  13: 'file',
  14: 'separator',
  17: 'container',
};

/** A component's names, most specific first (`['linkButton', 'button']`). Empty for unknown types. */
export const componentNames = (component: { type?: unknown; style?: unknown }): ComponentName[] => {
  if (component.type === 2) {
    const style = BUTTON_NAMES[component.style as number];
    return style ? [style, 'button'] : ['button'];
  }
  const name = TYPE_NAMES[component.type as number];
  if (!name) return [];
  return component.type === 1 || !name.endsWith('Select') ? [name] : [name, 'select'];
};

const GROUP_OF: Partial<Record<ComponentName, ComponentName>> = {
  primaryButton: 'button',
  secondaryButton: 'button',
  successButton: 'button',
  dangerButton: 'button',
  linkButton: 'button',
  premiumButton: 'button',
  stringSelect: 'select',
  userSelect: 'select',
  roleSelect: 'select',
  mentionableSelect: 'select',
  channelSelect: 'select',
};

const allowsName = (restrictions: BuilderRestrictions | undefined, names: readonly ComponentName[]) => {
  const rules = restrictions?.components;
  if (!rules) return true;
  for (const name of names) {
    const rule = rules[name];
    if (rule !== undefined) return rule;
  }
  return rules.default ?? true;
};

/**
 * Whether the builder allows a component: a component object (`{ type: 2, style: 5 }`) or a name. A group
 * name (`button`) is allowed when any of its members is.
 */
export const isComponentAllowed = (
  restrictions: BuilderRestrictions | undefined,
  component: ComponentName | { type?: unknown; style?: unknown },
): boolean => {
  if (typeof component !== 'string') {
    const names = componentNames(component);
    return names.length === 0 || allowsName(restrictions, names);
  }
  if (component === 'button' || component === 'select') {
    return (Object.keys(GROUP_OF) as ComponentName[]).some(
      (name) => GROUP_OF[name] === component && allowsName(restrictions, [name, component]),
    );
  }
  const group = GROUP_OF[component];
  return allowsName(restrictions, group ? [component, group] : [component]);
};

export const allowedModes = (restrictions: BuilderRestrictions | undefined): BuilderMode[] => {
  const modes = restrictions?.modes;
  const result = (['classic', 'cv2'] as const).filter((mode) => !modes || modes.includes(mode));
  return result.length > 0 ? result : ['classic', 'cv2'];
};

export const isModeAllowed = (restrictions: BuilderRestrictions | undefined, mode: BuilderMode) =>
  allowedModes(restrictions).includes(mode);

export const areEmbedsAllowed = (restrictions: BuilderRestrictions | undefined) => restrictions?.embeds !== false;

export const isEmbedPartAllowed = (restrictions: BuilderRestrictions | undefined, part: EmbedPart) => {
  const embeds = restrictions?.embeds;
  if (embeds === false) return false;
  return embeds === undefined || embeds === true || embeds[part] !== false;
};

export const isMessageFieldAllowed = (restrictions: BuilderRestrictions | undefined, field: MessageField) =>
  restrictions?.message?.[field] !== false;

/** The most components of this name the message can have (`Infinity` when not limited). */
export const countLimit = (restrictions: BuilderRestrictions | undefined, name: ComponentName) =>
  restrictions?.counts?.[name] ?? Infinity;

const ALL_NAMES: readonly ComponentName[] = [
  'actionRow',
  'primaryButton',
  'secondaryButton',
  'successButton',
  'dangerButton',
  'linkButton',
  'premiumButton',
  'stringSelect',
  'userSelect',
  'roleSelect',
  'mentionableSelect',
  'channelSelect',
  'section',
  'textDisplay',
  'thumbnail',
  'mediaGallery',
  'file',
  'separator',
  'container',
];

const EMBED_PARTS: readonly EmbedPart[] = [
  'title',
  'description',
  'url',
  'color',
  'timestamp',
  'author',
  'footer',
  'image',
  'thumbnail',
  'fields',
];

const MESSAGE_FIELDS: readonly MessageField[] = [
  'content',
  'username',
  'avatar_url',
  'tts',
  'thread_name',
  'applied_tags',
  'allowed_mentions',
  'poll',
  'attachments',
  'flags',
];

const minOf = (values: (number | undefined)[]) => {
  const defined = values.filter((value): value is number => value != null);
  return defined.length > 0 ? Math.min(...defined) : undefined;
};

/** Combines restrictions; the strictest wins (anything one of them turns off is off, the lowest limit wins). */
export const mergeRestrictions = (...list: (BuilderRestrictions | undefined)[]): BuilderRestrictions => {
  const all = list.filter((item): item is BuilderRestrictions => item != null);
  if (all.length <= 1) return all[0] ?? {};
  const merged: BuilderRestrictions = {};
  if (all.some((item) => item.modes)) {
    const modes = (['classic', 'cv2'] as const).filter((mode) =>
      all.every((item) => !item.modes || item.modes.includes(mode)),
    );
    merged.modes = modes;
  }
  if (all.some((item) => item.components)) {
    merged.components = Object.fromEntries(
      ALL_NAMES.map((name) => [name, all.every((item) => isComponentAllowed(item, name))]),
    );
  }
  if (all.some((item) => item.embeds !== undefined)) {
    merged.embeds = all.every(areEmbedsAllowed)
      ? Object.fromEntries(EMBED_PARTS.map((part) => [part, all.every((item) => isEmbedPartAllowed(item, part))]))
      : false;
  }
  if (all.some((item) => item.message)) {
    merged.message = Object.fromEntries(
      MESSAGE_FIELDS.map((field) => [field, all.every((item) => isMessageFieldAllowed(item, field))]),
    );
  }
  const countKeys = new Set(all.flatMap((item) => Object.keys(item.counts ?? {}) as ComponentName[]));
  if (countKeys.size > 0) {
    merged.counts = Object.fromEntries(
      [...countKeys].map((key) => [key, minOf(all.map((item) => item.counts?.[key]))]),
    );
  }
  const limitKeys = new Set(all.flatMap((item) => Object.keys(item.limits ?? {}) as (keyof RestrictionLimits)[]));
  if (limitKeys.size > 0) {
    merged.limits = Object.fromEntries(
      [...limitKeys].map((key) => [key, minOf(all.map((item) => item.limits?.[key]))]),
    );
  }
  return merged;
};

// ---------------------------------------------------------------------------------------------------------
// Validation

type Json = Record<string, unknown>;
type Path = (string | number)[];

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPresent = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0) &&
  !(isObject(value) && Object.keys(value).length === 0);

const SURROGATE = /[\uD800-\uDFFF]/;
const length = (value: unknown, trim = false) => {
  if (typeof value !== 'string') return 0;
  const text = trim ? value.trim() : value;
  if (!SURROGATE.test(text)) return text.length;
  let count = 0;
  for (const _char of text) count++;
  return count;
};

const COMPONENT_LABELS: Record<ComponentName, string> = {
  actionRow: 'Action rows',
  button: 'Buttons',
  primaryButton: 'Primary buttons',
  secondaryButton: 'Secondary buttons',
  successButton: 'Success buttons',
  dangerButton: 'Danger buttons',
  linkButton: 'Link buttons',
  premiumButton: 'Premium buttons',
  select: 'Select menus',
  stringSelect: 'String selects',
  userSelect: 'User selects',
  roleSelect: 'Role selects',
  mentionableSelect: 'Mentionable selects',
  channelSelect: 'Channel selects',
  section: 'Sections',
  textDisplay: 'Text displays',
  thumbnail: 'Thumbnails',
  mediaGallery: 'Media galleries',
  file: 'Files',
  separator: 'Separators',
  container: 'Containers',
};

export const describeComponentName = (name: ComponentName) => COMPONENT_LABELS[name];

const FIELD_LABELS: Record<MessageField, string> = {
  content: 'Message content',
  username: 'A custom username',
  avatar_url: 'A custom avatar',
  tts: 'Text-to-speech',
  thread_name: 'Creating a thread',
  applied_tags: 'Thread tags',
  allowed_mentions: 'Allowed mentions',
  poll: 'Polls',
  attachments: 'Files',
  flags: 'Message flags',
};

/** Checks a payload against restrictions only (Discord's own rules are `validateMessage`'s job). */
export const validateRestrictions = (
  payload: WebhookMessagePayload | Json,
  restrictions: BuilderRestrictions,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const report = (
    path: Path,
    code: string,
    message: string,
    extra?: { limit?: number; actual?: number },
    severity: IssueSeverity = 'error',
  ) => issues.push({ path, code, message, severity, restricted: true, ...extra });
  const tooLong = (path: Path, value: unknown, key: keyof RestrictionLimits, label: string, trim = false) => {
    if (!isTightened(restrictions, key)) return;
    const limit = effectiveLimit(restrictions, key);
    const actual = length(value, trim);
    if (actual > limit)
      report(path, 'MAX_LENGTH', `${label} is too long for this builder (${actual}/${limit})`, { limit, actual });
  };
  const tooMany = (path: Path, count: number, key: keyof RestrictionLimits, label: string, code = 'MAX_ITEMS') => {
    if (!isTightened(restrictions, key)) return;
    const limit = effectiveLimit(restrictions, key);
    if (count > limit)
      report(path, code, `${label}: at most ${limit} in this builder (${count}/${limit})`, { limit, actual: count });
  };
  const data = payload as Json;
  const cv2 = typeof data.flags === 'number' && (data.flags & MessageFlag.IsComponentsV2) !== 0;
  const mode: BuilderMode = cv2 ? 'cv2' : 'classic';
  if (!isModeAllowed(restrictions, mode)) {
    report(
      ['flags'],
      'MODE_NOT_ALLOWED',
      mode === 'cv2' ? 'This builder only makes classic messages' : 'This builder only makes Components v2 messages',
    );
  }

  for (const field of MESSAGE_FIELDS) {
    if (field === 'flags') {
      // The CV2 flag is the mode's business; other flags are what this switch covers.
      const others = typeof data.flags === 'number' ? data.flags & ~MessageFlag.IsComponentsV2 : 0;
      if (others !== 0 && !isMessageFieldAllowed(restrictions, 'flags')) {
        report(['flags'], 'FIELD_NOT_ALLOWED', `${FIELD_LABELS.flags} aren't allowed in this builder`);
      }
    } else if (isPresent(data[field]) && !isMessageFieldAllowed(restrictions, field) && data[field] !== false) {
      report([field], 'FIELD_NOT_ALLOWED', `${FIELD_LABELS[field]} isn't allowed in this builder`);
    }
  }
  tooLong(['content'], data.content, 'content', 'Content');
  tooLong(['username'], data.username, 'username', 'Username');
  tooLong(['thread_name'], data.thread_name, 'threadName', 'Thread name');

  const embeds = Array.isArray(data.embeds) ? data.embeds : [];
  if (embeds.length > 0 && !areEmbedsAllowed(restrictions)) {
    report(['embeds'], 'EMBEDS_NOT_ALLOWED', "Embeds aren't allowed in this builder");
  } else if (embeds.length > 0) {
    tooMany(['embeds'], embeds.length, 'embeds', 'Embeds');
    let total = 0;
    embeds.forEach((embed, index) => {
      if (!isObject(embed)) return;
      const path = ['embeds', index];
      for (const part of EMBED_PARTS) {
        if (isPresent(embed[part]) && !isEmbedPartAllowed(restrictions, part)) {
          report(
            [...path, part],
            'EMBED_FIELD_NOT_ALLOWED',
            `Embed ${part === 'color' ? 'colours' : `${part}s`} aren't allowed in this builder`,
          );
        }
      }
      tooLong([...path, 'title'], embed.title, 'embedTitle', 'Title', true);
      tooLong([...path, 'description'], embed.description, 'embedDescription', 'Description', true);
      const author = isObject(embed.author) ? embed.author : {};
      const footer = isObject(embed.footer) ? embed.footer : {};
      tooLong([...path, 'author', 'name'], author.name, 'authorName', 'Author name', true);
      tooLong([...path, 'footer', 'text'], footer.text, 'footerText', 'Footer text', true);
      const fields = Array.isArray(embed.fields) ? embed.fields : [];
      tooMany([...path, 'fields'], fields.length, 'embedFields', 'Fields');
      total +=
        length(embed.title, true) +
        length(embed.description, true) +
        length(author.name, true) +
        length(footer.text, true);
      fields.forEach((field, fieldIndex) => {
        if (!isObject(field)) return;
        tooLong([...path, 'fields', fieldIndex, 'name'], field.name, 'fieldName', 'Field name', true);
        tooLong([...path, 'fields', fieldIndex, 'value'], field.value, 'fieldValue', 'Field value', true);
        total += length(field.name, true) + length(field.value, true);
      });
    });
    tooMany(['embeds'], total, 'embedTotal', 'Embed characters', 'EMBED_TOTAL_LENGTH');
  }

  const counts = new Map<ComponentName, number>();
  let componentCount = 0;
  let textCharacters = 0;
  const visit = (component: unknown, path: Path) => {
    if (!isObject(component)) return;
    componentCount++;
    const names = componentNames(component);
    if (names.length > 0 && !allowsName(restrictions, names)) {
      report(path, 'COMPONENT_NOT_ALLOWED', `${COMPONENT_LABELS[names[0]]} aren't allowed in this builder`);
    }
    for (const name of names) {
      const count = (counts.get(name) ?? 0) + 1;
      counts.set(name, count);
      const max = countLimit(restrictions, name);
      if (count > max) {
        report(path, 'MAX_COUNT', `${COMPONENT_LABELS[name]}: at most ${max} in this builder`, {
          limit: max,
          actual: count,
        });
      }
    }
    const children = Array.isArray(component.components) ? component.components : [];
    switch (component.type) {
      case 1:
        tooMany(
          [...path, 'components'],
          children.filter((child) => isObject(child) && child.type === 2).length,
          'actionRowButtons',
          'Buttons per row',
        );
        break;
      case 2:
        tooLong([...path, 'label'], component.label, 'buttonLabel', 'Button label');
        break;
      case 3:
        tooMany(
          [...path, 'options'],
          Array.isArray(component.options) ? component.options.length : 0,
          'selectOptions',
          'Options',
        );
        break;
      case 9:
        tooMany([...path, 'components'], children.length, 'sectionComponents', 'Text displays per section');
        break;
      case 10:
        tooLong([...path, 'content'], component.content, 'textDisplay', 'Text');
        textCharacters += length(component.content);
        break;
      case 12:
        tooMany(
          [...path, 'items'],
          Array.isArray(component.items) ? component.items.length : 0,
          'galleryItems',
          'Gallery items',
        );
        break;
    }
    children.forEach((child, index) => visit(child, [...path, 'components', index]));
    if (isObject(component.accessory)) visit(component.accessory, [...path, 'accessory']);
  };
  (Array.isArray(data.components) ? data.components : []).forEach((component, index) =>
    visit(component, ['components', index]),
  );
  tooMany(['components'], componentCount, 'components', 'Components', 'COMPONENT_COUNT');
  tooMany(['components'], textCharacters, 'textDisplayTotal', 'Text characters', 'TEXT_DISPLAY_TOTAL_LENGTH');
  return issues;
};
