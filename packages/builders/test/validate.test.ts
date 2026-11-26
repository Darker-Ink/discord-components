import { describe, expect, it } from 'vitest';
import {
  assignComponentIds,
  characterLength,
  countEmbedCharacters,
  fromJSON,
  getDocumentStats,
  getLimit,
  limits,
  limitSources,
  ROOT_UID,
  validateButton,
  validateDocument,
  validateEmbed,
  validateMessage,
  validateSelect,
  type ValidateOptions,
  type WebhookMessagePayload,
} from '../src/core';
import { codes, errors } from './helpers';

const CV2 = 32768;
const s = (length: number, char = 'a') => char.repeat(length);

/** Error codes at a path (joined with dots). */
const errorsAt = (payload: unknown, path: string, options: ValidateOptions = { applicationOwnedWebhook: true }) =>
  codes(errors(validateMessage(payload, options)).filter((issue) => issue.path.join('.') === path));

const embed = (value: object): WebhookMessagePayload => ({ embeds: [{ description: 'x', ...value }] });
const cv2 = (...components: object[]): WebhookMessagePayload => ({ flags: CV2, components }) as WebhookMessagePayload;
const row = (...components: object[]) => ({ type: 1, components });
const button = (value: object = {}) => ({ type: 2, style: 1, label: 'Go', custom_id: `b${Math.random()}`, ...value });
const text = (content = 'text') => ({ type: 10, content });

describe('limits', () => {
  it('has a source for every value', () => {
    const leaves: string[] = [];
    const visit = (value: unknown, path: string[]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) visit(child, [...path, key]);
      } else leaves.push(path.join('.'));
    };
    visit(limits, []);
    expect(leaves.filter((leaf) => !(leaf in limitSources))).toEqual([]);
  });
});

describe('message', () => {
  it('content: 2000 characters', () => {
    expect(errorsAt({ content: s(2000) }, 'content')).toEqual([]);
    expect(errorsAt({ content: s(2001) }, 'content')).toEqual(['MAX_LENGTH']);
  });

  it('counts characters as code points', () => {
    expect(characterLength('😀😀')).toBe(2);
    expect(errorsAt({ content: s(2000, '😀') }, 'content')).toEqual([]);
  });

  it('reports counters on limit issues', () => {
    const [issue] = validateMessage({ content: s(2021) });
    expect(issue).toMatchObject({ limit: 2000, actual: 2021, message: 'Content is too long (2021/2000)' });
  });

  it('needs something to send', () => {
    expect(errorsAt({}, '')).toEqual(['EMPTY_MESSAGE']);
    expect(errorsAt({ content: '   ' }, '')).toEqual(['EMPTY_MESSAGE']);
    expect(errorsAt({ flags: CV2, components: [] }, '')).toEqual(['EMPTY_MESSAGE']);
    expect(errorsAt({ attachments: [{ id: 0, filename: 'a.png' }] }, '')).toEqual([]);
  });

  it('allows only the flags the endpoint takes', () => {
    expect(errorsAt({ content: 'x', flags: 4 | 4096 }, 'flags')).toEqual([]);
    expect(errorsAt({ content: 'x', flags: 64 }, 'flags')).toEqual(['INVALID_FLAGS']);
    expect(errorsAt({ content: 'x', flags: 64 }, 'flags', { target: 'interaction' })).toEqual([]);
    expect(errorsAt({ content: 'x', flags: 8192 }, 'flags')).toEqual(['INVALID_FLAGS']);
    expect(errorsAt({ content: 'x', flags: 8192 }, 'flags', { target: 'message' })).toEqual([]);
  });

  it('embeds: up to 10', () => {
    const embeds = (n: number) => ({ embeds: Array.from({ length: n }, () => ({ title: 't' })) });
    expect(errorsAt(embeds(10), 'embeds')).toEqual([]);
    expect(errorsAt(embeds(11), 'embeds')).toEqual(['MAX_ITEMS']);
  });

  it('IS_COMPONENTS_V2 forbids content, embeds, polls and stickers', () => {
    const payload = {
      flags: CV2,
      content: 'x',
      embeds: [{ title: 't' }],
      poll: { question: { text: 'q' }, answers: [{ poll_media: { text: 'a' } }] },
      sticker_ids: ['123456789012345678'],
      components: [text()],
    };
    const found = errors(validateMessage(payload)).map((issue) => `${issue.path.join('.')}:${issue.code}`);
    expect(found).toEqual([
      'content:FORBIDDEN_IN_COMPONENTS_V2',
      'embeds:FORBIDDEN_IN_COMPONENTS_V2',
      'poll:FORBIDDEN_IN_COMPONENTS_V2',
      'sticker_ids:FORBIDDEN_IN_COMPONENTS_V2',
    ]);
  });
});

