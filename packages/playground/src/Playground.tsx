import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { IconButton, Menu, MenuGroup, MenuItem, MenuRadioItem, Popout, TabBar } from '@discord-components/components';
import { SettingsIcon } from '@discord-components/icons';
import { ThemeTypes, type Theme } from '@discord-components/tokens';
import { AppRoot } from './AppRoot';
import { ControlsPanel, getDefaultProps } from './ControlsPanel';
import styles from './Playground.module.css';
import type { Collection, Story } from './types';
import { parseOverrides, readLocation, writeLocation } from './url';

const THEME_OPTIONS: { label: string; value: Theme }[] = [
  { label: 'Light', value: ThemeTypes.LIGHT },
  { label: 'Ash', value: ThemeTypes.ASH },
  { label: 'Dark', value: ThemeTypes.DARK },
  { label: 'Onyx', value: ThemeTypes.ONYX },
];

export const ControlsLayout = {
  RIGHT: 'right',
  BOTTOM: 'bottom',
  HIDDEN: 'hidden',
} as const;

type ControlsLayoutType = (typeof ControlsLayout)[keyof typeof ControlsLayout];

const noop = () => {};

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  controlsLayout: ControlsLayoutType;
  onControlsLayoutChange: (layout: ControlsLayoutType) => void;
}

const CONTROLS_LAYOUT_OPTIONS: { id: string; label: string; value: ControlsLayoutType }[] = [
  { id: 'controls-right', label: 'Right Side', value: ControlsLayout.RIGHT },
  { id: 'controls-bottom', label: 'Bottom', value: ControlsLayout.BOTTOM },
  { id: 'controls-hidden', label: 'Hidden', value: ControlsLayout.HIDDEN },
];

// Like Discord's playground settings menu: picking an item keeps the menu open.
const SettingsMenu = ({ theme, onThemeChange, controlsLayout, onControlsLayoutChange }: SettingsProps) => (
  <Menu
    data-menu-migrated
    onSelect={noop}
    navId="playground-settings-menu"
    onClose={noop}
    aria-label="Playground Settings"
  >
    <MenuItem id="appearance" label="Appearance">
      <MenuGroup key="theme-items">
        {THEME_OPTIONS.map((option) => (
          <MenuRadioItem
            key={option.value}
            id={option.value}
            group="input-modes"
            label={option.label}
            checked={option.value === theme}
            action={() => onThemeChange(option.value)}
          />
        ))}
      </MenuGroup>
      <MenuGroup key="controls-layout" label="Controls">
        {CONTROLS_LAYOUT_OPTIONS.map((option) => (
          <MenuRadioItem
            key={option.id}
            id={option.id}
            group="controls-layout"
            label={option.label}
            action={() => onControlsLayoutChange(option.value)}
            checked={controlsLayout === option.value}
          />
        ))}
      </MenuGroup>
    </MenuItem>
  </Menu>
);

SettingsMenu.displayName = 'SettingsMenu';

