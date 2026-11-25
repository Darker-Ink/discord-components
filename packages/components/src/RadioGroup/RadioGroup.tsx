import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import clsx from 'clsx';
import { Radio, RadioGroup as AriaRadioGroup } from 'react-aria-components';
import type { IconProps } from '@discord-components/icons';
import { Field, type FieldProps } from '../Field';
import { FocusRing } from '../FocusRing';
import { Text } from '../Text';
import textVariantStyles from '../Text/TextVariants.module.css';
import styles from './RadioGroup.module.css';

type AnimationState = 'animateIn' | 'animateOut';

// Animates selection changes after mount. Comparing against the previous value (rather than a
// "mounted" flag) keeps StrictMode's double effect run from triggering an animation.
const useSelectionAnimation = (isSelected: boolean | undefined) => {
  const [animation, setAnimation] = useState<AnimationState | undefined>(undefined);
  const previous = useRef(isSelected);
  useEffect(() => {
    if (previous.current === isSelected) return;
    previous.current = isSelected;
    setAnimation(isSelected ? 'animateIn' : 'animateOut');
  }, [isSelected]);
  return animation;
};

const RadioIndicatorIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    className={styles.radioIndicator}
    width={20}
    height={20}
    viewBox="0 0 40 40"
    fill="none"
    shapeRendering="geometricPrecision"
  >
    <circle cx={20} cy={20} r={20} className={styles.outerRadioBase} />
    <circle cx={20} cy={20} r={20} className={styles.outerRadioFill} />
    <circle cx={20} cy={20} r={8} className={styles.innerDotRadio} />
  </svg>
);

RadioIndicatorIcon.displayName = 'RadioIndicatorIcon';

export interface RadioIndicatorProps {
  disabled?: boolean;
  checked?: boolean;
}

// A radio's indicator on its own, for rows that handle selection themselves.
export const RadioIndicator = ({ disabled, checked }: RadioIndicatorProps) => {
  const animation = useSelectionAnimation(checked);
  return (
    <div
      className={clsx([styles.standaloneRadioIndicator, typeof animation === 'string' && styles[animation]])}
      data-selected={checked}
      data-disabled={disabled}
    >
      <RadioIndicatorIcon />
    </div>
  );
};

RadioIndicator.displayName = 'RadioIndicator';

export type RadioGroupLeadingIcon = ComponentType<IconProps<'color'>>;

export interface RadioGroupOption<T = string> {
  name: string;
  value: T;
  desc?: string;
  disabled?: boolean;
  leadingIcon?: RadioGroupLeadingIcon;
}

interface RadioGroupItemProps {
  name: string;
  value: string;
  desc?: string;
  disabled?: boolean;
  leadingIcon?: RadioGroupLeadingIcon;
  isSelected: boolean;
  index: number;
}

const RadioGroupItem = ({ desc, disabled, leadingIcon: LeadingIcon, name, value, isSelected }: RadioGroupItemProps) => {
  const ref = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `${id}label`;
  const descriptionId = `${id}description`;
  const hasDescription = desc != null && desc !== '';
  const animation = useSelectionAnimation(isSelected);
  return (
    <FocusRing focusTarget={ref} ringTarget={ref} within>
      <Radio
        className={clsx(styles.radioGroupOption, textVariantStyles['body-md/normal'], {
          [styles.withLeadingIcon]: LeadingIcon != null,
          [styles.animateIn]: animation === 'animateIn',
          [styles.animateOut]: animation === 'animateOut',
        })}
        value={value}
        isDisabled={disabled}
        inputRef={inputRef}
        aria-labelledby={labelId}
        aria-describedby={hasDescription ? descriptionId : undefined}
        ref={ref}
      >
        <RadioIndicatorIcon />
        {LeadingIcon != null && (
          <LeadingIcon className={styles.radioItemIcon} size="sm" color="currentColor" aria-hidden focusable={false} />
        )}
        <Text id={labelId} tag="span" variant="body-md/normal">
          {name}
        </Text>
        {hasDescription ? (
          <Text id={descriptionId} className={styles.description} variant="body-sm/normal" color="text-subtle">
            {desc}
          </Text>
        ) : null}
      </Radio>
    </FocusRing>
  );
};

RadioGroupItem.displayName = 'RadioGroupItem';

export interface RadioGroupProps<T = string> extends Omit<FieldProps, 'children' | 'disabled'> {
  onChange?: (value: T) => void;
  options: RadioGroupOption<T>[];
  value?: T;
  disabled?: boolean;
  'aria-labelledby'?: string;
}

export const RadioGroup = <T,>({
  onChange,
  options,
  value,
  disabled = false,
  'aria-labelledby': ariaLabelledBy,
  ...fieldProps
}: RadioGroupProps<T>) => {
  // React Aria works with string values; map back to the option's own value.
  const handleChange =
    onChange != null
      ? (selected: string) => {
          const option = options.find((candidate) => String(candidate.value) === selected);
          if (option != null) onChange(option.value);
        }
      : undefined;
  return (
    <Field {...fieldProps}>
      {(field) => (
        <AriaRadioGroup
          id={field.controlId}
          className={styles.group}
          isDisabled={disabled}
          onChange={handleChange}
          aria-labelledby={ariaLabelledBy ?? field.labelId}
          aria-describedby={field.describedById}
          aria-errormessage={field.errorMessageId}
          data-mana-component="BaseRadioGroup"
          value={value != null ? String(value) : undefined}
        >
          {options.map((option, index) => (
            <RadioGroupItem
              key={String(option.value)}
              index={index}
              {...option}
              value={String(option.value)}
              isSelected={value === option.value}
            />
          ))}
        </AriaRadioGroup>
      )}
    </Field>
  );
};

RadioGroup.displayName = 'RadioGroup';
