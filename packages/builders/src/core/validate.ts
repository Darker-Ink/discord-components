// Discord's message rules (see limits.ts for where each comes from), checked on an API payload. Pure and
// allocation-light, so it can run on every keystroke.
import { limits, MessageFlag } from './limits';
import { toJSON } from './json';
import { countComponents } from './rules';
import { effectiveLimit, validateRestrictions, type BuilderRestrictions, type RestrictionLimits } from './restrictions';
import { nodeAtPath } from './tree';
import type {
  BuilderDocument,
  IssueSeverity,
  NodeKind,
  ValidateOptions,
  ValidationIssue,
  ValidationTarget,
} from './types';

export type IssuePath = (string | number)[];

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SURROGATE = /[\uD800-\uDFFF]/;

/** Length in Unicode code points, the way Discord counts characters (an emoji is one). */
export const characterLength = (value: string) => {
  if (!SURROGATE.test(value)) return value.length;
  let length = 0;
  for (const _char of value) length++;
  return length;
};

/** Characters an embed adds to the 6000 total: trimmed title, description, fields, footer and author name. */
export const countEmbedCharacters = (embed: unknown) => {
  if (!isObject(embed)) return 0;
  const count = (value: unknown) => (typeof value === 'string' ? characterLength(value.trim()) : 0);
  let total = count(embed.title) + count(embed.description);
  if (isObject(embed.footer)) total += count(embed.footer.text);
  if (isObject(embed.author)) total += count(embed.author.name);
  if (Array.isArray(embed.fields)) {
    for (const field of embed.fields) if (isObject(field)) total += count(field.name) + count(field.value);
  }
  return total;
};

interface Context {
  issues: ValidationIssue[];
  cv2: boolean;
  target: ValidationTarget;
  options: ValidateOptions;
  customIds: Map<string, IssuePath>;
  componentIds: Map<number, IssuePath>;
  componentCount: number;
  textDisplayCharacters: number;
  /** attachment:// file names referenced by the payload. */
  attachmentRefs: Set<string>;
}

const newValidationContext = (options: ValidateOptions = {}, cv2 = false): Context => ({
  issues: [],
  cv2,
  target: options.target ?? 'webhook',
  options,
  customIds: new Map(),
  componentIds: new Map(),
  componentCount: 0,
  textDisplayCharacters: 0,
  attachmentRefs: new Set(),
});

const report = (
  ctx: Context,
  path: IssuePath,
  code: string,
  message: string,
  severity: IssueSeverity = 'error',
  extra?: { limit?: number; actual?: number },
) => {
  ctx.issues.push({ path, code, message, severity, ...extra });
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface TextRule {
  max: number;
  min?: number;
  required?: boolean;
  /** Count without leading/trailing whitespace (embeds). */
  trim?: boolean;
}

/** Checks a string field: type, required, min and max length (with "4021/4096" style messages). */
const checkText = (ctx: Context, path: IssuePath, value: unknown, label: string, rule: TextRule) => {
  if (value === undefined || value === null) {
    if (rule.required) report(ctx, path, 'REQUIRED', `${capitalize(label)} is required`);
    return;
  }
  if (typeof value !== 'string') {
    report(ctx, path, 'INVALID_TYPE', `${capitalize(label)} must be a string`);
    return;
  }
  const length = characterLength(rule.trim ? value.trim() : value);
  const min = rule.min ?? (rule.required ? 1 : 0);
  if (length < min) {
    if (length === 0)
      report(ctx, path, 'REQUIRED', `${capitalize(label)} can't be empty`, 'error', { limit: min, actual: 0 });
    else {
      report(
        ctx,
        path,
        'MIN_LENGTH',
        `${capitalize(label)} must be at least ${min} characters (${length}/${min})`,
        'error',
        {
          limit: min,
          actual: length,
        },
      );
    }
  } else if (length > rule.max) {
    report(ctx, path, 'MAX_LENGTH', `${capitalize(label)} is too long (${length}/${rule.max})`, 'error', {
      limit: rule.max,
      actual: length,
    });
  }
};

const checkBoolean = (ctx: Context, path: IssuePath, value: unknown, label: string) => {
  if (value !== undefined && value !== null && typeof value !== 'boolean') {
    report(ctx, path, 'INVALID_TYPE', `${capitalize(label)} must be true or false`);
  }
};

const checkInteger = (
  ctx: Context,
  path: IssuePath,
  value: unknown,
  label: string,
  { min, max, required }: { min: number; max: number; required?: boolean },
) => {
  if (value === undefined || value === null) {
    if (required) report(ctx, path, 'REQUIRED', `${capitalize(label)} is required`);
    return false;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    report(ctx, path, 'INVALID_TYPE', `${capitalize(label)} must be a whole number`);
    return false;
  }
  if (value < min || value > max) {
    report(ctx, path, 'OUT_OF_RANGE', `${capitalize(label)} must be between ${min} and ${max}`, 'error', {
      limit: value < min ? min : max,
      actual: value,
    });
    return false;
  }
  return true;
};

const checkCount = (
  ctx: Context,
  path: IssuePath,
  count: number,
  label: string,
  { min = 0, max }: { min?: number; max: number },
) => {
  if (count < min) {
    report(
      ctx,
      path,
      'MIN_ITEMS',
      min === 1 ? `${capitalize(label)} needs at least one item` : `${capitalize(label)} needs at least ${min} items`,
      'error',
      { limit: min, actual: count },
    );
  } else if (count > max) {
    report(ctx, path, 'MAX_ITEMS', `${capitalize(label)} has too many items (${count}/${max})`, 'error', {
      limit: max,
      actual: count,
    });
  }
};

const SNOWFLAKE = /^\d{17,20}$/;

const checkSnowflake = (ctx: Context, path: IssuePath, value: unknown, label: string, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) report(ctx, path, 'REQUIRED', `${capitalize(label)} is required`);
    return;
  }
  if (typeof value !== 'string' || !SNOWFLAKE.test(value)) {
    report(ctx, path, 'INVALID_SNOWFLAKE', `${capitalize(label)} must be a Discord ID (17 to 20 digits)`);
  }
};

type Scheme = 'http' | 'attachment' | 'discord';

const ATTACHMENT_URL = /^attachment:\/\/(\S+)$/;
const HTTP_URL = /^https?:\/\/\S+$/i;
const DISCORD_URL = /^discord:\/\/\S+$/i;

const isValidHttpUrl = (value: string) => {
  if (!HTTP_URL.test(value)) return false;
  try {
    return new URL(value).hostname !== '';
  } catch {
    return false;
  }
};

