import {
  Anchor,
  H,
  Heading,
  HeadingLevel,
  KeyCombo,
  MarqueeText,
  Stack,
  Text,
  TextVariants,
  type TextVariant,
} from '@discord-mana/components';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { valueOptions } from './shared';

const variantOptions = valueOptions(TextVariants);

interface HeadingStoryProps {
  variant: TextVariant;
  text: string;
  forceLevel: number | undefined;
}

// Each HeadingLevel nests the next heading one level deeper (h1 → h2 → h3).
const HeadingStory = ({ variant, text, forceLevel }: HeadingStoryProps) => (
  <HeadingLevel forceLevel={forceLevel}>
    <Stack gap={12}>
      <Heading variant={variant}>{text}</Heading>
      <HeadingLevel component={<Heading variant="heading-md/semibold">Nested section</Heading>}>
        <Heading variant="heading-sm/semibold">Deeper section</Heading>
        <H style={{ color: 'var(--text-default)', margin: 0 }}>Plain H at the same level</H>
      </HeadingLevel>
    </Stack>
  </HeadingLevel>
);

HeadingStory.displayName = 'HeadingStory';

interface AnchorStoryProps {
  text: string;
  href: string;
  useDefaultUnderlineStyles: boolean;
  inText: boolean;
}

const AnchorStory = ({ text, inText, ...props }: AnchorStoryProps) => {
  const anchor = (
    <Anchor {...props} target="_blank">
      {text}
    </Anchor>
  );
  return inText ? (
    <Text variant="body-md/normal">Read the {anchor} before you post.</Text>
  ) : (
    <Text variant="body-md/normal">{anchor}</Text>
  );
};

AnchorStory.displayName = 'AnchorStory';

const SHORTCUTS = ['mod+k', 'ctrl+shift+i', 'alt+up', 'shift+return', 'esc', 'mod+backspace', 'pageup', 'left+right'];

const KeyComboStory = ({ shortcut, dim }: { shortcut: string; dim: boolean }) => (
  <Stack gap={12}>
    <KeyCombo shortcut={shortcut} dim={dim} />
    {SHORTCUTS.map((keys) => (
      <Stack key={keys} direction="horizontal" gap={12} align="center">
        <Text variant="body-sm/normal" color="text-subtle" style={{ width: 120 }}>
          {keys}
        </Text>
        <KeyCombo shortcut={keys} dim={dim} />
      </Stack>
    ))}
  </Stack>
);

KeyComboStory.displayName = 'KeyComboStory';

interface MarqueeTextStoryProps {
  variant: TextVariant;
  text: string;
  width: number;
}

// The text scrolls on hover when it doesn't fit its container.
const MarqueeTextStory = ({ variant, text, width }: MarqueeTextStoryProps) => (
  <div className={styles.frame} style={{ width, padding: 8, color: 'var(--text-default)' }}>
    <MarqueeText variant={variant}>{text}</MarqueeText>
  </div>
);

MarqueeTextStory.displayName = 'MarqueeTextStory';

const typography: StoryGroup = {
  title: 'Typography',
  stories: [
    {
      name: 'Heading',
      id: 'heading',
      component: HeadingStory,
      controls: {
        variant: { label: 'Variant', type: 'select', defaultValue: 'heading-xl/semibold', options: variantOptions },
        text: { label: 'Text', type: 'text', defaultValue: 'Server Settings' },
        forceLevel: { label: 'Force Level', type: 'number', defaultValue: undefined, minValue: 1 },
      },
    },
    {
      name: 'Anchor',
      id: 'anchor',
      component: AnchorStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Community Guidelines' },
        href: { label: 'Href', type: 'text', defaultValue: 'https://discord.com/guidelines' },
        useDefaultUnderlineStyles: { label: 'Default Underline Styles', type: 'boolean', defaultValue: true },
        inText: { label: 'Inside Text', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'KeyCombo',
      id: 'key-combo',
      component: KeyComboStory,
      controls: {
        shortcut: { label: 'Shortcut', type: 'text', defaultValue: 'mod+shift+k' },
        dim: { label: 'Dim', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'MarqueeText',
      id: 'marquee-text',
      component: MarqueeTextStory,
      controls: {
        variant: { label: 'Variant', type: 'select', defaultValue: 'body-sm/medium', options: variantOptions },
        text: {
          label: 'Text',
          type: 'text',
          defaultValue: 'Listening to a song with a very long title that does not fit',
        },
        width: { label: 'Width', type: 'slider', defaultValue: 200, minValue: 80, maxValue: 600 },
      },
    },
  ],
};

export default typography;
