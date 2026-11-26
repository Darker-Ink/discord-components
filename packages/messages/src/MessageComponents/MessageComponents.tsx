import { Fragment, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { HiddenVisually } from '@discord-components/components';
import { ComponentButton } from './ComponentButton';
import { AutoMeasuredNestedContainer, ComponentLayoutRoot, useMeasuredWidth } from './ComponentLayout';
import { ComponentStateProvider, type OnMessageComponentInteraction } from './ComponentState';
import { createComponents } from './createComponents';
import {
  ActionRow,
  ComponentMediaGallery,
  Container,
  File,
  Section,
  Separator,
  TextDisplay,
  Thumbnail,
  UnknownComponent,
} from './LayoutComponents';
import { Checkbox, CheckboxGroup, FileUpload, Label, RadioGroup, TextInput } from './ModalComponents';
import type { APIResolvedData } from './resolvers';
import { SearchableSelect } from './SearchableSelect';
import { StringSelect } from './StringSelect';
import { ComponentType, type APIMessageComponent, type MessageComponent } from './types';
import styles from './MessageComponents.module.css';

const renderAccessory = (accessory: MessageComponent) => {
  switch (accessory.type) {
    case ComponentType.Button:
      return <ComponentButton {...accessory} />;
    case ComponentType.Thumbnail:
      return <Thumbnail {...accessory} />;
    default:
      return null;
  }
};

export const renderComponent = (component: MessageComponent, key?: string, location?: 'label-child'): ReactNode => {
  switch (component.type) {
    case ComponentType.ActionRow:
      return <ActionRow key={key} {...component} renderComponents={renderComponents} />;
    case ComponentType.Button:
      return <ComponentButton key={key} {...component} />;
    case ComponentType.StringSelect:
      return <StringSelect key={key} {...component} />;
    case ComponentType.ChannelSelect:
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
      return <SearchableSelect key={key} {...component} />;
    case ComponentType.Section:
      return <Section key={key} {...component} renderComponents={renderComponents} renderAccessory={renderAccessory} />;
    case ComponentType.TextDisplay:
      return <TextDisplay key={key} {...component} />;
    case ComponentType.MediaGallery:
      return <ComponentMediaGallery key={key} {...component} />;
    case ComponentType.Thumbnail:
      return <Thumbnail key={key} {...component} />;
    case ComponentType.File:
      return <File key={key} {...component} />;
    case ComponentType.Separator:
      return <Separator key={key} {...component} />;
    case ComponentType.Container:
      return <Container key={key} {...component} renderComponents={renderComponents} />;
    case ComponentType.TextInput:
      return <TextInput key={key} {...component} />;
    case ComponentType.Label:
      return <Label key={key} {...component} renderComponent={renderComponent} />;
    case ComponentType.FileUpload:
      return <FileUpload key={key} {...component} />;
    case ComponentType.RadioGroup:
      return <RadioGroup key={key} {...component} />;
    case ComponentType.CheckboxGroup:
      return <CheckboxGroup key={key} {...component} />;
    case ComponentType.Checkbox:
      return <Checkbox key={key} {...component} location={location} />;
    default:
      return <UnknownComponent key={key} />;
  }
};

/** Renders a list of components, each followed by a hidden comma for screen readers (the client's `renderComponents`). */
export const renderComponents = (components: readonly MessageComponent[]): ReactNode =>
  components.map((component, index) => (
    <Fragment key={index}>
      {renderComponent(component, index.toString())}
      <HiddenVisually>,</HiddenVisually>
    </Fragment>
  ));

export interface MessageComponentsProps<M = unknown> {
  /** The message's `components`, as the API sends them. */
  components: readonly APIMessageComponent[];
  /** The message they belong to (passed to interaction callbacks and the media viewer). */
  message?: M & { id?: string; channel_id?: string; flags?: number; resolved?: APIResolvedData | null };
  onInteraction?: OnMessageComponentInteraction<M>;
  /** Disables buttons and selects (the client does in previews, e.g. pinned messages). */
  shouldDisableInteractiveComponents?: boolean;
}

const IS_COMPONENTS_V2 = 1 << 15;

/** A message's components, laid out like the client's message accessories (action rows and Components v2). */
export const MessageComponents = <M,>({
  components: apiComponents,
  message,
  onInteraction,
  shouldDisableInteractiveComponents = false,
}: MessageComponentsProps<M>) => {
  const components = useMemo(() => createComponents(apiComponents), [apiComponents]);
  const [ref, outerWidth] = useMeasuredWidth();
  if (components.length === 0) return null;
  const isComponentsV2 = ((message?.flags ?? 0) & IS_COMPONENTS_V2) !== 0;
  return (
    <ComponentStateProvider
      components={components}
      message={message ?? ({} as M)}
      channelId={message?.channel_id}
      resolved={message?.resolved}
      onInteraction={onInteraction}
      shouldDisableInteractiveComponents={shouldDisableInteractiveComponents}
    >
      <ComponentLayoutRoot containerInnerWidth={outerWidth}>
        <div style={{ width: '100%' }} ref={ref}>
          <AutoMeasuredNestedContainer>
            {(innerRef) => (
              <div ref={innerRef} className={clsx([styles.container, { [styles.isComponentsV2]: isComponentsV2 }])}>
                {renderComponents(components)}
              </div>
            )}
          </AutoMeasuredNestedContainer>
        </div>
      </ComponentLayoutRoot>
    </ComponentStateProvider>
  );
};

MessageComponents.displayName = 'MessageComponents';