/** Checks a URL against the schemes the field accepts, and records attachment:// references. */
const checkUrl = (
  ctx: Context,
  path: IssuePath,
  value: unknown,
  label: string,
  schemes: readonly Scheme[],
  { required = false, max }: { required?: boolean; max?: number } = {},
) => {
  if (value === undefined || value === null || value === '') {
    if (required) report(ctx, path, 'REQUIRED', `${capitalize(label)} is required`);
    return;
  }
  if (typeof value !== 'string') {
    report(ctx, path, 'INVALID_TYPE', `${capitalize(label)} must be a string`);
    return;
  }
  if (max != null) {
    const length = characterLength(value);
    if (length > max) {
      report(ctx, path, 'MAX_LENGTH', `${capitalize(label)} is too long (${length}/${max})`, 'error', {
        limit: max,
        actual: length,
      });
    }
  }
  const attachment = ATTACHMENT_URL.exec(value);
  if (attachment) {
    if (schemes.includes('attachment')) ctx.attachmentRefs.add(attachment[1]);
    else report(ctx, path, 'INVALID_URL', `${capitalize(label)} can't be an attachment:// URL`);
    return;
  }
  if (schemes.includes('http') && isValidHttpUrl(value)) return;
  if (schemes.includes('discord') && DISCORD_URL.test(value)) return;
  const accepted = schemes
    .map((scheme) => (scheme === 'http' ? 'http(s)://' : scheme === 'attachment' ? 'attachment://' : 'discord://'))
    .join(' or ');
  report(ctx, path, 'INVALID_URL', `${capitalize(label)} must be a valid ${accepted} URL`);
};

const ISO_8601 = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i;

const checkTimestamp = (ctx: Context, path: IssuePath, value: unknown, label: string) => {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !ISO_8601.test(value) || Number.isNaN(Date.parse(value))) {
    report(ctx, path, 'INVALID_TIMESTAMP', `${capitalize(label)} must be an ISO 8601 timestamp`);
  }
};

const checkColor = (ctx: Context, path: IssuePath, value: unknown, label: string) => {
  if (value === undefined || value === null) return;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > limits.embed.colorMax) {
    report(
      ctx,
      path,
      'INVALID_COLOR',
      `${capitalize(label)} must be an RGB integer from 0 to 0xFFFFFF (16777215)`,
      'error',
      {
        limit: limits.embed.colorMax,
        ...(typeof value === 'number' ? { actual: value } : {}),
      },
    );
  }
};

const ignored = (ctx: Context, path: IssuePath, label: string, why: string) =>
  report(ctx, path, 'IGNORED_FIELD', `${capitalize(label)} is ignored: ${why}`, 'warning');

const checkEmoji = (ctx: Context, path: IssuePath, value: unknown) => {
  if (value === undefined || value === null) return;
  if (!isObject(value)) {
    report(ctx, path, 'INVALID_TYPE', 'Emoji must be an object with an id or a name');
    return;
  }
  const hasId = typeof value.id === 'string' && value.id !== '';
  const hasName = typeof value.name === 'string' && value.name !== '';
  if (!hasId && !hasName) report(ctx, path, 'REQUIRED', 'Emoji needs an id (custom emoji) or a name (Unicode emoji)');
  if (hasId) checkSnowflake(ctx, [...path, 'id'], value.id, 'emoji id');
  checkBoolean(ctx, [...path, 'animated'], value.animated, 'emoji animated');
};

// ---------------------------------------------------------------------------------------------------------
// Embeds

const EMBED_MEDIA_IGNORED = ['proxy_url', 'width', 'height'] as const;

const validateEmbedInto = (ctx: Context, embed: unknown, path: IssuePath) => {
  if (!isObject(embed)) {
    report(ctx, path, 'INVALID_TYPE', 'Embed must be an object');
    return;
  }
  checkText(ctx, [...path, 'title'], embed.title, 'title', { max: limits.embed.title, trim: true });
  checkText(ctx, [...path, 'description'], embed.description, 'description', {
    max: limits.embed.description,
    trim: true,
  });
  checkUrl(ctx, [...path, 'url'], embed.url, 'embed URL', ['http']);
  checkTimestamp(ctx, [...path, 'timestamp'], embed.timestamp, 'timestamp');
  checkColor(ctx, [...path, 'color'], embed.color, 'color');
  if (embed.type !== undefined && embed.type !== 'rich')
    ignored(ctx, [...path, 'type'], 'embed type', 'webhook and bot embeds are always "rich"');
  if (embed.provider !== undefined) ignored(ctx, [...path, 'provider'], 'provider', "it can't be set");
  if (embed.video !== undefined) ignored(ctx, [...path, 'video'], 'video', "it can't be set");

  if (embed.footer !== undefined && embed.footer !== null) {
    if (!isObject(embed.footer)) report(ctx, [...path, 'footer'], 'INVALID_TYPE', 'Footer must be an object');
    else {
      checkText(ctx, [...path, 'footer', 'text'], embed.footer.text, 'footer text', {
        max: limits.embed.footerText,
        required: true,
        trim: true,
      });
      checkUrl(ctx, [...path, 'footer', 'icon_url'], embed.footer.icon_url, 'footer icon URL', ['http', 'attachment']);
    }
  }
  if (embed.author !== undefined && embed.author !== null) {
    if (!isObject(embed.author)) report(ctx, [...path, 'author'], 'INVALID_TYPE', 'Author must be an object');
    else {
      checkText(ctx, [...path, 'author', 'name'], embed.author.name, 'author name', {
        max: limits.embed.authorName,
        required: true,
        trim: true,
      });
      checkUrl(ctx, [...path, 'author', 'url'], embed.author.url, 'author URL', ['http']);
      checkUrl(ctx, [...path, 'author', 'icon_url'], embed.author.icon_url, 'author icon URL', ['http', 'attachment']);
    }
  }
  for (const key of ['image', 'thumbnail'] as const) {
    const media = embed[key];
    if (media === undefined || media === null) continue;
    if (!isObject(media)) {
      report(ctx, [...path, key], 'INVALID_TYPE', `${capitalize(key)} must be an object`);
      continue;
    }
    checkUrl(ctx, [...path, key, 'url'], media.url, `${key} URL`, ['http', 'attachment'], { required: true });
    for (const field of EMBED_MEDIA_IGNORED) {
      if (media[field] !== undefined) ignored(ctx, [...path, key, field], `${key} ${field}`, 'Discord sets it');
    }
  }
  let hasFields = false;
  if (embed.fields !== undefined && embed.fields !== null) {
    if (!Array.isArray(embed.fields)) report(ctx, [...path, 'fields'], 'INVALID_TYPE', 'Fields must be a list');
    else {
      hasFields = embed.fields.length > 0;
      checkCount(ctx, [...path, 'fields'], embed.fields.length, 'fields', { max: limits.embed.fields });
      embed.fields.forEach((field, index) => {
        const fieldPath = [...path, 'fields', index];
        if (!isObject(field)) {
          report(ctx, fieldPath, 'INVALID_TYPE', 'Field must be an object');
          return;
        }
        checkText(ctx, [...fieldPath, 'name'], field.name, 'field name', {
          max: limits.embed.fieldName,
          required: true,
          trim: true,
        });
        checkText(ctx, [...fieldPath, 'value'], field.value, 'field value', {
          max: limits.embed.fieldValue,
          required: true,
          trim: true,
        });
        checkBoolean(ctx, [...fieldPath, 'inline'], field.inline, 'inline');
      });
    }
  }
  const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim() !== '';
  const hasContent =
    nonEmpty(embed.title) ||
    nonEmpty(embed.description) ||
    hasFields ||
    (isObject(embed.author) && nonEmpty(embed.author.name)) ||
    (isObject(embed.footer) && nonEmpty(embed.footer.text)) ||
    (isObject(embed.image) && nonEmpty(embed.image.url)) ||
    (isObject(embed.thumbnail) && nonEmpty(embed.thumbnail.url));
  if (!hasContent) report(ctx, path, 'EMPTY_EMBED', 'Embed is empty: add a title, description, field, image or more');
};

