import { z } from 'zod';
import { THEMES, type Limits, type PreviewOptions } from '../shared/api';
import { HttpError } from './http';

// Messages are validated in the Discord API format `<Message>` renders: the fields it reads are type-checked
// (with Discord's own length caps), anything else is passed through untouched and only ever rendered as text.

const URL_SCHEMES = new Set(['http:', 'https:', 'attachment:']);

export const isSafeUrl = (value: string) => {
  try {
    return URL_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

const snowflake = z.string().regex(/^\d{1,20}$/, 'Expected a snowflake (a numeric string)');
const url = z.string().max(2048).refine(isSafeUrl, 'Expected an absolute http(s) URL');
const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO 8601 timestamp');
const int = (min = 0, max = Number.MAX_SAFE_INTEGER) => z.int().min(min).max(max);

const user = z.looseObject({
  id: snowflake,
  username: z.string().min(1).max(80),
  global_name: z.string().max(80).nullish(),
  discriminator: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  // An avatar hash, put into a cdn.discordapp.com path.
  avatar: z
    .string()
    .regex(/^[\w]{1,64}$/, 'Expected an avatar hash')
    .nullish(),
  avatar_url: url.optional(),
  bot: z.boolean().optional(),
  system: z.boolean().optional(),
});

const media = z.looseObject({
  url,
  proxy_url: url.optional(),
  width: int().nullish(),
  height: int().nullish(),
  content_type: z.string().max(255).nullish(),
});

const embed = z.looseObject({
  type: z.string().max(32).optional(),
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  url: url.optional(),
  timestamp: timestamp.optional(),
  color: int(0, 0xffffff).nullish(),
  footer: z
    .looseObject({ text: z.string().max(2048), icon_url: url.optional(), proxy_icon_url: url.optional() })
    .optional(),
  image: media.optional(),
  thumbnail: media.optional(),
  video: media.partial({ url: true }).optional(),
  provider: z.looseObject({ name: z.string().max(256).optional(), url: url.optional() }).optional(),
  author: z
    .looseObject({
      name: z.string().max(256),
      url: url.optional(),
      icon_url: url.optional(),
      proxy_icon_url: url.optional(),
    })
    .optional(),
  fields: z
    .array(z.looseObject({ name: z.string().max(256), value: z.string().max(1024), inline: z.boolean().optional() }))
    .max(25)
    .optional(),
});

const attachment = z.looseObject({
  id: z.string().max(32).optional(),
  filename: z.string().min(1).max(1024),
  url,
  proxy_url: url.optional(),
  size: int().default(0),
  width: int().nullish(),
  height: int().nullish(),
  content_type: z.string().max(255).optional(),
  description: z.string().max(1024).optional(),
});

interface Component {
  type: number;
  [key: string]: unknown;
}

const component: z.ZodType<Component> = z.lazy(() =>
  z.looseObject({
    type: int(1, 255),
    id: int().optional(),
    url: url.optional(),
    label: z.string().max(80).optional(),
    content: z.string().max(4000).optional(),
    components: z.array(component).max(40).optional(),
    accessory: component.optional(),
    media: media.optional(),
    items: z
      .array(z.looseObject({ media, description: z.string().max(1024).nullish() }))
      .max(10)
      .optional(),
    file: media.partial({ url: true }).extend({ url: url.optional() }).optional(),
  }),
);

const reaction = z.looseObject({
  count: int(),
  me: z.boolean().optional(),
  emoji: z.looseObject({
    id: snowflake.nullish(),
    name: z.string().max(64).nullish(),
    animated: z.boolean().optional(),
  }),
});

const messageShape = {
  id: snowflake.optional(),
  channel_id: snowflake.optional(),
  author: user,
  content: z.string().max(4000).default(''),
  timestamp: timestamp.optional(),
  edited_timestamp: timestamp.nullish(),
  type: int(0, 255).default(0),
  flags: int().default(0),
  mentions: z.array(user).max(100).optional(),
  mention_roles: z.array(snowflake).max(100).optional(),
  attachments: z.array(attachment).max(10).optional(),
  embeds: z.array(embed).max(10).optional(),
  reactions: z.array(reaction).max(20).optional(),
  components: z.array(component).max(40).optional(),
  message_reference: z
    .looseObject({
      message_id: snowflake.optional(),
      channel_id: snowflake.optional(),
      guild_id: snowflake.optional(),
    })
    .optional(),
};

const referencedMessage = z.looseObject(messageShape);

const message = z.looseObject({
  ...messageShape,
  referenced_message: referencedMessage.nullish(),
  message_snapshots: z
    .array(z.looseObject({ message: referencedMessage.partial({ author: true }) }))
    .max(1)
    .optional(),
});

export type ValidMessage = z.infer<typeof message>;

const options = z
  .strictObject({
    interactive: z.boolean().default(false),
    title: z.string().trim().max(100).nullish(),
    theme: z.enum(THEMES).nullish(),
  })
  .default({ interactive: false });

const createBody = (limits: Limits) => {
  const messages = z
    .array(message)
    .min(1, 'A preview needs at least one message')
    .max(limits.maxMessagesPerPreview, `A preview holds at most ${limits.maxMessagesPerPreview} messages`);
  return z.strictObject({
    data: z.strictObject({ messages }, 'Expected an array of messages or `{ messages: [...] }`'),
    secret: z.boolean().default(false),
    options,
    expiresIn: int(60, limits.maxPreviewTtlSeconds).optional(),
  });
};

const signBody = (limits: Limits) =>
  z.strictObject({ expiresIn: int(1, limits.maxSignedUrlTtlSeconds).optional() }).default({});

const keyBody = z.strictObject({ name: z.string().trim().max(64).optional() }).default({});

const invalid = (error: z.ZodError, formatPath: (path: string) => string) =>
  new HttpError(
    400,
    'invalid_body',
    'Request body is invalid.',
    error.issues.slice(0, 50).map((issue) => ({ path: formatPath(issue.path.join('.')), message: issue.message })),
  );

const parse = <T>(schema: z.ZodType<T>, value: unknown, formatPath = (path: string) => path): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(result.error, formatPath);
  return result.data;
};

const MAX_DEPTH = 12;

// Drops any other `*url` value with a scheme a browser could run, wherever it sits in passthrough data.
const scrubUrls = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) throw new HttpError(400, 'invalid_body', `Data is nested deeper than ${MAX_DEPTH} levels.`);
  if (Array.isArray(value)) return value.map((item) => scrubUrls(item, depth + 1));
  if (value == null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/url$/i.test(key) && typeof item === 'string' && !isSafeUrl(item)) continue;
    out[key] = scrubUrls(item, depth + 1);
  }
  return out;
};

