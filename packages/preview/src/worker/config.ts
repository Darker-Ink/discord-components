import type { Limits } from '../shared/api';

// Fallbacks for vars missing from the environment; wrangler.jsonc sets the same values.
const DEFAULTS: Limits = {
  maxBodyBytes: 10 * 1024 * 1024,
  maxMessagesPerPreview: 10_000,
  maxPreviewsPerKey: 1000,
  maxStorageBytesPerKey: 1024 * 1024 * 1024,
  defaultPreviewTtlSeconds: 30 * 24 * 60 * 60,
  maxPreviewTtlSeconds: 365 * 24 * 60 * 60,
  defaultSignedUrlTtlSeconds: 60 * 60,
  maxSignedUrlTtlSeconds: 7 * 24 * 60 * 60,
  keyCreationLimit: 5,
  keyCreationWindowSeconds: 60 * 60,
};

const VARS: Record<keyof Limits, keyof Env> = {
  maxBodyBytes: 'MAX_BODY_BYTES',
  maxMessagesPerPreview: 'MAX_MESSAGES_PER_PREVIEW',
  maxPreviewsPerKey: 'MAX_PREVIEWS_PER_KEY',
  maxStorageBytesPerKey: 'MAX_STORAGE_BYTES_PER_KEY',
  defaultPreviewTtlSeconds: 'DEFAULT_PREVIEW_TTL_SECONDS',
  maxPreviewTtlSeconds: 'MAX_PREVIEW_TTL_SECONDS',
  defaultSignedUrlTtlSeconds: 'DEFAULT_SIGNED_URL_TTL_SECONDS',
  maxSignedUrlTtlSeconds: 'MAX_SIGNED_URL_TTL_SECONDS',
  keyCreationLimit: 'KEY_CREATION_LIMIT',
  keyCreationWindowSeconds: 'KEY_CREATION_WINDOW_SECONDS',
};

// Workers accept request bodies up to 100 MiB (more on Enterprise plans).
const MAX_BODY_CEILING = 100 * 1024 * 1024;

export const getLimits = (env: Env): Limits => {
  const limits = { ...DEFAULTS };
  for (const key of Object.keys(VARS) as (keyof Limits)[]) {
    const value = Number(env[VARS[key]] as unknown);
    if (Number.isFinite(value) && value > 0) limits[key] = Math.floor(value);
  }
  limits.maxBodyBytes = Math.min(limits.maxBodyBytes, MAX_BODY_CEILING);
  limits.defaultPreviewTtlSeconds = Math.min(limits.defaultPreviewTtlSeconds, limits.maxPreviewTtlSeconds);
  limits.defaultSignedUrlTtlSeconds = Math.min(limits.defaultSignedUrlTtlSeconds, limits.maxSignedUrlTtlSeconds);
  return limits;
};
