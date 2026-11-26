import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType as ReactComponentType,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Avatar, AvatarSizes, StatusTypes } from '@discord-mana/components';
import { BotTag, BotTagTypes } from '../Message/BotTag';
import {
  AnnouncementsIcon,
  AppsIcon,
  AtIcon,
  FolderIcon,
  ForumIcon,
  HubIcon,
  ImageIcon,
  ShieldUserIcon,
  StageIcon,
  TagIcon,
  TextIcon,
  ThreadIcon,
  ThreadLockIcon,
  UserIcon,
  VoiceNormalIcon,
  type IconProps,
} from '@discord-mana/icons';
import { useMessageI18n } from '../Message/messageI18n';
import { ComponentStatusLine, errorStatus } from './ComponentStatus';
import { ComponentVisualState, useComponentContext, useComponentState, type SelectedOption } from './ComponentState';
import { PopoutSearchableSelect, type SearchableSelectAccessoryContext } from './PopoutSearchableSelect';
import { createResolver, useMessageResolvers, type APIResolvedChannel, type Resolver } from './resolvers';
import {
  ComponentType,
  SelectOptionType,
  type APISelectMenuDefaultValue,
  type ChannelSelectComponent,
  type SearchableSelectComponent,
} from './types';
import tagStyles from './DiscordTag.module.css';
import labelStyles from './SearchableSelectLabel.module.css';
import stringSelectStyles from './StringSelect.module.css';
import styles from './SearchableSelect.module.css';

const PILL_ICON_SIZE = 16;
const ROW_ICON_SIZE = 24;
const DEFAULT_ROLE_COLOR = '#99aab5';

const CHANNEL_ICONS: Record<number, ReactComponentType<IconProps>> = {
  0: TextIcon,
  1: AtIcon,
  2: VoiceNormalIcon,
  3: AtIcon,
  4: FolderIcon,
  5: AnnouncementsIcon,
  6: TagIcon,
  10: ThreadIcon,
  11: ThreadIcon,
  12: ThreadLockIcon,
  13: StageIcon,
  14: HubIcon,
  15: ForumIcon,
  16: ImageIcon,
};

/** The channel types' icons (the client also has NSFW, locked and rules variants it reads from the channel). */
export const getChannelIcon = (channel: Pick<APIResolvedChannel, 'type'>) =>
  channel.type === 18 ? AppsIcon : CHANNEL_ICONS[channel.type];

const getUserLabel = (resolver: Resolver, id: string) => {
  const user = resolver.user(id);
  if (user == null) return null;
  const member = resolver.member(id);
  return member?.nick ?? user.global_name ?? user.username;
};

/** The selected values the client resolves from its stores (unknown ids are dropped). */
const resolveDefaults = (
  defaults: APISelectMenuDefaultValue[] | undefined,
  resolver: Resolver,
  channelTypes: number[] = [],
): SelectedOption[] | undefined =>
  defaults
    ?.map((value): SelectedOption | null => {
      switch (value.type) {
        case 'user': {
          const label = getUserLabel(resolver, value.id);
          return label == null ? null : { type: SelectOptionType.User, value: value.id, label };
        }
        case 'role': {
          const role = resolver.role(value.id);
          return role == null ? null : { type: SelectOptionType.Role, value: role.id, label: role.name };
        }
        case 'channel': {
          const channel = resolver.channel(value.id);
          if (channel == null || (channelTypes.length > 0 && !channelTypes.includes(channel.type))) return null;
          return { type: SelectOptionType.Channel, value: channel.id, label: channel.name ?? '' };
        }
        default:
          return null;
      }
    })
    .filter((value) => value != null);

const OptionIcon = ({ icon, iconSize }: { icon: ReactNode; iconSize: number }) => (
  <div className={styles.iconContainer} style={{ height: iconSize, width: iconSize }}>
    {icon}
  </div>
);

OptionIcon.displayName = 'OptionIcon';

interface SearchableSelectActionProps {
  component: SearchableSelectComponent;
  queryOptions: (query: string) => SelectedOption[];
  renderIcon: (option: SelectedOption | null, size: number) => ReactNode;
  renderOptionLabel: (option: SelectedOption) => ReactNode;
  defaultValues: SelectedOption[] | undefined;
}