// ---------------------------------------------------------------------------------------------------------
// Components

type Placement = 'top' | 'container' | 'section' | 'accessory' | 'actionRow';

const COMPONENT_LABELS: Record<number, string> = {
  1: 'action row',
  2: 'button',
  3: 'string select',
  4: 'text input',
  5: 'user select',
  6: 'role select',
  7: 'mentionable select',
  8: 'channel select',
  9: 'section',
  10: 'text display',
  11: 'thumbnail',
  12: 'media gallery',
  13: 'file',
  14: 'separator',
  17: 'container',
  18: 'label',
  19: 'file upload',
  21: 'radio group',
  22: 'checkbox group',
  23: 'checkbox',
};

const MODAL_ONLY = new Set([4, 18, 19, 21, 22, 23]);
const CV2_ONLY = new Set([9, 10, 11, 12, 13, 14, 17]);
const SELECT_TYPES = new Set([3, 5, 6, 7, 8]);

const ALLOWED_IN: Record<Placement, ReadonlySet<number>> = {
  top: new Set([1, 9, 10, 12, 13, 14, 17]),
  container: new Set([1, 9, 10, 12, 13, 14]),
  section: new Set([10]),
  accessory: new Set([2, 11]),
  actionRow: new Set([2, 3, 5, 6, 7, 8]),
};

const PLACEMENT_LABELS: Record<Placement, string> = {
  top: 'the top level of a message',
  container: 'a container',
  section: 'a section',
  accessory: "a section's accessory",
  actionRow: 'an action row',
};

const labelOf = (type: unknown) =>
  typeof type === 'number' ? (COMPONENT_LABELS[type] ?? `component type ${type}`) : 'component';

const checkCustomId = (ctx: Context, path: IssuePath, value: unknown, label: string) => {
  checkText(ctx, path, value, `${label} custom ID`, { max: limits.components.customId, required: true });
  if (typeof value !== 'string' || value === '') return;
  const previous = ctx.customIds.get(value);
  if (previous) {
    report(ctx, path, 'DUPLICATE_CUSTOM_ID', `Custom ID "${value}" is already used by another component`);
  } else ctx.customIds.set(value, path);
};

/** Interactive components in a webhook message need an application-owned webhook. */
const checkWebhookInteractive = (ctx: Context, path: IssuePath, label: string) => {
  if (ctx.target !== 'webhook' || ctx.options.applicationOwnedWebhook === true) return;
  report(
    ctx,
    path,
    'INTERACTIVE_COMPONENT_IN_WEBHOOK',
    `${capitalize(label)}s only work with webhooks created by an application; other webhooks can only send link buttons and non-interactive components`,
    ctx.options.applicationOwnedWebhook === false ? 'error' : 'warning',
  );
};

const validateButtonInto = (ctx: Context, button: Json, path: IssuePath) => {
  const style = button.style;
  if (!checkInteger(ctx, [...path, 'style'], style, 'button style', { min: 1, max: 6, required: true })) return;
  checkBoolean(ctx, [...path, 'disabled'], button.disabled, 'disabled');
  const forbid = (key: string, why: string) => {
    if (button[key] !== undefined && button[key] !== null) {
      report(
        ctx,
        [...path, key],
        'FORBIDDEN_FIELD',
        `${why} can't have ${key === 'sku_id' ? 'an SKU' : key === 'url' ? 'a URL' : key === 'custom_id' ? 'a custom ID' : `a ${key}`}`,
      );
    }
  };
  if (style === 6) {
    checkSnowflake(ctx, [...path, 'sku_id'], button.sku_id, 'SKU ID', true);
    for (const key of ['custom_id', 'label', 'url', 'emoji']) forbid(key, 'Premium buttons');
    checkWebhookInteractive(ctx, path, 'premium button');
    return;
  }
  checkText(ctx, [...path, 'label'], button.label, 'button label', { max: limits.button.label });
  checkEmoji(ctx, [...path, 'emoji'], button.emoji);
  const hasLabel = typeof button.label === 'string' && button.label !== '';
  if (!hasLabel && !isObject(button.emoji))
    report(ctx, [...path, 'label'], 'REQUIRED', 'Button needs a label or an emoji');
  if (style === 5) {
    checkUrl(ctx, [...path, 'url'], button.url, 'button URL', ['http', 'discord'], {
      required: true,
      max: limits.button.url,
    });
    forbid('custom_id', 'Link buttons');
    forbid('sku_id', 'Link buttons');
    return;
  }
  checkCustomId(ctx, [...path, 'custom_id'], button.custom_id, 'button');
  forbid('url', 'Only link buttons can have a URL; this button');
  forbid('sku_id', 'Only premium buttons can have an SKU; this button');
  checkWebhookInteractive(ctx, path, 'button');
};

const DEFAULT_VALUE_TYPES: Record<number, readonly string[]> = {
  5: ['user'],
  6: ['role'],
  7: ['user', 'role'],
  8: ['channel'],
};

