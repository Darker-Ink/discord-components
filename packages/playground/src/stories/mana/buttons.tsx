import { useState } from 'react';
import {
  Button,
  ButtonGroup,
  IconButton,
  TextButton,
  ToggleButton,
  ToggleIconButton,
  type ButtonGroupProps,
  type ButtonSize,
  type IconButtonProps,
  type ToggleIconButtonProps,
} from '@discord-components/components';
import { ClydeIcon, MicrophoneIcon, MicrophoneSlashIcon } from '@discord-components/icons';
import type { StoryGroup } from '../../types';

const IconButtonStory = (props: Omit<IconButtonProps, 'icon' | 'aria-label'>) => (
  <IconButton {...props} icon={ClydeIcon} aria-label="Clyde" />
);

IconButtonStory.displayName = 'IconButtonStory';

interface ToggleButtonStoryProps {
  disabled: boolean;
  size: ButtonSize;
  text: string;
}

const ToggleButtonStory = ({ disabled, size, text }: ToggleButtonStoryProps) => {
  const [pressed, setPressed] = useState(false);
  return (
    <ToggleButton text={text} size={size} disabled={disabled} pressed={pressed} onClick={() => setPressed(!pressed)} />
  );
};

ToggleButtonStory.displayName = 'ToggleButtonStory';

const ToggleIconButtonStory = (
  props: Omit<ToggleIconButtonProps, 'icon' | 'selectedIcon' | 'pressed' | 'aria-label' | 'onClick'>,
) => {
  const [pressed, setPressed] = useState(false);
  return (
    <ToggleIconButton
      {...props}
      icon={MicrophoneIcon}
      selectedIcon={MicrophoneSlashIcon}
      pressed={pressed}
      aria-label={pressed ? 'Unmute microphone' : 'Mute microphone'}
      onClick={() => setPressed((value) => !value)}
    />
  );
};

ToggleIconButtonStory.displayName = 'ToggleIconButtonStory';

const ButtonGroupStory = (props: Omit<ButtonGroupProps, 'children'>) => (
  <ButtonGroup {...props}>
    <Button variant="secondary" text="Cancel" />
    <Button variant="primary" text="Submit" />
  </ButtonGroup>
);

ButtonGroupStory.displayName = 'ButtonGroupStory';

const buttons: StoryGroup = {
  title: 'Buttons',
  stories: [
    {
      name: 'Button',
      id: 'button',
      component: Button,
      docs: 'https://design.discord.tools/components/web/buttons/button',
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Click me' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Critical Primary', value: 'critical-primary' },
            { label: 'Critical Secondary', value: 'critical-secondary' },
            { label: 'Active', value: 'active' },
            { label: 'Overlay Primary', value: 'overlay-primary' },
            { label: 'Overlay Secondary', value: 'overlay-secondary' },
            { label: 'Expressive', value: 'expressive' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        loading: { label: 'Loading', type: 'boolean', defaultValue: false },
        fullWidth: { label: 'Full Width', type: 'boolean', defaultValue: false },
        minWidth: { label: 'Min width', type: 'text', defaultValue: '' },
      },
    },
    {
      name: 'IconButton',
      id: 'icon-button',
      docs: 'https://design.discord.tools/components/web/buttons/icon-button',
      component: IconButtonStory,
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Critical Primary', value: 'critical-primary' },
            { label: 'Critical Secondary', value: 'critical-secondary' },
            { label: 'Active', value: 'active' },
            { label: 'Overlay Primary', value: 'overlay-primary' },
            { label: 'Overlay Secondary', value: 'overlay-secondary' },
            { label: 'Icon Only', value: 'icon-only' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        loading: { label: 'Loading', type: 'boolean', defaultValue: false },
      },
    },
    {
      id: 'toggle-button',
      name: 'ToggleButton',
      component: ToggleButtonStory,
      controls: {
        text: { type: 'text', label: 'Text', defaultValue: 'Toggle me' },
        size: {
          type: 'select',
          label: 'Size',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
      },
    },
    {
      name: 'ToggleIconButton',
      id: 'toggle-icon-button',
      component: ToggleIconButtonStory,
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Critical', value: 'critical' },
            { label: 'Icon Only', value: 'icon-only' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'TextButton',
      id: 'text-button',
      docs: 'https://design.discord.tools/components/web/buttons/text-button',
      component: TextButton,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Link Button' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Always White', value: 'always-white' },
            { label: 'Critical', value: 'critical' },
          ],
        },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'ButtonGroup',
      id: 'button-group',
      docs: 'https://design.discord.tools/components/web/buttons/button-group',
      component: ButtonGroupStory,
      controls: {
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        direction: {
          label: 'Direction',
          type: 'select',
          defaultValue: 'horizontal',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
        },
        fullWidth: { label: 'Full Width', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default buttons;
