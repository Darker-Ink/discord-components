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
  | (BaseControl<string> & { type: 'text' })
  | (BaseControl<string> & { type: 'color' })
  | (BaseControl<number> & { type: 'number'; minValue?: number })
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
  docs?: string;
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
}
