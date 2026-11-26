import { useMemo, useRef } from 'react';
import {
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuControlItem,
  MenuGroup,
  MenuItem,
  MenuRadioItem,
  MenuSliderControl,
  Popout,
} from '@discord-mana/components';
import { SettingsIcon } from '@discord-mana/icons';
import { ThemeTypes } from '@discord-mana/tokens';
import { updateAppSettings, useAppSettings, type ThemeSetting } from './appSettings';
import { ControlsLayout, playgroundStore } from './playgroundStore';

const noop = () => {};

const THEME_OPTIONS: { label: string; value: ThemeSetting }[] = [
  { label: 'Light', value: ThemeTypes.LIGHT },
  { label: 'Ash', value: ThemeTypes.ASH },
  { label: 'Dark', value: ThemeTypes.DARK },
  { label: 'Onyx', value: ThemeTypes.ONYX },
  { label: 'Sync with computer', value: 'system' },
];

const useAppearanceItems = () => {
  const { theme } = useAppSettings();
  return [
    <MenuGroup key="theme-items">
      {THEME_OPTIONS.map((option) => (
        <MenuRadioItem
          key={option.value}
          id={option.value}
          group="input-modes"
          label={option.label}
          checked={option.value === theme}
          action={() => updateAppSettings({ theme: option.value })}
        />
      ))}
    </MenuGroup>,
  ];
};

const ROLE_STYLE_OPTIONS = [
  { name: 'Show role colors in names', value: 'username' },
  { name: 'Show role colors next to names', value: 'dot' },
  { name: "Don't show role colors", value: 'hidden' },
] as const;

// Discord shows this one only in an experiment; here it's always on.
const DYNAMIC_RANGE_OPTIONS = [
  { name: 'Full Dynamic Range', value: 'no-limit' },
  { name: 'Standard Range', value: 'standard' },
] as const;

const useAccessibilityItems = () => {
  const settings = useAppSettings();
  const reducedMotion =
    settings.reducedMotion === 'auto'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : settings.reducedMotion === 'reduce';
  return [
    <MenuGroup key="reduced-motion">
      <MenuCheckboxItem
        id="reduced-motion"
        label="Enable Reduced Motion"
        checked={reducedMotion}
        action={() => updateAppSettings({ reducedMotion: reducedMotion ? 'no-preference' : 'reduce' })}
      />
    </MenuGroup>,
    <MenuGroup key="high-contrast">
      <MenuCheckboxItem
        id="high-contrast"
        label="Enable High Contrast Mode"
        checked={settings.highContrastMode}
        action={() => updateAppSettings({ highContrastMode: !settings.highContrastMode })}
      />
    </MenuGroup>,
    <MenuGroup key="input">
      <MenuControlItem
        id="input"
        label="Saturation"
        control={(props, ref) => (
          <MenuSliderControl
            {...props}
            ref={ref}
            value={100 * settings.saturation}
            onChange={(value) => updateAppSettings({ saturation: value / 100 })}
            aria-label="Saturation"
          />
        )}
      />
    </MenuGroup>,
    <MenuGroup key="list-density" label="UI Density">
      <MenuRadioItem
        id="compact-ui"
        group="list-density"
        label="Compact"
        checked={settings.uiDensity === 'compact'}
        action={() => updateAppSettings({ uiDensity: 'compact' })}
      />
      <MenuRadioItem
        id="default-ui"
        group="list-density"
        label="Default"
        checked={settings.uiDensity === 'default'}
        action={() => updateAppSettings({ uiDensity: 'default' })}
      />
      <MenuRadioItem
        id="cozy-ui"
        group="list-density"
        label="Spacious"
        checked={settings.uiDensity === 'cozy'}
        action={() => updateAppSettings({ uiDensity: 'cozy' })}
      />
    </MenuGroup>,
    <MenuGroup key="chat-density" label="Chat Message Display">
      <MenuRadioItem
        id="cozy-chat"
        group="chat-density"
        label="Default"
        checked={!settings.messageDisplayCompact}
        action={() => updateAppSettings({ messageDisplayCompact: false })}
      />
      <MenuRadioItem
        id="compact-chat"
        group="chat-density"
        label="Compact"
        checked={settings.messageDisplayCompact}
        action={() => updateAppSettings({ messageDisplayCompact: true })}
      />
    </MenuGroup>,
    <MenuGroup key="hdr-dynamic-range">
      <MenuItem id="hdr-dynamic-range" label="High Dynamic Range">
        {DYNAMIC_RANGE_OPTIONS.map(({ name, value }) => (
          <MenuRadioItem
            key={value}
            id={value}
            group="hdr-dynamic-range"
            checked={value === settings.hdrDynamicRange}
            label={name}
            action={() => updateAppSettings({ hdrDynamicRange: value })}
          />
        ))}
      </MenuItem>
    </MenuGroup>,
    <MenuGroup key="role-colors">
      <MenuItem id="role-colors" label="Role Colors">
        {ROLE_STYLE_OPTIONS.map(({ name, value }) => (
          <MenuRadioItem
            key={value}
            id={value}
            group="role-colors"
            checked={value === settings.roleStyle}
            label={name}
            action={() => updateAppSettings({ roleStyle: value })}
          />
        ))}
      </MenuItem>
    </MenuGroup>,
    // Discord's label for this one is in a string bundle its build doesn't load here (it renders empty).
    <MenuGroup key="display-name-styles">
      <MenuCheckboxItem
        id="display-name-styles"
        label=""
        checked={settings.displayNameStylesEnabled}
        action={() => updateAppSettings({ displayNameStylesEnabled: !settings.displayNameStylesEnabled })}
      />
    </MenuGroup>,
    <MenuGroup key="switch-icons">
      <MenuCheckboxItem
        id="switch-icons"
        label="Show on/off indicators"
        checked={settings.switchIconsEnabled}
        action={() => updateAppSettings({ switchIconsEnabled: !settings.switchIconsEnabled })}
      />
    </MenuGroup>,
  ];
};

