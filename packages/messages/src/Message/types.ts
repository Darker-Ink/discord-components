// Messages as the REST API and gateway send them (discord-api-types naming).
import type { APIAttachment } from '../attachments/types';
import type { APIEmbed } from '../Embed/types';
import type { APIMessageTopLevelComponent } from '../MessageComponents/types';
import type { APIResolvedData, APIResolvedMember, APIResolvedUser } from '../MessageComponents/resolvers';

export const MessageFlags = {
  Crossposted: 1 << 0,
  IsCrosspost: 1 << 1,
  SuppressEmbeds: 1 << 2,
  SourceMessageDeleted: 1 << 3,
  Urgent: 1 << 4,
  HasThread: 1 << 5,
  Ephemeral: 1 << 6,
  Loading: 1 << 7,
  FailedToMentionSomeRolesInThread: 1 << 8,
  SuppressNotifications: 1 << 12,
  IsVoiceMessage: 1 << 13,
  HasSnapshot: 1 << 14,
  IsComponentsV2: 1 << 15,
} as const;

export type MessageFlags = (typeof MessageFlags)[keyof typeof MessageFlags];

export const MessageType = {
  Default: 0,
  RecipientAdd: 1,
  RecipientRemove: 2,
  Call: 3,
  ChannelNameChange: 4,
  ChannelIconChange: 5,
  ChannelPinnedMessage: 6,
  UserJoin: 7,
  GuildBoost: 8,
  GuildBoostTier1: 9,
  GuildBoostTier2: 10,
  GuildBoostTier3: 11,
  ChannelFollowAdd: 12,
  GuildDiscoveryDisqualified: 14,
  GuildDiscoveryRequalified: 15,
  ThreadCreated: 18,
  Reply: 19,
  ChatInputCommand: 20,
  ThreadStarterMessage: 21,
  GuildInviteReminder: 22,
  ContextMenuCommand: 23,
  AutoModerationAction: 24,
  RoleSubscriptionPurchase: 25,
  InteractionPremiumUpsell: 26,
  StageStart: 27,
  StageEnd: 28,
  StageSpeaker: 29,
  StageTopic: 31,
  GuildApplicationPremiumSubscription: 32,
  PollResult: 46,
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

/** Message types the client draws as a normal message (others are system messages). */
export const USER_MESSAGE_TYPES: ReadonlySet<number> = new Set([
  MessageType.Default,
  MessageType.Reply,
  MessageType.ChatInputCommand,
  MessageType.ContextMenuCommand,
]);

export const InteractionType = { ApplicationCommand: 2, MessageComponent: 3, ModalSubmit: 5 } as const;

export type APIUser = APIResolvedUser;

export interface APIMessageReference {
  type?: number;
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
}

export interface APIMessageInteractionMetadata {
  id: string;
  type: number;
  user: APIUser;
  authorizing_integration_owners?: Record<string, string>;
  original_response_message_id?: string;
  /** Slash command name, e.g. "ping" (command interactions). */
  name?: string;
  command_type?: number;
  target_user?: APIUser;
  target_message_id?: string;
  /** Why an ephemeral response is ephemeral (client-only data on failed sends). */
  ephemerality_reason?: number;
}

/** Deprecated `interaction` of a command response (the client still reads it for the "used /command" line). */
export interface APIMessageInteraction {
  id: string;
  type: number;
  name: string;
  user: APIUser;
  member?: APIResolvedMember;
}

export interface APIReactionEmoji {
  id: string | null;
  name: string | null;
  animated?: boolean;
}

export interface APIReaction {
  count: number;
  count_details?: { burst: number; normal: number };
  me: boolean;
  me_burst?: boolean;
  emoji: APIReactionEmoji;
  burst_colors?: string[];
}

export const StickerFormatType = { PNG: 1, APNG: 2, Lottie: 3, GIF: 4 } as const;

export interface APIStickerItem {
  id: string;
  name: string;
  format_type: number;
}

export interface APIMessageSnapshot {
  message: Pick<
    APIMessage,
    | 'type'
    | 'content'
    | 'embeds'
    | 'attachments'
    | 'timestamp'
    | 'edited_timestamp'
    | 'flags'
    | 'mentions'
    | 'mention_roles'
    | 'sticker_items'
    | 'components'
  >;
}

export interface APIPollMedia {
  text?: string;
  emoji?: APIReactionEmoji;
}

export interface APIPoll {
  question: APIPollMedia;
  answers: { answer_id: number; poll_media: APIPollMedia }[];
  expiry: string | null;
  allow_multiselect: boolean;
  layout_type: number;
  results?: {
    is_finalized: boolean;
    answer_counts: { id: number; count: number; me_voted: boolean }[];
  };
}

export interface APIMessage {
  id: string;
  channel_id: string;
  author: APIUser;
  content: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  edited_timestamp: string | null;
  tts?: boolean;
  mention_everyone?: boolean;
  mentions?: APIUser[];
  mention_roles?: string[];
  attachments?: APIAttachment[];
  embeds?: APIEmbed[];
  reactions?: APIReaction[];
  nonce?: string | number;
  pinned?: boolean;
  webhook_id?: string;
  type: MessageType | number;
  application_id?: string;
  /** The app that sent a command response (partial). */
  application?: { id: string; name?: string; icon?: string | null };
  message_reference?: APIMessageReference;
  flags?: number;
  /** The replied-to message (replies and context menu commands). */
  referenced_message?: APIMessage | null;
  message_snapshots?: APIMessageSnapshot[];
  interaction_metadata?: APIMessageInteractionMetadata;
  interaction?: APIMessageInteraction;
  components?: APIMessageTopLevelComponent[];
  sticker_items?: APIStickerItem[];
  poll?: APIPoll;
  /** Data for users, members, channels and roles in the message's auto-populated select menus. */
  resolved?: APIResolvedData;
  /** The author's guild member (gateway MESSAGE_CREATE in guilds). */
  member?: APIResolvedMember;
}
