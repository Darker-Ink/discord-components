import { useRef, useState } from 'react';
import {
  Button,
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioItem,
  MenuSeparator,
  MenuSwitchItem,
  Popout,
  type MenuItemColor,
  type MenuVariant,
} from '@discord-components/components';
import {
  CopyIcon,
  LinkExternalSmallIcon,
  PencilIcon,
  PinIcon,
  SettingsIcon,
  TrashIcon,
} from '@discord-components/icons';
import type { StoryGroup } from '../../types';
import styles from './menu.module.css';

interface MenuStoryProps {
  variant: MenuVariant;
  hideScroller: boolean;
  showGroups: boolean;
  showCheckboxItems: boolean;
  showRadioItems: boolean;
  showSwitchItems: boolean;
  showSubmenus: boolean;
  showIcons: boolean;
  showShortcuts: boolean;
  showSubtext: boolean;
  showDisabledItems: boolean;
  showColoredItems: boolean;
  showLoading: boolean;
  showTrailingIndicator: boolean;
  dangerItemColor: MenuItemColor;
}

const noop = () => {};

const MenuStory = ({
  variant,
  hideScroller,
  showGroups,
  showCheckboxItems,
  showRadioItems,
  showSwitchItems,
  showSubmenus,
  showIcons,
  showShortcuts,
  showSubtext,
  showDisabledItems,
  showColoredItems,
  showLoading,
  showTrailingIndicator,
  dangerItemColor,
}: MenuStoryProps) => {
  const [notifications, setNotifications] = useState(true);
  const [muted, setMuted] = useState(false);
  const [channelType, setChannelType] = useState('text');
  const [viewMode, setViewMode] = useState('cozy');
  const [open, setOpen] = useState(true);
  const targetRef = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.container}>
      {!open && <Button text="Open Menu" onClick={() => setOpen(true)} />}
      <Popout
        renderPopout={({ closePopout }) => (
          <Menu
            data-menu-migrated
            navId="menu-story"
            aria-label="Story Menu"
            variant={variant}
            hideScroller={hideScroller}
            onClose={closePopout}
            onSelect={noop}
          >
            <MenuItem
              id="edit"
              label="Edit Message"
              icon={showIcons ? PencilIcon : undefined}
              leadingAccessory={showIcons ? { type: 'icon', icon: PencilIcon } : undefined}
              shortcut={showShortcuts ? '⌘E' : undefined}
              action={noop}
            />
            <MenuItem
              id="pin"
              label="Pin Message"
              icon={showIcons ? PinIcon : undefined}
              leadingAccessory={showIcons ? { type: 'icon', icon: PinIcon } : undefined}
              subtext={showSubtext ? 'Pin this message to the channel' : undefined}
              badge="beta"
              loading={showLoading}
              action={noop}
            />
            <MenuItem
              id="copy"
              label="Copy Message Link"
              icon={showIcons ? CopyIcon : undefined}
              leadingAccessory={showIcons ? { type: 'icon', icon: CopyIcon } : undefined}
              badge="new"
              action={noop}
            />
            {showDisabledItems && (
              <MenuItem
                id="disabled"
                label="Disabled Item"
                icon={showIcons ? SettingsIcon : undefined}
                leadingAccessory={showIcons ? { type: 'icon', icon: SettingsIcon } : undefined}
                disabled
                action={noop}
              />
            )}
            {showColoredItems && (
              <>
                <MenuSeparator />
                <MenuItem
                  id="brand-item"
                  label="Brand Item"
                  color="brand"
                  trailingIndicator={showTrailingIndicator ? { type: 'icon', icon: LinkExternalSmallIcon } : undefined}
                  action={noop}
                />
                <MenuItem
                  id="premium-item"
                  label="Premium Item"
                  color="premium"
                  icon={showIcons ? SettingsIcon : undefined}
                  leadingAccessory={showIcons ? { type: 'icon', icon: SettingsIcon } : undefined}
                  action={noop}
                />
                <MenuItem
                  id="success-item"
                  label="Success Item"
                  color="success"
                  icon={showIcons ? SettingsIcon : undefined}
                  leadingAccessory={showIcons ? { type: 'icon', icon: SettingsIcon } : undefined}
                  action={noop}
                />
              </>
            )}
            {showSubmenus && (
              <>
                <MenuSeparator />
                <MenuItem id="submenu" label="More Options" icon={showIcons ? SettingsIcon : undefined}>
                  <MenuItem id="submenu-1" label="Submenu Item 1" action={noop} />
                  <MenuItem id="submenu-2" label="Submenu Item 2" action={noop} />
                  <MenuItem id="submenu-3" label="Submenu Item 3" action={noop} />
                </MenuItem>
              </>
            )}
            {showCheckboxItems && (
              <>
                <MenuSeparator />
                <MenuCheckboxItem
                  id="notifications"
                  label="Enable Notifications Enable Notifications Enable Notifications"
                  checked={notifications}
                  action={() => setNotifications(!notifications)}
                />
                <MenuCheckboxItem id="mute" label="Mute Channel" checked={muted} action={() => setMuted(!muted)} />
              </>
            )}
            {showSwitchItems && (
              <>
                <MenuSeparator />
                <MenuSwitchItem
                  id="switch-notifications"
                  label="Push Notifications"
                  checked={notifications}
                  action={() => setNotifications(!notifications)}
                />
              </>
            )}
            {showRadioItems && (
              <>
                <MenuSeparator />
                <MenuGroup label="Channel Type">
                  <MenuRadioItem
                    id="radio-text"
                    group="channel-type"
                    label="Text Channel Text Channel Text Channel Text Channel Text Channel Text Channel "
                    checked={channelType === 'text'}
                    action={() => setChannelType('text')}
                  />
                  <MenuRadioItem
                    id="radio-voice"
                    group="channel-type"
                    label="Voice Channel"
                    checked={channelType === 'voice'}
                    action={() => setChannelType('voice')}
                  />
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup label="View Mode">
                  <MenuRadioItem
                    id="radio-cozy"
                    group="view-mode"
                    label="Cozy"
                    checked={viewMode === 'cozy'}
                    action={() => setViewMode('cozy')}
                  />
                  <MenuRadioItem
                    id="radio-compact"
                    group="view-mode"
                    label="Compact"
                    checked={viewMode === 'compact'}
                    action={() => setViewMode('compact')}
                  />
                </MenuGroup>
              </>
            )}
            {showGroups && (
              <>
                <MenuSeparator />
                <MenuGroup label="Grouped Items">
                  <MenuItem id="group-1" label="Group Item 1" action={noop} />
                  <MenuItem id="group-2" label="Group Item 2" action={noop} />
                  <MenuItem id="group-3" label="Group Item 3" action={noop} />
                </MenuGroup>
              </>
            )}
            <MenuSeparator />
            <MenuItem
              id="delete"
              label="Delete Message"
              color={dangerItemColor}
              icon={showIcons ? TrashIcon : undefined}
              action={noop}
            />
          </Menu>
        )}
        position="bottom"
        align="center"
        shouldShow={open}
        targetElementRef={targetRef}
        onRequestClose={() => setOpen(false)}
      >
        {() => <div ref={targetRef} style={{ width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />}
      </Popout>
    </div>
  );
};

