import { useCallback, useEffect, useRef, useState, type Ref, type RefObject } from 'react';
import { useMergeRefs } from '../hooks';
import { TextInput, type TextInputProps } from '../TextInput';

export type NumberInputMode = 'integer' | 'decimal';

export interface NumberInputProps extends Omit<
  TextInputProps,
  'value' | 'defaultValue' | 'onChange' | 'inputRef' | 'min' | 'max' | 'step' | 'type' | 'inputMode'
> {
  name?: string;
  value: number | undefined;
  onChange: (value: number | undefined, name: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  min?: number;
  max?: number;
  step?: number;
  /** Whether the value may have decimals. */
  mode?: NumberInputMode;
}

const INTEGER_PATTERN = /^-?\d*$/;
const DECIMAL_PATTERN = /^-?\d*\.?\d*$/;

const toText = (value: number | undefined) => (value != null ? value.toString() : '');

const parse = (text: string, isDecimal: boolean) => {
  const value = isDecimal ? parseFloat(text) : parseInt(text, 10);
  return Number.isNaN(value) ? undefined : value;
};

const countDecimals = (value: number) => {
  const text = value.toString();
  const point = text.indexOf('.');
  return point === -1 ? 0 : text.length - point - 1;
};

// Arrow keys and the mouse wheel (while focused) step the value, clamped to min and max.
const useStepping = ({
  name,
  disabled,
  readOnly,
  value,
  min,
  max,
  step,
  onChange,
  ref,
}: {
  name: string;
  disabled?: boolean;
  readOnly?: boolean;
  value: number | undefined;
  min?: number;
  max?: number;
  step: number;
  onChange: (value: number | undefined, name: string) => void;
  ref: RefObject<HTMLInputElement | null>;
}) => {
  useEffect(() => {
    const element = ref.current;
    if (disabled || readOnly || element == null) return;
    const stepBy = (direction: number) => {
      const current = value ?? 0;
      const decimals = Math.max(countDecimals(step), countDecimals(current));
      const next = Number((current + direction * step).toFixed(decimals));
      onChange(min != null && next < min ? min : max != null && next > max ? max : next, name);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          stepBy(1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          stepBy(-1);
          break;
      }
    };
    const handleWheel = (event: WheelEvent) => {
      if (document.activeElement !== element) return;
      event.preventDefault();
      stepBy(event.deltaY < 0 ? 1 : -1);
    };
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [disabled, readOnly, value, min, max, step, onChange, ref, name]);
};

/** A text input for numbers, stepped with the arrow keys or the mouse wheel. */
export const NumberInput = ({
  name = '',
  value,
  onChange,
  inputRef,
  min,
  max,
  step = 1,
  mode = 'integer',
  disabled,
  readOnly,
  ...props
}: NumberInputProps) => {
  const isDecimal = mode === 'decimal';
  if (!isDecimal && !Number.isInteger(step)) {
    throw new Error('NumberInput step must be an integer when mode is "integer"');
  }
  const ownRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergeRefs(inputRef, ownRef);
  // The typed text, kept separately so partial input like "-" or "1." survives until it parses.
  const [text, setText] = useState(() => toText(value));
  if (text !== toText(value) && parse(text, isDecimal) !== value) setText(toText(value));
  useStepping({ name, disabled, readOnly, value, min, max, step, onChange, ref: ownRef });
  const handleChange = useCallback(
    (nextText: string, inputName: string) => {
      if ((isDecimal ? DECIMAL_PATTERN : INTEGER_PATTERN).test(nextText)) {
        setText(nextText);
        onChange(parse(nextText, isDecimal), inputName);
      }
    },
    [onChange, isDecimal],
  );
  return (
    <TextInput
      {...props}
      name={name}
      disabled={disabled}
      readOnly={readOnly}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onChange={handleChange}
      inputRef={mergedRef}
      value={text}
      min={min}
      max={max}
      type="text"
      inputMode={isDecimal ? 'decimal' : 'numeric'}
    />
  );
};

NumberInput.displayName = 'NumberInput';
