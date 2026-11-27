import { useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { Clickable, GuildIcon, GuildIconSizes, Popout, type ClickableProps } from '@discord-mana/components';
import {
  AnnouncementsIcon,
  AnnouncementsSpoilerIcon,
  AnnouncementsWarningIcon,
  AppsIcon,
  AppsSpoilerIcon,
  AppsWarningIcon,
  AttachmentIcon,
  ChannelListMagnifyingGlassIcon,
  ChatIcon,
  ChevronSmallRightIcon,
  ForumIcon,
  ForumSpoilerIcon,
  ForumWarningIcon,
  ImageIcon,
  ImageWarningIcon,
  LinkIcon,
  LockIcon,
  SignPostIcon,
  StageIcon,
  TextIcon,
  TextSpoilerIcon,
  TextWarningIcon,
  ThreadIcon,
  VoiceNormalIcon,
  VoiceNormalSpoilerIcon,
  VoiceWarningIcon,
} from '@discord-mana/icons';
import {
  markupStyles,
  useMessageActions,
  useMessageResolvers,
  type APIResolvedGuild,
  type APIResolvedRole,
} from '@discord-mana/messages';
import { DEFAULT_MARKDOWN_STRINGS, getUserDisplayName, type MarkdownStrings } from '../state';
import chevronStyles from './ChannelMentionChevron.module.css';
import channelStyles from './ChannelWithIcon.module.css';
// After the channel icon styles: its margin wins, like the client's stylesheet order.
import attachmentIconStyles from './AttachmentLinkIcon.module.css';
import guildStyles from './GuildMention.module.css';
import styles from './Mention.module.css';
import noWrapStyles from './NoWrap.module.css';
import gradientStyles from './RoleGradient.module.css';

const hexColor = (color: number) => {
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  return color <= 0xffffff
    ? `#${hex((color >> 16) & 255)}${hex((color >> 8) & 255)}${hex(255 & color)}`
    : `#${hex((color >> 24) & 255)}${hex((color >> 16) & 255)}${hex((color >> 8) & 255)}`;
};

const rgba = (color: number, alpha?: number) =>
  `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${255 & color}, ${alpha ?? ((color >> 24) & 255) / 255})`;

/** A gradient role color (`colors`), as the client passes it to mentions. */
export interface RoleColorStrings {
  primaryColor: string;
  secondaryColor?: string | null;
  tertiaryColor?: string | null;
}

// The client's default role color when a gradient has no primary color.
const DEFAULT_ROLE_COLOR = '#99aab5';

const useRoleGradient = (colorStrings: RoleColorStrings | null, animateGradient: boolean) =>
  useMemo(() => {
    const primary = colorStrings?.primaryColor ?? DEFAULT_ROLE_COLOR;
    return {
      gradientStyle: {
        '--custom-gradient-color-1': primary,
        '--custom-gradient-color-2': colorStrings?.secondaryColor ?? primary,
        '--custom-gradient-color-3': colorStrings?.tertiaryColor ?? primary,
      } as React.CSSProperties,
      gradientClassname: clsx(
        colorStrings?.tertiaryColor != null ? gradientStyles.threeColorGradient : gradientStyles.twoColorGradient,
        gradientStyles.usernameGradient,
        { [gradientStyles.animateGradient]: animateGradient },
      ),
    };
  }, [colorStrings, animateGradient]);

export interface MentionProps extends Omit<ClickableProps, 'color'> {
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  /** A role color: the text takes it and the background a tint of it. */
  color?: number | null;
  roleColors?: RoleColorStrings | null;
  /** Shows a channel icon before the content. */
  iconType?: string;
}

/** The mention pill (`.mention`): users, roles, channels and slash commands. */
export const Mention = ({
  ref,
  children,
  className,
  color,
  roleColors,
  iconType,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: MentionProps) => {
  const [hovered, setHovered] = useState(false);
  const { gradientStyle, gradientClassname } = useRoleGradient(roleColors ?? null, hovered);
  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      setHovered(true);
      onMouseEnter?.(event);
    },
    [onMouseEnter],
  );
  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      setHovered(false);
      onMouseLeave?.(event);
    },
    [onMouseLeave],
  );
  const style =
    color != null ? { color: hexColor(color), backgroundColor: hovered ? rgba(color, 0.3) : rgba(color, 0.1) } : {};
  return (
    <Clickable
      {...rest}
      innerRef={ref}
      tag="span"
      className={clsx(className, { [styles.wrapper]: true, interactive: rest.onClick })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={style}
      tabIndex={rest.onClick != null ? 0 : -1}
    >
      {iconType != null ? (
        <ChannelWithIcon iconType={iconType}>{children}</ChannelWithIcon>
      ) : roleColors != null ? (
        <span style={gradientStyle} className={gradientClassname}>
          {children}
        </span>
      ) : (
        children
      )}
    </Clickable>
  );
};

Mention.displayName = 'Mention';

