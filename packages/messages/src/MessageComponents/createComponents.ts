import { createUnfurledMediaItem } from '../MediaGallery/MediaGallery';
import {
  ComponentType,
  SelectOptionType,
  SeparatorSpacingSize,
  type APIMessageComponent,
  type APIMessageComponentEmoji,
  type ComponentEmoji,
  type MessageComponent,
} from './types';

const SUPPORTED_TYPES = new Set<number>(Object.values(ComponentType));

const toEmoji = (emoji: APIMessageComponentEmoji): ComponentEmoji => ({
  id: emoji.id,
  name: emoji.name,
  animated: emoji.animated,
  src: undefined,
});

const toId = (path: (number | string)[]) => path.join(',');

/** Converts one API component (and its children) to the client's record; unknown types are dropped. */
export const createComponent = (component: APIMessageComponent, path: (number | string)[]): MessageComponent | null => {
  if (!SUPPORTED_TYPES.has(component.type)) return null;
  const child = (value: APIMessageComponent, index: number | (number | string)[]) =>
    createComponent(value, path.concat(index));
  const id = toId(path);
  switch (component.type) {
    case ComponentType.ActionRow:
      return {
        type: ComponentType.ActionRow,
        id,
        components: component.components.map((value, index) => child(value, index)).filter((value) => value != null),
      };
    case ComponentType.Button:
      return {
        type: ComponentType.Button,
        id,
        customId: 'custom_id' in component ? component.custom_id : undefined,
        style: component.style,
        disabled: component.disabled,
        url: 'url' in component ? component.url : undefined,
        label: 'label' in component ? component.label : undefined,
        emoji: 'emoji' in component && component.emoji != null ? toEmoji(component.emoji) : undefined,
        skuId: 'sku_id' in component ? component.sku_id : undefined,
      };
    case ComponentType.StringSelect:
      return {
        type: ComponentType.StringSelect,
        id,
        customId: component.custom_id,
        disabled: component.disabled,
        required: component.required ?? false,
        options: component.options.map((option) => ({
          type: SelectOptionType.String,
          label: option.label,
          value: option.value,
          default: option.default,
          description: option.description,
          emoji: option.emoji != null ? toEmoji(option.emoji) : undefined,
        })),
        placeholder: component.placeholder,
        minValues: component.min_values,
        maxValues: component.max_values,
      };
    case ComponentType.TextInput:
      return {
        type: ComponentType.TextInput,
        id,
        style: component.style,
        customId: component.custom_id,
        label: component.label,
        value: component.value,
        placeholder: component.placeholder,
        disabled: component.disabled,
        required: component.required ?? false,
        minLength: component.min_length,
        maxLength: component.max_length,
      };
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
      return {
        type: component.type,
        id,
        customId: component.custom_id,
        disabled: component.disabled,
        required: component.required ?? false,
        placeholder: component.placeholder,
        minValues: component.min_values,
        maxValues: component.max_values,
        defaultValues: component.default_values,
      } as MessageComponent;
    case ComponentType.ChannelSelect:
      return {
        type: ComponentType.ChannelSelect,
        id,
        customId: component.custom_id,
        disabled: component.disabled,
        required: component.required ?? false,
        placeholder: component.placeholder,
        minValues: component.min_values,
        maxValues: component.max_values,
        channelTypes: component.channel_types,
        defaultValues: component.default_values,
      };
    case ComponentType.Section: {
      const components = component.components
        .map((value, index) => child(value, index))
        .filter((value) => value != null);
      const accessory = child(component.accessory, components.length);
      if (components.length === 0 || accessory == null) return null;
      return { type: ComponentType.Section, id, components, accessory };
    }
    case ComponentType.TextDisplay:
      return { type: ComponentType.TextDisplay, id, content: component.content };
    case ComponentType.Thumbnail:
      return {
        type: ComponentType.Thumbnail,
        id,
        media: createUnfurledMediaItem(component.media),
        description: component.description,
        spoiler: component.spoiler,
      };
    case ComponentType.MediaGallery:
      return { type: ComponentType.MediaGallery, id, items: component.items };
    case ComponentType.File:
      return {
        type: ComponentType.File,
        id,
        file: createUnfurledMediaItem(component.file),
        name: component.name,
        size: component.size,
        spoiler: component.spoiler,
      };
    case ComponentType.Separator:
      return {
        type: ComponentType.Separator,
        id,
        divider: component.divider ?? true,
        spacing: component.spacing ?? SeparatorSpacingSize.Small,
      };
    case ComponentType.Container:
      return {
        type: ComponentType.Container,
        id,
        accentColor: component.accent_color,
        spoiler: component.spoiler,
        components: component.components.map((value, index) => child(value, index)).filter((value) => value != null),
      };
    case ComponentType.Label: {
      const inner = child(component.component, 0);
      if (inner == null) return null;
      return {
        type: ComponentType.Label,
        id,
        label: component.label,
        description: component.description,
        component: inner,
      };
    }
    case ComponentType.FileUpload:
      return {
        type: ComponentType.FileUpload,
        id,
        customId: component.custom_id,
        disabled: component.disabled,
        required: component.required ?? false,
        minValues: component.min_values,
        maxValues: component.max_values,
        fileTypes: component.file_types,
      };
    case ComponentType.RadioGroup:
      return {
        type: ComponentType.RadioGroup,
        id,
        customId: component.custom_id,
        options: component.options,
        required: component.required ?? false,
      };
    case ComponentType.CheckboxGroup:
      return {
        type: ComponentType.CheckboxGroup,
        id,
        customId: component.custom_id,
        options: component.options,
        minValues: component.min_values,
        maxValues: component.max_values,
        required: component.required ?? false,
      };
    case ComponentType.Checkbox:
      return { type: ComponentType.Checkbox, id, customId: component.custom_id, default: component.default };
    default:
      // Discord-internal types (content inventory entries, checkpoint cards, overflow menus) need app data.
      return null;
  }
};

/** Converts a message's or modal's API components like the client (keyed by position). */
export const createComponents = (components: readonly APIMessageComponent[]): MessageComponent[] =>
  components.map((component, index) => createComponent(component, [index])).filter((value) => value != null);

/** Children of a record (used to find parents and to walk a tree). */
export const getComponentChildren = (component: MessageComponent): MessageComponent[] => {
  switch (component.type) {
    case ComponentType.ActionRow:
    case ComponentType.Container:
      return component.components;
    case ComponentType.Section:
      return [...component.components, component.accessory];
    case ComponentType.Label:
      return [component.component];
    default:
      return [];
  }
};

/** The chain of parents of a component, nearest first. */
export const getComponentParents = (
  components: readonly MessageComponent[],
  target: MessageComponent,
): MessageComponent[] | null => {
  const walk = (list: readonly MessageComponent[], parents: MessageComponent[]): MessageComponent[] | null => {
    for (const component of list) {
      const children = getComponentChildren(component);
      if (children.some((value) => value.id === target.id)) return [component, ...parents];
      const found = walk(children, [component, ...parents]);
      if (found != null) return found;
    }
    return null;
  };
  return walk(components, []);
};

/** Whether the component sends an interaction (and so goes disabled/loading while one is pending). */
export const isActionComponent = (component: MessageComponent) => {
  switch (component.type) {
    case ComponentType.Button:
      return component.style !== 5;
    case ComponentType.StringSelect:
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.ChannelSelect:
      return true;
    default:
      return false;
  }
};