const SearchableSelectAction = ({
  component,
  queryOptions,
  renderIcon,
  renderOptionLabel,
  defaultValues,
}: SearchableSelectActionProps) => {
  const { type, customId, maxValues, disabled } = component;
  const i18n = useMessageI18n();
  const placeholder = component.placeholder ?? i18n.MAKE_A_SELECTION;
  const [open, setOpen] = useState(false);
  const [changedWhileClosed, setChangedWhileClosed] = useState(false);
  const [selected, setSelected] = useState(() => new Map(defaultValues?.map((option) => [option.value, option])));
  const [committed, setCommitted] = useState(() => new Set(selected.keys()));
  const defaultsRef = useRef((defaultValues ?? []).map((option) => option.value));
  const typeRef = useRef(type);
  const customIdRef = useRef(customId);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    const values = (defaultValues ?? []).map((option) => option.value);
    if (
      values.every((value) => defaultsRef.current.includes(value)) &&
      defaultsRef.current.every((value) => values.includes(value)) &&
      type === typeRef.current &&
      customId === customIdRef.current
    )
      return;
    defaultsRef.current = values;
    typeRef.current = type;
    customIdRef.current = customId;
    const next = new Map(defaultValues?.map((option) => [option.value, option]));
    setSelected(next);
    setCommitted(new Set(next.keys()));
    setResetKey((key) => key + 1);
  }, [defaultValues, type, customId]);
  const context = useComponentContext();
  if (context == null)
    throw new Error('SearchableSelectActionComponent must be rendered inside a ComponentStateContext');
  const { state, executeStateUpdate, visualState, isDisabled, error } = useComponentState(
    component,
    selected.size > 0 ? { type, selectedOptions: Array.from(selected.values()) } : undefined,
  );
  const inModal = context.modal != null;
  const processing = visualState === ComponentVisualState.LOADING;
  useEffect(() => {
    if (state != null && 'selectedOptions' in state) {
      const next = new Map(state.selectedOptions.map((option) => [option.value, option]));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the stored state, like the client
      setSelected(next);
      setCommitted(new Set(next.keys()));
    }
  }, [state]);
  const commit = useCallback(() => {
    if (executeStateUpdate({ type, selectedOptions: Array.from(selected.values()) } as never))
      setCommitted(new Set(selected.keys()));
  }, [executeStateUpdate, type, selected]);
  useEffect(() => {
    if (open || changedWhileClosed) return;
    if (selected.size === committed.size && Array.from(selected.keys()).every((value) => committed.has(value))) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- commits once the popout closes, like the client
    commit();
  }, [open, changedWhileClosed, committed, selected, commit]);
  const showPlaceholder = selected.size === 0 || open;
  const shared = {
    isProcessing: processing,
    isDisabled: disabled || visualState === ComponentVisualState.DISABLED || isDisabled,
    wrapperClassName: clsx(styles.select, { [styles.inModal]: inModal }),
    options: (query: string) => new Promise<SelectedOption[]>((resolve) => resolve(queryOptions(query))),
    filter: false,
    placeholder: showPlaceholder ? placeholder : undefined,
    onClose: () => setOpen(false),
    onOpen: () => setOpen(true),
    onBlur: () => setChangedWhileClosed(false),
    maxVisibleItems: 5,
    renderOptionPrefix: (option: SelectedOption | null, { inPill }: SearchableSelectAccessoryContext) => {
      const size = inPill ? PILL_ICON_SIZE : ROW_ICON_SIZE;
      const icon = renderIcon(option, size);
      return icon != null ? <OptionIcon icon={icon} iconSize={size} /> : null;
    },
    renderOptionLabel,
  };
  return (
    <Fragment>
      <div className={styles.container}>
        {maxValues != null && maxValues > 1 ? (
          <PopoutSearchableSelect<string, SelectedOption>
            key={resetKey}
            {...shared}
            multi
            value={Array.from(selected.values())}
            onChange={(values) => {
              if (!open) setChangedWhileClosed(true);
              setSelected(new Map((values as SelectedOption[]).map((option) => [option.value, option])));
            }}
            inputClassNames={clsx({ [styles.hidden]: !showPlaceholder })}
            closeOnSelect={false}
          />
        ) : (
          <PopoutSearchableSelect<string, SelectedOption>
            key={resetKey}
            {...shared}
            value={Array.from(selected.values())[0]}
            onChange={(value) =>
              setSelected(
                value != null ? new Map([[(value as SelectedOption).value, value as SelectedOption]]) : new Map(),
              )
            }
            clearable
          />
        )}
      </div>
      {error == null || inModal ? null : (
        <ComponentStatusLine {...errorStatus(error)} className={stringSelectStyles.error} />
      )}
    </Fragment>
  );
};

SearchableSelectAction.displayName = 'SearchableSelectAction';

/** The username after a user option (with an app's tag), like the client's `DiscordTag`. */
const UserTag = ({ username, discriminator, bot }: { username: string; discriminator?: string; bot?: boolean }) => (
  <div className={clsx(tagStyles.info, labelStyles.tag)}>
    <span className={labelStyles.username}>{username}</span>
    {discriminator != null && discriminator !== '0' ? (
      <span className={clsx(tagStyles.infoSpacing, labelStyles.discriminator)}>#{discriminator}</span>
    ) : undefined}
    {bot ? <BotTag type={BotTagTypes.BOT} className={clsx(tagStyles.infoSpacing, labelStyles.bot)} /> : null}
  </div>
);

