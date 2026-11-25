import { Fragment } from 'react';
import styles from './Playground.module.css';
import type { Controls } from './types';

type Props = Record<string, unknown>;

export const getDefaultProps = (controls: Controls | undefined): Props =>
  Object.fromEntries(Object.entries(controls ?? {}).map(([key, control]) => [key, control.defaultValue]));

const withDefaults = (controls: Controls, props: Props): Props =>
  Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, props[key] ?? control.defaultValue]));

interface ControlsPanelProps {
  controls: Controls;
  props: Props;
  onPropsChange: (props: Props) => void;
}

// TODO: swap the native inputs for the library's own Select/Checkbox/TextInput/Slider once they exist,
// matching Discord's playground.
export const ControlsPanel = ({ controls, props, onPropsChange }: ControlsPanelProps) => {
  const resolved = withDefaults(controls, props);

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

  const visible = Object.entries(controls).filter(([, control]) => control.isVisible?.(resolved) ?? true);
  if (visible.length === 0) return null;

  return (
    <div className={styles.controlsSection}>
      {visible.map(([key, control]) => {
        const value = resolved[key];
        return (
          <Fragment key={key}>
            <label>
              {control.label}
              {control.type === 'select' && (
                <select
                  value={String(
                    (control.getOptions?.(resolved) ?? control.options).findIndex((o) => o.value === value),
                  )}
                  onChange={(e) => {
                    const options = control.getOptions?.(resolved) ?? control.options;
                    setProp(key, options[Number(e.target.value)]?.value);
                  }}
                >
                  {(control.getOptions?.(resolved) ?? control.options).map((o, i) => (
                    <option key={o.label} value={i}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              {control.type === 'boolean' && (
                <input type="checkbox" checked={Boolean(value)} onChange={(e) => setProp(key, e.target.checked)} />
              )}
              {(control.type === 'text' || control.type === 'color') && (
                <input
                  type={control.type === 'color' ? 'color' : 'text'}
                  value={String(value ?? '')}
                  onChange={(e) => setProp(key, e.target.value)}
                />
              )}
              {control.type === 'number' && (
                <input
                  type="number"
                  value={String(value)}
                  min={control.minValue}
                  onChange={(e) => setProp(key, Number(e.target.value))}
                />
              )}
              {control.type === 'slider' && (
                <input
                  type="range"
                  value={Number(value)}
                  min={control.minValue}
                  max={control.maxValue}
                  step={control.markers != null ? 1 : (control.maxValue - control.minValue) * 0.05}
                  onChange={(e) => setProp(key, Number(e.target.value))}
                />
              )}
            </label>
            {control.hint != null && <div className={styles.controlHint}>{control.hint}</div>}
          </Fragment>
        );
      })}
    </div>
  );
};

ControlsPanel.displayName = 'ControlsPanel';
