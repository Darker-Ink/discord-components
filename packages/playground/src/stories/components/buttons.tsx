import { useState } from 'react';
import { CloseButton, Hamburger, PlayPauseButton, type ButtonSize } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import { noop, valueOptions } from './shared';

const sizeControl = {
  label: 'Size',
  type: 'select' as const,
  defaultValue: 'md',
  options: valueOptions(['xs', 'sm', 'md']),
};

interface CloseButtonStoryProps {
  size: ButtonSize;
  variant: 'icon-only' | 'secondary' | 'overlay-secondary';
  disabled: boolean;
}

const CloseButtonStory = (props: CloseButtonStoryProps) => <CloseButton {...props} onClick={noop} />;

CloseButtonStory.displayName = 'CloseButtonStory';

interface PlayPauseButtonStoryProps {
  size: ButtonSize;
  disabled: boolean;
}

const PlayPauseButtonStory = (props: PlayPauseButtonStoryProps) => {
  const [playing, setPlaying] = useState(false);
  return <PlayPauseButton {...props} playing={playing} onClick={() => setPlaying((value) => !value)} />;
};

PlayPauseButtonStory.displayName = 'PlayPauseButtonStory';

const HamburgerStory = () => {
  const [open, setOpen] = useState(false);
  return <Hamburger open={open} aria-label="Toggle sidebar" onClick={() => setOpen((value) => !value)} />;
};

HamburgerStory.displayName = 'HamburgerStory';

const buttons: StoryGroup = {
  title: 'Buttons',
  stories: [
    {
      name: 'CloseButton',
      id: 'close-button',
      component: CloseButtonStory,
      controls: {
        size: sizeControl,
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'icon-only',
          options: valueOptions(['icon-only', 'secondary', 'overlay-secondary']),
        },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'PlayPauseButton',
      id: 'play-pause-button',
      component: PlayPauseButtonStory,
      controls: { size: sizeControl, disabled: { label: 'Disabled', type: 'boolean', defaultValue: false } },
    },
    { name: 'Hamburger', id: 'hamburger', component: HamburgerStory },
  ],
};

export default buttons;
