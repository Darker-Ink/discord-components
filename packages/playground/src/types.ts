import type { ComponentType, ReactNode } from 'react';

// Mirrors the story/control schema of Discord's internal component playground.

interface BaseControl<T> {
  label: string;
  hint?: string;
  defaultValue: T;
  isVisible?: (props: Record<string, unknown>) => boolean;
}

export interface SelectOption<T = unknown> {
  label: string;
  value: T;
}

export type Control =
  | (BaseControl<boolean> & { type: 'boolean' })
  | (BaseControl<string | undefined> & { type: 'text' })
  | (BaseControl<string | undefined> & { type: 'color' })
  | (BaseControl<number | undefined> & { type: 'number'; minValue?: number })
  | (BaseControl<number> & { type: 'slider'; minValue: number; maxValue: number; markers?: number[] })
  | (BaseControl<unknown> & {
      type: 'select';
      options: SelectOption[];
      getOptions?: (props: Record<string, unknown>) => SelectOption[];
    });

export type Controls = Record<string, Control>;

export interface Story {
  name: string;
  id: string;
  // Stories receive whatever their controls produce, so props are intentionally loose here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  controls?: Controls;
  /** Notes about the story (Discord's playground links its docs from the header; ours doesn't show them). */
  docs?: string;
  /** Default values that replace the controls' own defaults (e.g. ones that depend on app state). */
  useDefaultOverrides?: () => Record<string, unknown> | null;
  /** Rendered above the controls. */
  ControlsExtension?: ComponentType;
}

export interface StoryGroup {
  title: string;
  stories: Story[];
}

export interface Collection {
  id: string;
  name: string;
  groups: StoryGroup[];
  Provider?: ComponentType<{ children: ReactNode }>;
  /** Rendered at the end of the header, before the settings button. */
  HeaderControl?: ComponentType;
  /** Shown as a warning notice under the header. */
}