const validateSelectInto = (ctx: Context, select: Json, path: IssuePath) => {
  const type = select.type as number;
  const label = labelOf(type);
  checkCustomId(ctx, [...path, 'custom_id'], select.custom_id, label);
  checkText(ctx, [...path, 'placeholder'], select.placeholder, 'placeholder', { max: limits.select.placeholder });
  const minOk = checkInteger(ctx, [...path, 'min_values'], select.min_values, 'minimum values', {
    min: limits.select.minValues,
    max: limits.select.maxValues,
  });
  const maxOk = checkInteger(ctx, [...path, 'max_values'], select.max_values, 'maximum values', {
    min: 1,
    max: limits.select.maxValues,
  });
  const min = minOk ? (select.min_values as number) : 1;
  const max = maxOk ? (select.max_values as number) : 1;
  if (minOk && maxOk && min > max) {
    report(
      ctx,
      [...path, 'min_values'],
      'MIN_GREATER_THAN_MAX',
      'Minimum values must not be more than maximum values',
      'error',
      {
        limit: max,
        actual: min,
      },
    );
  }
  checkBoolean(ctx, [...path, 'disabled'], select.disabled, 'disabled');
  if (select.required !== undefined) ignored(ctx, [...path, 'required'], 'required', 'it only applies in modals');
  checkWebhookInteractive(ctx, path, 'select menu');

  if (type === 3) {
    if (select.default_values !== undefined) {
      ignored(ctx, [...path, 'default_values'], 'default values', 'string selects use `default` on options');
    }
    if (!Array.isArray(select.options)) {
      report(ctx, [...path, 'options'], 'REQUIRED', 'String select needs options');
      return;
    }
    checkCount(ctx, [...path, 'options'], select.options.length, 'options', {
      min: limits.select.minOptions,
      max: limits.select.options,
    });
    const values = new Set<string>();
    let defaults = 0;
    select.options.forEach((option, index) => {
      const optionPath = [...path, 'options', index];
      if (!isObject(option)) {
        report(ctx, optionPath, 'INVALID_TYPE', 'Option must be an object');
        return;
      }
      checkText(ctx, [...optionPath, 'label'], option.label, 'option label', {
        max: limits.select.optionLabel,
        required: true,
      });
      checkText(ctx, [...optionPath, 'value'], option.value, 'option value', {
        max: limits.select.optionValue,
        required: true,
      });
      checkText(ctx, [...optionPath, 'description'], option.description, 'option description', {
        max: limits.select.optionDescription,
      });
      checkEmoji(ctx, [...optionPath, 'emoji'], option.emoji);
      checkBoolean(ctx, [...optionPath, 'default'], option.default, 'default');
      if (option.default === true) defaults++;
      if (typeof option.value === 'string' && option.value !== '') {
        if (values.has(option.value)) {
          report(
            ctx,
            [...optionPath, 'value'],
            'DUPLICATE_OPTION_VALUE',
            `Option value "${option.value}" is used twice`,
          );
        }
        values.add(option.value);
      }
    });
    if (maxOk && max > select.options.length && select.options.length > 0) {
      report(
        ctx,
        [...path, 'max_values'],
        'MAX_VALUES_EXCEEDS_OPTIONS',
        `Maximum values (${max}) is more than the number of options (${select.options.length})`,
        'error',
        { limit: select.options.length, actual: max },
      );
    }
    if (defaults > max) {
      report(
        ctx,
        [...path, 'options'],
        'TOO_MANY_DEFAULTS',
        `${defaults} options are default but at most ${max} can be selected`,
        'error',
        {
          limit: max,
          actual: defaults,
        },
      );
    }
    return;
  }

  if (select.options !== undefined) ignored(ctx, [...path, 'options'], 'options', `${label}s fill their own options`);
  if (type === 8 && select.channel_types !== undefined) {
    if (!Array.isArray(select.channel_types) || select.channel_types.some((value) => !Number.isInteger(value))) {
      report(ctx, [...path, 'channel_types'], 'INVALID_TYPE', 'Channel types must be a list of channel type numbers');
    }
  }
  if (select.default_values === undefined || select.default_values === null) return;
  if (!Array.isArray(select.default_values)) {
    report(ctx, [...path, 'default_values'], 'INVALID_TYPE', 'Default values must be a list');
    return;
  }
  const allowedTypes = DEFAULT_VALUE_TYPES[type] ?? [];
  select.default_values.forEach((value, index) => {
    const valuePath = [...path, 'default_values', index];
    if (!isObject(value)) {
      report(ctx, valuePath, 'INVALID_TYPE', 'Default value must be an object with a type and an id');
      return;
    }
    checkSnowflake(ctx, [...valuePath, 'id'], value.id, 'default value id', true);
    if (typeof value.type !== 'string' || !allowedTypes.includes(value.type)) {
      report(
        ctx,
        [...valuePath, 'type'],
        'INVALID_DEFAULT_VALUE_TYPE',
        `Default values of a ${label} must have type ${allowedTypes.map((t) => `"${t}"`).join(' or ')}`,
      );
    }
  });
  const count = select.default_values.length;
  if (count > max || (count > 0 && count < min)) {
    report(
      ctx,
      [...path, 'default_values'],
      'DEFAULT_VALUES_OUT_OF_RANGE',
      `The number of default values (${count}) must be between the minimum (${min}) and maximum (${max}) values`,
      'error',
      { limit: count > max ? max : min, actual: count },
    );
  }
};

