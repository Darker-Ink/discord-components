import { Stack, Text } from '@discord-mana/components';
import {
  BotTag,
  BotTagTypes,
  Emoji,
  EMOJI_SIZES,
  MaskedLink,
  MessageTimestamp,
  type BotTagType,
  type EmojiSize,
} from '@discord-mana/messages';
import type { StoryGroup } from '../../types';
import { keyOptions, valueOptions } from './shared';

interface BotTagStoryProps {
  type: keyof typeof BotTagTypes;
  verified: boolean;
  invertColor: boolean;
  hideIcon: boolean;
  useRemSizes: boolean;
}

const BotTagStory = ({ type, ...props }: BotTagStoryProps) => (
  <Stack gap={16} align="start">
    <BotTag {...props} type={BotTagTypes[type] as BotTagType} />
    {Object.entries(BotTagTypes).map(([name, value]) => (
      <Stack key={name} direction="horizontal" gap={12} align="center">
        <Text variant="body-sm/normal" color="text-subtle" style={{ width: 160 }}>
          {name}
        </Text>
        <BotTag {...props} type={value} />
      </Stack>
    ))}
  </Stack>
);

BotTagStory.displayName = 'BotTagStory';

interface EmojiStoryProps {
  emojiName: string;
  emojiId: string;
  animated: boolean;
  size: EmojiSize;
}

const EmojiStory = ({ emojiId, ...props }: EmojiStoryProps) => (
  <Emoji {...props} emojiId={emojiId === '' ? null : emojiId} alt={props.emojiName} />
);

EmojiStory.displayName = 'EmojiStory';

interface MessageTimestampStoryProps {
  timestamp: string;
  compact: boolean;
  cozyAlt: boolean;
  isEdited: boolean;
  isInline: boolean;
}

const MessageTimestampStory = (props: MessageTimestampStoryProps) => <MessageTimestamp {...props} />;

MessageTimestampStory.displayName = 'MessageTimestampStory';

interface MaskedLinkStoryProps {
  text: string;
  href: string;
  title: string;
  trusted: boolean;
}

const MaskedLinkStory = ({ text, title, ...props }: MaskedLinkStoryProps) => (
  <Text variant="body-md/normal">
    Check out{' '}
    <MaskedLink {...props} title={title === '' ? undefined : title}>
      {text}
    </MaskedLink>{' '}
    for more.
  </Text>
);

MaskedLinkStory.displayName = 'MaskedLinkStory';

const messageParts: StoryGroup = {
  title: 'Message Parts',
  stories: [
    {
      name: 'BotTag',
      id: 'bot-tag',
      component: BotTagStory,
      controls: {
        type: { label: 'Type', type: 'select', defaultValue: 'BOT', options: keyOptions(BotTagTypes) },
        verified: { label: 'Verified', type: 'boolean', defaultValue: false },
        invertColor: { label: 'Invert Color', type: 'boolean', defaultValue: false },
        hideIcon: { label: 'Hide Icon', type: 'boolean', defaultValue: false },
        useRemSizes: { label: 'Rem Sizes', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Emoji',
      id: 'emoji',
      component: EmojiStory,
      controls: {
        emojiName: { label: 'Name or Unicode', type: 'text', defaultValue: '🔥' },
        emojiId: { label: 'Custom Emoji ID', type: 'text', defaultValue: '' },
        animated: { label: 'Animated', type: 'boolean', defaultValue: false },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'default',
          options: valueOptions(Object.keys(EMOJI_SIZES)),
        },
      },
    },
    {
      name: 'MessageTimestamp',
      id: 'message-timestamp',
      component: MessageTimestampStory,
      controls: {
        timestamp: { label: 'Timestamp', type: 'text', defaultValue: '2026-11-26T16:20:00.000Z' },
        compact: { label: 'Compact', type: 'boolean', defaultValue: false },
        cozyAlt: { label: 'Cozy Alt', type: 'boolean', defaultValue: false },
        isEdited: { label: 'Edited', type: 'boolean', defaultValue: false },
        isInline: { label: 'Inline', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'MaskedLink',
      id: 'masked-link',
      component: MaskedLinkStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'the developer docs' },
        href: { label: 'Href', type: 'text', defaultValue: 'https://discord.com/developers/docs' },
        title: { label: 'Title', type: 'text', defaultValue: '' },
        trusted: { label: 'Trusted', type: 'boolean', defaultValue: true },
      },
    },
  ],
};

export default messageParts;