describe('embeds', () => {
  it.each([
    ['title', 256],
    ['description', 4096],
  ])('%s: %i characters', (key, max) => {
    expect(errorsAt(embed({ [key]: s(max) }), `embeds.0.${key}`)).toEqual([]);
    expect(errorsAt(embed({ [key]: s(max + 1) }), `embeds.0.${key}`)).toEqual(['MAX_LENGTH']);
  });

  it('trims whitespace before counting', () => {
    expect(errorsAt(embed({ title: `  ${s(256)}  ` }), 'embeds.0.title')).toEqual([]);
  });

  it('fields: up to 25, name 256, value 1024, both required', () => {
    const fields = (n: number) => Array.from({ length: n }, () => ({ name: 'n', value: 'v' }));
    expect(errorsAt(embed({ fields: fields(25) }), 'embeds.0.fields')).toEqual([]);
    expect(errorsAt(embed({ fields: fields(26) }), 'embeds.0.fields')).toEqual(['MAX_ITEMS']);
    expect(errorsAt(embed({ fields: [{ name: s(256), value: s(1024) }] }), 'embeds.0.fields.0.name')).toEqual([]);
    expect(errorsAt(embed({ fields: [{ name: s(257), value: 'v' }] }), 'embeds.0.fields.0.name')).toEqual([
      'MAX_LENGTH',
    ]);
    expect(errorsAt(embed({ fields: [{ name: 'n', value: s(1025) }] }), 'embeds.0.fields.0.value')).toEqual([
      'MAX_LENGTH',
    ]);
    expect(errorsAt(embed({ fields: [{ name: ' ', value: 'v' }] }), 'embeds.0.fields.0.name')).toEqual(['REQUIRED']);
  });

  it('footer text 2048 and author name 256, required when present', () => {
    expect(errorsAt(embed({ footer: { text: s(2048) } }), 'embeds.0.footer.text')).toEqual([]);
    expect(errorsAt(embed({ footer: { text: s(2049) } }), 'embeds.0.footer.text')).toEqual(['MAX_LENGTH']);
    expect(errorsAt(embed({ author: { name: s(256) } }), 'embeds.0.author.name')).toEqual([]);
    expect(errorsAt(embed({ author: { name: s(257) } }), 'embeds.0.author.name')).toEqual(['MAX_LENGTH']);
    expect(errorsAt(embed({ author: { url: 'https://x.com' } }), 'embeds.0.author.name')).toEqual(['REQUIRED']);
  });

  it('6000 characters across all embeds', () => {
    const atLimit = { embeds: [{ description: s(4000) }, { description: s(2000) }] };
    expect(errorsAt(atLimit, 'embeds')).toEqual([]);
    const over = {
      embeds: [{ description: s(4000) }, { description: s(1000), title: s(100), footer: { text: s(901) } }],
    };
    expect(errorsAt(over, 'embeds')).toEqual(['EMBED_TOTAL_LENGTH']);
    expect(countEmbedCharacters(over.embeds[1])).toBe(2001);
  });

  it('colour: an RGB integer', () => {
    expect(errorsAt(embed({ color: 0 }), 'embeds.0.color')).toEqual([]);
    expect(errorsAt(embed({ color: 0xffffff }), 'embeds.0.color')).toEqual([]);
    expect(errorsAt(embed({ color: 0x1000000 }), 'embeds.0.color')).toEqual(['INVALID_COLOR']);
    expect(errorsAt(embed({ color: -1 }), 'embeds.0.color')).toEqual(['INVALID_COLOR']);
    expect(errorsAt(embed({ color: 1.5 }), 'embeds.0.color')).toEqual(['INVALID_COLOR']);
  });

  it('timestamp: ISO 8601', () => {
    expect(errorsAt(embed({ timestamp: '2025-04-22T17:00:00.000Z' }), 'embeds.0.timestamp')).toEqual([]);
    expect(errorsAt(embed({ timestamp: '2025-04-22T17:00:00+02:00' }), 'embeds.0.timestamp')).toEqual([]);
    expect(errorsAt(embed({ timestamp: 'yesterday' }), 'embeds.0.timestamp')).toEqual(['INVALID_TIMESTAMP']);
    expect(errorsAt(embed({ timestamp: '2025-13-40' }), 'embeds.0.timestamp')).toEqual(['INVALID_TIMESTAMP']);
  });

  it('URL schemes', () => {
    expect(errorsAt(embed({ image: { url: 'attachment://a.png' } }), 'embeds.0.image.url')).toEqual([]);
    expect(errorsAt(embed({ image: { url: 'ftp://a.png' } }), 'embeds.0.image.url')).toEqual(['INVALID_URL']);
    expect(errorsAt(embed({ author: { name: 'a', url: 'attachment://a.png' } }), 'embeds.0.author.url')).toEqual([
      'INVALID_URL',
    ]);
    expect(
      errorsAt(embed({ footer: { text: 'f', icon_url: 'attachment://a.png' } }), 'embeds.0.footer.icon_url'),
    ).toEqual([]);
    expect(errorsAt(embed({ url: 'not a url' }), 'embeds.0.url')).toEqual(['INVALID_URL']);
  });

  it('reports empty embeds and ignored fields', () => {
    expect(codes(validateEmbed({}))).toEqual(['EMPTY_EMBED']);
    const issues = validateEmbed({ title: 't', type: 'video', image: { url: 'https://a.com/a.png', width: 10 } });
    expect(issues.map((issue) => `${issue.severity}:${issue.code}`)).toEqual([
      'warning:IGNORED_FIELD',
      'warning:IGNORED_FIELD',
    ]);
  });
});