const validateMediaInto = (
  ctx: Context,
  media: unknown,
  path: IssuePath,
  label: string,
  schemes: readonly Scheme[],
) => {
  if (!isObject(media)) {
    report(ctx, path, 'REQUIRED', `${capitalize(label)} needs media with a URL`);
    return;
  }
  checkUrl(ctx, [...path, 'url'], media.url, `${label} URL`, schemes, { required: true });
};

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v|avi|mkv)(?:[?#]|$)/i;

const validateComponentInto = (ctx: Context, component: unknown, path: IssuePath, placement: Placement) => {
  if (!isObject(component) || typeof component.type !== 'number') {
    report(ctx, path, 'INVALID_TYPE', 'Component must be an object with a numeric type');
    return;
  }
  ctx.componentCount++;
  const type = component.type;
  const label = labelOf(type);

  if (component.id !== undefined && component.id !== null) {
    if (checkInteger(ctx, [...path, 'id'], component.id, 'component id', { min: 0, max: limits.components.idMax })) {
      const id = component.id as number;
      if (id !== 0) {
        if (ctx.componentIds.has(id)) {
          report(ctx, [...path, 'id'], 'DUPLICATE_COMPONENT_ID', `Component id ${id} is already used in this message`);
        } else ctx.componentIds.set(id, path);
      }
    }
  }

  if (MODAL_ONLY.has(type)) {
    report(ctx, path, 'MODAL_ONLY_COMPONENT', `A ${label} can only be used in modals`);
    return;
  }
  if (!(type in COMPONENT_LABELS)) {
    report(ctx, path, 'UNKNOWN_COMPONENT', `Unknown component type ${type}`, 'warning');
    return;
  }
  if (CV2_ONLY.has(type) && !ctx.cv2) {
    report(ctx, path, 'REQUIRES_COMPONENTS_V2', `A ${label} needs the IS_COMPONENTS_V2 flag (Components v2 mode)`);
  } else if (!ALLOWED_IN[placement].has(type)) {
    report(ctx, path, 'INVALID_PARENT', `A ${label} can't be placed in ${PLACEMENT_LABELS[placement]}`);
  }

  const children = (key: string, childPlacement: Placement) => {
    const list = component[key];
    if (!Array.isArray(list)) {
      report(ctx, [...path, key], 'REQUIRED', `${capitalize(label)} needs ${key}`);
      return [] as unknown[];
    }
    list.forEach((child, index) => validateComponentInto(ctx, child, [...path, key, index], childPlacement));
    return list;
  };

  switch (type) {
    case 1: {
      const list = children('components', 'actionRow');
      const buttons = list.filter((child) => isObject(child) && child.type === 2).length;
      const selects = list.filter((child) => isObject(child) && SELECT_TYPES.has(child.type as number)).length;
      if (list.length === 0)
        report(ctx, [...path, 'components'], 'MIN_ITEMS', 'Action row is empty', 'error', { limit: 1, actual: 0 });
      else if (selects > 0 && (buttons > 0 || selects > 1)) {
        report(
          ctx,
          [...path, 'components'],
          'ACTION_ROW_MIXED',
          'An action row holds either up to 5 buttons or a single select menu',
        );
      } else if (buttons > limits.actionRow.buttons) {
        report(
          ctx,
          [...path, 'components'],
          'MAX_ITEMS',
          `Action row has too many buttons (${buttons}/${limits.actionRow.buttons})`,
          'error',
          {
            limit: limits.actionRow.buttons,
            actual: buttons,
          },
        );
      }
      break;
    }
    case 2:
      validateButtonInto(ctx, component, path);
      break;
    case 3:
    case 5:
    case 6:
    case 7:
    case 8:
      validateSelectInto(ctx, component, path);
      break;
    case 9: {
      const list = children('components', 'section');
      checkCount(ctx, [...path, 'components'], list.length, 'section', {
        min: limits.section.minComponents,
        max: limits.section.maxComponents,
      });
      if (component.accessory === undefined || component.accessory === null) {
        report(ctx, [...path, 'accessory'], 'REQUIRED', 'Section needs an accessory (a thumbnail or a button)');
      } else validateComponentInto(ctx, component.accessory, [...path, 'accessory'], 'accessory');
      break;
    }
    case 10: {
      checkText(ctx, [...path, 'content'], component.content, 'text', {
        max: limits.textDisplay.content,
        required: true,
      });
      if (typeof component.content === 'string') ctx.textDisplayCharacters += characterLength(component.content);
      break;
    }
    case 11: {
      validateMediaInto(ctx, component.media, [...path, 'media'], 'thumbnail', ['http', 'attachment']);
      if (
        isObject(component.media) &&
        typeof component.media.url === 'string' &&
        VIDEO_EXTENSION.test(component.media.url)
      ) {
        report(
          ctx,
          [...path, 'media', 'url'],
          'UNSUPPORTED_MEDIA',
          'Thumbnails only support images, not videos',
          'warning',
        );
      }
      checkText(ctx, [...path, 'description'], component.description, 'thumbnail description', {
        max: limits.thumbnail.description,
      });
      checkBoolean(ctx, [...path, 'spoiler'], component.spoiler, 'spoiler');
      break;
    }
    case 12: {
      if (!Array.isArray(component.items)) {
        report(ctx, [...path, 'items'], 'REQUIRED', 'Media gallery needs items');
        break;
      }
      checkCount(ctx, [...path, 'items'], component.items.length, 'media gallery', {
        min: limits.mediaGallery.minItems,
        max: limits.mediaGallery.maxItems,
      });
      component.items.forEach((item, index) => {
        const itemPath = [...path, 'items', index];
        if (!isObject(item)) {
          report(ctx, itemPath, 'INVALID_TYPE', 'Gallery item must be an object');
          return;
        }
        validateMediaInto(ctx, item.media, [...itemPath, 'media'], 'gallery item', ['http', 'attachment']);
        checkText(ctx, [...itemPath, 'description'], item.description, 'gallery item description', {
          max: limits.mediaGallery.description,
        });
        checkBoolean(ctx, [...itemPath, 'spoiler'], item.spoiler, 'spoiler');
      });
      break;
    }
    case 13:
      validateMediaInto(ctx, component.file, [...path, 'file'], 'file', ['attachment']);
      checkBoolean(ctx, [...path, 'spoiler'], component.spoiler, 'spoiler');
      break;
    case 14:
      checkBoolean(ctx, [...path, 'divider'], component.divider, 'divider');
      if (component.spacing !== undefined && !limits.separator.spacing.includes(component.spacing as number)) {
        report(ctx, [...path, 'spacing'], 'INVALID_VALUE', 'Separator spacing must be 1 (small) or 2 (large)');
      }
      break;
    case 17: {
      const list = children('components', 'container');
      if (list.length < limits.container.minComponents) {
        report(ctx, [...path, 'components'], 'MIN_ITEMS', 'Container is empty', 'error', { limit: 1, actual: 0 });
      }
      checkColor(ctx, [...path, 'accent_color'], component.accent_color, 'accent color');
      checkBoolean(ctx, [...path, 'spoiler'], component.spoiler, 'spoiler');
      break;
    }
  }
};

// ---------------------------------------------------------------------------------------------------------
// The message

const ALLOWED_MENTION_TYPES = new Set(['users', 'roles', 'everyone']);

const validateAllowedMentionsInto = (ctx: Context, value: unknown, path: IssuePath) => {
  if (value === undefined || value === null) return;
  if (!isObject(value)) {
    report(ctx, path, 'INVALID_TYPE', 'Allowed mentions must be an object');
    return;
  }
  const parse = value.parse;
  if (parse !== undefined && parse !== null) {
    if (!Array.isArray(parse))
      report(ctx, [...path, 'parse'], 'INVALID_TYPE', 'Allowed mentions `parse` must be a list');
    else {
      parse.forEach((type, index) => {
        if (!ALLOWED_MENTION_TYPES.has(type as string)) {
          report(
            ctx,
            [...path, 'parse', index],
            'INVALID_VALUE',
            'Mention type must be "users", "roles" or "everyone"',
          );
        }
      });
    }
  }
  for (const key of ['users', 'roles'] as const) {
    const list = value[key];
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list)) {
      report(ctx, [...path, key], 'INVALID_TYPE', `Allowed mentions \`${key}\` must be a list of IDs`);
      continue;
    }
    checkCount(ctx, [...path, key], list.length, `allowed ${key}`, { max: limits.allowedMentions[key] });
    list.forEach((id, index) =>
      checkSnowflake(ctx, [...path, key, index], id, key === 'users' ? 'user id' : 'role id'),
    );
    if (Array.isArray(parse) && parse.includes(key) && list.length > 0) {
      report(
        ctx,
        [...path, key],
        'ALLOWED_MENTIONS_CONFLICT',
        `Allowed mentions can't parse all ${key} and list specific ${key} at the same time`,
      );
    }
  }
  checkBoolean(ctx, [...path, 'replied_user'], value.replied_user, 'replied user');
};

const validatePollInto = (ctx: Context, poll: unknown, path: IssuePath) => {
  if (!isObject(poll)) {
    report(ctx, path, 'INVALID_TYPE', 'Poll must be an object');
    return;
  }
  checkText(
    ctx,
    [...path, 'question', 'text'],
    isObject(poll.question) ? poll.question.text : undefined,
    'poll question',
    {
      max: limits.poll.question,
      required: true,
    },
  );
  if (!Array.isArray(poll.answers)) report(ctx, [...path, 'answers'], 'REQUIRED', 'Poll needs answers');
  else {
    checkCount(ctx, [...path, 'answers'], poll.answers.length, 'poll answers', { min: 1, max: limits.poll.answers });
    poll.answers.forEach((answer, index) => {
      const media = isObject(answer) && isObject(answer.poll_media) ? answer.poll_media : undefined;
      checkText(ctx, [...path, 'answers', index, 'poll_media', 'text'], media?.text, 'poll answer', {
        max: limits.poll.answer,
        required: true,
      });
      if (media) checkEmoji(ctx, [...path, 'answers', index, 'poll_media', 'emoji'], media.emoji);
    });
  }
  checkInteger(ctx, [...path, 'duration'], poll.duration, 'poll duration (hours)', {
    min: 1,
    max: limits.poll.duration,
  });
  checkBoolean(ctx, [...path, 'allow_multiselect'], poll.allow_multiselect, 'allow multiselect');
};