// Unfurled media Discord sends back carries a proxy URL and a loading state; hand-written payloads usually don't.
const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

/** The media type a file name or URL path suggests, which Discord's own payloads would state. */
const guessContentType = (name: string | undefined) => {
  if (name == null) return undefined;
  let path = name;
  try {
    path = new URL(name).pathname;
  } catch {
    // A plain file name.
  }
  return CONTENT_TYPES[/\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? ''];
};

const fillUnfurledMedia = (media: unknown) => {
  if (media == null || typeof media !== 'object') return media;
  const item = media as { url?: string; proxy_url?: string; loading_state?: number; content_type?: string | null };
  return {
    ...item,
    proxy_url: item.proxy_url ?? item.url,
    content_type: item.content_type ?? guessContentType(item.url),
    loading_state: item.loading_state ?? 2,
  };
};

const fillComponents = (components: Component[] | undefined): Component[] | undefined =>
  components?.map((node) => {
    const out: Component = { ...node };
    if (node.media != null) out.media = fillUnfurledMedia(node.media);
    if (node.file != null) out.file = fillUnfurledMedia(node.file);
    if (Array.isArray(node.items)) {
      out.items = node.items.map((item: { media?: unknown }) => ({ ...item, media: fillUnfurledMedia(item.media) }));
    }
    if (Array.isArray(node.components)) out.components = fillComponents(node.components as Component[]);
    if (node.accessory != null) out.accessory = fillComponents([node.accessory as Component])?.[0];
    return out;
  });

// Fills what the renderer needs but transcripts often leave out, and orders messages chronologically.
const normalizeMessages = (messages: ValidMessage[], now: Date) => {
  const fallbackBase = BigInt(now.getTime() - 1420070400000) << 22n;
  const filled = messages.map((item, index) => {
    const fill = <M extends z.infer<typeof referencedMessage>>(m: M, i: number) => ({
      ...m,
      id: m.id ?? String(fallbackBase + BigInt(i)),
      channel_id: m.channel_id ?? '0',
      timestamp: m.timestamp ?? now.toISOString(),
      edited_timestamp: m.edited_timestamp ?? null,
      ...(m.components != null ? { components: fillComponents(m.components) } : {}),
      ...(m.attachments != null
        ? {
            attachments: m.attachments.map((a, i) => ({
              ...a,
              id: a.id ?? String(i),
              content_type: a.content_type ?? guessContentType(a.filename),
            })),
          }
        : {}),
    });
    const base = fill(item, index);
    return item.referenced_message != null
      ? { ...base, referenced_message: fill(item.referenced_message, messages.length + index) }
      : base;
  });
  return filled
    .map((item, index) => ({ item, index, time: Date.parse(item.timestamp) }))
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map(({ item }) => item);
};

export const parseCreateBody = (value: unknown, limits: Limits, now: Date) => {
  if (value == null) throw new HttpError(400, 'invalid_body', 'Send a JSON body with `data`.');
  // `data` may be the array itself; validate both forms as `{ messages }` but report paths as sent.
  const bare = typeof value === 'object' && Array.isArray((value as { data?: unknown }).data);
  const input = bare ? { ...value, data: { messages: (value as { data: unknown }).data } } : value;
  const body = parse(createBody(limits), input, (path) => (bare ? path.replace(/^data\.messages/, 'data') : path));
  const messages = body.data.messages;
  const previewOptions: PreviewOptions = {
    interactive: body.options.interactive,
    title: body.options.title || null,
    theme: body.options.theme ?? null,
  };
  return {
    messages: scrubUrls(normalizeMessages(messages, now)) as unknown[],
    secret: body.secret,
    options: previewOptions,
    expiresIn: body.expiresIn ?? limits.defaultPreviewTtlSeconds,
  };
};

export const parseSignBody = (value: unknown, limits: Limits) =>
  parse(signBody(limits), value).expiresIn ?? limits.defaultSignedUrlTtlSeconds;

export const parseKeyBody = (value: unknown) => parse(keyBody, value).name || null;