describe('Components v2', () => {
  it('counts nested components towards 40', () => {
    // A container (1) with 13 sections of a text display and a button (3 each) = 40.
    const section = () => ({ type: 9, components: [text()], accessory: button() });
    const container = (n: number) => ({ type: 17, components: Array.from({ length: n }, section) });
    expect(errorsAt(cv2(container(13)), 'components')).toEqual([]);
    expect(errorsAt(cv2(container(13), { type: 14 }), 'components')).toEqual(['COMPONENT_COUNT']);
    const [issue] = errors(validateMessage(cv2(container(13), { type: 14 }), { applicationOwnedWebhook: true }));
    expect(issue).toMatchObject({ limit: 40, actual: 41 });
  });

  it('allows only layout and content components at the top level', () => {
    expect(errorsAt(cv2(button()), 'components.0')).toEqual(['INVALID_PARENT']);
    expect(errorsAt(cv2({ type: 11, media: { url: 'https://a.com/a.png' } }), 'components.0')).toEqual([
      'INVALID_PARENT',
    ]);
    expect(errorsAt(cv2({ type: 4, custom_id: 'x', style: 1, label: 'x' }), 'components.0')).toEqual([
      'MODAL_ONLY_COMPONENT',
    ]);
  });

  it('nests containers only at the top level', () => {
    expect(
      errorsAt(cv2({ type: 17, components: [{ type: 17, components: [text()] }] }), 'components.0.components.0'),
    ).toEqual(['INVALID_PARENT']);
    expect(errorsAt(cv2({ type: 17, components: [] }), 'components.0.components')).toEqual(['MIN_ITEMS']);
  });

  it('sections: 1-3 text displays and a thumbnail or button accessory', () => {
    const section = (n: number, accessory?: object) => ({
      type: 9,
      components: Array.from({ length: n }, () => text()),
      ...(accessory ? { accessory } : {}),
    });
    const thumbnail = { type: 11, media: { url: 'https://a.com/a.png' } };
    expect(errorsAt(cv2(section(3, thumbnail)), 'components.0.components')).toEqual([]);
    expect(errorsAt(cv2(section(4, thumbnail)), 'components.0.components')).toEqual(['MAX_ITEMS']);
    expect(errorsAt(cv2(section(0, thumbnail)), 'components.0.components')).toEqual(['MIN_ITEMS']);
    expect(errorsAt(cv2(section(1)), 'components.0.accessory')).toEqual(['REQUIRED']);
    expect(errorsAt(cv2(section(1, { type: 14 })), 'components.0.accessory')).toEqual(['INVALID_PARENT']);
    expect(
      errorsAt(cv2({ type: 9, components: [{ type: 14 }], accessory: thumbnail }), 'components.0.components.0'),
    ).toEqual(['INVALID_PARENT']);
  });

  it('text displays: 4000 each and 4000 in total', () => {
    expect(errorsAt(cv2(text(s(4000))), 'components.0.content')).toEqual([]);
    expect(errorsAt(cv2(text(s(4001))), 'components.0.content')).toEqual(['MAX_LENGTH']);
    expect(errorsAt(cv2(text(s(2000)), text(s(2000))), 'components')).toEqual([]);
    expect(errorsAt(cv2(text(s(2000)), text(s(2001))), 'components')).toEqual(['TEXT_DISPLAY_TOTAL_LENGTH']);
    expect(errorsAt(cv2(text('')), 'components.0.content')).toEqual(['REQUIRED']);
  });

  it('media galleries: 1-10 items, descriptions up to 1024', () => {
    const gallery = (n: number, description?: string) => ({
      type: 12,
      items: Array.from({ length: n }, () => ({ media: { url: 'https://a.com/a.png' }, description })),
    });
    expect(errorsAt(cv2(gallery(10)), 'components.0.items')).toEqual([]);
    expect(errorsAt(cv2(gallery(11)), 'components.0.items')).toEqual(['MAX_ITEMS']);
    expect(errorsAt(cv2(gallery(0)), 'components.0.items')).toEqual(['MIN_ITEMS']);
    expect(errorsAt(cv2(gallery(1, s(1024))), 'components.0.items.0.description')).toEqual([]);
    expect(errorsAt(cv2(gallery(1, s(1025))), 'components.0.items.0.description')).toEqual(['MAX_LENGTH']);
  });

  it('thumbnails: image URL, description up to 1024; files: attachment:// only', () => {
    const section = (thumbnail: object) =>
      cv2({ type: 9, components: [text()], accessory: { type: 11, ...thumbnail } });
    expect(errorsAt(section({ media: { url: '' } }), 'components.0.accessory.media.url')).toEqual(['REQUIRED']);
    expect(
      errorsAt(
        section({ media: { url: 'https://a.com/a.png' }, description: s(1025) }),
        'components.0.accessory.description',
      ),
    ).toEqual(['MAX_LENGTH']);
    const warnings = validateMessage(section({ media: { url: 'https://a.com/clip.mp4' } }));
    expect(codes(warnings)).toContain('UNSUPPORTED_MEDIA');
    expect(errorsAt(cv2({ type: 13, file: { url: 'attachment://a.txt' } }), 'components.0.file.url')).toEqual([]);
    expect(errorsAt(cv2({ type: 13, file: { url: 'https://a.com/a.txt' } }), 'components.0.file.url')).toEqual([
      'INVALID_URL',
    ]);
  });

  it('separators: spacing 1 or 2', () => {
    expect(errorsAt(cv2({ type: 14, spacing: 2 }), 'components.0.spacing')).toEqual([]);
    expect(errorsAt(cv2({ type: 14, spacing: 3 }), 'components.0.spacing')).toEqual(['INVALID_VALUE']);
  });

  it('containers: accent colour and spoiler', () => {
    const container = (value: object) => cv2({ type: 17, components: [text()], ...value });
    expect(errorsAt(container({ accent_color: null, spoiler: true }), 'components.0.accent_color')).toEqual([]);
    expect(errorsAt(container({ accent_color: 0x1000000 }), 'components.0.accent_color')).toEqual(['INVALID_COLOR']);
    expect(errorsAt(container({ spoiler: 'yes' }), 'components.0.spoiler')).toEqual(['INVALID_TYPE']);
  });

  it('needs the flag for v2 components', () => {
    expect(errorsAt({ components: [text()] }, 'components.0')).toEqual(['REQUIRES_COMPONENTS_V2']);
  });

  it('reports files not shown by any component', () => {
    const issues = validateMessage(
      { ...cv2(text()), attachments: [{ id: 0, filename: 'a.png' }] },
      { applicationOwnedWebhook: true },
    );
    expect(issues.map((issue) => `${issue.severity}:${issue.code}`)).toEqual(['warning:UNREFERENCED_ATTACHMENT']);
  });

  it('checks attachment:// references against the uploaded files', () => {
    const payload = cv2({ type: 12, items: [{ media: { url: 'attachment://missing.png' } }] });
    expect(codes(validateMessage(payload, { files: ['other.png'], applicationOwnedWebhook: true }))).toContain(
      'ATTACHMENT_NOT_FOUND',
    );
  });
});