const FLAG_NAMES: Record<number, string> = {
  [MessageFlag.SuppressEmbeds]: 'SUPPRESS_EMBEDS',
  [MessageFlag.Ephemeral]: 'EPHEMERAL',
  [MessageFlag.SuppressNotifications]: 'SUPPRESS_NOTIFICATIONS',
  [MessageFlag.IsVoiceMessage]: 'IS_VOICE_MESSAGE',
  [MessageFlag.IsComponentsV2]: 'IS_COMPONENTS_V2',
};

const validateFlagsInto = (ctx: Context, flags: unknown, path: IssuePath) => {
  if (flags === undefined || flags === null) return;
  if (typeof flags !== 'number' || !Number.isInteger(flags) || flags < 0) {
    report(ctx, path, 'INVALID_TYPE', 'Flags must be a non-negative whole number');
    return;
  }
  const allowed = limits.flags[ctx.target];
  const disallowed = flags & ~allowed;
  if (disallowed !== 0) {
    const allowedNames = Object.entries(FLAG_NAMES)
      .filter(([bit]) => (allowed & Number(bit)) !== 0)
      .map(([, name]) => name)
      .join(', ');
    report(ctx, path, 'INVALID_FLAGS', `Only these flags can be set here: ${allowedNames}`, 'error', {
      actual: flags,
    });
  }
};

const validateWebhookParamsInto = (ctx: Context, payload: Json) => {
  const webhookOnly = ['username', 'avatar_url', 'thread_name', 'applied_tags'] as const;
  if (ctx.target !== 'webhook') {
    for (const key of webhookOnly) {
      if (payload[key] !== undefined) ignored(ctx, [key], key, 'only webhooks take it');
    }
    return;
  }
  for (const key of ['nonce', 'enforce_nonce', 'sticker_ids', 'message_reference'] as const) {
    if (payload[key] !== undefined) ignored(ctx, [key], key, "webhooks don't take it");
  }
  const username = payload.username;
  checkText(ctx, ['username'], username, 'username', { max: limits.webhook.username });
  if (typeof username === 'string' && /clyde|discord/i.test(username)) {
    report(ctx, ['username'], 'INVALID_USERNAME', 'Username can\'t contain "clyde" or "discord"');
  }
  checkUrl(ctx, ['avatar_url'], payload.avatar_url, 'avatar URL', ['http']);
  checkText(ctx, ['thread_name'], payload.thread_name, 'thread name', { max: limits.webhook.threadName });
  if (typeof payload.thread_name === 'string' && payload.thread_name !== '' && ctx.options.threadId) {
    report(ctx, ['thread_name'], 'THREAD_CONFLICT', "Thread name can't be used when sending to an existing thread");
  }
  const tags = payload.applied_tags;
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags)) report(ctx, ['applied_tags'], 'INVALID_TYPE', 'Applied tags must be a list of tag IDs');
    else {
      checkCount(ctx, ['applied_tags'], tags.length, 'applied tags', { max: limits.webhook.appliedTags });
      tags.forEach((tag, index) => checkSnowflake(ctx, ['applied_tags', index], tag, 'tag id'));
      if (tags.length > 0 && !payload.thread_name) {
        report(
          ctx,
          ['applied_tags'],
          'IGNORED_FIELD',
          'Applied tags only apply when creating a thread (set a thread name)',
          'warning',
        );
      }
    }
  }
};

const isCV2 = (payload: Json, options: ValidateOptions) =>
  options.mode === 'cv2' ||
  ((options.mode ?? 'auto') === 'auto' &&
    typeof payload.flags === 'number' &&
    (payload.flags & MessageFlag.IsComponentsV2) !== 0);

/**
 * Checks a message payload (Execute Webhook, Create Message or an interaction response) against Discord's
 * rules. Returns every issue found, with JSON paths, codes and, for limits, `limit` and `actual`.
 */
