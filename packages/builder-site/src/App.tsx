import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  AppRoot,
  Button,
  IconButton,
  Menu,
  MenuGroup,
  MenuItem,
  MenuRadioItem,
  MenuSeparator,
  Popout,
  ScrollerThin,
  Text,
  Tooltip,
  tokens,
} from '@discord-mana/components';
import {
  CheckmarkLargeIcon,
  CircleErrorIcon,
  AngleBracketsIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PlusLargeIcon,
  PlusSmallIcon,
  SendMessageIcon,
  TextIcon,
  XLargeIcon,
} from '@discord-mana/icons';
import {
  BuilderCanvas,
  BuilderChannel,
  BuilderHistoryButtons,
  BuilderModeSwitch,
  BuilderPanels,
  BuilderProvider,
  ComponentPalette,
  DEFAULT_AUTHOR,
  getWebhookAvatarURL,
  JsonPanel,
  useBuilderIssues,
  useMessageBuilder,
  ValidationPanel,
  WebhookPanel,
  type BuilderAuthor,
  type BuilderPanelId,
  type WebhookInfo,
  type WebhookMessagePayload,
} from '@discord-mana/builders';
import { MediaViewerProvider, type MessageResolvers } from '@discord-mana/messages';
import { clearHash, createShareUrl, readDraft, readSharedPayload, WEBHOOK_KEY, writeDraft } from './draft';
import { Logo, LogoMark } from './Logo';
import { PreviewButton } from './PreviewButton';
import { BLANK, BLANK_CV2, EXAMPLE, EXAMPLE_CV2 } from './starters';
import { ThemeSwitcher } from './ThemeSwitcher';
import { THEMES, themeOf, useSiteTheme, type SiteTheme } from './theme';
import { useMediaQuery } from './useMediaQuery';
import welcomeStyles from './ChannelWelcome.module.css';
import dividerStyles from './Divider.module.css';
import styles from './App.module.css';

const RESOLVERS: MessageResolvers = { getAvatarURL: (user) => user.avatar_url ?? null };

const CHANNEL = 'announcements';

const STARTERS: { id: string; label: string; payload: WebhookMessagePayload }[] = [
  { id: 'blank', label: 'Blank message', payload: BLANK },
  { id: 'blank-cv2', label: 'Blank Components v2', payload: BLANK_CV2 },
  { id: 'example', label: 'Example', payload: EXAMPLE },
  { id: 'example-cv2', label: 'Components v2 example', payload: EXAMPLE_CV2 },
];

/** Copies a link with the message compressed into its hash. */
const useShare = (getPayload: () => WebhookMessagePayload) => {
  const [copied, setCopied] = useState(false);
  const share = useCallback(async () => {
    const url = await createShareUrl(getPayload());
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [getPayload]);
  return [copied, share] as const;
};

/** "New": start again from a blank message or an example (undo brings the draft back). */
const NewMenu = ({ onPick }: { onPick: (payload: WebhookMessagePayload) => void }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <Popout
      position="bottom"
      align="left"
      targetElementRef={ref}
      renderPopout={({ closePopout }) => (
        <Menu navId="builder-new" aria-label="New message" onClose={closePopout} onSelect={() => undefined}>
          {STARTERS.slice(0, 2).map((starter) => (
            <MenuItem key={starter.id} id={starter.id} label={starter.label} action={() => onPick(starter.payload)} />
          ))}
          <MenuSeparator />
          {STARTERS.slice(2).map((starter) => (
            <MenuItem key={starter.id} id={starter.id} label={starter.label} action={() => onPick(starter.payload)} />
          ))}
        </Menu>
      )}
    >
      {(props) => (
        <Button
          size="sm"
          variant="secondary"
          icon={{ type: 'icon', asset: PlusSmallIcon }}
          text="New"
          buttonRef={ref}
          {...props}
        />
      )}
    </Popout>
  );
};

NewMenu.displayName = 'NewMenu';

const ShareButton = ({ getPayload }: { getPayload: () => WebhookMessagePayload }) => {
  const [copied, share] = useShare(getPayload);
  return (
    <Tooltip text="Copy a link to this message" position="bottom">
      <Button
        size="sm"
        variant="secondary"
        icon={{ type: 'icon', asset: copied ? CheckmarkLargeIcon : LinkIcon }}
        text={copied ? 'Link copied' : 'Share'}
        onClick={() => void share()}
      />
    </Tooltip>
  );
};

ShareButton.displayName = 'ShareButton';

