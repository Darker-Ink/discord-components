import { z } from 'zod';
import { THEMES, type Limits, type PreviewOptions } from '../shared/api';
import { formatIssues, int, messageSchema, NestingError, normalizeMessages, scrubUrls } from '../shared/messages';
import { HttpError } from './http';

const isOrigin = (value: string) => {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin === value;
  } catch {
    return false;
  }
};

const options = z
  .strictObject({
    interactive: z.boolean().default(false),
    interactions: z.boolean().default(false),
    allowedOrigins: z
      .array(
        z
          .string()
          .max(200)
          .refine(isOrigin, 'Expected an origin like https://example.com (scheme, host and port only)'),
      )
      .min(1)
      .max(10)
      .nullish(),
    title: z.string().trim().max(100).nullish(),
    theme: z.enum(THEMES).nullish(),
  })
  .default({ interactive: false, interactions: false });

const createBody = (limits: Limits) => {
  const messages = z
    .array(messageSchema)
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
  new HttpError(400, 'invalid_body', 'Request body is invalid.', formatIssues(error, formatPath));

const parse = <T>(schema: z.ZodType<T>, value: unknown, formatPath = (path: string) => path): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(result.error, formatPath);
  return result.data;
};

const scrub = (value: unknown) => {
  try {
    return scrubUrls(value) as unknown[];
  } catch (error) {
    if (error instanceof NestingError) throw new HttpError(400, 'invalid_body', error.message);
    throw error;
  }
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
    interactions: body.options.interactions,
    allowedOrigins: body.options.allowedOrigins ?? null,
    title: body.options.title || null,
    theme: body.options.theme ?? null,
  };
  return {
    messages: scrub(normalizeMessages(messages, now)),
    secret: body.secret,
    options: previewOptions,
    expiresIn: body.expiresIn ?? limits.defaultPreviewTtlSeconds,
  };
};

export const parseSignBody = (value: unknown, limits: Limits) =>
  parse(signBody(limits), value).expiresIn ?? limits.defaultSignedUrlTtlSeconds;

export const parseKeyBody = (value: unknown) => parse(keyBody, value).name || null;
