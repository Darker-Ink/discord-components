import type { Theme } from '@discord-components/tokens';
import type { Controls } from './types';

export interface PlaygroundLocation {
  collection: string | null;
  story: string | null;
  theme: Theme | null;
  /** Client experiments to turn on, from `?experiments=a,b` (all off by default, as in the client). */
  experiments: string[];
  embed: boolean;
  overrides: Record<string, string>;
}

const RESERVED = new Set(['collection', 'story', 'theme', 'experiments', 'embed']);

export const readLocation = (): PlaygroundLocation => {
  const params = new URLSearchParams(window.location.search);
  return {
    collection: params.get('collection'),
    story: params.get('story'),
    theme: params.get('theme') as Theme | null,
    experiments: params.get('experiments')?.split(',').filter(Boolean) ?? [],
    embed: params.has('embed'),
    overrides: Object.fromEntries([...params].filter(([key]) => !RESERVED.has(key))),
  };
};

export const writeLocation = (
  collection: string | undefined,
  story: string | null,
  theme: Theme,
  experiments: string[],
) => {
  const params = new URLSearchParams();
  if (collection != null) params.set('collection', collection);
  if (story != null) params.set('story', story);
  params.set('theme', theme);
  if (experiments.length > 0) params.set('experiments', experiments.join(','));
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
