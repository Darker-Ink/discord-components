import { useState } from 'react';
import {
  Anchor,
  Button,
  InlineNotice,
  Stack,
  type InlineNoticeRole,
  type InlineNoticeType,
} from '@discord-components/components';
import type { Controls, StoryGroup } from '../../types';

// Discord's English copy for its keyboard-navigation string, which the story uses as real copy with a
// link. Its `$link` tag renders an Anchor to the `keyboardNavArticle` URL.
const keyboardNavMessage = (keyboardNavArticle: string) => [
  'This key is used for ',
  <Anchor key="link" href={keyboardNavArticle}>
    keyboard navigation
  </Anchor>,
  '. It will no longer activate Keyboard Mode.',
];

const controls: Controls = {
  type: {
    label: 'Type',
    type: 'select',
    defaultValue: 'critical',
    options: ['info', 'success', 'warning', 'critical'].map((type) => ({ label: type, value: type })),
  },
  text: {
    label: 'Message',
    type: 'text',
    defaultValue: 'Something went wrong. Please try again, or reach out to support if it keeps happening.',
  },
  withLink: { label: 'Message: use real copy with a link', type: 'boolean', defaultValue: false },
  hidden: { label: 'Hidden', type: 'boolean', defaultValue: false },
  title: { label: 'Title (empty for none)', type: 'text', defaultValue: 'Notice title' },
  dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
  ctaText: { label: 'CTA text (empty for none)', type: 'text', defaultValue: 'Take action' },
  ctaLoading: { label: 'CTA loading', type: 'boolean', defaultValue: false },
  role: {
    label: 'Role (screen reader behavior)',
    type: 'select',
    defaultValue: 'alert',
    options: [
      { label: 'alert (announce immediately)', value: 'alert' },
      { label: 'status (announce when idle)', value: 'status' },
      { label: 'none (no announcement)', value: 'none' },
    ],
  },
};

interface InlineNoticeStoryProps {
  type: InlineNoticeType;
  text: string;
  withLink: boolean;
  hidden: boolean;
  title: string;
  dismissable: boolean;
  ctaText: string;
  ctaLoading: boolean;
  role: InlineNoticeRole;
}

const InlineNoticeStory = ({
  type,
  text,
  withLink,
  hidden,
  title,
  dismissable,
  ctaText,
  ctaLoading,
  role,
}: InlineNoticeStoryProps) => {
  const [dismissed, setDismissed] = useState(false);
  const message = withLink ? keyboardNavMessage('https://support.discord.com') : text;
  if (dismissed)
    return (
      <Stack direction="horizontal">
        <Button text="Reset dismissed notice" variant="secondary" size="sm" onClick={() => setDismissed(false)} />
      </Stack>
    );
  return (
    <InlineNotice
      type={type}
      hidden={hidden}
      message={message}
      title={title === '' ? undefined : title}
      onDismiss={dismissable ? () => setDismissed(true) : undefined}
      action={ctaText === '' ? undefined : { text: ctaText, onClick: () => {}, loading: ctaLoading }}
      role={role}
    />
  );
};

InlineNoticeStory.displayName = 'InlineNoticeStory';

const inlineNotice: StoryGroup = {
  title: 'InlineNotice',
  stories: [{ name: 'InlineNotice', id: 'inline-notice', component: InlineNoticeStory, controls }],
};

export default inlineNotice;
