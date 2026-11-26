import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  AppRoot,
  Button,
  KeyCombo,
  Menu,
  MenuItem,
  MenuSeparator,
  Popout,
  Text,
  Tooltip,
  tokens,
} from '@discord-mana/components';
import { CheckmarkLargeIcon, LinkIcon, PlusSmallIcon, TextIcon } from '@discord-mana/icons';
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
  useMessageBuilder,
  type BuilderAuthor,
  type BuilderPanelId,
  type WebhookInfo,
  type WebhookMessagePayload,
} from '@discord-mana/builders';
import { MediaViewerProvider, type MessageResolvers } from '@discord-mana/messages';
import { clearHash, createShareUrl, readDraft, readSharedPayload, WEBHOOK_KEY, writeDraft } from './draft';
import { Logo } from './Logo';
import { PreviewButton } from './PreviewButton';
import { BLANK, BLANK_CV2, EXAMPLE, EXAMPLE_CV2 } from './starters';
import { ThemeSwitcher } from './ThemeSwitcher';
import { themeOf, useSiteTheme } from './theme';
import { useMediaQuery } from './useMediaQuery';
import welcomeStyles from './ChannelWelcome.module.css';
import dividerStyles from './Divider.module.css';
import styles from './App.module.css';

const RESOLVERS: MessageResolvers = { getAvatarURL: (user) => user.avatar_url ?? null };

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const STARTERS: { id: string; label: string; subtext: string; payload: WebhookMessagePayload }[] = [
  { id: 'blank', label: 'Blank message', subtext: 'Content and embeds', payload: BLANK },
  { id: 'blank-cv2', label: 'Blank Components v2', subtext: 'Containers, sections and more', payload: BLANK_CV2 },
  { id: 'example', label: 'Example', subtext: 'A tour of the editor, with embeds', payload: EXAMPLE },
  { id: 'example-cv2', label: 'Components v2 example', subtext: 'A container with a section', payload: EXAMPLE_CV2 },
];

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
            <MenuItem
              key={starter.id}
              id={starter.id}
              label={starter.label}
              subtext={starter.subtext}
              action={() => onPick(starter.payload)}
            />
          ))}
          <MenuSeparator />
          {STARTERS.slice(2).map((starter) => (
            <MenuItem
              key={starter.id}
              id={starter.id}
              label={starter.label}
              subtext={starter.subtext}
              action={() => onPick(starter.payload)}
            />
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

/** Copies a link that holds the whole message (compressed into the URL's hash; nothing is uploaded). */
const ShareButton = ({ getPayload }: { getPayload: () => WebhookMessagePayload }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip text="Copy a link with this message in it. Nothing is uploaded." position="bottom">
      <Button
        size="sm"
        variant="secondary"
        icon={{ type: 'icon', asset: copied ? CheckmarkLargeIcon : LinkIcon }}
        text={copied ? 'Link copied' : 'Share'}
        onClick={async () => {
          const url = await createShareUrl(getPayload());
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            window.prompt('Copy this link', url);
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      />
    </Tooltip>
  );
};

ShareButton.displayName = 'ShareButton';

/** The client's start-of-channel header and today's divider, above the message. */
const ChannelStart = ({ name }: { name: string }) => (
  <>
    <div className={clsx(welcomeStyles.container, styles.welcome)}>
      <div className={clsx(welcomeStyles.emptyChannelIcon, welcomeStyles.emptyChannelIconComponent)}>
        <TextIcon color={tokens.colors.ICON_STRONG} size="custom" width={42} height={42} />
      </div>
      <Text tag="h1" variant="heading-xxl/semibold" className={welcomeStyles.header} color="text-strong">
        Build a message in #{name}
      </Text>
      <Text variant="body-md/normal" color="text-muted" className={welcomeStyles.description}>
        It renders exactly as Discord will show it. Click to edit, drag to rearrange.
      </Text>
    </div>
    <div className={clsx(dividerStyles.divider, dividerStyles.hasContent, styles.divider)} role="separator">
      <span className={dividerStyles.content}>Today</span>
    </div>
  </>
);

ChannelStart.displayName = 'ChannelStart';

const Hints = () => {
  const mod = isMac ? '⌘' : 'Ctrl+';
  return (
    <div className={styles.hints} aria-hidden>
      <span>
        <KeyCombo shortcut="Enter" /> edit
      </span>
      <span>
        <KeyCombo shortcut="Space" /> move
      </span>
      <span>
        <KeyCombo shortcut={`${mod}D`} /> duplicate
      </span>
      <span>
        <KeyCombo shortcut="Del" /> delete
      </span>
      <span>
        <KeyCombo shortcut={`${mod}Z`} /> undo
      </span>
    </div>
  );
};

Hints.displayName = 'Hints';

const CHANNEL = 'announcements';

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
  const [panel, setPanel] = useState<BuilderPanelId>('issues');
  const narrow = useMediaQuery('(max-width: 860px)');

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

  return (
    <AppRoot theme={themeOf(theme).theme}>
      <MediaViewerProvider>
        <BuilderProvider builder={builder} resolvers={RESOLVERS}>
          <div className={styles.app}>
            <header className={styles.header}>
              <Logo />
              <div className={styles.headerTools}>
                <BuilderModeSwitch />
                <BuilderHistoryButtons />
              </div>
              <div className={styles.headerActions}>
                <NewMenu onPick={(payload) => store.actions.replace(payload)} />
                <ShareButton getPayload={getPayload} />
                <ThemeSwitcher value={theme} onChange={setTheme} />
              </div>
            </header>
            <aside className={styles.palette} aria-label="Add components">
              <ComponentPalette orientation={narrow ? 'horizontal' : 'vertical'} />
            </aside>
            <BuilderChannel
              name={CHANNEL}
              topic="Nothing here is sent until you press Send"
              className={styles.channel}
              footer={<Hints />}
            >
              <div className={styles.channelBody}>
                <ChannelStart name={CHANNEL} />
                <BuilderCanvas author={author} className={styles.canvas} />
              </div>
            </BuilderChannel>
            <aside className={styles.side} aria-label="Message tools">
              <BuilderPanels
                selectedId={panel}
                onSelect={setPanel}
                webhookStorageKey={WEBHOOK_KEY}
                onWebhookChange={setWebhook}
                jsonActions={<PreviewButton author={author} theme={theme} />}
              />
            </aside>
          </div>
        </BuilderProvider>
      </MediaViewerProvider>
    </AppRoot>
  );
};

App.displayName = 'App';
