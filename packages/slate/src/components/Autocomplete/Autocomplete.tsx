import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import {
  AdvancedScrollerThin,
  Avatar,
  AvatarSizes,
  Clickable,
  Heading,
  ListNavigatorItem,
  ListNavigatorProvider,
  Text,
  useListNavigator,
} from '@discord-mana/components';
import {
  AnnouncementsIcon,
  ChatIcon,
  ForumIcon,
  ImageIcon,
  StageIcon,
  TextIcon,
  ThreadIcon,
  VoiceNormalIcon,
} from '@discord-mana/icons';
import {
  getDefaultAvatarURL,
  type APIResolvedChannel,
  type APIResolvedRole,
  type APIResolvedUser,
} from '@discord-mana/messages';
import type { ChatInputType } from '../../chatInputTypes';
import { useEditorContext, type EditorCustomEmoji, type EditorUnicodeEmoji } from '../../core/context';
import { formatChannelMention, getUserTag } from '../../core/serialize';
import type { ChannelEditorHandle } from '../ChannelTextArea/ChannelEditor';
import styles from './Autocomplete.module.css';
import rowStyles from './AutocompleteRow.module.css';

// The chat input's autocomplete for `@` (members, @everyone/@here, roles), `#` (channels) and `:` (emoji): the
// client's AutocompleteRow pieces in a list attached above the input. Arrow keys move, Tab and Enter pick.

export interface AutocompleteHandle {
  onTabOrEnter: (isEnter: boolean) => boolean;
  onSpace: () => boolean;
  onMoveSelection: (delta: number) => boolean;
  onMaybeShowAutocomplete: () => void;
  onHideAutocomplete: () => void;
}

export interface AutocompleteProps {
  ref?: Ref<AutocompleteHandle>;
  editorRef: RefObject<ChannelEditorHandle | null>;
  type: ChatInputType;
  textValue: string;
  targetRef: RefObject<HTMLElement | null>;
  editorHeight: number;
  onPopupChange?: (popup: { id: string | null; activeDescendant: string | null }) => void;
}

type Emoji = (EditorCustomEmoji & { kind: 'custom' }) | (EditorUnicodeEmoji & { kind: 'unicode'; name: string });

interface MentionGlobal {
  text: string;
  description: string;
}

type Query =
  | { type: 'MENTIONS'; text: string; users: APIResolvedUser[]; globals: MentionGlobal[]; roles: APIResolvedRole[] }
  | { type: 'CHANNELS'; text: string; channels: APIResolvedChannel[] }
  | { type: 'EMOJIS'; text: string; emojis: Emoji[] };

const MAX_RESULTS = 10;

const GLOBALS: MentionGlobal[] = [
  { text: '@everyone', description: 'Notify everyone who has permission to view this channel.' },
  { text: '@here', description: 'Notify everyone online who has permission to view this channel.' },
];

const resultCount = (query: Query) =>
  query.type === 'MENTIONS'
    ? query.users.length + query.globals.length + query.roles.length
    : query.type === 'CHANNELS'
      ? query.channels.length
      : query.emojis.length;

const rowId = (index: number | null) => (index != null ? `autocomplete-${index}` : null);

interface RowProps {
  index: number;
  selected: boolean;
  small?: boolean;
  onClick: (index: number) => void;
  onHover: (index: number) => void;
  children: ReactNode;
}

// A selectable AutocompleteRow: an option in the list navigator.
const Row = ({ index, selected, small, onClick, onHover, children }: RowProps) => (
  <ListNavigatorItem id={`${index}`}>
    {(itemProps) => (
      <Clickable
        {...itemProps}
        className={clsx(
          rowStyles.clickable,
          rowStyles.autocompleteRowVertical,
          small && rowStyles.autocompleteRowVerticalSmall,
        )}
        id={rowId(index) ?? undefined}
        onClick={() => onClick(index)}
        onMouseMove={() => {
          if (!selected) onHover(index);
        }}
        role="option"
        aria-selected={selected}
      >
        <div className={rowStyles.base}>{children}</div>
      </Clickable>
    )}
  </ListNavigatorItem>
);

Row.displayName = 'AutocompleteRow';

const RowContent = ({ children }: { children: ReactNode }) => (
  <div className={rowStyles.autocompleteRowContent}>{children}</div>
);
RowContent.displayName = 'AutocompleteRowContent';