/** Phones: New, Share and the theme, in one menu. */
const MoreMenu = ({
  onPick,
  getPayload,
  theme,
  onTheme,
}: {
  onPick: (payload: WebhookMessagePayload) => void;
  getPayload: () => WebhookMessagePayload;
  theme: SiteTheme;
  onTheme: (theme: SiteTheme) => void;
}) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [copied, share] = useShare(getPayload);
  return (
    <Popout
      position="bottom"
      align="right"
      targetElementRef={ref}
      renderPopout={({ closePopout }) => (
        <Menu navId="builder-more" aria-label="More" onClose={closePopout} onSelect={() => undefined}>
          <MenuGroup label="New">
            {STARTERS.map((starter) => (
              <MenuItem key={starter.id} id={starter.id} label={starter.label} action={() => onPick(starter.payload)} />
            ))}
          </MenuGroup>
          <MenuSeparator />
          <MenuItem id="share" label="Copy link" icon={LinkIcon} action={() => void share()} />
          <MenuSeparator />
          <MenuGroup label="Theme">
            {THEMES.map(({ id, label }) => (
              <MenuRadioItem
                key={id}
                id={`theme-${id}`}
                group="theme"
                label={label}
                checked={theme === id}
                action={() => onTheme(id)}
              />
            ))}
          </MenuGroup>
        </Menu>
      )}
    >
      {(props) => (
        <IconButton
          size="sm"
          variant="icon-only"
          icon={{ type: 'icon', asset: copied ? CheckmarkLargeIcon : MoreHorizontalIcon }}
          aria-label={copied ? 'Link copied' : 'More'}
          buttonRef={ref}
          {...props}
        />
      )}
    </Popout>
  );
};

MoreMenu.displayName = 'MoreMenu';

/** The client's start-of-channel header and today's divider, above the message. */
const ChannelStart = ({ name }: { name: string }) => (
  <>
    <div className={clsx(welcomeStyles.container, styles.welcome)}>
      <div className={clsx(welcomeStyles.emptyChannelIcon, welcomeStyles.emptyChannelIconComponent)}>
        <TextIcon color={tokens.colors.ICON_STRONG} size="custom" width={42} height={42} />
      </div>
      <Text tag="h1" variant="heading-xxl/semibold" className={welcomeStyles.header} color="text-strong">
        Welcome to #{name}!
      </Text>
    </div>
    <div className={clsx(dividerStyles.divider, dividerStyles.hasContent, styles.divider)} role="separator">
      <span className={dividerStyles.content}>Today</span>
    </div>
  </>
);

ChannelStart.displayName = 'ChannelStart';

type Sheet = 'add' | BuilderPanelId;

const SHEET_TITLES: Record<Sheet, string> = { add: 'Add', issues: 'Issues', json: 'JSON', send: 'Send' };

/** A panel sliding up from the bottom of a phone's screen. */
const BottomSheet = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className={styles.sheetLayer}>
      <div className={styles.sheetBackdrop} onClick={onClose} aria-hidden />
      <div ref={ref} className={styles.sheet} role="dialog" aria-modal aria-label={title} tabIndex={-1}>
        <div className={styles.sheetHeader}>
          <span className={styles.sheetGrabber} aria-hidden />
          <Text tag="h2" variant="heading-md/semibold" color="text-strong">
            {title}
          </Text>
          <IconButton
            size="sm"
            variant="icon-only"
            icon={{ type: 'icon', asset: XLargeIcon }}
            aria-label="Close"
            onClick={onClose}
          />
        </div>
        <ScrollerThin className={styles.sheetBody}>{children}</ScrollerThin>
      </div>
    </div>
  );
};

BottomSheet.displayName = 'BottomSheet';

/** Phones: Add, Issues, JSON and Send along the bottom. */
const TabBar = ({ sheet, onOpen }: { sheet: Sheet | null; onOpen: (sheet: Sheet) => void }) => {
  const issues = useBuilderIssues();
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const tabs = [
    { id: 'add', label: 'Add', icon: PlusLargeIcon },
    { id: 'issues', label: 'Issues', icon: CircleErrorIcon },
    { id: 'json', label: 'JSON', icon: AngleBracketsIcon },
    { id: 'send', label: 'Send', icon: SendMessageIcon },
  ] as const;
  return (
    <nav className={styles.tabBar} aria-label="Message tools">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tab}
          aria-pressed={sheet === id}
          aria-label={id === 'issues' && issues.length > 0 ? `${label} (${issues.length})` : label}
          onClick={() => onOpen(id)}
        >
          <span className={styles.tabIcon}>
            <Icon size="md" color="currentColor" />
            {id === 'issues' && issues.length > 0 ? (
              <span className={styles.tabBadge} data-severity={errors > 0 ? 'error' : 'warning'}>
                {issues.length}
              </span>
            ) : null}
          </span>
          <span className={styles.tabLabel}>{label}</span>
        </button>
      ))}
    </nav>
  );
};

TabBar.displayName = 'TabBar';

