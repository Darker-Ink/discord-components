export const MediaLayoutType = {
  STATIC: 'STATIC',
  RESPONSIVE: 'RESPONSIVE',
  MOSAIC: 'MOSAIC',
} as const;

export type MediaLayoutType = (typeof MediaLayoutType)[keyof typeof MediaLayoutType];

export const ImageReadyState = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  READY: 'READY',
} as const;

export type ImageReadyState = (typeof ImageReadyState)[keyof typeof ImageReadyState];

export const ObscureReason = {
  SPOILER: 'spoiler',
  EXPLICIT_CONTENT: 'explicit_content',
  POTENTIAL_EXPLICIT_CONTENT: 'potential_explicit_content',
  GORE_CONTENT: 'gore_content',
  SELF_HARM_CONTENT: 'self_harm_content',
} as const;

export type ObscureReason = (typeof ObscureReason)[keyof typeof ObscureReason];

// Reasons that render the sensitive-content overlay (with its reveal toggle) rather than the spoiler one.
export const SENSITIVE_OBSCURE_REASONS: ReadonlySet<ObscureReason> = new Set([
  ObscureReason.EXPLICIT_CONTENT,
  ObscureReason.GORE_CONTENT,
  ObscureReason.SELF_HARM_CONTENT,
  ObscureReason.POTENTIAL_EXPLICIT_CONTENT,
]);

export const AGE_VERIFICATION_OBSCURE_REASONS: ReadonlySet<ObscureReason> = new Set([
  ObscureReason.EXPLICIT_CONTENT,
  ObscureReason.GORE_CONTENT,
  ObscureReason.SELF_HARM_CONTENT,
]);
