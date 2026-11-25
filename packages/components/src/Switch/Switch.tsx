import { useContext } from 'react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Field, type FieldProps } from '../Field';
import { SwitchControl, type SwitchControlProps } from './SwitchControl';

export interface SwitchProps
  extends
    Omit<FieldProps, 'children' | 'layout' | 'interactiveLabel' | 'auxiliaryContentPosition' | 'disabled' | 'id'>,
    Pick<SwitchControlProps, 'checked' | 'disabled' | 'displayOnly' | 'id' | 'onChange' | 'focusProps' | 'hasIcon'> {}

const SwitchField = ({
  checked,
  disabled,
  displayOnly,
  id,
  onChange,
  focusProps,
  hasIcon = false,
  ...fieldProps
}: SwitchProps) => {
  if (displayOnly) return <SwitchControl checked={checked} disabled={disabled} displayOnly hasIcon={hasIcon} />;
  return (
    <Field
      {...fieldProps}
      id={id}
      disabled={disabled}
      layout="horizontal"
      interactiveLabel
      auxiliaryContentPosition="under-label"
    >
      {(field) => (
        <SwitchControl
          focusProps={focusProps}
          id={field.controlId}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          hasIcon={hasIcon}
          describedBy={field.describedById}
          labelledBy={field.labelId}
        />
      )}
    </Field>
  );
};

SwitchField.displayName = 'SwitchField';

export const Switch = (props: SwitchProps) => {
  const { switchIconsEnabled } = useContext(AccessibilityPreferencesContext);
  const hasIcon = props.hasIcon !== undefined ? props.hasIcon : switchIconsEnabled;
  return <SwitchField {...props} hasIcon={hasIcon} />;
};

Switch.displayName = 'Switch';
