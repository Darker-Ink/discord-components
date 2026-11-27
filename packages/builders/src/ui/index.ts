// The editor: every piece renders with @discord-mana/messages exactly like Discord, made editable in place.
export {
  MessageBuilder,
  BuilderPanels,
  BuilderChannel,
  type MessageBuilderProps,
  type BuilderPanelsProps,
  type BuilderPanelId,
} from './MessageBuilder';
export { BuilderProvider, useBuilderScope, type BuilderProviderProps } from './BuilderProvider';
export {
  BuilderCanvas,
  toPreviewMessage,
  DEFAULT_AUTHOR,
  type BuilderCanvasProps,
  type BuilderAuthor,
} from './BuilderCanvas';
export { EditableEmbed, EditableEmbedField, type EditableEmbedProps } from './EditableEmbed';
export {
  EditableComponents,
  EditableComponent,
  AddChildButton,
  type EditableComponentsProps,
} from './EditableComponents';
export { ComponentPalette, findInsertTarget, type ComponentPaletteProps } from './ComponentPalette';
export { ValidationPanel, useRevealIssue, type ValidationPanelProps } from './ValidationPanel';
export { JsonPanel, highlightJSON, downloadJSON, type JsonPanelProps } from './JsonPanel';
export { WebhookPanel, getWebhookAvatarURL, type WebhookPanelProps, type WebhookInfo } from './WebhookPanel';
export { BuilderModeSwitch, BuilderHistoryButtons, type BuilderModeSwitchProps } from './BuilderControls';
export {
  BuilderTextField,
  BuilderPlainTextField,
  type BuilderTextFieldProps,
  type BuilderPlainTextFieldProps,
} from './BuilderTextField';
export { NodeFrame, useNodeFrame, type NodeFrameProps, type NodeFrameOptions } from './NodeFrame';
export {
  NodeToolbar,
  NodeToolbarButton,
  NodeToolbarPopoutButton,
  NodeToolbarSeparator,
  type NodeToolbarButtonProps,
} from './NodeToolbar';
export { BuilderDndProvider } from './dnd/BuilderDnd';
export { useBuilderUI, useBuilderUIStore, type BuilderUIState, type DropSlot } from './uiStore';
export {
  prepareEmbed,
  prepareMedia,
  prepareComponents,
  probeMedia,
  setMediaSize,
  useMediaSizes,
  type MediaSize,
} from './mediaSize';
export { parseEmoji, formatEmoji, EmojiPicker } from './componentTools';
export {
  createBuilderFiles,
  useBuilderFiles,
  useFilesVersion,
  useAttachmentResolver,
  formatBytes,
  FILE_SIZE_LIMIT,
  REQUEST_SIZE_LIMIT,
  type BuilderFiles,
  type StoredFile,
} from './files';
export {
  attachFiles,
  attachmentName,
  attachmentUrl,
  collectUploads,
  createAttachmentResolver,
  displayName as attachmentDisplayName,
  findAttachmentRefs,
  isSpoilerName,
  readAttachments,
  referencedFiles,
  removeAttachment,
  renameAttachment,
  sanitizeFilename,
  setAttachmentDescription,
  setAttachmentSpoiler,
  toPreviewAttachments,
  SPOILER_PREFIX,
  type AttachmentResolver,
  type ResolvedAttachment,
} from './attachments';
export { attachToMessage, pickFiles, useAttachFiles } from './attach';
export {
  AttachmentChooser,
  AttachmentEditor,
  EditableAttachments,
  FilesSection,
  MissingFilesNotice,
  useAttachmentSummary,
} from './EditableAttachments';
export { EditablePoll, POLL_DURATIONS, toPreviewPoll, type EditablePollProps } from './EditablePoll';
export {
  AllowedMentionsEditor,
  AppliedTagsInput,
  MessageOptions,
  parseIds,
  type MessageOptionsProps,
} from './MessageOptions';
export { KIND_LABELS, KIND_ICONS, PALETTE_ITEMS, type PaletteItem } from './meta';
export { describeNode } from './describe';
export { canPlace, placeTemplate } from './placeTemplate';