describe('component ids and custom ids', () => {
  it('ids: unique 32-bit integers, 0 means unset', () => {
    expect(
      errorsAt(
        cv2({ ...text(), id: 1 }, { ...text(), id: 2 }, { ...text(), id: 0 }, { ...text(), id: 0 }),
        'components.1.id',
      ),
    ).toEqual([]);
    expect(errorsAt(cv2({ ...text(), id: 5 }, { ...text(), id: 5 }), 'components.1.id')).toEqual([
      'DUPLICATE_COMPONENT_ID',
    ]);
    expect(errorsAt(cv2({ ...text(), id: 2 ** 31 }), 'components.0.id')).toEqual(['OUT_OF_RANGE']);
    expect(errorsAt(cv2({ ...text(), id: 1.5 }), 'components.0.id')).toEqual(['INVALID_TYPE']);
  });

  it('custom_id: 1-100 characters, unique in the message', () => {
    expect(errorsAt(cv2(row(button({ custom_id: s(100) }))), 'components.0.components.0.custom_id')).toEqual([]);
    expect(errorsAt(cv2(row(button({ custom_id: s(101) }))), 'components.0.components.0.custom_id')).toEqual([
      'MAX_LENGTH',
    ]);
    const duplicate = cv2(row(button({ custom_id: 'same' })), {
      type: 9,
      components: [text()],
      accessory: button({ custom_id: 'same' }),
    });
    expect(errorsAt(duplicate, 'components.1.accessory.custom_id')).toEqual(['DUPLICATE_CUSTOM_ID']);
  });
});

