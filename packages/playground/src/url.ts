import type { Theme } from '@discord-mana/tokens';
import type { Controls } from './types';

export interface PlaygroundLocation {
  collection: string | null;
  story: string | null;
  theme: Theme | null;
  embed: boolean;
  overrides: Record<string, string>;
}

const RESERVED = new Set(['collection', 'story', 'theme', 'embed']);

export const readLocation = (): PlaygroundLocation => {
  const params = new URLSearchParams(window.location.search);
  return {
    collection: params.get('collection'),
    story: params.get('story'),
    theme: params.get('theme') as Theme | null,
    embed: params.has('embed'),
    overrides: Object.fromEntries([...params].filter(([key]) => !RESERVED.has(key))),
  };
};

export const writeLocation = (collection: string | undefined, story: string | null, theme: Theme) => {
  const params = new URLSearchParams();
  if (collection != null) params.set('collection', collection);
  if (story != null) params.set('story', story);
  params.set('theme', theme);
  window.history.replaceState(null, '', `?${params}`);
};

// Same coercion Discord's playground applies to configuration links.
export const parseOverrides = (controls: Controls | undefined, overrides: Record<string, string>) => {
  const props: Record<string, unknown> = {};
  for (const [key, control] of Object.entries(controls ?? {})) {
    const raw = overrides[key];
    if (raw == null) continue;
    switch (control.type) {
      case 'select':
        props[key] = control.options.find((o) => String(o.value) === raw)?.value ?? control.defaultValue;
        break;
      case 'boolean':
        props[key] = raw === 'true' ? true : raw === 'false' ? false : control.defaultValue;
        break;
      case 'number':
      case 'slider':
        props[key] = Number.isNaN(Number(raw)) ? control.defaultValue : Number(raw);
        break;
      default:
        props[key] = raw;
    }
  }
  return props;
};