const SettingsButton = (props: SettingsProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Popout
      targetElementRef={buttonRef}
      renderPopout={() => <SettingsMenu {...props} />}
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

interface StoryViewProps {
  story: Story;
  controlsLayout: ControlsLayoutType;
  initialOverrides?: Record<string, string>;
}

const StoryView = ({ story, controlsLayout, initialOverrides = {} }: StoryViewProps) => {
  const [props, setProps] = useState(() => ({
    ...getDefaultProps(story.controls),
    ...parseOverrides(story.controls, initialOverrides),
  }));
  const Component = story.component;
  const showControls = controlsLayout !== ControlsLayout.HIDDEN && story.controls != null;

  return (
    <div
      className={clsx(styles.main, {
        [styles.mainBottomLayout]: controlsLayout === ControlsLayout.BOTTOM,
        [styles.mainRightLayout]: controlsLayout === ControlsLayout.RIGHT,
      })}
    >
      <div className={styles.canvas}>
        <div className={styles.storyContent}>
          <Component {...props} />
        </div>
      </div>
      {showControls && (
        <div
          className={clsx(styles.controls, {
            [styles.controlsBottom]: controlsLayout === ControlsLayout.BOTTOM,
            [styles.controlsRight]: controlsLayout === ControlsLayout.RIGHT,
          })}
        >
          <ControlsPanel controls={story.controls!} props={props} onPropsChange={setProps} />
        </div>
      )}
    </div>
  );
};

StoryView.displayName = 'StoryView';

// Renders a single story with no chrome, laid out exactly like the reference server's story page,
// so the two can be screenshotted and diffed.
const EmbeddedStory = ({ story, overrides }: { story: Story; overrides: Record<string, string> }) => {
  const Component = story.component;
  const props = { ...getDefaultProps(story.controls), ...parseOverrides(story.controls, overrides) };
  return (
    <div data-story={story.id} style={{ padding: 24 }}>
      <Component {...props} />
    </div>
  );
};

EmbeddedStory.displayName = 'EmbeddedStory';

const initialLocation = readLocation();

export const Playground = ({ collections }: { collections: Collection[] }) => {
  const [theme, setTheme] = useState<Theme>(initialLocation.theme ?? ThemeTypes.DARK);
  const [controlsLayout, setControlsLayout] = useState<ControlsLayoutType>(ControlsLayout.RIGHT);
  const [collectionId, setCollectionId] = useState(initialLocation.collection ?? collections[0]?.id);
  const [storyId, setStoryId] = useState<string | null>(initialLocation.story);
  const [query, setQuery] = useState('');

  const collection = collections.find((c) => c.id === collectionId) ?? collections[0];
  const story = collection?.groups.flatMap((g) => g.stories).find((s) => s.id === storyId) ?? null;

  useEffect(() => {
    if (!initialLocation.embed) writeLocation(collection?.id, story?.id ?? null, theme, initialLocation.experiments);
  }, [collection, story, theme]);

  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (collection == null || search === '') return collection?.groups ?? [];
    return collection.groups
      .map((g) => ({ ...g, stories: g.stories.filter((s) => s.name.toLowerCase().includes(search)) }))
      .filter((g) => g.stories.length > 0);
  }, [collection, query]);

  const Provider = collection?.Provider;

  if (initialLocation.embed) {
    if (story == null) return null;
    const embedded = <EmbeddedStory story={story} overrides={initialLocation.overrides} />;
    return (
      <AppRoot theme={theme} experiments={initialLocation.experiments}>
        {Provider != null ? <Provider>{embedded}</Provider> : embedded}
      </AppRoot>
    );
  }

  const view =
    story != null ? (
      <StoryView
        key={story.id}
        story={story}
        controlsLayout={controlsLayout}
        initialOverrides={story.id === initialLocation.story ? initialLocation.overrides : undefined}
      />
    ) : null;

  return (
    <AppRoot theme={theme} experiments={initialLocation.experiments}>
      <div className={styles.root} data-testid="component-playground">
        <div className={styles.group}>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              title={`${c.name} Design System`}
              aria-pressed={c.id === collection?.id}
              onClick={() => {
                setCollectionId(c.id);
                setStoryId(null);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <span>{collection?.name ?? 'Design System'}</span>
            {story != null && <span> › {story.name}</span>}
            <div className={styles.headerRight}>
              <SettingsButton
                theme={theme}
                onThemeChange={setTheme}
                controlsLayout={controlsLayout}
                onControlsLayoutChange={setControlsLayout}
              />
            </div>
          </div>
          <div className={styles.page}>
            <nav className={styles.sidebar}>
              <input
                type="search"
                value={query}
                placeholder="Search stories…"
                aria-label="Search stories"
                onChange={(e) => setQuery(e.target.value)}
              />
              {groups.length === 0 ? (
                <p>No results</p>
              ) : (
                <TabBar
                  // An empty id rather than null, so TabBar doesn't select the first story by default.
                  selectedItem={story?.id ?? ''}
                  orientation="vertical"
                  onItemSelect={(id) => {
                    if (id != null) setStoryId(String(id));
                  }}
                >
                  {groups.flatMap((group, index) => [
                    <TabBar.Header key={`${group.title}-header`}>{group.title}</TabBar.Header>,
                    ...group.stories.map((s) => (
                      <TabBar.Item key={s.id} id={s.id} aria-label={s.name}>
                        <span data-testid={`playground-story-${s.id}`}>{s.name}</span>
                      </TabBar.Item>
                    )),
                    index < groups.length - 1 ? <TabBar.Separator key={`${group.title}-separator`} /> : null,
                  ])}
                </TabBar>
              )}
            </nav>
            <div className={styles.content}>{Provider != null ? <Provider>{view}</Provider> : view}</div>
          </div>
        </div>
      </div>
    </AppRoot>
  );
};

Playground.displayName = 'Playground';
