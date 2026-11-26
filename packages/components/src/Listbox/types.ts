import type { ComponentType, ReactElement } from 'react';
import type { BadgeType } from '../Badge';

export type SelectionMode = 'single' | 'multiple';

export type ListboxOptionAccessory =
  | string
  | ReactElement
  | ComponentType<{ size?: 'refresh_sm'; color?: string }>
  | { type: 'image'; src: string }
  | { type: 'avatar'; src: string }
  | { type: 'badge'; badgeType: BadgeType };

export interface ListboxOption<Value = unknown> {
  id: string;
  label: string;
  value: Value;
  description?: string;
  disabled?: boolean;
  leading?: ListboxOptionAccessory;
  trailing?: ListboxOptionAccessory;
}

export interface ListboxOptionGroup<T extends ListboxOption = ListboxOption> {
  label: string;
  options: T[];
}

export interface ListboxGroup {
  label: string;
  count: number;
}