const RowPrimary = ({ children }: { children: ReactNode }) => (
  <div className={rowStyles.autocompleteRowContentPrimary}>{children}</div>
);
RowPrimary.displayName = 'AutocompleteRowContentPrimary';

const RowIcon = ({ children }: { children: ReactNode }) => (
  <div className={rowStyles.autocompleteRowIcon}>{children}</div>
);
RowIcon.displayName = 'AutocompleteRowIcon';

const RowHeading = ({ children }: { children: ReactNode }) => (
  <Text className={rowStyles.autocompleteRowHeading} color="interactive-text-active" variant="body-md/normal">
    {children}
  </Text>
);
RowHeading.displayName = 'AutocompleteRowHeading';

const RowSecondary = ({ children }: { children: ReactNode }) => (
  <Text className={rowStyles.autocompleteRowContentSecondary} color="interactive-text-default" variant="body-xs/normal">
    {children}
  </Text>
);
RowSecondary.displayName = 'AutocompleteRowContentSecondary';

const Divider = () => (
  <div className={clsx(rowStyles.autocompleteRowVertical, rowStyles.dividerContainer)} role="none">
    <div className={rowStyles.base}>
      <div className={rowStyles.divider} />
    </div>
  </div>
);
Divider.displayName = 'AutocompleteDivider';

const Title = ({ id, title }: { id: string; title: string }) => (
  <div className={rowStyles.base}>
    <Heading id={`autocomplete-${id}-title`} className={rowStyles.contentTitle} variant="body-xs/semibold">
      {title}
    </Heading>
  </div>
);
Title.displayName = 'AutocompleteTitle';

const title = (query: string, prefix: string, withQuery: string, withoutQuery: string) =>
  query.length > 0 ? `${withQuery} ${prefix}${query}` : withoutQuery;

const CHANNEL_ICONS: Record<number, typeof TextIcon> = {
  0: TextIcon,
  2: VoiceNormalIcon,
  5: AnnouncementsIcon,
  10: ThreadIcon,
  11: ThreadIcon,
  12: ThreadIcon,
  13: StageIcon,
  15: ForumIcon,
  16: ImageIcon,
};

const startsWith = (query: string, ...names: (string | null | undefined)[]) =>
  names.some((name) => name != null && name.toLowerCase().startsWith(query.toLowerCase()));