export const validateMessage = (payload: unknown, options: ValidateOptions = {}): ValidationIssue[] => {
  if (!isObject(payload)) {
    return [{ path: [], code: 'INVALID_TYPE', message: 'The message must be a JSON object', severity: 'error' }];
  }
  const ctx = newValidationContext(options, isCV2(payload, options));
  const { cv2 } = ctx;

  if (
    options.mode === 'cv2' &&
    typeof payload.flags === 'number' &&
    (payload.flags & MessageFlag.IsComponentsV2) === 0
  ) {
    report(
      ctx,
      ['flags'],
      'MISSING_COMPONENTS_V2_FLAG',
      'Components v2 messages need the IS_COMPONENTS_V2 flag (32768)',
    );
  }
  validateFlagsInto(ctx, payload.flags, ['flags']);

  const content = payload.content;
  if (cv2 && typeof content === 'string' && content !== '') {
    report(
      ctx,
      ['content'],
      'FORBIDDEN_IN_COMPONENTS_V2',
      "Components v2 messages can't have content; use a text display",
    );
  } else checkText(ctx, ['content'], content, 'content', { max: limits.message.content });
  checkBoolean(ctx, ['tts'], payload.tts, 'TTS');

  let embedCount = 0;
  if (payload.embeds !== undefined && payload.embeds !== null) {
    if (!Array.isArray(payload.embeds)) report(ctx, ['embeds'], 'INVALID_TYPE', 'Embeds must be a list');
    else {
      embedCount = payload.embeds.length;
      if (cv2 && embedCount > 0) {
        report(
          ctx,
          ['embeds'],
          'FORBIDDEN_IN_COMPONENTS_V2',
          "Components v2 messages can't have embeds; use containers",
        );
      }
      checkCount(ctx, ['embeds'], embedCount, 'embeds', { max: limits.message.embeds });
      let total = 0;
      payload.embeds.forEach((embed, index) => {
        validateEmbedInto(ctx, embed, ['embeds', index]);
        total += countEmbedCharacters(embed);
      });
      if (total > limits.embed.total) {
        report(
          ctx,
          ['embeds'],
          'EMBED_TOTAL_LENGTH',
          `Embeds have too many characters in total (${total}/${limits.embed.total})`,
          'error',
          {
            limit: limits.embed.total,
            actual: total,
          },
        );
      }
    }
  }

  let componentCount = 0;
  if (payload.components !== undefined && payload.components !== null) {
    if (!Array.isArray(payload.components)) report(ctx, ['components'], 'INVALID_TYPE', 'Components must be a list');
    else {
      componentCount = payload.components.length;
      payload.components.forEach((component, index) => {
        if (
          !cv2 &&
          isObject(component) &&
          component.type !== 1 &&
          !CV2_ONLY.has(component.type as number) &&
          !MODAL_ONLY.has(component.type as number)
        ) {
          report(
            ctx,
            ['components', index],
            'INVALID_PARENT',
            'Top-level components of a classic message must be action rows',
          );
        }
        validateComponentInto(ctx, component, ['components', index], 'top');
      });
      if (!cv2) {
        checkCount(ctx, ['components'], componentCount, 'action rows', { max: limits.message.classicActionRows });
      } else if (ctx.componentCount > limits.components.total) {
        report(
          ctx,
          ['components'],
          'COMPONENT_COUNT',
          `Too many components (${ctx.componentCount}/${limits.components.total}, nested ones count)`,
          'error',
          {
            limit: limits.components.total,
            actual: ctx.componentCount,
          },
        );
      }
      if (ctx.textDisplayCharacters > limits.textDisplay.total) {
        report(
          ctx,
          ['components'],
          'TEXT_DISPLAY_TOTAL_LENGTH',
          `Text displays have too many characters in total (${ctx.textDisplayCharacters}/${limits.textDisplay.total})`,
          'error',
          { limit: limits.textDisplay.total, actual: ctx.textDisplayCharacters },
        );
      }
    }
  }

  validateAllowedMentionsInto(ctx, payload.allowed_mentions, ['allowed_mentions']);

  if (payload.poll !== undefined && payload.poll !== null) {
    if (cv2) report(ctx, ['poll'], 'FORBIDDEN_IN_COMPONENTS_V2', "Components v2 messages can't have a poll");
    else validatePollInto(ctx, payload.poll, ['poll']);
  }
  if (payload.sticker_ids !== undefined && payload.sticker_ids !== null) {
    if (cv2) report(ctx, ['sticker_ids'], 'FORBIDDEN_IN_COMPONENTS_V2', "Components v2 messages can't have stickers");
    else if (!Array.isArray(payload.sticker_ids))
      report(ctx, ['sticker_ids'], 'INVALID_TYPE', 'Sticker IDs must be a list');
    else checkCount(ctx, ['sticker_ids'], payload.sticker_ids.length, 'stickers', { max: limits.message.stickers });
  }
  if (typeof payload.nonce === 'string')
    checkText(ctx, ['nonce'], payload.nonce, 'nonce', { max: limits.message.nonce });

  const fileNames = new Set(options.files ?? []);
  if (payload.attachments !== undefined && payload.attachments !== null) {
    if (!Array.isArray(payload.attachments)) report(ctx, ['attachments'], 'INVALID_TYPE', 'Attachments must be a list');
    else {
      payload.attachments.forEach((attachment, index) => {
        const path = ['attachments', index];
        if (!isObject(attachment)) {
          report(ctx, path, 'INVALID_TYPE', 'Attachment must be an object');
          return;
        }
        if (attachment.id === undefined || attachment.id === null || attachment.id === '') {
          report(ctx, [...path, 'id'], 'REQUIRED', 'Attachment needs an id (the n of files[n])');
        }
        if (typeof attachment.filename === 'string') fileNames.add(attachment.filename);
        checkText(ctx, [...path, 'description'], attachment.description, 'attachment description', {
          max: limits.message.attachmentDescription,
        });
        checkBoolean(ctx, [...path, 'is_spoiler'], attachment.is_spoiler, 'spoiler');
      });
    }
  }
  if (options.files) {
    for (const name of ctx.attachmentRefs) {
      if (!fileNames.has(name)) {
        report(ctx, [], 'ATTACHMENT_NOT_FOUND', `attachment://${name} doesn't match an uploaded file`, 'warning');
      }
    }
  }
  if (cv2) {
    for (const name of fileNames) {
      if (!ctx.attachmentRefs.has(name)) {
        report(
          ctx,
          ['attachments'],
          'UNREFERENCED_ATTACHMENT',
          `${name} isn't shown: Components v2 messages only show files used by a file, thumbnail or media gallery`,
          'warning',
        );
      }
    }
  }

  validateWebhookParamsInto(ctx, payload);

  // A poll goes alone (ruleSources.pollExclusive: observed, not documented).
  const poll = !cv2 && (options.mode === 'poll' || isObject(payload.poll));
  if (poll) {
    if (!isObject(payload.poll)) report(ctx, ['poll'], 'REQUIRED', 'Add a poll');
    const exclusive = (path: string, what: string) =>
      report(ctx, [path], 'POLL_EXCLUSIVE', `A poll can't be sent with anything else (${what})`);
    if (typeof content === 'string' && content.trim() !== '') exclusive('content', 'content');
    if (Array.isArray(payload.embeds) && payload.embeds.length > 0) exclusive('embeds', 'embeds');
    if (Array.isArray(payload.components) && payload.components.length > 0) exclusive('components', 'components');
    if (fileNames.size > 0 || (Array.isArray(payload.attachments) && payload.attachments.length > 0))
      exclusive('attachments', 'files');
    if (Array.isArray(payload.sticker_ids) && payload.sticker_ids.length > 0) exclusive('sticker_ids', 'stickers');
  }

  const hasContent = !cv2 && typeof content === 'string' && content.trim() !== '';
  const hasFiles = fileNames.size > 0 || (Array.isArray(payload.attachments) && payload.attachments.length > 0);
  const hasPoll = !cv2 && isObject(payload.poll);
  const hasStickers = Array.isArray(payload.sticker_ids) && payload.sticker_ids.length > 0;
  if (
    !poll &&
    (cv2
      ? componentCount === 0
      : !hasContent && embedCount === 0 && componentCount === 0 && !hasFiles && !hasPoll && !hasStickers)
  ) {
    report(
      ctx,
      [],
      'EMPTY_MESSAGE',
      cv2 ? 'Add at least one component' : 'The message needs content, an embed, components, a file or a poll',
    );
  }
  if (!options.restrictions) return ctx.issues;
  const restricted = validateRestrictions(payload, options.restrictions);
  if (restricted.length === 0) return ctx.issues;
  // A builder limit below Discord's replaces Discord's issue for the same thing.
  const replaced = new Set(restricted.map((issue) => `${issue.code}\u0000${issue.path.join('.')}`));
  return [...ctx.issues.filter((issue) => !replaced.has(`${issue.code}\u0000${issue.path.join('.')}`)), ...restricted];
};

// ---------------------------------------------------------------------------------------------------------
// Individual validators (paths are relative to the value unless `path` is given)

const run = (fn: (ctx: Context) => void, options?: ValidateOptions, cv2 = true) => {
  const ctx = newValidationContext(options, cv2);
  fn(ctx);
  return ctx.issues;
};

export const validateEmbed = (embed: unknown, path: IssuePath = []) =>
  run((ctx) => validateEmbedInto(ctx, embed, path));

/** Checks one component and its children. `placement` is where it sits (default: the top level). */
export const validateComponent = (
  component: unknown,
  { path = [], placement = 'top', ...options }: ValidateOptions & { path?: IssuePath; placement?: Placement } = {},
) => run((ctx) => validateComponentInto(ctx, component, path, placement), options, options.mode !== 'classic');

