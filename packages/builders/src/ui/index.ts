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
export { WebhookPanel, type WebhookPanelProps } from './WebhookPanel';
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
export { prepareEmbed, prepareMedia, prepareComponents, probeMedia, setMediaSize, type MediaSize } from './mediaSize';
export { parseEmoji, formatEmoji } from './componentTools';
export { KIND_LABELS, KIND_ICONS, PALETTE_ITEMS, type PaletteItem } from './meta';
export { describeNode } from './describe';