export const Autocomplete = ({ ref, editorRef, type, textValue, onPopupChange }: AutocompleteProps) => {
  const { resolvers, guildId } = useEditorContext();
  const [query, setQuery] = useState<Query | null>(null);
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const id = useId().replace(/:/g, '');

  const runQuery = useCallback((): Query | null => {
    const editor = editorRef.current;
    if (editor == null) return null;
    const { word } = editor.getCurrentWord();
    if (word == null || word.length === 0) return null;
    const sentinel = word[0];
    const text = word.slice(1);
    if (sentinel === '@' && type.users?.allowMentioning !== false) {
      const users = (resolvers.searchUsers?.(text) ?? resolvers.getMentionableUsers?.() ?? [])
        .filter((user) => startsWith(text, user.username, user.global_name, resolvers.resolveMember?.(user.id)?.nick))
        .slice(0, MAX_RESULTS);
      const globals =
        guildId != null ? GLOBALS.filter((global) => global.text.slice(1).startsWith(text.toLowerCase())) : [];
      const roles =
        guildId != null
          ? (resolvers.searchRoles?.(text) ?? resolvers.getRoles?.() ?? [])
              .filter((role) => startsWith(text, role.name))
              .slice(0, MAX_RESULTS)
          : [];
      return { type: 'MENTIONS', text, users, globals, roles };
    }
    if (sentinel === '#' && guildId != null) {
      const channels = (resolvers.searchChannels?.(text) ?? resolvers.getChannels?.() ?? [])
        .filter((channel) => channel.type !== 4 && startsWith(text, channel.name))
        .slice(0, MAX_RESULTS);
      return { type: 'CHANNELS', text, channels };
    }
    if (sentinel === ':' && text.length > 1) {
      const results = resolvers.searchEmojis?.(text) ?? { custom: [], unicode: [] };
      const emojis: Emoji[] = [
        ...results.custom.map((emoji) => ({ ...emoji, kind: 'custom' as const })),
        ...results.unicode.map((emoji) => ({ ...emoji, kind: 'unicode' as const, name: emoji.names[0] })),
      ].slice(0, MAX_RESULTS);
      return { type: 'EMOJIS', text, emojis };
    }
    return null;
  }, [editorRef, guildId, resolvers, type.users?.allowMentioning]);

  const update = useCallback(() => {
    const next = runQuery();
    const shown = next != null && resultCount(next) > 0;
    setQuery(next);
    setVisible(shown);
    setSelectedIndex(shown ? 0 : null);
  }, [runQuery]);

  // Query again as the text changes (the client also waits for the next tick).
  useEffect(() => {
    const timeout = setTimeout(update, 0);
    return () => clearTimeout(timeout);
  }, [textValue, update]);

  const select = useCallback(
    (index: number) => {
      const editor = editorRef.current;
      if (query == null || editor == null) return false;
      if (query.type === 'MENTIONS') {
        const { users, globals, roles } = query;
        if (index < users.length) editor.insertAutocomplete(`@${getUserTag(users[index])}`, `<@${users[index].id}>`);
        else if (index < users.length + globals.length) editor.insertAutocomplete(globals[index - users.length].text);
        else {
          const role = roles[index - users.length - globals.length];
          if (role == null) return false;
          editor.insertAutocomplete(`@${role.name}`, `<@&${role.id}>`);
        }
      } else if (query.type === 'CHANNELS') {
        const channel = query.channels[index];
        if (channel == null) return false;
        editor.insertAutocomplete(formatChannelMention(channel), `<#${channel.id}>`);
      } else {
        const emoji = query.emojis[index];
        if (emoji == null) return false;
        editor.insertAutocomplete(
          `:${emoji.name}:`,
          emoji.kind === 'custom' ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` : null,
        );
      }
      setVisible(false);
      setQuery(null);
      return true;
    },
    [editorRef, query],
  );

  const navigator = useListNavigator({
    id: 'channel-autocomplete',
    isEnabled: visible,
    useVirtualFocus: true,
    setFocus: (_selector, itemId) => setSelectedIndex(Number(itemId)),
    scrollToStart: () => Promise.resolve(),
    scrollToEnd: () => Promise.resolve(),
  });

  useImperativeHandle(
    ref,
    () => ({
      onTabOrEnter: () => (visible && selectedIndex != null ? select(selectedIndex) : false),
      onSpace: () => false,
      onMoveSelection: (delta) => {
        if (!visible || query == null) return false;
        const count = resultCount(query);
        setSelectedIndex((current) => ((current ?? (delta > 0 ? -1 : 0)) + delta + count) % count);
        return true;
      },
      onMaybeShowAutocomplete: update,
      onHideAutocomplete: () => setVisible(false),
    }),
    [query, select, selectedIndex, update, visible],
  );

  useEffect(() => {
    onPopupChange?.(visible ? { id, activeDescendant: rowId(selectedIndex) } : { id: null, activeDescendant: null });
  }, [id, onPopupChange, selectedIndex, visible]);

  const rows = useMemo(() => {
    if (query == null) return null;
    const rowProps = (index: number) => ({
      index,
      selected: selectedIndex === index,
      onClick: select,
      onHover: setSelectedIndex,
    });
    if (query.type === 'MENTIONS') {
      const { users, globals, roles, text } = query;
      let heading = title(text, '@', 'Members matching', 'Members');
      if (users.length === 0 && globals.length > 0) heading = title(text, '@', 'Options matching', 'Options');
      else if (users.length === 0 && roles.length > 0) heading = title(text, '@', 'Roles matching', 'Roles');
      return (
        <Fragment key="mentions">
          <Title id={id} title={heading} />
          {users.map((user, i) => (
            <Row key={i} {...rowProps(i)}>
              <RowContent>
                <RowIcon>
                  <Avatar
                    size={AvatarSizes.SIZE_24}
                    src={resolvers.getAvatarURL?.(user, 24) ?? getDefaultAvatarURL(user, 24)}
                    aria-hidden
                    status={resolvers.getUserStatus?.(user.id) ?? undefined}
                  />
                </RowIcon>
                <RowPrimary>
                  <RowHeading>
                    {resolvers.resolveMember?.(user.id)?.nick ?? user.global_name ?? user.username}
                  </RowHeading>
                </RowPrimary>
                <RowSecondary>{user.username}</RowSecondary>
              </RowContent>
            </Row>
          ))}
          {globals.length > 0 && users.length > 0 ? <Divider /> : null}
          {globals.map((global, i) => (
            <Row key={users.length + i} {...rowProps(users.length + i)}>
              <RowContent>
                <RowPrimary>
                  <RowHeading>{global.text}</RowHeading>
                </RowPrimary>
                <RowSecondary>{global.description}</RowSecondary>
              </RowContent>
            </Row>
          ))}
          {roles.length > 0 && (users.length > 0 || globals.length > 0) ? <Divider /> : null}
          {roles.map((role, i) => (
            <Row key={users.length + globals.length + i} {...rowProps(users.length + globals.length + i)}>
              <RowContent>
                <RowPrimary>
                  <RowHeading>
                    <span style={role.color ? { color: `#${role.color.toString(16).padStart(6, '0')}` } : undefined}>
                      @{role.name}
                    </span>
                  </RowHeading>
                </RowPrimary>
                <RowSecondary>Notify users with this role who have permission to view this channel.</RowSecondary>
              </RowContent>
            </Row>
          ))}
        </Fragment>
      );
    }
    if (query.type === 'CHANNELS')
      return (
        <Fragment key="channels">
          <Title id={id} title={title(query.text, '#', 'Text channels matching', 'Text Channels')} />
          {query.channels.map((channel, i) => {
            const Icon = CHANNEL_ICONS[channel.type] ?? ChatIcon;
            const category = channel.parent_id != null ? resolvers.resolveChannel?.(channel.parent_id) : null;
            return (
              <Row key={i} {...rowProps(i)}>
                <RowContent>
                  <RowIcon>
                    <Icon className={rowStyles.icon} />
                  </RowIcon>
                  <RowPrimary>
                    <RowHeading>{channel.name}</RowHeading>
                  </RowPrimary>
                  {category != null ? <RowSecondary>{category.name}</RowSecondary> : null}
                </RowContent>
              </Row>
            );
          })}
        </Fragment>
      );
    return (
      <Fragment key="emoji">
        <Title id={id} title={title(query.text, ':', 'Emoji matching', 'Emoji')} />
        {query.emojis.map((emoji, i) => {
          const url =
            emoji.kind === 'custom'
              ? resolvers.getEmojiURL?.({ id: emoji.id, name: emoji.name, animated: emoji.animated, size: 48 })
              : resolvers.getEmojiURL?.({ name: emoji.surrogates, size: 48 });
          return (
            <Row key={i} {...rowProps(i)} small>
              <RowContent>
                <RowIcon>
                  {url != null ? (
                    <img alt="" className={rowStyles.emojiImage} src={url} />
                  ) : (
                    <span className={rowStyles.emojiRaw}>{emoji.kind === 'unicode' ? emoji.surrogates : null}</span>
                  )}
                </RowIcon>
                <RowPrimary>
                  <RowHeading>:{emoji.name}:</RowHeading>
                </RowPrimary>
                {emoji.kind === 'custom' && emoji.guildName != null ? (
                  <RowSecondary>{emoji.guildName}</RowSecondary>
                ) : null}
              </RowContent>
            </Row>
          );
        })}
      </Fragment>
    );
  }, [id, query, resolvers, select, selectedIndex]);

  if (!visible || query == null || rows == null) return null;
  const maxHeight = type.autocomplete?.small ? 200 : query.type === 'EMOJIS' ? 490 : 245;
  return (
    <div
      className={clsx(rowStyles.autocomplete, styles.autocomplete, styles.autocompleteAttached)}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className={clsx(rowStyles.autocompleteInner, styles.autocompleteInner)}>
        <ListNavigatorProvider navigator={navigator}>
          <AdvancedScrollerThin
            id={id}
            orientation="vertical"
            className={styles.scroller}
            style={{ maxHeight: Math.min(window.innerHeight - 120, maxHeight) }}
            role="listbox"
            aria-labelledby={`autocomplete-${id}-title`}
          >
            {rows}
          </AdvancedScrollerThin>
        </ListNavigatorProvider>
      </div>
    </div>
  );
};

Autocomplete.displayName = 'Autocomplete';
