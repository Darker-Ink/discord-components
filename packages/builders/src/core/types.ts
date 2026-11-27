import type {
  APIButtonComponent,
  APIChannelSelectComponent,
  APIContainerComponent,
  APIEmbed,
  APIEmbedField,
  APIFileComponent,
  APIMediaGalleryItem,
  APIMentionableSelectComponent,
  APIMessageComponentEmoji,
  APIMessageReference,
  APIMessageTopLevelComponent,
  APIRoleSelectComponent,
  APISelectMenuOption,
  APISeparatorComponent,
  APIStringSelectComponent,
  APITextDisplayComponent,
  APIThumbnailComponent,
  APIUserSelectComponent,
} from '@discord-mana/messages';
import type { BuilderRestrictions } from './restrictions';

// ---------------------------------------------------------------------------------------------------------
// Request payloads (discord-api-types naming). The message/component/embed shapes come from
// @discord-mana/messages; these add what only requests have.

export type AllowedMentionType = 'users' | 'roles' | 'everyone';

/** `allowed_mentions` (resources/message.mdx, "Allowed Mentions Object"). */
export interface APIAllowedMentions {
  parse?: AllowedMentionType[];
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
}

/** An entry of a request's `attachments` (resources/message.mdx, "Attachment Request Structure"). */
export interface APIAttachmentRequest {
  /** For new files, the `n` of `files[n]`. */
  id: string | number;
  filename?: string;
  title?: string;
  description?: string;
  duration_secs?: number;
  waveform?: string;
  is_spoiler?: boolean;
}

export interface APIPollMediaRequest {
  text?: string;
  emoji?: APIMessageComponentEmoji;
}

/** resources/poll.mdx, "Poll Create Request Object". */
export interface APIPollCreateRequest {
  question: APIPollMediaRequest;
  answers: { poll_media: APIPollMediaRequest }[];
  /** Hours, up to 32 days. */
  duration?: number;
  allow_multiselect?: boolean;
  layout_type?: number;
}

/**
 * The JSON body of Execute Webhook (resources/webhook.mdx, "JSON/Form Params"), plus the Create Message fields
 * webhooks don't take (`nonce`, `enforce_nonce`, `sticker_ids`, `message_reference`), so one type covers both.
 */
export interface WebhookMessagePayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: APIEmbed[];
  allowed_mentions?: APIAllowedMentions;
  components?: APIMessageTopLevelComponent[];
  attachments?: APIAttachmentRequest[];
  flags?: number;
  thread_name?: string;
  applied_tags?: string[];
  poll?: APIPollCreateRequest;
  nonce?: string | number;
  enforce_nonce?: boolean;
  sticker_ids?: string[];
  message_reference?: APIMessageReference;
}

/** discord-api-types' name for the Execute Webhook body. */
export type RESTPostAPIWebhookWithTokenJSONBody = WebhookMessagePayload;

// ---------------------------------------------------------------------------------------------------------
// The builder document: the payload as an editable tree. Every node is the API object plus a stable `uid`
// (React keys, drag and drop ids, selection). `uid` is separate from components' own numeric API `id`.

/**
 * `classic`: content, embeds and action rows. `cv2`: Components v2 layout components. `poll`: a poll and nothing
 * else (a message with a poll can't carry content, embeds, components, files or stickers).
 */
export type BuilderMode = 'classic' | 'cv2' | 'poll';

export const ROOT_UID = 'root';

interface WithUid {
  uid: string;
}

export type EmbedFieldNode = APIEmbedField & WithUid;
export type EmbedNode = Omit<APIEmbed, 'fields'> & WithUid & { fields: EmbedFieldNode[] };

export type SelectOptionNode = APISelectMenuOption & WithUid;
export type MediaGalleryItemNode = APIMediaGalleryItem & WithUid;

export type ButtonNode = APIButtonComponent & WithUid;
export type StringSelectNode = Omit<APIStringSelectComponent, 'options'> & WithUid & { options: SelectOptionNode[] };
export type UserSelectNode = APIUserSelectComponent & WithUid;
export type RoleSelectNode = APIRoleSelectComponent & WithUid;
export type MentionableSelectNode = APIMentionableSelectComponent & WithUid;
export type ChannelSelectNode = APIChannelSelectComponent & WithUid;
export type SelectNode = StringSelectNode | UserSelectNode | RoleSelectNode | MentionableSelectNode | ChannelSelectNode;

export interface ActionRowNode extends WithUid {
  type: 1;
  id?: number;
  components: (ButtonNode | SelectNode)[];
}

export type TextDisplayNode = APITextDisplayComponent & WithUid;
export type ThumbnailNode = APIThumbnailComponent & WithUid;
export type FileNode = APIFileComponent & WithUid;
export type SeparatorNode = APISeparatorComponent & WithUid;

