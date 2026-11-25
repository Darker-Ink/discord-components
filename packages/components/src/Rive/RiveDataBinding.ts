import { createContext, useContext, useEffect, useRef } from 'react';
import type { Rive, ViewModelInstance, ViewModelInstanceNumber } from '@rive-app/react-canvas';

export interface RiveDataBindingContextValue {
  instance: ViewModelInstance | null;
  rive: Rive | null;
  reducedMotionEnabled: boolean;
  playIfNeeded: () => void;
}

export const RiveDataBindingContext = createContext<RiveDataBindingContextValue>({
  instance: null,
  rive: null,
  reducedMotionEnabled: false,
  playIfNeeded: () => {},
});

RiveDataBindingContext.displayName = 'RiveDataBindingContext';

export const useRiveDataBinding = () => useContext(RiveDataBindingContext);

/**
 * Two-way binds a number property of a view model instance: `value` is written into the animation
 * (waking it up to draw the change) and `onChange` hears about changes made by the animation itself.
 */
export const useRiveNumberProperty = (
  name: string,
  instance: ViewModelInstance | null,
  value: number | undefined,
  onChange: ((value: number) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  useEffect(() => {
    const property = instance == null || value == null ? null : instance.number(name);
    if (property == null || value == null) return;
    property.value = value;
    playIfNeeded?.();
  }, [value, playIfNeeded, name, instance]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const listening = onChange != null;
  useEffect(() => {
    const property: ViewModelInstanceNumber | null = instance != null && listening ? instance.number(name) : null;
    if (property == null) return;
    const notify = () => onChangeRef.current?.(property.value);
    notify();
    property.on(notify);
    return () => property.off(notify);
  }, [instance, name, listening]);
};