describe('action rows', () => {
  it('up to 5 buttons or a single select', () => {
    const select = { type: 5, custom_id: 'u' };
    expect(errorsAt(cv2(row(...Array.from({ length: 5 }, () => button()))), 'components.0.components')).toEqual([]);
    expect(errorsAt(cv2(row(...Array.from({ length: 6 }, () => button()))), 'components.0.components')).toEqual([
      'MAX_ITEMS',
    ]);
    expect(errorsAt(cv2(row(button(), select)), 'components.0.components')).toEqual(['ACTION_ROW_MIXED']);
    expect(errorsAt(cv2(row()), 'components.0.components')).toEqual(['MIN_ITEMS']);
    expect(errorsAt(cv2(row(text())), 'components.0.components.0')).toEqual(['INVALID_PARENT']);
  });

  it('classic messages: up to 5 action rows, nothing else', () => {
    const rows = (n: number) => ({ content: 'x', components: Array.from({ length: n }, () => row(button())) });
    expect(errorsAt(rows(5), 'components')).toEqual([]);
    expect(errorsAt(rows(6), 'components')).toEqual(['MAX_ITEMS']);
  });
});

describe('buttons', () => {
  const at = (value: object, field = '') =>
    codes(errors(validateButton(button(value))).filter((issue) => issue.path.join('.') === field));

  it('label: up to 80', () => {
    expect(at({ label: s(80) }, 'label')).toEqual([]);
    expect(at({ label: s(81) }, 'label')).toEqual(['MAX_LENGTH']);
  });

  it('needs a label or an emoji', () => {
    expect(at({ label: undefined }, 'label')).toEqual(['REQUIRED']);
    expect(at({ label: undefined, emoji: { name: '🔥' } }, 'label')).toEqual([]);
    expect(at({ emoji: {} }, 'emoji')).toEqual(['REQUIRED']);
  });

  it('non-link buttons need a custom_id and no url or sku_id', () => {
    expect(at({ custom_id: undefined }, 'custom_id')).toEqual(['REQUIRED']);
    expect(at({ url: 'https://a.com' }, 'url')).toEqual(['FORBIDDEN_FIELD']);
    expect(at({ sku_id: '123456789012345678' }, 'sku_id')).toEqual(['FORBIDDEN_FIELD']);
  });

  it('link buttons need a url (512 max) and no custom_id', () => {
    const link = (value: object) => ({ style: 5, custom_id: undefined, url: 'https://a.com', ...value });
    expect(at(link({}), 'url')).toEqual([]);
    expect(at(link({ url: undefined }), 'url')).toEqual(['REQUIRED']);
    expect(at(link({ url: `https://a.com/${s(498)}` }), 'url')).toEqual([]);
    expect(at(link({ url: `https://a.com/${s(499)}` }), 'url')).toEqual(['MAX_LENGTH']);
    expect(at(link({ url: 'discord://-/channels/1/2' }), 'url')).toEqual([]);
    expect(at(link({ custom_id: 'x' }), 'custom_id')).toEqual(['FORBIDDEN_FIELD']);
  });

  it('premium buttons need a sku_id and nothing else', () => {
    const premium = { style: 6, custom_id: undefined, label: undefined, sku_id: '123456789012345678' };
    expect(errors(validateButton(button(premium)))).toEqual([]);
    expect(at({ ...premium, sku_id: undefined }, 'sku_id')).toEqual(['REQUIRED']);
    expect(at({ ...premium, label: 'Buy' }, 'label')).toEqual(['FORBIDDEN_FIELD']);
    expect(at({ ...premium, emoji: { name: '💎' } }, 'emoji')).toEqual(['FORBIDDEN_FIELD']);
  });

  it('webhooks not owned by an app can only send non-interactive components', () => {
    const payload = cv2(row(button()), row(button({ style: 5, custom_id: undefined, url: 'https://a.com' })));
    const owned = (value?: boolean) =>
      validateMessage(payload, { applicationOwnedWebhook: value })
        .filter((issue) => issue.code === 'INTERACTIVE_COMPONENT_IN_WEBHOOK')
        .map((issue) => `${issue.path.join('.')}:${issue.severity}`);
    expect(owned(false)).toEqual(['components.0.components.0:error']);
    expect(owned(undefined)).toEqual(['components.0.components.0:warning']);
    expect(owned(true)).toEqual([]);
    expect(codes(validateMessage(payload, { target: 'message' }))).not.toContain('INTERACTIVE_COMPONENT_IN_WEBHOOK');
  });
});

