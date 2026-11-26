// Message and modal components as the REST API and gateway send them (discord-api-types naming), and the
// client's camelCase records they are converted to before rendering.
import type { APIMediaGalleryItem, APIUnfurledMediaItem, UnfurledMediaItem } from '../MediaGallery/MediaGallery';

export const ComponentType = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  TextInput: 4,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8,
  Section: 9,
  TextDisplay: 10,
  Thumbnail: 11,
  MediaGallery: 12,
  File: 13,
  Separator: 14,
  ContentInventoryEntry: 16,
  Container: 17,
  Label: 18,
  FileUpload: 19,
  CheckpointCard: 20,
  RadioGroup: 21,
  CheckboxGroup: 22,
  Checkbox: 23,
  OverflowMenu: 25,
  MenuActionItem: 26,
} as const;

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

export const ButtonStyle = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5,
  Premium: 6,
} as const;

export type ButtonStyle = (typeof ButtonStyle)[keyof typeof ButtonStyle];

export const TextInputStyle = { Short: 1, Paragraph: 2 } as const;

export type TextInputStyle = (typeof TextInputStyle)[keyof typeof TextInputStyle];

export const SeparatorSpacingSize = { Small: 1, Large: 2 } as const;

export type SeparatorSpacingSize = (typeof SeparatorSpacingSize)[keyof typeof SeparatorSpacingSize];

export const SelectMenuDefaultValueType = { User: 'user', Role: 'role', Channel: 'channel' } as const;

export type SelectMenuDefaultValueType = (typeof SelectMenuDefaultValueType)[keyof typeof SelectMenuDefaultValueType];

export interface APIMessageComponentEmoji {
  id?: string | null;
  name?: string | null;
  animated?: boolean;
}

interface APIBaseComponent<T extends ComponentType> {
  type: T;
  /** The component's numeric identifier (unique per message); the client keys components by position instead. */
  id?: number;
}

export interface APIButtonComponentBase<S extends ButtonStyle> extends APIBaseComponent<typeof ComponentType.Button> {
  style: S;
  label?: string;
  emoji?: APIMessageComponentEmoji;
  disabled?: boolean;
}

export interface APIButtonComponentWithCustomId extends APIButtonComponentBase<
  typeof ButtonStyle.Primary | typeof ButtonStyle.Secondary | typeof ButtonStyle.Success | typeof ButtonStyle.Danger
> {
  custom_id: string;
}

export interface APIButtonComponentWithURL extends APIButtonComponentBase<typeof ButtonStyle.Link> {
  url: string;
}

export interface APIButtonComponentWithSKUId extends Omit<
  APIButtonComponentBase<typeof ButtonStyle.Premium>,
  'label' | 'emoji'
> {
  sku_id: string;
}

export type APIButtonComponent =
  APIButtonComponentWithCustomId | APIButtonComponentWithURL | APIButtonComponentWithSKUId;

export interface APISelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: APIMessageComponentEmoji;
  default?: boolean;
}

export interface APISelectMenuDefaultValue<T extends SelectMenuDefaultValueType = SelectMenuDefaultValueType> {
  type: T;
  id: string;
}

interface APIBaseSelectMenuComponent<T extends ComponentType> extends APIBaseComponent<T> {
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  disabled?: boolean;
  /** Modals only (inside a Label). */
  required?: boolean;
}

export interface APIStringSelectComponent extends APIBaseSelectMenuComponent<typeof ComponentType.StringSelect> {
  options: APISelectMenuOption[];
}

export interface APIUserSelectComponent extends APIBaseSelectMenuComponent<typeof ComponentType.UserSelect> {
  default_values?: APISelectMenuDefaultValue<typeof SelectMenuDefaultValueType.User>[];
}

export interface APIRoleSelectComponent extends APIBaseSelectMenuComponent<typeof ComponentType.RoleSelect> {
  default_values?: APISelectMenuDefaultValue<typeof SelectMenuDefaultValueType.Role>[];
}

export interface APIMentionableSelectComponent extends APIBaseSelectMenuComponent<
  typeof ComponentType.MentionableSelect
> {
  default_values?: APISelectMenuDefaultValue<
    typeof SelectMenuDefaultValueType.User | typeof SelectMenuDefaultValueType.Role
  >[];
}

export interface APIChannelSelectComponent extends APIBaseSelectMenuComponent<typeof ComponentType.ChannelSelect> {
  channel_types?: number[];
  default_values?: APISelectMenuDefaultValue<typeof SelectMenuDefaultValueType.Channel>[];
}

export type APISelectMenuComponent =
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

