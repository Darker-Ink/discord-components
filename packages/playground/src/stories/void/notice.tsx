import type { CSSProperties } from 'react';
import {
  Notice,
  NoticeButton,
  NoticeButtonAnchor,
  NoticeCloseButton,
  NoticeColors,
  PrimaryCTANoticeButton,
  Stack,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';

type ColorName = keyof typeof NoticeColors;

const COLOR_NAMES = Object.keys(NoticeColors) as ColorName[];

const toLabel = (name: string) =>
  name
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const NOTICE_TYPE = 'LAUNCH_GAME_FAILURE';

interface NoticeStoryProps {
  message: string;
  color: ColorName;
  actions: 'none' | 'cta' | 'ctaWithSecondary' | 'link';
  actionLabel: string;
  minorButtons: boolean;
  dismissible: boolean;
  customBackground?: string;
  customText?: string;
}

const NoticeStory = ({
  message,
  color,
  actions,
  actionLabel,
  minorButtons,
  dismissible,
  customBackground,
  customText,
}: NoticeStoryProps) => {
  const isCustom = color === 'CUSTOM';
  const style: CSSProperties = {};
  if (isCustom && customBackground != null && customBackground !== '') style.backgroundColor = customBackground;
  if (isCustom && customText != null && customText !== '') style.color = customText;
  return (
    <Notice color={NoticeColors[color]} style={Object.keys(style).length > 0 ? style : null}>
      {message}
      {actions === 'cta' || actions === 'ctaWithSecondary' ? (
        <PrimaryCTANoticeButton noticeType={NOTICE_TYPE} minor={minorButtons}>
          {actionLabel}
        </PrimaryCTANoticeButton>
      ) : null}
      {actions === 'ctaWithSecondary' ? <NoticeButton minor={minorButtons}>Maybe later</NoticeButton> : null}
      {actions === 'link' ? (
        <NoticeButtonAnchor noticeType={NOTICE_TYPE} href="https://support.discord.com">
          {actionLabel}
        </NoticeButtonAnchor>
      ) : null}
      {dismissible ? <NoticeCloseButton noticeType={NOTICE_TYPE} onClick={() => {}} /> : null}
    </Notice>
  );
};

NoticeStory.displayName = 'NoticeStory';

const AllColors = ({ message }: { message: string }) => (
  <Stack gap={8}>
    {COLOR_NAMES.map((name) => (
      <Notice key={name} color={NoticeColors[name]}>{`${toLabel(name)}: ${message}`}</Notice>
    ))}
  </Stack>
);

AllColors.displayName = 'AllColors';

const notice: StoryGroup = {
  title: 'Notice',
  stories: [
    {
      name: 'Notice',
      id: 'notice',
      component: NoticeStory,
      controls: {
        color: {
          label: 'Color',
          type: 'select',
          defaultValue: 'BRAND',
          options: COLOR_NAMES.map((name) => ({ label: toLabel(name), value: name })),
        },
        message: {
          label: 'Message',
          type: 'text',
          defaultValue: 'This is a notice message with important information.',
        },
        actions: {
          label: 'Actions',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Primary button', value: 'cta' },
            { label: 'Primary + secondary buttons', value: 'ctaWithSecondary' },
            { label: 'Link', value: 'link' },
          ],
        },
        actionLabel: { label: 'Action label', type: 'text', defaultValue: 'Upgrade' },
        minorButtons: { label: 'Use smaller "minor" buttons', type: 'boolean', defaultValue: false },
        dismissible: { label: 'Show close button', type: 'boolean', defaultValue: false },
        customBackground: { label: 'Background (Custom color only)', type: 'color', defaultValue: undefined },
        customText: { label: 'Text color (Custom color only)', type: 'color', defaultValue: undefined },
      },
    },
    {
      name: 'All Colors',
      id: 'notice-colors',
      component: AllColors,
      controls: { message: { label: 'Message', type: 'text', defaultValue: 'This is a notice message.' } },
    },
  ],
};

export default notice;