describe('selects', () => {
  const option = (n: number) => ({ label: `Option ${n}`, value: `v${n}` });
  const stringSelect = (value: object) => ({ type: 3, custom_id: 's', options: [option(1)], ...value });
  const at = (select: object, field = '') =>
    codes(errors(validateSelect(select)).filter((issue) => issue.path.join('.') === field));

  it('options: 1-25, label/value/description up to 100, unique values', () => {
    const options = (n: number) => Array.from({ length: n }, (_, i) => option(i));
    expect(at(stringSelect({ options: options(25) }), 'options')).toEqual([]);
    expect(at(stringSelect({ options: options(26) }), 'options')).toEqual(['MAX_ITEMS']);
    expect(at(stringSelect({ options: [] }), 'options')).toEqual(['MIN_ITEMS']);
    for (const key of ['label', 'value', 'description']) {
      expect(at(stringSelect({ options: [{ ...option(1), [key]: s(100) }] }), `options.0.${key}`)).toEqual([]);
      expect(at(stringSelect({ options: [{ ...option(1), [key]: s(101) }] }), `options.0.${key}`)).toEqual([
        'MAX_LENGTH',
      ]);
    }
    expect(at(stringSelect({ options: [option(1), option(1)] }), 'options.1.value')).toEqual([
      'DUPLICATE_OPTION_VALUE',
    ]);
  });

  it('placeholder: up to 150', () => {
    expect(at(stringSelect({ placeholder: s(150) }), 'placeholder')).toEqual([]);
    expect(at(stringSelect({ placeholder: s(151) }), 'placeholder')).toEqual(['MAX_LENGTH']);
  });

  it('min_values 0-25, max_values 1-25, min <= max', () => {
    const user = (value: object) => ({ type: 5, custom_id: 'u', ...value });
    expect(at(user({ min_values: 0, max_values: 25 }), 'min_values')).toEqual([]);
    expect(at(user({ min_values: 26 }), 'min_values')).toEqual(['OUT_OF_RANGE']);
    expect(at(user({ max_values: 0 }), 'max_values')).toEqual(['OUT_OF_RANGE']);
    expect(at(user({ max_values: 26 }), 'max_values')).toEqual(['OUT_OF_RANGE']);
    expect(at(user({ min_values: 3, max_values: 2 }), 'min_values')).toEqual(['MIN_GREATER_THAN_MAX']);
  });

  it('string select max_values and defaults fit the options', () => {
    expect(at(stringSelect({ max_values: 2 }), 'max_values')).toEqual(['MAX_VALUES_EXCEEDS_OPTIONS']);
    const defaults = {
      options: [
        { ...option(1), default: true },
        { ...option(2), default: true },
      ],
    };
    expect(at(stringSelect(defaults), 'options')).toEqual(['TOO_MANY_DEFAULTS']);
    expect(at(stringSelect({ ...defaults, max_values: 2 }), 'options')).toEqual([]);
  });

  it('default_values: the right types, within min/max', () => {
    const id = '123456789012345678';
    const select = (type: number, values: object[], extra: object = {}) => ({
      type,
      custom_id: 'x',
      default_values: values,
      ...extra,
    });
    expect(at(select(5, [{ type: 'user', id }]), 'default_values')).toEqual([]);
    expect(at(select(5, [{ type: 'role', id }]), 'default_values.0.type')).toEqual(['INVALID_DEFAULT_VALUE_TYPE']);
    expect(at(select(7, [{ type: 'role', id }]), 'default_values.0.type')).toEqual([]);
    expect(at(select(8, [{ type: 'channel', id: 'abc' }]), 'default_values.0.id')).toEqual(['INVALID_SNOWFLAKE']);
    expect(
      at(
        select(6, [
          { type: 'role', id },
          { type: 'role', id },
        ]),
        'default_values',
      ),
    ).toEqual(['DEFAULT_VALUES_OUT_OF_RANGE']);
    expect(
      at(
        select(
          6,
          [
            { type: 'role', id },
            { type: 'role', id },
          ],
          { max_values: 2 },
        ),
        'default_values',
      ),
    ).toEqual([]);
  });
});

