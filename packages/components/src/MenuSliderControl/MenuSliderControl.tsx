import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { MenuInteractionType, type MenuControlHandle } from '../Menu';
import { Slider } from '../Slider';
import styles from './MenuSliderControl.module.css';

const formatPercent = (value: number) => `${value.toFixed(0)}%`;

const debounce = (fn: () => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
};

export interface MenuSliderControlProps {
  value: number;
  minValue?: number;
  maxValue?: number;
  tabIndex?: number;
  onChange: (value: number) => void;
  onInteraction?: (type?: MenuInteractionType) => void;
  renderValue?: (value: number) => string;
  'aria-label'?: string;
  ref?: Ref<MenuControlHandle>;
}

// A slider for a MenuControlItem's `control`; up/down arrows keep moving through the menu.
export const MenuSliderControl = ({
  ref,
  value,
  minValue = 0,
  maxValue = 100,
  tabIndex,
  onChange,
  onInteraction,
  renderValue = formatPercent,
  'aria-label': ariaLabel,
}: MenuSliderControlProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInteraction = useMemo(
    () => debounce(() => onInteraction?.(MenuInteractionType.SLIDER), 100),
    [onInteraction],
  );
  useImperativeHandle(
    ref,
    () => ({ focus: () => inputRef.current?.focus(), blur: () => inputRef.current?.blur(), activate: () => false }),
    [],
  );
  return (
    <div className={styles.sliderContainer}>
      <Slider
        inputRef={inputRef}
        defaultValue={value}
        minValue={minValue}
        maxValue={maxValue}
        tabIndex={tabIndex}
        onChange={onChange}
        onChangeEnd={(next) => {
          onChange(next);
          reportInteraction();
        }}
        formatValue={renderValue}
        passThroughVerticalArrowKeys
        aria-label={ariaLabel}
      />
    </div>
  );
};

MenuSliderControl.displayName = 'MenuSliderControl';