export const validateButton = (button: unknown, path: IssuePath = []) =>
  validateComponent(button, { path, placement: 'actionRow', applicationOwnedWebhook: true });

export const validateSelect = (select: unknown, path: IssuePath = []) =>
  validateComponent(select, { path, placement: 'actionRow', applicationOwnedWebhook: true });

export const validateAllowedMentions = (value: unknown, path: IssuePath = []) =>
  run((ctx) => validateAllowedMentionsInto(ctx, value, path));

export const validatePoll = (poll: unknown, path: IssuePath = []) => run((ctx) => validatePollInto(ctx, poll, path));

// ---------------------------------------------------------------------------------------------------------
// Documents

const documentIssues = new WeakMap<BuilderDocument, { key: string; issues: ValidationIssue[] }>();

/**
 * Validates a builder document (via `toJSON`). Each issue also gets `nodeId`, the deepest node it is about
 * (`ROOT_UID` for the message), and `field`, the dotted property path in that node (`author.name`).
 * Memoized per document and options.
 */
export const validateDocument = (doc: BuilderDocument, options: ValidateOptions = {}): ValidationIssue[] => {
  const key = JSON.stringify(options);
  const cached = documentIssues.get(doc);
  if (cached && cached.key === key) return cached.issues;
  const issues = validateMessage(toJSON(doc), { ...options, mode: doc.mode }).map((issue) => {
    const { uid, rest } = nodeAtPath(doc, issue.path);
    return rest.length > 0 ? { ...issue, nodeId: uid, field: rest.join('.') } : { ...issue, nodeId: uid };
  });
  documentIssues.set(doc, { key, issues });
  return issues;
};

type LimitKind = NodeKind | 'message';

const TEXT_LIMITS: Partial<Record<LimitKind, Record<string, number>>> = {
  message: {
    content: limits.message.content,
    username: limits.webhook.username,
    thread_name: limits.webhook.threadName,
    embeds: limits.message.embeds,
    applied_tags: limits.webhook.appliedTags,
  },
  embed: {
    title: limits.embed.title,
    description: limits.embed.description,
    'author.name': limits.embed.authorName,
    'footer.text': limits.embed.footerText,
    fields: limits.embed.fields,
  },
  embedField: { name: limits.embed.fieldName, value: limits.embed.fieldValue },
  button: { label: limits.button.label, custom_id: limits.components.customId, url: limits.button.url },
  selectOption: {
    label: limits.select.optionLabel,
    value: limits.select.optionValue,
    description: limits.select.optionDescription,
  },
  textDisplay: { content: limits.textDisplay.content },
  thumbnail: { description: limits.thumbnail.description },
  mediaGallery: { items: limits.mediaGallery.maxItems },
  mediaGalleryItem: { description: limits.mediaGallery.description },
  section: { components: limits.section.maxComponents },
  actionRow: { components: limits.actionRow.buttons },
};

const SELECT_LIMITS = {
  custom_id: limits.components.customId,
  placeholder: limits.select.placeholder,
  min_values: limits.select.maxValues,
  max_values: limits.select.maxValues,
};

/** Which restriction limit lowers each `getLimit` field. */
const RESTRICTED_FIELDS: Partial<Record<LimitKind, Record<string, keyof RestrictionLimits>>> = {
  message: { content: 'content', username: 'username', thread_name: 'threadName', embeds: 'embeds' },
  embed: {
    title: 'embedTitle',
    description: 'embedDescription',
    'author.name': 'authorName',
    'footer.text': 'footerText',
    fields: 'embedFields',
  },
  embedField: { name: 'fieldName', value: 'fieldValue' },
  button: { label: 'buttonLabel' },
  textDisplay: { content: 'textDisplay' },
  mediaGallery: { items: 'galleryItems' },
  section: { components: 'sectionComponents' },
  actionRow: { components: 'actionRowButtons' },
  stringSelect: { options: 'selectOptions' },
};

/**
 * The maximum length (or item count) of a node's field, for counters: `getLimit('embed', 'title')` → 256,
 * `getLimit('message', 'content')` → 2000, lowered by `restrictions` when given. `undefined` when the field has
 * no limit.
 */
export const getLimit = (kind: LimitKind, field: string, restrictions?: BuilderRestrictions): number | undefined => {
  const restricted = restrictions ? RESTRICTED_FIELDS[kind]?.[field] : undefined;
  if (restricted) return effectiveLimit(restrictions, restricted);
  if (kind === 'stringSelect' && field === 'options') return limits.select.options;
  if (
    kind === 'stringSelect' ||
    kind === 'userSelect' ||
    kind === 'roleSelect' ||
    kind === 'mentionableSelect' ||
    kind === 'channelSelect'
  ) {
    return (SELECT_LIMITS as Record<string, number>)[field];
  }
  return TEXT_LIMITS[kind]?.[field];
};

export interface DocumentStats {
  contentLength: number;
  contentLimit: number;
  embedCount: number;
  embedLimit: number;
  /** Characters counted towards the 6000 total. */
  embedCharacters: number;
  embedCharacterLimit: number;
  /** All components, nested ones included. */
  componentCount: number;
  /** 40 in Components v2; classic messages are limited by action rows (`actionRowLimit`). */
  componentLimit: number;
  actionRowCount: number;
  actionRowLimit: number;
  textDisplayCharacters: number;
  textDisplayLimit: number;
}

const statsCache = new WeakMap<BuilderDocument, { key: string; stats: DocumentStats }>();

/**
 * Totals for counters (characters across embeds, components, text display characters), with the limits
 * lowered by `restrictions` when given. Memoized.
 */
export const getDocumentStats = (doc: BuilderDocument, restrictions?: BuilderRestrictions): DocumentStats => {
  const key = restrictions ? JSON.stringify(restrictions.limits ?? {}) : '';
  const cached = statsCache.get(doc);
  if (cached && cached.key === key) return cached.stats;
  let textDisplayCharacters = 0;
  const countText = (components: readonly unknown[]) => {
    for (const component of components) {
      if (!isObject(component)) continue;
      if (component.type === 10 && typeof component.content === 'string') {
        textDisplayCharacters += characterLength(component.content);
      }
      if (Array.isArray(component.components)) countText(component.components);
    }
  };
  countText(doc.components);
  const stats: DocumentStats = {
    contentLength: characterLength(doc.content),
    contentLimit: effectiveLimit(restrictions, 'content'),
    embedCount: doc.embeds.length,
    embedLimit: effectiveLimit(restrictions, 'embeds'),
    embedCharacters: doc.embeds.reduce((total, embed) => total + countEmbedCharacters(embed), 0),
    embedCharacterLimit: effectiveLimit(restrictions, 'embedTotal'),
    componentCount: countComponents(doc),
    componentLimit: effectiveLimit(restrictions, 'components'),
    actionRowCount: doc.components.filter((node) => node.type === 1).length,
    actionRowLimit: limits.message.classicActionRows,
    textDisplayCharacters,
    textDisplayLimit: effectiveLimit(restrictions, 'textDisplayTotal'),
  };
  statsCache.set(doc, { key, stats });
  return stats;
};