describe('webhook params and allowed mentions', () => {
  it('username: up to 80, no "clyde" or "discord"', () => {
    expect(errorsAt({ content: 'x', username: s(80) }, 'username')).toEqual([]);
    expect(errorsAt({ content: 'x', username: s(81) }, 'username')).toEqual(['MAX_LENGTH']);
    expect(errorsAt({ content: 'x', username: 'My Discord Bot' }, 'username')).toEqual(['INVALID_USERNAME']);
  });

  it('avatar_url, thread_name and applied_tags', () => {
    expect(errorsAt({ content: 'x', avatar_url: 'nope' }, 'avatar_url')).toEqual(['INVALID_URL']);
    expect(errorsAt({ content: 'x', thread_name: s(100) }, 'thread_name')).toEqual([]);
    expect(errorsAt({ content: 'x', thread_name: s(101) }, 'thread_name')).toEqual(['MAX_LENGTH']);
    expect(errorsAt({ content: 'x', thread_name: 't' }, 'thread_name', { threadId: '123456789012345678' })).toEqual([
      'THREAD_CONFLICT',
    ]);
    const tags = (n: number) => Array.from({ length: n }, () => '123456789012345678');
    expect(errorsAt({ content: 'x', thread_name: 't', applied_tags: tags(5) }, 'applied_tags')).toEqual([]);
    expect(errorsAt({ content: 'x', thread_name: 't', applied_tags: tags(6) }, 'applied_tags')).toEqual(['MAX_ITEMS']);
  });

  it('allowed_mentions: parse is exclusive with lists of the same type', () => {
    const id = '123456789012345678';
    expect(
      errorsAt({ content: 'x', allowed_mentions: { parse: ['roles'], users: [id] } }, 'allowed_mentions.users'),
    ).toEqual([]);
    expect(
      errorsAt({ content: 'x', allowed_mentions: { parse: ['users'], users: [id] } }, 'allowed_mentions.users'),
    ).toEqual(['ALLOWED_MENTIONS_CONFLICT']);
    expect(errorsAt({ content: 'x', allowed_mentions: { parse: ['all'] } }, 'allowed_mentions.parse.0')).toEqual([
      'INVALID_VALUE',
    ]);
    const users = (n: number) => Array.from({ length: n }, () => id);
    expect(errorsAt({ content: 'x', allowed_mentions: { users: users(101) } }, 'allowed_mentions.users')).toEqual([
      'MAX_ITEMS',
    ]);
  });

  it('polls: question 300, 1-10 answers of 55', () => {
    const poll = (question: string, answers: string[]) => ({
      poll: { question: { text: question }, answers: answers.map((text) => ({ poll_media: { text } })) },
    });
    expect(errors(validateMessage(poll(s(300), [s(55)])))).toEqual([]);
    expect(errorsAt(poll(s(301), ['a']), 'poll.question.text')).toEqual(['MAX_LENGTH']);
    expect(errorsAt(poll('q', [s(56)]), 'poll.answers.0.poll_media.text')).toEqual(['MAX_LENGTH']);
    expect(
      errorsAt(
        poll(
          'q',
          Array.from({ length: 11 }, () => 'a'),
        ),
        'poll.answers',
      ),
    ).toEqual(['MAX_ITEMS']);
  });
});