export interface APITextInputComponent extends APIBaseComponent<typeof ComponentType.TextInput> {
  custom_id: string;
  style: TextInputStyle;
  /** Deprecated outside a Label; a Label's `label` replaces it. */
  label?: string;
  min_length?: number;
  max_length?: number;
  required?: boolean;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface APIActionRowComponent<
  T extends APIComponentInActionRow = APIComponentInActionRow,
> extends APIBaseComponent<typeof ComponentType.ActionRow> {
  components: T[];
}

export interface APITextDisplayComponent extends APIBaseComponent<typeof ComponentType.TextDisplay> {
  content: string;
}

export interface APIThumbnailComponent extends APIBaseComponent<typeof ComponentType.Thumbnail> {
  media: APIUnfurledMediaItem;
  description?: string | null;
  spoiler?: boolean;
}

export interface APISectionComponent extends APIBaseComponent<typeof ComponentType.Section> {
  components: APITextDisplayComponent[];
  accessory: APIButtonComponent | APIThumbnailComponent;
}

export interface APIMediaGalleryComponent extends APIBaseComponent<typeof ComponentType.MediaGallery> {
  items: APIMediaGalleryItem[];
}

export interface APIFileComponent extends APIBaseComponent<typeof ComponentType.File> {
  /** Only `attachment://<filename>` references are allowed by the API; resolved messages carry the unfurled file. */
  file: APIUnfurledMediaItem;
  spoiler?: boolean;
  /** Filled in by the API on received messages. */
  name?: string;
  size?: number;
}

export interface APISeparatorComponent extends APIBaseComponent<typeof ComponentType.Separator> {
  divider?: boolean;
  spacing?: SeparatorSpacingSize;
}

export interface APIContainerComponent extends APIBaseComponent<typeof ComponentType.Container> {
  components: APIComponentInContainer[];
  /** RGB integer. */
  accent_color?: number | null;
  spoiler?: boolean;
}

export interface APILabelComponent extends APIBaseComponent<typeof ComponentType.Label> {
  label: string;
  description?: string;
  component: APIComponentInLabel;
}

export interface APIFileUploadComponent extends APIBaseComponent<typeof ComponentType.FileUpload> {
  custom_id: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  /** Allowed file extensions (client-only filter). */
  file_types?: string[];
}

export interface APIRadioGroupOption {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
}

export interface APIRadioGroupComponent extends APIBaseComponent<typeof ComponentType.RadioGroup> {
  custom_id: string;
  options: APIRadioGroupOption[];
  required?: boolean;
}

export interface APICheckboxGroupOption {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
}

export interface APICheckboxGroupComponent extends APIBaseComponent<typeof ComponentType.CheckboxGroup> {
  custom_id: string;
  options: APICheckboxGroupOption[];
  min_values?: number;
  max_values?: number;
  required?: boolean;
}

export interface APICheckboxComponent extends APIBaseComponent<typeof ComponentType.Checkbox> {
  custom_id: string;
  default?: boolean;
}

export type APIComponentInActionRow = APIButtonComponent | APISelectMenuComponent | APITextInputComponent;

export type APIComponentInContainer =
  | APIActionRowComponent
  | APITextDisplayComponent
  | APISectionComponent
  | APIMediaGalleryComponent
  | APIFileComponent
  | APISeparatorComponent;

export type APIComponentInLabel =
  | APITextInputComponent
  | APISelectMenuComponent
  | APIFileUploadComponent
  | APIRadioGroupComponent
  | APICheckboxGroupComponent
  | APICheckboxComponent;

/** Top-level components of a message. */
export type APIMessageTopLevelComponent =
  | APIActionRowComponent
  | APITextDisplayComponent
  | APISectionComponent
  | APIMediaGalleryComponent
  | APIFileComponent
  | APISeparatorComponent
  | APIContainerComponent;

/** Top-level components of a modal. */
export type APIModalComponent =
  APIActionRowComponent<APITextInputComponent> | APILabelComponent | APITextDisplayComponent;

export type APIMessageComponent =
  | APIMessageTopLevelComponent
  | APIComponentInActionRow
  | APIThumbnailComponent
  | APILabelComponent
  | APIFileUploadComponent
  | APIRadioGroupComponent
  | APICheckboxGroupComponent
  | APICheckboxComponent;

// ---------------------------------------------------------------------------------------------------------
// The client's records (module 257249 `transformComponent`): camelCase, keyed by their position.

export interface ComponentEmoji {
  id?: string | null;
  name?: string | null;
  animated?: boolean;
  src?: string;
}

interface BaseComponent<T extends ComponentType> {
  type: T;
  /** Position path (`"0,2,1"`); identifies the component within its message or modal. */
  id: string;
}

export interface ActionRowComponent extends BaseComponent<typeof ComponentType.ActionRow> {
  components: MessageComponent[];
}

export interface ButtonComponent extends BaseComponent<typeof ComponentType.Button> {
  customId?: string;
  style: ButtonStyle;
  disabled?: boolean;
  url?: string;
  label?: string;
  emoji?: ComponentEmoji;
  skuId?: string;
}

export const SelectOptionType = { String: 1, User: 2, Role: 3, Channel: 4 } as const;

export type SelectOptionType = (typeof SelectOptionType)[keyof typeof SelectOptionType];

export interface StringSelectOption {
  type: typeof SelectOptionType.String;
  label: string;
  value: string;
  default?: boolean;
  description?: string;
  emoji?: ComponentEmoji;
}

interface BaseSelectComponent<T extends ComponentType> extends BaseComponent<T> {
  customId: string;
  disabled?: boolean;
  required: boolean;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
}

export interface StringSelectComponent extends BaseSelectComponent<typeof ComponentType.StringSelect> {
  options: StringSelectOption[];
}

export interface UserSelectComponent extends BaseSelectComponent<typeof ComponentType.UserSelect> {
  defaultValues?: APISelectMenuDefaultValue[];
}

export interface RoleSelectComponent extends BaseSelectComponent<typeof ComponentType.RoleSelect> {
  defaultValues?: APISelectMenuDefaultValue[];
}

export interface MentionableSelectComponent extends BaseSelectComponent<typeof ComponentType.MentionableSelect> {
  defaultValues?: APISelectMenuDefaultValue[];
}

export interface ChannelSelectComponent extends BaseSelectComponent<typeof ComponentType.ChannelSelect> {
  channelTypes?: number[];
  defaultValues?: APISelectMenuDefaultValue[];
}

export type SearchableSelectComponent =
  UserSelectComponent | RoleSelectComponent | MentionableSelectComponent | ChannelSelectComponent;

export type SelectComponent = StringSelectComponent | SearchableSelectComponent;

export interface TextInputComponent extends BaseComponent<typeof ComponentType.TextInput> {
  style: TextInputStyle;
  customId: string;
  label?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface SectionComponent extends BaseComponent<typeof ComponentType.Section> {
  components: MessageComponent[];
  accessory: MessageComponent;
}

export interface TextDisplayComponent extends BaseComponent<typeof ComponentType.TextDisplay> {
  content: string;
}

export interface ThumbnailComponent extends BaseComponent<typeof ComponentType.Thumbnail> {
  media: UnfurledMediaItem;
  description?: string | null;
  spoiler?: boolean;
}

export interface MediaGalleryComponent extends BaseComponent<typeof ComponentType.MediaGallery> {
  /** Kept in API format: `MediaGallery` converts them itself. */
  items: APIMediaGalleryItem[];
}

export interface FileComponent extends BaseComponent<typeof ComponentType.File> {
  file: UnfurledMediaItem;
  name?: string;
  size?: number;
  spoiler?: boolean;
}

export interface SeparatorComponent extends BaseComponent<typeof ComponentType.Separator> {
  divider: boolean;
  spacing: SeparatorSpacingSize;
}

export interface ContainerComponent extends BaseComponent<typeof ComponentType.Container> {
  accentColor?: number | null;
  spoiler?: boolean;
  components: MessageComponent[];
}

export interface LabelComponent extends BaseComponent<typeof ComponentType.Label> {
  label: string;
  description?: string;
  component: MessageComponent;
}

export interface FileUploadComponent extends BaseComponent<typeof ComponentType.FileUpload> {
  customId: string;
  disabled?: boolean;
  required: boolean;
  minValues?: number;
  maxValues?: number;
  fileTypes?: string[];
}

export interface RadioGroupComponent extends BaseComponent<typeof ComponentType.RadioGroup> {
  customId: string;
  options: APIRadioGroupOption[];
  required: boolean;
}

export interface CheckboxGroupComponent extends BaseComponent<typeof ComponentType.CheckboxGroup> {
  customId: string;
  options: APICheckboxGroupOption[];
  minValues?: number;
  maxValues?: number;
  required: boolean;
}

export interface CheckboxComponent extends BaseComponent<typeof ComponentType.Checkbox> {
  customId: string;
  default?: boolean;
}

export type MessageComponent =
  | ActionRowComponent
  | ButtonComponent
  | StringSelectComponent
  | UserSelectComponent
  | RoleSelectComponent
  | MentionableSelectComponent
  | ChannelSelectComponent
  | TextInputComponent
  | SectionComponent
  | TextDisplayComponent
  | ThumbnailComponent
  | MediaGalleryComponent
  | FileComponent
  | SeparatorComponent
  | ContainerComponent
  | LabelComponent
  | FileUploadComponent
  | RadioGroupComponent
  | CheckboxGroupComponent
  | CheckboxComponent;

/** A component the client couldn't convert (an unknown type) renders as the "update Discord" notice. */
export interface UnknownComponent {
  type: number;
  id: string;
}