export const App = () => {
  const [theme, setTheme] = useSiteTheme();
  const [initial] = useState(() => readDraft() ?? EXAMPLE);
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const validation = useMemo(
    () => ({
      target: 'webhook' as const,
      applicationOwnedWebhook: webhook != null ? webhook.application_id != null : undefined,
    }),
    [webhook],
  );
  const builder = useMessageBuilder({ defaultValue: initial, validation });
  const { store } = builder;
  const [panel, setPanel] = useState<BuilderPanelId>('json');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const phone = useMediaQuery('(max-width: 700px)');
  const tablet = useMediaQuery('(min-width: 701px) and (max-width: 1100px)');

  // A shared link opens its message (once; the draft it replaces is one undo away).
  useEffect(() => {
    void readSharedPayload().then((payload) => {
      if (payload != null) store.actions.replace(payload);
      clearHash();
    });
  }, [store]);

  // Autosave, a moment after the last change.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribe(() => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => writeDraft(store.toJSON()), 300);
    });
    return () => {
      unsubscribe();
      if (timer != null) {
        clearTimeout(timer);
        writeDraft(store.toJSON());
      }
    };
  }, [store]);

  const author = useMemo<BuilderAuthor>(
    () =>
      webhook != null
        ? { id: webhook.id, username: webhook.name ?? 'Webhook', avatarUrl: getWebhookAvatarURL(webhook) }
        : { ...DEFAULT_AUTHOR, avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png' },
    [webhook],
  );

  const getPayload = useCallback(() => store.toJSON(), [store]);
  const pick = useCallback((payload: WebhookMessagePayload) => store.actions.replace(payload), [store]);
  const closeSheet = useCallback(() => setSheet(null), []);

  const sheetContent =
    sheet === 'add' ? (
      <ComponentPalette orientation="grid" onAdd={closeSheet} />
    ) : sheet === 'issues' ? (
      <ValidationPanel onReveal={closeSheet} />
    ) : sheet === 'json' ? (
      <JsonPanel className={styles.sheetJson} actions={<PreviewButton author={author} theme={theme} />} />
    ) : sheet === 'send' ? (
      <WebhookPanel storageKey={WEBHOOK_KEY} onWebhookChange={setWebhook} />
    ) : null;

  return (
    <AppRoot theme={themeOf(theme).theme}>
      <MediaViewerProvider>
        <BuilderProvider builder={builder} resolvers={RESOLVERS} toolbarPlacement={phone ? 'docked' : 'floating'}>
          <div className={styles.app} data-layout={phone ? 'phone' : tablet ? 'tablet' : 'desktop'}>
            <header className={styles.header}>
              {phone ? (
                <span className={styles.logoMarkOnly} aria-label="discord-mana builder" role="img">
                  <LogoMark className={styles.logoMark} />
                </span>
              ) : (
                <Logo />
              )}
              <div className={styles.headerTools}>
                <BuilderModeSwitch className={styles.modeSwitch} />
                <BuilderHistoryButtons />
              </div>
              <div className={styles.headerActions}>
                {phone ? (
                  <MoreMenu onPick={pick} getPayload={getPayload} theme={theme} onTheme={setTheme} />
                ) : (
                  <>
                    <NewMenu onPick={pick} />
                    <ShareButton getPayload={getPayload} />
                    <ThemeSwitcher value={theme} onChange={setTheme} />
                  </>
                )}
              </div>
            </header>
            {!phone ? (
              <aside className={styles.palette} aria-label="Add components">
                <ScrollerThin className={styles.paletteScroller}>
                  <ComponentPalette compact={tablet} />
                </ScrollerThin>
              </aside>
            ) : null}
            <BuilderChannel name={CHANNEL} className={styles.channel}>
              <div className={styles.channelBody}>
                {!phone ? <ChannelStart name={CHANNEL} /> : null}
                <BuilderCanvas author={author} className={styles.canvas} />
              </div>
            </BuilderChannel>
            {phone ? (
              <TabBar sheet={sheet} onOpen={setSheet} />
            ) : (
              <aside className={styles.side} aria-label="Message tools">
                <ScrollerThin className={styles.sideScroller}>
                  <BuilderPanels
                    selectedId={panel}
                    onSelect={setPanel}
                    webhookStorageKey={WEBHOOK_KEY}
                    onWebhookChange={setWebhook}
                    jsonActions={<PreviewButton author={author} theme={theme} />}
                  />
                </ScrollerThin>
              </aside>
            )}
            {phone && sheet != null ? (
              <BottomSheet title={SHEET_TITLES[sheet]} onClose={closeSheet}>
                {sheetContent}
              </BottomSheet>
            ) : null}
          </div>
        </BuilderProvider>
      </MediaViewerProvider>
    </AppRoot>
  );
};

App.displayName = 'App';