describe('documents', () => {
  it('maps issues to the deepest node and a dotted field', () => {
    const doc = fromJSON({
      content: s(2001),
      embeds: [{ title: 't', author: { name: s(257) }, fields: [{ name: 'n', value: '' }] }],
    });
    const issues = validateDocument(doc);
    const embed = doc.embeds[0];
    expect(issues.map((issue) => [issue.nodeId, issue.field, issue.code])).toEqual([
      [ROOT_UID, 'content', 'MAX_LENGTH'],
      [embed.uid, 'author.name', 'MAX_LENGTH'],
      [embed.fields[0].uid, 'value', 'REQUIRED'],
    ]);
  });

  it('maps option and gallery item issues to those nodes', () => {
    const doc = fromJSON(
      cv2(
        { type: 12, items: [{ media: { url: 'bad' } }] },
        row({ type: 3, custom_id: 's', options: [{ label: s(101), value: 'v' }] }),
      ),
    );
    const gallery = doc.components[0] as { items: { uid: string }[] };
    const select = (doc.components[1] as { components: { options: { uid: string }[] }[] }).components[0];
    const issues = errors(validateDocument(doc, { applicationOwnedWebhook: true }));
    expect(issues.map((issue) => [issue.nodeId, issue.field])).toEqual([
      [gallery.items[0].uid, 'media.url'],
      [select.options[0].uid, 'label'],
    ]);
  });

  it('is memoised per document', () => {
    const doc = fromJSON({ content: 'x' });
    expect(validateDocument(doc)).toBe(validateDocument(doc));
  });

  it('getLimit and stats for counters', () => {
    expect(getLimit('embed', 'title')).toBe(256);
    expect(getLimit('embed', 'author.name')).toBe(256);
    expect(getLimit('message', 'content')).toBe(2000);
    expect(getLimit('message', 'username')).toBe(80);
    expect(getLimit('button', 'label')).toBe(80);
    expect(getLimit('userSelect', 'placeholder')).toBe(150);
    expect(getLimit('separator', 'spacing')).toBeUndefined();
    const stats = getDocumentStats(fromJSON({ embeds: [{ title: 'abc', description: '  de  ' }] }));
    expect(stats).toMatchObject({ embedCharacters: 5, embedCharacterLimit: 6000, embedCount: 1 });
  });

  it('validates a large document fast enough for every keystroke', () => {
    const doc = fromJSON({
      embeds: Array.from({ length: 10 }, () => ({
        title: s(200),
        description: s(500),
        fields: Array.from({ length: 25 }, () => ({ name: 'name', value: 'value' })),
      })),
      components: Array.from({ length: 5 }, () => row(...Array.from({ length: 5 }, () => button()))),
    });
    const start = performance.now();
    for (let i = 0; i < 100; i++) validateMessage(JSON.parse(JSON.stringify({ ...doc, uid: undefined })));
    expect((performance.now() - start) / 100).toBeLessThan(5);
  });
});

describe('assignComponentIds', () => {
  it('numbers components in order, skipping ids in use', () => {
    const components = [
      { type: 10, content: 'a' },
      {
        type: 9,
        id: 2,
        components: [{ type: 10, content: 'b' }],
        accessory: { type: 2, style: 1, custom_id: 'x', label: 'x' },
      },
      { type: 17, id: 0, components: [{ type: 14 }] },
    ];
    const result = assignComponentIds(components);
    expect(result).toEqual([
      { type: 10, content: 'a', id: 1 },
      {
        type: 9,
        id: 2,
        components: [{ type: 10, content: 'b', id: 3 }],
        accessory: { type: 2, style: 1, custom_id: 'x', label: 'x', id: 4 },
      },
      { type: 17, id: 5, components: [{ type: 14, id: 6 }] },
    ]);
    expect(components[0]).not.toHaveProperty('id');
    expect(errors(validateMessage({ flags: CV2, components: result }, { applicationOwnedWebhook: true }))).toEqual([]);
  });
});
