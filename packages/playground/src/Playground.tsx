import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  AppRoot,
  BlobMask,
  HeaderBar,
  IconButton,
  NavItem,
  Notice,
  NoticeColors,
  ScrollerThin,
  Tooltip,
} from '@discord-components/components';
import { XSmallIcon } from '@discord-components/icons';
import { ThemeTypes, type Theme } from '@discord-components/tokens';
import { useAppSettings, type ThemeSetting } from './appSettings';
import { dynamicGraphicComponents } from './dynamicGraphics';
import { getDefaultProps } from './ControlsPanel';
import { CopyLinkButton } from './CopyLinkButton';
import { playgroundStore } from './playgroundStore';
import styles from './Playground.module.css';
import { SettingsButton } from './SettingsButton';
import { StorySidebar } from './StorySidebar';
import { StoryView } from './StoryView';
import type { Collection, Story } from './types';
import { parseOverrides, readLocation, writeLocation } from './url';

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

// The app components Discord's client registers for dynamic graphics (only its demo one exists here).
const MANA_CONTEXT = { dynamicGraphicComponents };

playgroundStore.setState({
  selectedCollection: initialLocation.collection,
  selectedStory: initialLocation.story,
  controlOverrides: Object.keys(initialLocation.overrides).length > 0 ? initialLocation.overrides : null,
});

// Like the client's body, the page itself never scrolls; the root's top offset would otherwise let it.
if (!initialLocation.embed) document.body.style.overflow = 'hidden';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const subscribeToColorScheme = (onChange: () => void) => {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const useResolvedTheme = (setting: ThemeSetting): Theme => {
  const systemDark = useSyncExternalStore(subscribeToColorScheme, () => window.matchMedia(DARK_SCHEME_QUERY).matches);
  if (setting !== 'system') return setting;
  return systemDark ? ThemeTypes.DARK : ThemeTypes.LIGHT;
};

// The standalone playground has nothing to close back to.
const closePlayground = () => {};

const selectCollection = (id: string) =>
  playgroundStore.setState({ selectedCollection: id, selectedStory: null, controlOverrides: null, currentProps: null });

const selectStory = (id: string) =>
  playgroundStore.setState({ selectedStory: id, controlOverrides: null, currentProps: null });

export const Playground = ({ collections }: { collections: Collection[] }) => {
  const settings = useAppSettings();
  const theme = useResolvedTheme(settings.theme);
  const selectedCollection = playgroundStore.useField('selectedCollection');
  const selectedStory = playgroundStore.useField('selectedStory');
  const controlsLayout = playgroundStore.useField('controlsLayout');

  const { collection, group, story } = useMemo(() => {
    const found = selectedCollection != null ? collections.find((c) => c.id === selectedCollection) : collections[0];
    if (found == null) return { collection: null, group: null, story: null };
    const foundGroup = found.groups.find((g) => g.stories.some((s) => s.id === selectedStory));
    return {
      collection: found,
      group: foundGroup,
      story: foundGroup?.stories.find((s) => s.id === selectedStory) ?? null,
    };
  }, [selectedCollection, selectedStory, collections]);

  // The client puts the HDR setting on the root element's style.
  useEffect(() => {
    document.documentElement.style.setProperty('dynamic-range-limit', settings.hdrDynamicRange);
  }, [settings.hdrDynamicRange]);

  useEffect(() => {
    if (!initialLocation.embed) writeLocation(collection?.id, story?.id ?? null, theme);
  }, [collection, story, theme]);

  const Provider = collection?.Provider;

  if (initialLocation.embed) {
    if (story == null) return null;
    const embedded = <EmbeddedStory story={story} overrides={initialLocation.overrides} />;
    return (
      <AppRoot theme={theme} manaContext={MANA_CONTEXT}>
        {Provider != null ? <Provider>{embedded}</Provider> : embedded}
      </AppRoot>
    );
  }

  const collectionName = collection?.name ?? 'Design System';
  const storyName = story?.name;
  const view =
    story != null && group != null ? <StoryView key={story.id} story={story} controlsLayout={controlsLayout} /> : null;
  const HeaderControl = collection?.HeaderControl;

  return (
    <AppRoot
      theme={theme}
      manaContext={MANA_CONTEXT}
      reducedMotion={settings.reducedMotion}
      highContrastMode={settings.highContrastMode}
      saturation={settings.saturation}
      density={settings.uiDensity}
      switchIconsEnabled={settings.switchIconsEnabled}
    >
      <div className={styles.root} data-testid="component-playground">
        <div className={styles.group}>
          {collections.map((c) => (
            <BlobMask key={c.id}>
              <Tooltip position="right" text={`${c.name} Design System`}>
                <NavItem
                  name={c.name}
                  selected={(selectedCollection ?? collections[0]?.id) === c.id}
                  onClick={() => selectCollection(c.id)}
                />
              </Tooltip>
            </BlobMask>
          ))}
        </div>
        <div className={styles.content}>
          <HeaderBar className={styles.header}>
            {collectionName != null ? <HeaderBar.Title>{collectionName}</HeaderBar.Title> : null}
            {storyName != null ? (
              <>
                {collectionName != null ? <HeaderBar.Caret className={styles.headerDivider} /> : null}
                <HeaderBar.Title>{storyName}</HeaderBar.Title>
              </>
            ) : null}
            {collection != null ? <CopyLinkButton collection={collection} story={story} /> : null}
            <div className={styles.headerRight}>
              {HeaderControl != null ? <HeaderControl /> : null}
              <SettingsButton />
              <IconButton
                size="sm"
                icon={XSmallIcon}
                aria-label="Close"
                variant="icon-only"
                onClick={closePlayground}
              />
            </div>
          </HeaderBar>
          {collection?.deprecationNotice != null && (
            <Notice color={NoticeColors.WARNING} className={styles.deprecationNotice}>
              {collection.deprecationNotice}
            </Notice>
          )}
          <div className={styles.page}>
            <ScrollerThin fade className={styles.sidebar}>
              {collection != null ? (
                <StorySidebar groups={collection.groups} selectedStory={selectedStory} onStorySelect={selectStory} />
              ) : null}
            </ScrollerThin>
            <div className={styles.content}>{Provider != null ? <Provider>{view}</Provider> : view}</div>
          </div>
        </div>
      </div>
    </AppRoot>
  );
};

Playground.displayName = 'Playground';
