import { useState } from 'react';
import {
  Button,
  RadioGroup,
  Stack,
  Switch,
  Tabs,
  TextInput,
  type TabsItem,
  type TabsKeyboardActivation,
  type TabsPanelAnimation,
  type TabsVariant,
} from '@discord-mana/components';
import { ClydeIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

const AccountPanel = () => (
  <Stack gap={16} padding={{ top: 16 }}>
    <TextInput label="Display Name" placeholder="Jane Doe" />
    <TextInput label="Email" type="email" placeholder="jane@example.com" />
    <Stack direction="horizontal">
      <Button text="Save Changes" variant="secondary" size="sm" />
    </Stack>
  </Stack>
);

AccountPanel.displayName = 'AccountPanel';

const NotificationsPanel = () => {
  const [value, setValue] = useState('mentions');
  return (
    <Stack gap={16} padding={{ top: 16 }}>
      <RadioGroup
        label="Notify me about"
        value={value}
        onChange={setValue}
        options={[
          { value: 'all', name: 'All messages' },
          { value: 'mentions', name: 'Only @mentions' },
          { value: 'none', name: 'Nothing', desc: 'You can still browse this server at your own pace.' },
        ]}
      />
    </Stack>
  );
};

NotificationsPanel.displayName = 'NotificationsPanel';

const PrivacyPanel = () => {
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);
  const [shareActivity, setShareActivity] = useState(false);
  return (
    <Stack gap={16} padding={{ top: 16 }}>
      <Switch
        label="Allow direct messages"
        description="Members of this server can send you direct messages."
        checked={allowDirectMessages}
        onChange={setAllowDirectMessages}
      />
      <Switch
        label="Share activity status"
        description="Show other members what you're playing."
        checked={shareActivity}
        onChange={setShareActivity}
      />
    </Stack>
  );
};

PrivacyPanel.displayName = 'PrivacyPanel';

const ITEMS: TabsItem[] = [
  { id: 'account', label: 'Account', icon: ClydeIcon, panel: () => <AccountPanel /> },
  { id: 'notifications', label: 'Notifications', count: 10, panel: () => <NotificationsPanel /> },
  { id: 'privacy', label: 'Privacy', panel: () => <PrivacyPanel /> },
];

interface TabsStoryProps {
  variant: TabsVariant;
  showCounts: boolean;
  disabled: boolean;
  keyboardActivation: TabsKeyboardActivation;
  panelAnimation: TabsPanelAnimation;
}

const TabsStory = ({ variant, showCounts, disabled, keyboardActivation, panelAnimation }: TabsStoryProps) => {
  const [selectedId, setSelectedId] = useState('account');
  const items = showCounts ? ITEMS : ITEMS.map((item) => ({ ...item, count: undefined }));
  return (
    <Tabs
      aria-label="User settings"
      items={items}
      selectedId={selectedId}
      onChange={setSelectedId}
      variant={variant}
      disabled={disabled}
      keyboardActivation={keyboardActivation}
      panelAnimation={panelAnimation}
    />
  );
};

TabsStory.displayName = 'TabsStory';

const tabs: StoryGroup = {
  title: 'Tabs',
  stories: [
    {
      name: 'Tabs',
      id: 'tabs',
      component: TabsStory,
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Overlay', value: 'overlay' },
          ],
        },
        showCounts: { label: 'Show Counts', type: 'boolean', defaultValue: true },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        keyboardActivation: {
          label: 'Keyboard Activation',
          type: 'select',
          defaultValue: 'manual',
          options: [
            { label: 'Manual', value: 'manual' },
            { label: 'Automatic', value: 'automatic' },
          ],
        },
        panelAnimation: {
          label: 'Panel Animation',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Fade', value: 'fade' },
          ],
        },
      },
    },
  ],
};

export default tabs;