// Like Discord's playground settings menu: picking an item keeps the menu open. Discord's also has an
// Experiments submenu for client experiments, which the standalone playground has none of.
const SettingsMenu = () => {
  const appearanceItems = useAppearanceItems();
  const accessibilityItems = useAccessibilityItems();
  const controlsLayout = playgroundStore.useField('controlsLayout');
  const controlsGroup = useMemo(
    () => (
      <MenuGroup key="controls-layout" label="Controls">
        <MenuRadioItem
          id="controls-right"
          group="controls-layout"
          label="Right Side"
          action={() => playgroundStore.setState({ controlsLayout: ControlsLayout.RIGHT })}
          checked={controlsLayout === ControlsLayout.RIGHT}
        />
        <MenuRadioItem
          id="controls-bottom"
          group="controls-layout"
          label="Bottom"
          action={() => playgroundStore.setState({ controlsLayout: ControlsLayout.BOTTOM })}
          checked={controlsLayout === ControlsLayout.BOTTOM}
        />
        <MenuRadioItem
          id="controls-hidden"
          group="controls-layout"
          label="Hidden"
          action={() => playgroundStore.setState({ controlsLayout: ControlsLayout.HIDDEN })}
          checked={controlsLayout === ControlsLayout.HIDDEN}
        />
      </MenuGroup>
    ),
    [controlsLayout],
  );
  return (
    <Menu
      data-menu-migrated
      onSelect={noop}
      navId="playground-settings-menu"
      onClose={noop}
      aria-label="Playground Settings"
    >
      <MenuItem id="appearance" label="Appearance">
        {[...appearanceItems, controlsGroup]}
      </MenuItem>
      <MenuItem id="accessibility" label="Accessibility">
        {accessibilityItems}
      </MenuItem>
    </Menu>
  );
};

SettingsMenu.displayName = 'SettingsMenu';

export const SettingsButton = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Popout
      targetElementRef={buttonRef}
      renderPopout={() => <SettingsMenu />}
      position="bottom"
      align="center"
      animation={Popout.Animation.SCALE}
      onRequestClose={noop}
    >
      {(triggerProps) => (
        <IconButton
          size="sm"
          icon={SettingsIcon}
          aria-label="Settings"
          variant="icon-only"
          {...triggerProps}
          buttonRef={buttonRef}
        />
      )}
    </Popout>
  );
};

SettingsButton.displayName = 'SettingsButton';
