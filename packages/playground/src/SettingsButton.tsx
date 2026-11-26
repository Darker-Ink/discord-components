import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconButton,
  MENU_EXPERIMENT,
  Menu,
  MenuCheckboxItem,
  MenuControlItem,
  MenuGroup,
  MenuItem,
  MenuRadioItem,
  MenuSearchControl,
  MenuSeparator,
  MenuSliderControl,
  Popout,
  showToast,
} from '@discord-components/components';
import { SettingsIcon, TrashIcon } from '@discord-components/icons';
import { ThemeTypes } from '@discord-components/tokens';
import { getAppSettings, updateAppSettings, useAppSettings, type ThemeSetting } from './appSettings';
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

// Client experiments our components react to. Unlike Discord's experiment registry these are on/off.
const KNOWN_EXPERIMENTS = [MENU_EXPERIMENT, 'mana-badge-refresh', 'refresh-fast-follow-avatars'];

const EXPERIMENT_VARIANTS = [
  { id: 0, label: 'Control' },
  { id: 1, label: 'Treatment' },
];

// Like the `fuzzysearch` package Discord filters experiments with: the query's characters in order.
const fuzzyMatch = (query: string, text: string) => {
  if (query.length > text.length) return false;
  if (query.length === text.length) return query === text;
  let position = 0;
  outer: for (const char of query) {
    while (position < text.length) if (text[position++] === char) continue outer;
    return false;
  }
  return true;
};

const setExperiment = (id: string, variant: number | null) => {
  const { experiments } = getAppSettings();
  const others = experiments.filter((name) => name !== id);
  updateAppSettings({ experiments: variant === 1 ? [...others, id] : others });
};

const copyExperimentLink = async (id: string) => {
  if (typeof navigator.clipboard?.writeText !== 'function') return;
  const params = new URLSearchParams(window.location.search);
  params.set('experiments', id);
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`);
    showToast({ text: 'Copied experiment link', variant: 'success' });
  } catch {
    // Clipboard access can be denied.
  }
};

const renderExperiment = ({ id, overridden }: { id: string; overridden: boolean }) => (
  <MenuItem key={id} id={id.replaceAll('--', '__')} label={id} action={() => setExperiment(id, null)}>
    {EXPERIMENT_VARIANTS.map((variant) => (
      <MenuCheckboxItem
        key={`${variant.id}`}
        id={`${variant.id}`}
        label={variant.label}
        checked={overridden ? variant.id === 1 : false}
        action={() => setExperiment(id, variant.id)}
      />
    ))}
    <MenuGroup>
      {typeof navigator.clipboard?.writeText === 'function' && (
        <MenuItem id="copy-link" label="Copy Link" action={() => void copyExperimentLink(id)} />
      )}
      {overridden && (
        <MenuItem
          id="clear-override"
          label="Clear Override"
          color="danger"
          icon={TrashIcon}
          action={() => setExperiment(id, null)}
        />
      )}
    </MenuGroup>
  </MenuItem>
);

const useExperimentItems = () => {
  const { experiments } = useAppSettings();
  const all = useMemo(
    () =>
      [...new Set([...KNOWN_EXPERIMENTS, ...experiments])]
        .sort((a, b) => b.localeCompare(a))
        .map((id) => ({ id, overridden: experiments.includes(id) })),
    [experiments],
  );
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(all);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiltered(query.trim().length === 0 ? all : all.filter(({ id }) => fuzzyMatch(query, id.toLowerCase())));
  }, [all, query]);
  const overridden = useMemo(() => all.filter((experiment) => experiment.overridden), [all]);
  const others = useMemo(() => filtered.filter((experiment) => !experiment.overridden), [filtered]);
  const search = (
    <MenuControlItem
      key="experiments-search"
      id="experiments-search"
      control={(props, ref) => (
        <MenuSearchControl {...props} query={query} onChange={setQuery} ref={ref} placeholder="Search" />
      )}
    />
  );
  return overridden.length > 0
    ? [
        <MenuGroup key="overridden-group" label="Overridden Experiments">
          {overridden.map(renderExperiment)}
        </MenuGroup>,
        <MenuSeparator key="separator-2" />,
        <MenuItem key="other-experiments" id="other-experiments" label="Other Experiments">
          {search}
          {others.map(renderExperiment)}
        </MenuItem>,
      ]
    : [search, ...others.map(renderExperiment)];
};

// Like Discord's playground settings menu: picking an item keeps the menu open.
const SettingsMenu = () => {
  const appearanceItems = useAppearanceItems();
  const accessibilityItems = useAccessibilityItems();
  const experimentItems = useExperimentItems();
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
      <MenuItem id="experiments" label="Experiments">
        {experimentItems}
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
