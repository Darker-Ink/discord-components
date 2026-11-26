import {
  ButtonColors,
  ButtonLooks,
  ButtonSizes,
  Flex,
  FlexAlign,
  FlexDirection,
  FlexJustify,
  FlexWrap,
  LegacyButton,
  Stack,
  Text,
  type ButtonColor,
  type ButtonLook,
  type ButtonSizeClass,
  type FlexAlignClass,
  type FlexDirectionClass,
  type FlexJustifyClass,
  type FlexWrapClass,
} from '@discord-mana/components';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { keyOptions, noop } from './shared';

interface LegacyButtonStoryProps {
  text: string;
  look: keyof typeof ButtonLooks;
  color: keyof typeof ButtonColors;
  size: keyof typeof ButtonSizes;
  fullWidth: boolean;
  grow: boolean;
  disabled: boolean;
  submitting: boolean;
}

const LegacyButtonStory = ({ text, look, color, size, ...props }: LegacyButtonStoryProps) => (
  <LegacyButton
    {...props}
    look={ButtonLooks[look] as ButtonLook}
    color={ButtonColors[color] as ButtonColor}
    size={ButtonSizes[size] as ButtonSizeClass}
    onClick={noop}
  >
    {text}
  </LegacyButton>
);

LegacyButtonStory.displayName = 'LegacyButtonStory';

const LOOKS = ['FILLED', 'OUTLINED', 'LINK', 'BLANK'] as const;
const COLORS = ['BRAND', 'BRAND_INVERTED', 'RED', 'GREEN', 'PRIMARY', 'LINK', 'WHITE', 'TRANSPARENT'] as const;
const SIZES = ['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'MIN', 'MAX'] as const;

const AllLegacyButtonsStory = ({ disabled }: { disabled: boolean }) => (
  <Stack gap={24}>
    {LOOKS.map((look) => (
      <Stack key={look} gap={8}>
        <Text variant="heading-sm/semibold">{look}</Text>
        <Stack direction="horizontal" gap={8} wrap align="center">
          {COLORS.map((color) => (
            <LegacyButton
              key={color}
              look={ButtonLooks[look]}
              color={ButtonColors[color]}
              size={ButtonSizes.SMALL}
              disabled={disabled}
            >
              {color}
            </LegacyButton>
          ))}
        </Stack>
      </Stack>
    ))}
    <Stack gap={8}>
      <Text variant="heading-sm/semibold">Sizes</Text>
      <Stack direction="horizontal" gap={8} wrap align="center">
        {SIZES.map((size) => (
          <LegacyButton key={size} size={ButtonSizes[size]} disabled={disabled}>
            {size}
          </LegacyButton>
        ))}
      </Stack>
    </Stack>
  </Stack>
);

AllLegacyButtonsStory.displayName = 'AllLegacyButtonsStory';

interface FlexStoryProps {
  direction: keyof typeof FlexDirection;
  justify: keyof typeof FlexJustify;
  align: keyof typeof FlexAlign;
  wrap: keyof typeof FlexWrap;
  items: number;
}

const FlexStory = ({ direction, justify, align, wrap, items }: FlexStoryProps) => (
  <Flex
    direction={FlexDirection[direction] as FlexDirectionClass}
    justify={FlexJustify[justify] as FlexJustifyClass}
    align={FlexAlign[align] as FlexAlignClass}
    wrap={FlexWrap[wrap] as FlexWrapClass}
    className={styles.frame}
    style={{ minHeight: 200, gap: 8, padding: 8 }}
  >
    {Array.from({ length: items }, (_, index) => (
      <Flex.Child key={index} grow={0}>
        <div className={styles.box} style={{ minHeight: 40 + (index % 3) * 12 }}>
          {index + 1}
        </div>
      </Flex.Child>
    ))}
  </Flex>
);

FlexStory.displayName = 'FlexStory';

const legacy: StoryGroup = {
  title: 'Legacy',
  stories: [
    {
      name: 'LegacyButton',
      id: 'legacy-button',
      component: LegacyButtonStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Button' },
        look: { label: 'Look', type: 'select', defaultValue: 'FILLED', options: keyOptions(ButtonLooks) },
        color: { label: 'Color', type: 'select', defaultValue: 'BRAND', options: keyOptions(ButtonColors) },
        size: { label: 'Size', type: 'select', defaultValue: 'MEDIUM', options: keyOptions(ButtonSizes) },
        fullWidth: { label: 'Full Width', type: 'boolean', defaultValue: false },
        grow: { label: 'Grow', type: 'boolean', defaultValue: true },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        submitting: { label: 'Submitting', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'LegacyButton (All)',
      id: 'legacy-button-all',
      component: AllLegacyButtonsStory,
      controls: { disabled: { label: 'Disabled', type: 'boolean', defaultValue: false } },
    },
    {
      name: 'Flex',
      id: 'flex',
      component: FlexStory,
      controls: {
        direction: {
          label: 'Direction',
          type: 'select',
          defaultValue: 'HORIZONTAL',
          options: keyOptions(FlexDirection),
        },
        justify: { label: 'Justify', type: 'select', defaultValue: 'START', options: keyOptions(FlexJustify) },
        align: { label: 'Align', type: 'select', defaultValue: 'STRETCH', options: keyOptions(FlexAlign) },
        wrap: { label: 'Wrap', type: 'select', defaultValue: 'NO_WRAP', options: keyOptions(FlexWrap) },
        items: { label: 'Items', type: 'slider', defaultValue: 4, minValue: 1, maxValue: 12 },
      },
    },
  ],
};

export default legacy;
