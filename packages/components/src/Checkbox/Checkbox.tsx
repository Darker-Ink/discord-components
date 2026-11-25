import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import clsx from 'clsx';
import { Checkbox as AriaCheckbox } from 'react-aria-components';
import { CheckmarkSmallBoldIcon, type IconProps } from '@discord-components/icons';
import { FocusRing } from '../FocusRing';
import { Text } from '../Text';
import textVariantStyles from '../Text/TextVariants.module.css';
import styles from './Checkbox.module.css';

export type CheckboxLabelType = 'primary' | 'secondary';

// 'indicator' drops the spacing class, for checkboxes that sit inside another row (e.g. a list item).
export type CheckboxUsageVariant = 'single' | 'indicator';

export type CheckboxLeadingIcon = ComponentType<IconProps<'color'>>;

export interface CheckboxProps {
  checked?: boolean;
  description?: string;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  // Renders a non-interactive copy of the checkbox (no input, no focus ring).
  displayOnly?: boolean;
  label?: string;
  labeledBy?: string;
  leadingIcon?: CheckboxLeadingIcon;
  value?: string | number;
  labelType?: CheckboxLabelType;
  usageVariant?: CheckboxUsageVariant;
}

type AnimationState = 'animateIn' | 'animateOut';

export const Checkbox = ({
  checked,
  description,
  onChange,
  disabled = false,
  displayOnly,
  label,
  labeledBy,
  leadingIcon,
  value,
  labelType = 'primary',
  usageVariant = 'single',
}: CheckboxProps) => {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ringRef = useRef<HTMLLabelElement>(null);
  const id = useId();
  const labelId = `${id}label`;
  const descriptionId = `${id}description`;
  const [animation, setAnimation] = useState<AnimationState | undefined>(undefined);
  const previousChecked = useRef(checked);
  const hasLabel = label != null && label !== '';
  const hasDescription = description != null && description !== '';
  const LeadingIcon = leadingIcon ?? null;

  // Only animate changes after mount, so initially checked boxes render without playing the check.
  // Comparing against the previous value (rather than a "mounted" flag) keeps StrictMode's double
  // effect run from triggering an animation.
  useEffect(() => {
    if (previousChecked.current === checked) return;
    previousChecked.current = checked;
    setAnimation(checked ? 'animateIn' : 'animateOut');
  }, [checked]);

  const className = clsx(styles.checkboxOption, {
    // Discord's `labeled` class composes the body-md/normal text variant.
    [styles.labeled]: hasLabel,
    [textVariantStyles['body-md/normal']]: hasLabel,
    [styles.withLeadingIcon]: hasLabel && LeadingIcon != null,
    [styles.animateIn]: animation === 'animateIn',
    [styles.animateOut]: animation === 'animateOut',
    [styles.spacing]: usageVariant !== 'indicator',
  });

  const content = (
    <>
      <div className={styles.checkboxIndicator} ref={indicatorRef} aria-hidden>
        <svg className={styles.checkmark} width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle className={styles.dot} cx="10" cy="10" r="1.1" fill="currentColor" />
        </svg>
        <CheckmarkSmallBoldIcon className={styles.checkStroke} size="sm" color="currentColor" />
      </div>
      {hasLabel && (
        <>
          {LeadingIcon != null && (
            <LeadingIcon className={styles.leadingIcon} size="sm" color="currentColor" aria-hidden focusable={false} />
          )}
          <Text
            id={labelId}
            tag="span"
            className={styles.label}
            variant="body-md/normal"
            color={labelType === 'primary' ? 'text-strong' : 'text-subtle'}
          >
            {label}
          </Text>
          {hasDescription && (
            <Text id={descriptionId} className={styles.description} variant="body-sm/normal" color="text-subtle">
              {description}
            </Text>
          )}
        </>
      )}
    </>
  );

  if (displayOnly) {
    return (
      <div className={className} data-selected={checked || undefined} data-disabled={disabled || undefined}>
        {content}
      </div>
    );
  }

  return (
    <FocusRing focusTarget={inputRef} ringTarget={ringRef}>
      <AriaCheckbox
        ref={ringRef}
        inputRef={inputRef}
        aria-labelledby={labeledBy ?? (hasLabel ? labelId : undefined)}
        aria-describedby={hasLabel && hasDescription ? descriptionId : undefined}
        isSelected={checked}
        onChange={(isSelected) => onChange?.(isSelected)}
        isDisabled={disabled}
        isReadOnly={displayOnly}
        data-mana-component="checkbox"
        className={className}
        value={String(value)}
      >
        {content}
      </AriaCheckbox>
    </FocusRing>
  );
};

Checkbox.displayName = 'Checkbox';