MenuStory.displayName = 'MenuStory';

const menu: StoryGroup = {
  title: 'Menu',
  stories: [
    {
      name: 'Menu',
      id: 'menu',
      component: MenuStory,
      controls: {
        variant: {
          type: 'select',
          label: 'Variant',
          defaultValue: 'flexible',
          options: [
            { label: 'Fixed', value: 'fixed' },
            { label: 'Flexible', value: 'flexible' },
          ],
        },
        hideScroller: { type: 'boolean', label: 'Hide Scroller', defaultValue: false },
        showGroups: { type: 'boolean', label: 'Show Groups', defaultValue: true },
        showCheckboxItems: { type: 'boolean', label: 'Show Checkbox Items', defaultValue: true },
        showRadioItems: { type: 'boolean', label: 'Show Radio Items', defaultValue: true },
        showSwitchItems: { type: 'boolean', label: 'Show Switch Items', defaultValue: true },
        showSubmenus: { type: 'boolean', label: 'Show Submenus', defaultValue: true },
        showIcons: { type: 'boolean', label: 'Show Icons', defaultValue: true },
        showShortcuts: { type: 'boolean', label: 'Show Shortcuts', defaultValue: true },
        showSubtext: { type: 'boolean', label: 'Show Subtext', defaultValue: false },
        showDisabledItems: { type: 'boolean', label: 'Show Disabled Items', defaultValue: true },
        showColoredItems: { type: 'boolean', label: 'Show Colored Items', defaultValue: true },
        showLoading: { type: 'boolean', label: 'Show Loading', defaultValue: false },
        showTrailingIndicator: { type: 'boolean', label: 'Show Trailing Indicator', defaultValue: false },
        dangerItemColor: {
          type: 'select',
          label: 'Danger Item Color',
          defaultValue: 'danger',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Brand', value: 'brand' },
            { label: 'Danger', value: 'danger' },
            { label: 'Premium', value: 'premium' },
            { label: 'Premium Gradient', value: 'premium-gradient' },
            { label: 'Success', value: 'success' },
          ],
        },
      },
    },
  ],
};

export default menu;
