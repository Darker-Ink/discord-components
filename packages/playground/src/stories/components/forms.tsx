import { useEffect, useState } from 'react';
import {
  ButtonColors,
  ButtonLooks,
  CharacterCount,
  ColorPicker,
  CopyInput,
  CopyInputModes,
  CustomColorButton,
  CustomColorPicker,
  DEFAULT_ROLE_COLOR,
  DefaultColorButton,
  hex2int,
  int2hex,
  isValidHex,
  Stack,
  Text,
  TextInput,
  type ButtonColor,
  type ButtonLook,
  type CopyInputMode,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';
import { keyOptions, valueOptions } from './shared';

// The role colors Discord offers in server settings.
const ROLE_COLORS = [
  1752220, 3066993, 3447003, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c, 9807270, 6323595, 1146986, 2067276,
  2123412, 7419530, 0xad1457, 0xc27c0e, 0xa84300, 0x992d22, 9936031, 5533306,
];

interface CopyInputStoryProps {
  value: string;
  mode: CopyInputMode;
  text: string;
  hideMessage: string;
  buttonColor: keyof typeof ButtonColors;
  buttonLook: keyof typeof ButtonLooks;
  supportsCopy: boolean;
  disabled: boolean;
}

// Like the client's invite links: copying flips the input to its success mode for a moment.
const CopyInputStory = ({ mode, text, hideMessage, buttonColor, buttonLook, ...props }: CopyInputStoryProps) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1000);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <div style={{ width: 400 }}>
      <CopyInput
        {...props}
        mode={copied ? CopyInputModes.SUCCESS : mode}
        text={copied ? 'Copied' : text}
        hideMessage={hideMessage === '' ? undefined : hideMessage}
        buttonColor={ButtonColors[buttonColor] as ButtonColor}
        buttonLook={ButtonLooks[buttonLook] as ButtonLook}
        onCopy={(value) => {
          void navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
        }}
      />
    </div>
  );
};

CopyInputStory.displayName = 'CopyInputStory';

interface ColorPickerStoryProps {
  customColor: string;
  disabled: boolean;
  shouldRenderSingleRow: boolean;
}

const ColorPickerStory = ({ customColor, ...props }: ColorPickerStoryProps) => {
  const [value, setValue] = useState<number | null | undefined>(ROLE_COLORS[0]);
  return (
    <Stack gap={16}>
      <ColorPicker
        {...props}
        defaultColor={DEFAULT_ROLE_COLOR}
        customColor={isValidHex(customColor) ? hex2int(customColor) : null}
        colors={ROLE_COLORS}
        value={value}
        onChange={(color) => {
          if (typeof color === 'number') setValue(color);
        }}
        renderDefaultButton={(buttonProps) => <DefaultColorButton {...buttonProps} onChange={setValue} />}
        renderCustomButton={(buttonProps) => <CustomColorButton {...buttonProps} />}
      />
      <Text variant="body-sm/normal" color="text-subtle">
        Selected: {value == null ? 'none' : int2hex(value)}
      </Text>
    </Stack>
  );
};

ColorPickerStory.displayName = 'ColorPickerStory';

interface CustomColorPickerStoryProps {
  value: string;
  eagerUpdate: boolean;
  showEyeDropper: boolean;
  suggestedColors: boolean;
}

const CustomColorPickerStory = ({ value, suggestedColors, ...props }: CustomColorPickerStoryProps) => {
  const [color, setColor] = useState<number | string>(value);
  return (
    <Stack gap={12} fullWidth={false}>
      <CustomColorPicker
        {...props}
        key={value}
        value={color}
        onChange={setColor}
        suggestedColors={suggestedColors ? ROLE_COLORS.slice(0, 8).map(int2hex) : undefined}
      />
      <Text variant="body-sm/normal" color="text-subtle">
        Value: {typeof color === 'number' ? int2hex(color) : color}
      </Text>
    </Stack>
  );
};

CustomColorPickerStory.displayName = 'CustomColorPickerStory';

const CharacterCountStory = ({ maxLength }: { maxLength: number | undefined }) => {
  const [value, setValue] = useState('Hello!');
  return (
    <Stack gap={8} style={{ width: 360 }}>
      <TextInput label="Status" value={value} onChange={setValue} maxLength={maxLength} />
      <Stack direction="horizontal" justify="end">
        <CharacterCount value={value} maxLength={maxLength} />
      </Stack>
    </Stack>
  );
};

CharacterCountStory.displayName = 'CharacterCountStory';

const forms: StoryGroup = {
  title: 'Forms',
  stories: [
    {
      name: 'CopyInput',
      id: 'copy-input',
      component: CopyInputStory,
      controls: {
        value: { label: 'Value', type: 'text', defaultValue: 'https://discord.gg/discord-developers' },
        mode: {
          label: 'Mode',
          type: 'select',
          defaultValue: CopyInputModes.DEFAULT,
          options: valueOptions(Object.values(CopyInputModes)),
        },
        text: { label: 'Button Text', type: 'text', defaultValue: 'Copy' },
        hideMessage: { label: 'Hide Message', type: 'text', defaultValue: '' },
        buttonColor: {
          label: 'Button Color',
          type: 'select',
          defaultValue: 'PRIMARY',
          options: keyOptions(ButtonColors),
        },
        buttonLook: { label: 'Button Look', type: 'select', defaultValue: 'FILLED', options: keyOptions(ButtonLooks) },
        supportsCopy: { label: 'Supports Copy', type: 'boolean', defaultValue: true },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'ColorPicker',
      id: 'color-picker',
      component: ColorPickerStory,
      controls: {
        customColor: { label: 'Custom Color', type: 'color', defaultValue: '#5865f2' },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        shouldRenderSingleRow: { label: 'Single Row', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'CustomColorPicker',
      id: 'custom-color-picker',
      component: CustomColorPickerStory,
      controls: {
        value: { label: 'Initial Value', type: 'color', defaultValue: '#5865f2' },
        eagerUpdate: { label: 'Eager Update', type: 'boolean', defaultValue: false },
        showEyeDropper: { label: 'Show Eye Dropper', type: 'boolean', defaultValue: false },
        suggestedColors: { label: 'Suggested Colors', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'CharacterCount',
      id: 'character-count',
      component: CharacterCountStory,
      controls: { maxLength: { label: 'Max Length', type: 'number', defaultValue: 32, minValue: 1 } },
    },
  ],
};

export default forms;
