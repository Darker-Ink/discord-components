import { useState, type ElementType } from 'react';
import {
  Button,
  Clickable,
  ClickableContainer,
  FocusRing,
  HiddenVisually,
  Stack,
  Text,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { valueOptions } from './shared';

interface ClickableStoryProps {
  tag: ElementType;
  ignoreKeyPress: boolean;
}

// A focusable element that turns Enter and Space into clicks; click or focus it and press a key.
const ClickableStory = (props: ClickableStoryProps) => {
  const [clicks, setClicks] = useState(0);
  return (
    <Stack gap={12} align="start">
      <Clickable {...props} className={styles.box} onClick={() => setClicks((count) => count + 1)}>
        Click me
      </Clickable>
      <Text variant="body-sm/normal" color="text-subtle">
        Clicked {clicks} times
      </Text>
    </Stack>
  );
};

ClickableStory.displayName = 'ClickableStory';

// A clickable area whose focusable button sits over its content, so the content can hold other controls.
const ClickableContainerStory = ({ label }: { label: string }) => {
  const [clicks, setClicks] = useState(0);
  return (
    <Stack gap={12} align="start">
      <ClickableContainer
        className={styles.box}
        aria-label={label}
        onClick={() => setClicks((count) => count + 1)}
        style={{ padding: 16 }}
      >
        <Text variant="body-md/medium">{label}</Text>
      </ClickableContainer>
      <Text variant="body-sm/normal" color="text-subtle">
        Clicked {clicks} times
      </Text>
    </Stack>
  );
};

ClickableContainerStory.displayName = 'ClickableContainerStory';

interface HiddenVisuallyStoryProps {
  text: string;
  showOnFocus: boolean;
}

const HiddenVisuallyStory = ({ text, showOnFocus }: HiddenVisuallyStoryProps) => (
  <Stack gap={12} align="start">
    <Text variant="body-sm/normal" color="text-subtle">
      {showOnFocus
        ? 'Press Tab: the text below becomes visible while it has focus.'
        : 'The text below is only read by screen readers.'}
    </Text>
    <HiddenVisually showOnFocus={showOnFocus} tabIndex={showOnFocus ? 0 : undefined}>
      {text}
    </HiddenVisually>
  </Stack>
);

HiddenVisuallyStory.displayName = 'HiddenVisuallyStory';

interface FocusRingStoryProps {
  offset: number;
  within: boolean;
  focused: boolean | 'auto';
}

const FocusRingStory = ({ offset, within, focused }: FocusRingStoryProps) => (
  <Stack gap={16} align="start">
    <Text variant="body-sm/normal" color="text-subtle">
      Tab to the element to see its focus ring.
    </Text>
    <FocusRing offset={offset} within={within} focused={focused === 'auto' ? undefined : focused}>
      <div className={styles.box} tabIndex={within ? undefined : 0}>
        {within ? <Button size="sm" text="Focusable child" /> : 'Focusable'}
      </div>
    </FocusRing>
  </Stack>
);

FocusRingStory.displayName = 'FocusRingStory';

const utilities: StoryGroup = {
  title: 'Utilities',
  stories: [
    {
      name: 'Clickable',
      id: 'clickable',
      component: ClickableStory,
      controls: {
        tag: { label: 'Tag', type: 'select', defaultValue: 'div', options: valueOptions(['div', 'span', 'li']) },
        ignoreKeyPress: { label: 'Ignore Key Press', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'ClickableContainer',
      id: 'clickable-container',
      component: ClickableContainerStory,
      controls: { label: { label: 'Label', type: 'text', defaultValue: 'Open server settings' } },
    },
    {
      name: 'HiddenVisually',
      id: 'hidden-visually',
      component: HiddenVisuallyStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Skip to content' },
        showOnFocus: { label: 'Show On Focus', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'FocusRing',
      id: 'focus-ring',
      component: FocusRingStory,
      controls: {
        offset: { label: 'Offset', type: 'number', defaultValue: 4 },
        within: { label: 'Within', type: 'boolean', defaultValue: false },
        focused: {
          label: 'Focused',
          type: 'select',
          defaultValue: 'auto',
          options: [
            { label: 'Auto', value: 'auto' },
            { label: 'Always', value: true },
            { label: 'Never', value: false },
          ],
        },
      },
    },
  ],
};

export default utilities;
