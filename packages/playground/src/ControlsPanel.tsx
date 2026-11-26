import { Fragment, type KeyboardEvent } from 'react';
import chroma from 'chroma-js';
import { Checkbox, Select, Slider, Stack, Text, TextInput, type ListboxOption } from '@discord-components/components';
import styles from './Playground.module.css';
import type { Controls, SelectOption } from './types';

type Props = Record<string, unknown>;

const DEFAULT_COLOR = '#000000';

export const getDefaultProps = (controls: Controls | undefined): Props =>
  Object.fromEntries(Object.entries(controls ?? {}).map(([key, control]) => [key, control.defaultValue]));

const withDefaults = (controls: Controls, props: Props): Props =>
  Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, props[key] ?? control.defaultValue]));

// The native color input only takes #rrggbb.
const toSwatchColor = (value: unknown) => {
  if (value == null || value === '') return DEFAULT_COLOR;
  try {
    return chroma(value as string).hex();
  } catch {
    return DEFAULT_COLOR;
  }
};

// Controls' options are plain label/value pairs; the select gets them as listbox options.
const formatOption = (option: ListboxOption) => {
  const { label, value } = option as SelectOption;
  return { id: value as string, value, label };
};

const formatSliderValue = (value: number) => String(Math.round(1000 * value) / 1000);

const ARROW_KEY_DIRECTIONS: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };

interface SliderControlProps {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  markers?: number[];
  onChange: (value: number) => void;
}

// Without markers a drag can land on (almost) any value, while the arrow keys move by 5% of the range. The
// slider has a single step for both, so it gets a fine one and the arrow keys are handled here.
const SliderControl = ({ label, value, minValue, maxValue, markers, onChange }: SliderControlProps) => {
  const range = maxValue - minValue;
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = ARROW_KEY_DIRECTIONS[event.key];
    if (markers != null || direction == null) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.min(maxValue, Math.max(minValue, value + direction * range * 0.05)));
  };
  return (
    <div onKeyDownCapture={handleKeyDownCapture}>
      <Slider
        label={label}
        value={value}
        minValue={minValue}
        maxValue={maxValue}
        step={markers != null ? 1 : range / 1000}
        marks={markers}
        snapToMarks={markers != null}
        onChange={onChange}
        formatValue={formatSliderValue}
      />
    </div>
  );
};

SliderControl.displayName = 'SliderControl';

interface ControlsPanelProps {
  controls: Controls;
  props: Props;
  onPropsChange: (props: Props) => void;
}

export const ControlsPanel = ({ controls, props, onPropsChange }: ControlsPanelProps) => {
  const setProp = (key: string, value: unknown) => {
    const next = { ...props, [key]: value };
    const nextResolved = withDefaults(controls, next);
    // A select whose options depend on other props falls back to its first option when its value disappears.
    for (const [name, control] of Object.entries(controls)) {
      if (control.type !== 'select' || control.getOptions == null) continue;
      const options = control.getOptions(nextResolved);
      if (options.length > 0 && !options.some((o) => o.value === nextResolved[name])) next[name] = options[0].value;
    }
    onPropsChange(next);
  };

  const resolved = withDefaults(controls, props);
  const visible = Object.entries(controls).filter(([, control]) => control.isVisible?.(resolved) ?? true);
  if (visible.length === 0) return null;

  return (
    <div className={styles.controlsSection}>
      <Stack gap={16}>
        {visible.map(([key, control]) => {
          const value = props[key] ?? control.defaultValue;
          return (
            <Fragment key={String(key)}>
              {control.type === 'select' && control.options != null && (
                <Select
                  label={control.label}
                  value={value}
                  onSelectionChange={(next) => setProp(key, next)}
                  options={(control.getOptions?.(resolved) ?? control.options) as ListboxOption[]}
                  formatOption={formatOption}
                  selectionMode="single"
                  fullWidth
                />
              )}
              {control.type === 'boolean' && (
                <Checkbox checked={value as boolean} onChange={(next) => setProp(key, next)} label={control.label} />
              )}
              {control.type === 'text' && (
                <TextInput value={value as string} onChange={(next) => setProp(key, next)} label={control.label} />
              )}
              {control.type === 'number' && (
                <TextInput
                  type="number"
                  value={String(value)}
                  min={control.minValue}
                  onChange={(next) => setProp(key, Number(next))}
                  label={control.label}
                />
              )}
              {control.type === 'slider' && (
                <SliderControl
                  label={control.label}
                  value={value != null ? Number(value) : 0}
                  minValue={control.minValue}
                  maxValue={control.maxValue}
                  markers={control.markers}
                  onChange={(next) => setProp(key, next)}
                />
              )}
              {control.type === 'color' && (
                <div className={styles.colorControl}>
                  <Text variant="body-md/medium" color="text-strong" tag="label">
                    {control.label}
                  </Text>
                  <div className={styles.colorControlInput}>
                    <input
                      type="color"
                      className={styles.colorSwatch}
                      value={toSwatchColor(value)}
                      onChange={(event) => setProp(key, event.target.value)}
                    />
                    <TextInput value={(value as string | undefined) ?? ''} onChange={(next) => setProp(key, next)} />
                  </div>
                </div>
              )}
              {control.hint == null ? null : (
                <Text variant="body-xs/normal" color="text-muted" className={styles.controlHint}>
                  {control.hint}
                </Text>
              )}
            </Fragment>
          );
        })}
      </Stack>
    </div>
  );
};

ControlsPanel.displayName = 'ControlsPanel';
