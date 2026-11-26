import type { Control, Story } from './types';

type Props = Record<string, unknown>;

const defaultValueFor = (key: string, control: Control, defaults: Props | null) => {
  const value = defaults?.[key];
  return value !== undefined ? value : control.defaultValue;
};

// How Discord's playground reads a control value from a configuration link.
const parseOverride = (control: Control, raw: string) => {
  switch (control.type) {
    case 'select': {
      const option = control.options.find((o) => String(o.value) === raw);
      return option != null ? option.value : control.defaultValue;
    }
    case 'boolean':
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return control.defaultValue;
    case 'number': {
      const value = Number(raw);
      return Number.isNaN(value) ? control.defaultValue : value;
    }
    case 'slider': {
      const value = Number(raw);
      if (Number.isNaN(value)) return control.defaultValue;
      const clamped = Math.min(control.maxValue, Math.max(control.minValue, value));
      const [first, ...rest] = control.markers ?? [];
      if (first == null) return clamped;
      return rest.reduce(
        (closest, marker) => (Math.abs(marker - clamped) < Math.abs(closest - clamped) ? marker : closest),
        first,
      );
    }
    case 'text':
    case 'color':
      return raw;
  }
};

/** A story's props when it opens: link overrides, else the story's default overrides, else the controls' defaults. */
export const getInitialProps = (
  story: Story,
  overrides: Record<string, string> | null,
  defaults: Props | null = null,
): Props => {
  const props: Props = {};
  if (story.controls == null) return props;
  for (const [key, control] of Object.entries(story.controls)) {
    const raw = overrides?.[key];
    props[key] = raw != null ? parseOverride(control, raw) : defaultValueFor(key, control, defaults);
  }
  return props;
};

/** The props that differ from their defaults, as configuration link parameters. */
export const getChangedProps = (story: Story, props: Props | null, defaults: Props | null = null) => {
  const changed: Record<string, string> = {};
  if (story.controls == null || props == null) return changed;
  for (const [key, control] of Object.entries(story.controls)) {
    const value = props[key];
    if (value !== defaultValueFor(key, control, defaults) && value != null) changed[key] = String(value);
  }
  return changed;
};
