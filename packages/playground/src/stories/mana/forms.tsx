import type { ReactNode } from 'react';
import {
  Button,
  Checkbox,
  ColorPicker,
  CopyInput,
  CustomColorButton,
  DefaultColorButton,
  Field,
  FieldSet,
  InputField,
  Select,
  Stack,
  Switch,
  Text,
  TextButton,
  TextInput,
  type FieldAuxiliaryContentPosition,
  type FieldProps,
} from '@discord-mana/components';
import { LockIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';
import styles from './forms.module.css';

interface FieldStoryProps extends Omit<FieldProps, 'icon'> {
  showIcon: boolean;
}

const FieldSetStory = ({ label }: { label: string }) => (
  <div>
    <FieldSet label={label === '' ? undefined : label}>
      <TextInput label="First Name" />
      <TextInput label="Last Name" />
      <TextInput label="Address" />
    </FieldSet>
  </div>
);

FieldSetStory.displayName = 'FieldSetStory';

const FieldStory = ({ description, ...props }: FieldStoryProps) => (
  <div>
    <Field
      {...props}
      description={description === '' ? undefined : description}
      icon={props.showIcon ? LockIcon : undefined}
    >
      <div className={styles.placeholder}>
        <Text color="text-subtle" variant="body-md/medium">
          Field
        </Text>
      </div>
    </Field>
  </div>
);

FieldStory.displayName = 'FieldStory';

const noop = () => {};

const DisabledFieldRow = ({
  title,
  children,
  auxiliaryContentPosition,
}: {
  title: string;
  children: ReactNode;
  auxiliaryContentPosition?: FieldAuxiliaryContentPosition;
}) => (
  <Field
    disabled
    label={title}
    description="This row is disabled at the Field level and at the control level."
    helperText="Every leaf (label, description, helper text, control) should render at a single 0.5 opacity layer."
    auxiliaryContentPosition={auxiliaryContentPosition}
  >
    {children}
  </Field>
);

DisabledFieldRow.displayName = 'DisabledFieldRow';

const SELECT_OPTIONS = [
  { label: 'Aardvark', value: 'aardvark', id: 'aardvark' },
  { label: 'Cat', value: 'cat', id: 'cat' },
  { label: 'Dog', value: 'dog', id: 'dog' },
];

const PICKER_COLORS = [1752220, 3066993, 3447003, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c];

const DisabledFields = ({ auxiliaryContentPosition }: { auxiliaryContentPosition?: FieldAuxiliaryContentPosition }) => (
  <Stack direction="vertical" gap={24}>
    <DisabledFieldRow title="Button" auxiliaryContentPosition={auxiliaryContentPosition}>
      <div>
        <Button text="Remove" variant="critical-primary" disabled />
      </div>
    </DisabledFieldRow>
    <DisabledFieldRow title="TextButton" auxiliaryContentPosition={auxiliaryContentPosition}>
      <div>
        <TextButton text="View details" variant="primary" disabled />
      </div>
    </DisabledFieldRow>
    <DisabledFieldRow title="Switch" auxiliaryContentPosition={auxiliaryContentPosition}>
      <Switch label="Allow direct messages" disabled checked={false} onChange={noop} />
    </DisabledFieldRow>
    <DisabledFieldRow title="Checkbox" auxiliaryContentPosition={auxiliaryContentPosition}>
      <Checkbox label="Accept terms" disabled checked={false} onChange={noop} value="accept-terms" />
    </DisabledFieldRow>
    <DisabledFieldRow title="InputField" auxiliaryContentPosition={auxiliaryContentPosition}>
      <InputField disabled>
        <Text variant="body-md/normal" color="text-subtle">
          Inner InputField content
        </Text>
      </InputField>
    </DisabledFieldRow>
    <DisabledFieldRow title="Select" auxiliaryContentPosition={auxiliaryContentPosition}>
      <Select
        label="Animal"
        hideLabel
        options={SELECT_OPTIONS}
        selectionMode="single"
        value={undefined}
        onSelectionChange={noop}
        disabled
      />
    </DisabledFieldRow>
    <DisabledFieldRow title="CopyInput" auxiliaryContentPosition={auxiliaryContentPosition}>
      <CopyInput value="https://discord.gg/disabled-example" supportsCopy onCopy={noop} disabled />
    </DisabledFieldRow>
    <DisabledFieldRow title="ColorPicker" auxiliaryContentPosition={auxiliaryContentPosition}>
      <ColorPicker
        defaultColor={PICKER_COLORS[0]}
        customColor={null}
        colors={PICKER_COLORS}
        value={PICKER_COLORS[0]}
        disabled
        onChange={noop}
        renderDefaultButton={(props) => <DefaultColorButton {...props} />}
        renderCustomButton={(props) => <CustomColorButton {...props} />}
      />
    </DisabledFieldRow>
    <DisabledFieldRow title="TextInput" auxiliaryContentPosition={auxiliaryContentPosition}>
      <TextInput label="Username" hideLabel value="disabled-user" onChange={noop} disabled />
    </DisabledFieldRow>
  </Stack>
);

DisabledFields.displayName = 'DisabledFields';

const DisabledFieldsUnderLabel = () => <DisabledFields auxiliaryContentPosition="under-label" />;

DisabledFieldsUnderLabel.displayName = 'DisabledFieldsUnderLabel';

const forms: StoryGroup = {
  title: 'Forms',
  stories: [
    {
      name: 'FieldSet',
      id: 'fieldset',
      component: FieldSetStory,
      controls: { label: { type: 'text', label: 'Label', defaultValue: 'Billing Address' } },
    },
    {
      name: 'Field',
      id: 'formcontrol',
      component: FieldStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'First Name' },
        description: { type: 'text', label: 'Description', defaultValue: 'This is the first name of the user' },
        helperText: {
          type: 'text',
          label: 'Helper Text',
          defaultValue: 'This is the helper text for the form control',
        },
        required: { type: 'boolean', label: 'Required', defaultValue: false },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        layout: {
          type: 'select',
          label: 'Layout',
          defaultValue: 'vertical',
          options: [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Horizontal (Responsive)', value: 'horizontal-responsive' },
          ],
        },
        badge: {
          type: 'select',
          label: 'Badge',
          defaultValue: undefined,
          options: [
            { label: 'None', value: undefined },
            { label: 'New', value: 'new' },
            { label: 'Beta', value: 'beta' },
            { label: 'Early Access', value: 'early_access' },
            { label: 'Free Trial', value: 'free_trial' },
          ],
        },
        showIcon: { type: 'boolean', label: 'Show Icon', defaultValue: false },
      },
    },
    {
      name: 'Field (Disabled, under-control)',
      id: 'field-disabled-under-control',
      component: DisabledFields,
      controls: {
        auxiliaryContentPosition: {
          type: 'select',
          label: 'Auxiliary Content Position',
          defaultValue: 'under-control',
          options: [
            { label: 'Under Control (default)', value: 'under-control' },
            { label: 'Under Label', value: 'under-label' },
          ],
        },
      },
    },
    {
      name: 'Field (Disabled, under-label)',
      id: 'field-disabled-under-label',
      component: DisabledFieldsUnderLabel,
    },
  ],
};

export default forms;