export interface SectionNode extends WithUid {
  type: 9;
  id?: number;
  components: TextDisplayNode[];
  /** Required by the API; optional here so a section can be built up (validation reports it). */
  accessory?: ButtonNode | ThumbnailNode;
}

export interface MediaGalleryNode extends WithUid {
  type: 12;
  id?: number;
  items: MediaGalleryItemNode[];
}

export type ContainerChildNode =
  ActionRowNode | TextDisplayNode | SectionNode | MediaGalleryNode | FileNode | SeparatorNode | UnknownComponentNode;

export type ContainerNode = Omit<APIContainerComponent, 'components'> & WithUid & { components: ContainerChildNode[] };

/** A component of a type the builder doesn't know: kept as it came and written back unchanged. */
export interface UnknownComponentNode extends WithUid {
  type: number;
  [key: string]: unknown;
}

export type TopLevelComponentNode =
  | ActionRowNode
  | TextDisplayNode
  | SectionNode
  | MediaGalleryNode
  | FileNode
  | SeparatorNode
  | ContainerNode
  | UnknownComponentNode;

export type ComponentNode = TopLevelComponentNode | ButtonNode | SelectNode | ThumbnailNode;

export type BuilderNode = EmbedNode | EmbedFieldNode | SelectOptionNode | MediaGalleryItemNode | ComponentNode;

/** The message itself: every payload field except `embeds`/`components` (children) and the CV2 flag (`mode`). */
export interface BuilderDocument extends Omit<WebhookMessagePayload, 'content' | 'embeds' | 'components'> {
  uid: typeof ROOT_UID;
  mode: BuilderMode;
  content: string;
  /** Other flags; `toJSON` adds IS_COMPONENTS_V2 in `cv2` mode. */
  flags?: number;
  embeds: EmbedNode[];
  components: TopLevelComponentNode[];
  /** Top-level payload keys the builder doesn't know, written back unchanged. */
  extra?: Record<string, unknown>;
}

/** Where children live: the property of the parent that holds them (`accessory` holds at most one). */
export type SlotName = 'embeds' | 'components' | 'fields' | 'accessory' | 'items' | 'options';

export type NodeKind =
  | 'embed'
  | 'embedField'
  | 'selectOption'
  | 'mediaGalleryItem'
  | 'actionRow'
  | 'button'
  | 'stringSelect'
  | 'userSelect'
  | 'roleSelect'
  | 'mentionableSelect'
  | 'channelSelect'
  | 'section'
  | 'textDisplay'
  | 'thumbnail'
  | 'mediaGallery'
  | 'file'
  | 'separator'
  | 'container'
  | 'unknown';

export interface NodeLocation {
  node: BuilderNode;
  kind: NodeKind;
  /** `null` for children of the message. */
  parentId: string | null;
  slot: SlotName;
  index: number;
  /** JSON path of the node in `toJSON(doc)`, e.g. `['components', 0, 'accessory']`. */
  path: (string | number)[];
}

/** Where a node goes: `parentId` `null` (or `ROOT_UID`) is the message. `index` defaults to the end. */
export interface NodeTarget {
  parentId: string | null;
  slot?: SlotName;
  index?: number;
}

// ---------------------------------------------------------------------------------------------------------
// Validation

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  /** JSON path in the payload, e.g. `['embeds', 0, 'fields', 2, 'value']` (`[]` for the message itself). */
  path: (string | number)[];
  /** Stable machine-readable code, e.g. `MAX_LENGTH`. */
  code: string;
  message: string;
  severity: IssueSeverity;
  limit?: number;
  actual?: number;
  /** Document issues only: the deepest node the issue is about (`ROOT_UID` for the message). */
  nodeId?: string;
  /** Document issues only: the property of that node, dotted for nested ones (`author.name`, `media.url`). */
  field?: string;
  /** Set when the issue comes from the builder's restrictions rather than from Discord's rules. */
  restricted?: boolean;
}

export type ValidationTarget = 'webhook' | 'message' | 'interaction';

export interface ValidateOptions {
  /** `auto` (default) reads IS_COMPONENTS_V2 from `flags`. */
  mode?: 'auto' | BuilderMode;
  /** Which endpoint the payload is for; changes the allowed flags and fields. Default `webhook`. */
  target?: ValidationTarget;
  /**
   * Webhooks only. Webhooks not owned by an application can't send interactive components (buttons with a
   * `custom_id`, selects). `false` makes those errors, `undefined` (unknown) warnings, `true` allows them.
   */
  applicationOwnedWebhook?: boolean;
  /** Names of the files that will be uploaded with the payload, to check `attachment://` references. */
  files?: string[];
  /** Webhooks only: the `thread_id` query parameter (`thread_name` can't be used with it). */
  threadId?: string;
  /** What this builder allows; anything else is reported with `restricted: true`. */
  restrictions?: BuilderRestrictions;
}