/** Keeps an icon on the same line as the word after it (a word joiner follows it). */
export const NoWrap = ({ children }: { children?: ReactNode }) => (
  <span className={noWrapStyles.nowrap}>
    {children}
    {'\u2060'}
  </span>
);

NoWrap.displayName = 'NoWrap';

const CHANNEL_ICONS: Record<string, { Icon: typeof TextIcon; size?: 'md' | 'lg' }> = {
  voice: { Icon: VoiceNormalIcon },
  'voice-locked': { Icon: LockIcon },
  'voice-nsfw': { Icon: VoiceWarningIcon },
  'voice-spoiler': { Icon: VoiceNormalSpoilerIcon },
  stage: { Icon: StageIcon, size: 'lg' },
  'stage-locked': { Icon: LockIcon },
  thread: { Icon: ThreadIcon },
  text: { Icon: TextIcon },
  'text-nsfw': { Icon: TextWarningIcon },
  'text-spoiler': { Icon: TextSpoilerIcon },
  announcement: { Icon: AnnouncementsIcon },
  'announcement-nsfw': { Icon: AnnouncementsWarningIcon },
  'announcement-spoiler': { Icon: AnnouncementsSpoilerIcon },
  forum: { Icon: ForumIcon },
  'forum-nsfw': { Icon: ForumWarningIcon },
  'forum-spoiler': { Icon: ForumSpoilerIcon },
  post: { Icon: ChatIcon },
  home: { Icon: SignPostIcon },
  guide: { Icon: SignPostIcon },
  browse: { Icon: ChannelListMagnifyingGlassIcon },
  customize: { Icon: ChannelListMagnifyingGlassIcon },
  message: { Icon: ChatIcon },
  locked: { Icon: LockIcon },
  media: { Icon: ImageIcon },
  'media-nsfw': { Icon: ImageWarningIcon },
  'linked-roles': { Icon: LinkIcon },
  app: { Icon: AppsIcon },
  'app-nsfw': { Icon: AppsWarningIcon },
  'app-spoiler': { Icon: AppsSpoilerIcon },
};

export interface ChannelWithIconProps {
  iconType: string;
  children?: ReactNode;
  strings?: MarkdownStrings;
}

/** A channel name with its type's icon (text, voice, thread…), as mentions show it. */
export const ChannelWithIcon = ({ iconType, children, strings = DEFAULT_MARKDOWN_STRINGS }: ChannelWithIconProps) => {
  const entry = CHANNEL_ICONS[iconType];
  const icon =
    entry != null ? (
      <entry.Icon
        size={entry.size ?? 'md'}
        color="currentColor"
        className={channelStyles.icon}
        aria-label={strings.CHANNEL_ICON[iconType]}
      />
    ) : null;
  return (
    <span
      className={clsx('channelWithIcon', {
        [channelStyles.iconMentionText]: iconType === 'text' || iconType === 'text-nsfw' || iconType === 'text-spoiler',
      })}
    >
      <NoWrap>{icon}</NoWrap>
      {children != null && children !== '' ? <span className={channelStyles.name}>{children}</span> : null}
    </span>
  );
};

ChannelWithIcon.displayName = 'ChannelWithIcon';

/** A server's icon and name, before the channel in mentions of other servers' channels. */
export const GuildMention = ({ guild, children }: { guild: APIResolvedGuild | null; children?: ReactNode }) => {
  const icon =
    guild != null ? (
      <GuildIcon
        guild={guild}
        size={GuildIconSizes.MEDIUM}
        className={clsx(guildStyles.icon, guild.icon == null ? guildStyles.textIcon : guildStyles.imageIcon)}
        active
      />
    ) : null;
  return (
    <span>
      <NoWrap>{icon}</NoWrap>
      <span className={guildStyles.name}>{children}</span>
    </span>
  );
};

GuildMention.displayName = 'GuildMention';

/** The `›` between a server or channel and what's inside it. */
export const MentionChevron = () => (
  <ChevronSmallRightIcon size="md" color="currentColor" className={chevronStyles.icon} />
);

MentionChevron.displayName = 'MentionChevron';

// The popout trigger props without their handlers when nothing can be opened.
const usePopout = () => {
  const { renderMarkdownPopout } = useMessageActions();
  return renderMarkdownPopout;
};

const isDefaultColor = (role: APIResolvedRole) =>
  role.color === 0 ||
  (role.colors != null &&
    role.colors.primary_color === 0 &&
    role.colors.secondary_color == null &&
    role.colors.tertiary_color == null);

const colorStringsOf = (role: APIResolvedRole): RoleColorStrings | null =>
  role.colors == null
    ? null
    : {
        primaryColor: role.colors.primary_color === 0 ? DEFAULT_ROLE_COLOR : hexColor(role.colors.primary_color),
        secondaryColor: role.colors.secondary_color == null ? null : hexColor(role.colors.secondary_color),
        tertiaryColor: role.colors.tertiary_color == null ? null : hexColor(role.colors.tertiary_color),
      };