UserTag.displayName = 'UserTag';

/** User, role and mentionable selects: options come from the resolvers' searches. */
const MentionableSelect = (component: Exclude<SearchableSelectComponent, ChannelSelectComponent>) => {
  const resolvers = useMessageResolvers();
  const context = useComponentContext();
  const resolver = createResolver(resolvers, context?.resolved);
  const defaults = useMemo(
    () => resolveDefaults(component.defaultValues, resolver),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the resolver is rebuilt each render
    [component.defaultValues, resolvers, context?.resolved],
  );
  const users = component.type === ComponentType.UserSelect || component.type === ComponentType.MentionableSelect;
  const roles = component.type === ComponentType.RoleSelect || component.type === ComponentType.MentionableSelect;
  return (
    <SearchableSelectAction
      component={component}
      defaultValues={defaults}
      queryOptions={(query) => [
        ...(users
          ? (resolvers.searchUsers?.(query) ?? []).slice(0, 15).map((user) => ({
              type: SelectOptionType.User,
              value: user.id,
              label: resolver.member(user.id)?.nick ?? user.global_name ?? user.username,
            }))
          : []),
        ...(roles
          ? (resolvers.searchRoles?.(query) ?? [])
              .slice(0, 15)
              .map((role) => ({ type: SelectOptionType.Role, value: role.id, label: role.name }))
          : []),
      ]}
      renderIcon={(option, size) => {
        if (option?.type === SelectOptionType.User) {
          const user = resolver.user(option.value);
          if (user == null) return null;
          return (
            <Avatar
              size={size === PILL_ICON_SIZE ? AvatarSizes.SIZE_16 : AvatarSizes.SIZE_24}
              src={resolver.avatarURL(user, size)}
              status={size === PILL_ICON_SIZE ? null : (resolvers.getUserStatus?.(user.id) ?? StatusTypes.OFFLINE)}
              aria-hidden
            />
          );
        }
        if (option?.type === SelectOptionType.Role) {
          const role = resolver.role(option.value);
          if (role == null) return null;
          return (
            <ShieldUserIcon
              size="custom"
              color={role.color !== 0 ? `#${role.color.toString(16).padStart(6, '0')}` : DEFAULT_ROLE_COLOR}
              height={size}
              width={size}
            />
          );
        }
        return null;
      }}
      renderOptionLabel={(option) => {
        let suffix: ReactNode = null;
        if (option.type === SelectOptionType.User) {
          const user = resolver.user(option.value);
          if (user != null)
            suffix = <UserTag username={user.username} discriminator={user.discriminator} bot={user.bot} />;
        } else if (option.type === SelectOptionType.Role) {
          const count = resolvers.getRoleMemberCount?.(option.value);
          if (count != null)
            suffix = (
              <div className={labelStyles.roleCountContainer}>
                <UserIcon size="sm" color="currentColor" className={labelStyles.roleCountIcon} />
                <span className={labelStyles.roleCountText}>{count}</span>
              </div>
            );
        }
        return (
          <span className={labelStyles.label}>
            <span className={labelStyles.labelText}>{option.label}</span>
            {suffix}
          </span>
        );
      }}
    />
  );
};

MentionableSelect.displayName = 'MentionableSelect';

const ChannelSelect = (component: ChannelSelectComponent) => {
  const resolvers = useMessageResolvers();
  const context = useComponentContext();
  const resolver = createResolver(resolvers, context?.resolved);
  const { channelTypes } = component;
  const defaults = useMemo(
    () => resolveDefaults(component.defaultValues, resolver, channelTypes),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the resolver is rebuilt each render
    [component.defaultValues, resolvers, context?.resolved, channelTypes],
  );
  return (
    <SearchableSelectAction
      component={component}
      defaultValues={defaults}
      queryOptions={(query) =>
        (resolvers.searchChannels?.(query, channelTypes) ?? [])
          .slice(0, 15)
          .map((channel) => ({ type: SelectOptionType.Channel, value: channel.id, label: channel.name ?? '' }))
      }
      renderIcon={(option, size) => {
        const channel = option != null ? resolver.channel(option.value) : null;
        if (channel == null) return null;
        const Icon = getChannelIcon(channel);
        return Icon != null ? <Icon size="custom" color="currentColor" width={size} height={size} /> : null;
      }}
      renderOptionLabel={(option) => <span className={labelStyles.label}>{option.label}</span>}
    />
  );
};

ChannelSelect.displayName = 'ChannelSelect';

/** User, role, mentionable and channel selects (searchable, filled from the resolvers). */
export const SearchableSelect = (component: SearchableSelectComponent) =>
  component.type === ComponentType.ChannelSelect ? (
    <ChannelSelect {...component} />
  ) : (
    <MentionableSelect {...component} />
  );

SearchableSelect.displayName = 'SearchableSelect';