export interface RoleMentionProps {
  roleId?: string | null;
  channelId?: string | null;
  roleName?: string;
  guildId?: string | null;
  children?: ReactNode;
  /** Previews (reply bars, notifications) show mentions without colors or popouts. */
  inlinePreview?: boolean;
}

/** A role mention (and `@everyone`/`@here`): the role's color, and its member list on click. */
export const RoleMention = ({
  roleId,
  channelId,
  roleName,
  guildId,
  children,
  inlinePreview = false,
}: RoleMentionProps) => {
  const resolvers = useMessageResolvers();
  const actions = useMessageActions();
  const renderPopout = usePopout();
  const role = roleId == null ? null : (resolvers.resolveRole?.(roleId) ?? null);
  const guild = guildId != null ? resolvers.resolveGuild?.(guildId) : null;
  const enhanced = guild?.features?.includes('ENHANCED_ROLE_COLORS') === true;
  const colored = !inlinePreview && role != null && !isDefaultColor(role);
  const colorStrings = enhanced && role != null ? colorStringsOf(role) : null;
  const ref = useRef<HTMLElement>(null);
  const pill = (props?: object) => (
    <Mention
      ref={ref}
      className={markupStyles.roleMention}
      color={colored ? role.color : null}
      roleColors={colored ? colorStrings : null}
      {...props}
    >
      {children}
    </Mention>
  );
  if (inlinePreview || channelId == null || guildId == null || (roleId == null && roleName !== '@everyone'))
    return pill();
  return (
    <Popout
      targetElementRef={ref}
      position="right"
      renderPopout={
        renderPopout != null
          ? () => renderPopout({ type: 'role', roleId: roleId ?? null, guildId, channelId })
          : undefined
      }
    >
      {(props) =>
        pill({
          ...props,
          onClick: (event: MouseEvent<HTMLElement>) => {
            actions.onMarkdownInteraction?.({ type: 'role', roleId: roleId ?? null, guildId, event });
            props.onClick(event);
          },
        })
      }
    </Popout>
  );
};

RoleMention.displayName = 'RoleMention';

export interface UserMentionProps {
  className?: string;
  userId?: string;
  channelId?: string;
  parsedUserId?: string | null;
  content?: ReactNode;
  inlinePreview?: boolean;
  viewingChannelId?: string;
}

/** A user mention: `@` and the member's server nickname or display name, and their profile on click. */
export const UserMention = ({
  className,
  userId,
  channelId,
  parsedUserId,
  content,
  inlinePreview = false,
}: UserMentionProps) => {
  const resolvers = useMessageResolvers();
  const actions = useMessageActions();
  const renderPopout = usePopout();
  const ref = useRef<HTMLElement>(null);
  const user = userId != null ? (resolvers.resolveUser?.(userId) ?? null) : null;
  const channel = channelId != null ? resolvers.resolveChannel?.(channelId) : null;
  const guildId = channel?.guild_id ?? null;
  if (user == null)
    return (
      <Mention
        className={className}
        onClick={(event) => actions.onMarkdownInteraction?.({ type: 'user', userId: parsedUserId ?? null, event })}
      >
        {content}
      </Mention>
    );
  const name = getUserDisplayName(user, guildId != null ? resolvers.resolveMember?.(user.id)?.nick : null);
  const pill = (props?: object) => (
    <Mention ref={ref} className={className} {...props}>
      {`@${name}`}
    </Mention>
  );
  if (inlinePreview) return pill();
  return (
    <Popout
      targetElementRef={ref}
      position="right"
      clickTrap
      renderPopout={
        renderPopout != null
          ? () => renderPopout({ type: 'user', userId: user.id, guildId, channelId: channelId ?? null })
          : undefined
      }
    >
      {(props) =>
        pill({
          ...props,
          onClick: (event: MouseEvent<HTMLElement>) => {
            actions.onMarkdownInteraction?.({ type: 'user', userId: user.id, event });
            props.onClick(event);
          },
        })
      }
    </Popout>
  );
};

UserMention.displayName = 'UserMention';

export interface AttachmentLinkProps {
  href: string;
  children?: ReactNode;
  noStyleAndInteraction?: boolean;
}

/** A link to an uploaded attachment: a paperclip and the file name. */
export const AttachmentLink = ({ href, children, noStyleAndInteraction = false }: AttachmentLinkProps) => {
  const actions = useMessageActions();
  return (
    <Mention
      role="link"
      href={href}
      onClick={
        noStyleAndInteraction ? undefined : (event) => actions.onMarkdownInteraction?.({ type: 'link', href, event })
      }
      className="attachmentLink"
    >
      <AttachmentIcon size="xs" className={clsx(channelStyles.icon, attachmentIconStyles.icon)} color="currentColor" />
      {children}
    </Mention>
  );
};

AttachmentLink.displayName = 'AttachmentLink';
