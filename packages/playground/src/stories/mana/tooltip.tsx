import { useMemo } from 'react';
import {
  Button,
  RichTooltip,
  Tooltip,
  type TooltipAlign,
  type TooltipCaretAlign,
  type TooltipCaretConfig,
  type TooltipPosition,
  type RichTooltipAssetSize,
  type RichTooltipPadding,
} from '@discord-mana/components';
import type { Controls, StoryGroup } from '../../types';

const richTooltipAsset =
  'https://cdn.discordapp.com/assets/content/9af0badd716ab9255c841405a169dda54f64438488bc44080898752292aaad3b.png';

type CaretAlign = TooltipCaretAlign;

const useCaretConfig = (caretAlign: CaretAlign | undefined, customOffset: number) =>
  useMemo<TooltipCaretConfig | undefined>(() => {
    if (caretAlign === 'center' || caretAlign == null) return undefined;
    return caretAlign === 'custom' ? { align: caretAlign, customOffset } : { align: caretAlign };
  }, [caretAlign, customOffset]);

interface TooltipStoryProps {
  text: string;
  position: TooltipPosition;
  align: TooltipAlign;
  caretAlign: CaretAlign;
  customOffset: number;
  delay: number;
  spacing: number;
  keyboardShortcut: string;
  ariaHidden: boolean;
}

const TooltipStory = ({
  text,
  position,
  align,
  caretAlign,
  customOffset,
  delay,
  spacing,
  ariaHidden,
  ...props
}: TooltipStoryProps) => {
  const caretConfig = useCaretConfig(caretAlign, customOffset);
  return (
    <Tooltip
      text={text}
      position={position}
      align={align}
      delay={delay}
      spacing={spacing}
      caretConfig={caretConfig}
      ariaHidden={ariaHidden}
      {...props}
    >
      <Button variant="primary" text="Hover me" />
    </Tooltip>
  );
};

TooltipStory.displayName = 'TooltipStory';

interface RichTooltipStoryProps {
  title: string;
  body: string;
  showAsset: boolean;
  assetSize: RichTooltipAssetSize;
  padding: RichTooltipPadding;
  position: TooltipPosition;
  align: TooltipAlign;
  caretAlign: CaretAlign;
  customOffset: number;
  delay: number;
  spacing: number;
  forceOpen: boolean;
}

const RichTooltipStory = ({
  title,
  body,
  showAsset,
  assetSize,
  padding,
  position,
  align,
  caretAlign,
  customOffset,
  delay,
  spacing,
  forceOpen,
  ...props
}: RichTooltipStoryProps) => {
  const caretConfig = useCaretConfig(caretAlign, customOffset);
  const asset = useMemo(
    () => (showAsset ? { type: 'image' as const, src: richTooltipAsset, aspectRatio: '1/1' as const } : undefined),
    [showAsset],
  );
  return (
    <RichTooltip
      title={title}
      body={body}
      position={position}
      align={align}
      padding={padding}
      delay={delay}
      spacing={spacing}
      caretConfig={caretConfig}
      asset={asset}
      assetSize={assetSize}
      forceOpen={forceOpen}
      {...props}
    >
      <Button variant="primary" text="Hover me (rich)" />
    </RichTooltip>
  );
};

RichTooltipStory.displayName = 'RichTooltipStory';

const positionControl: Controls[string] = {
  label: 'Position',
  type: 'select',
  defaultValue: 'top',
  options: [
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ],
};

const alignControl: Controls[string] = {
  label: 'Align',
  type: 'select',
  defaultValue: 'center',
  options: [
    { label: 'Top', value: 'top' },
    { label: 'Center', value: 'center' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ],
};

const caretAlignControl: Controls[string] = {
  label: 'Caret Align',
  type: 'select',
  defaultValue: 'center',
  options: [
    { label: 'Start', value: 'start' },
    { label: 'Center', value: 'center' },
    { label: 'End', value: 'end' },
    { label: 'Custom', value: 'custom' },
  ],
};

const tooltip: StoryGroup = {
  title: 'Tooltip',
  stories: [
    {
      name: 'Tooltip',
      id: 'tooltip',
      docs: 'https://design.discord.tools/components/web/tooltip',
      component: TooltipStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: "Here's a tooltip!" },
        position: positionControl,
        align: alignControl,
        caretAlign: caretAlignControl,
        customOffset: { label: 'Custom Offset', type: 'number', defaultValue: 0 },
        delay: { label: 'Delay (ms)', type: 'number', defaultValue: 0 },
        spacing: { label: 'Spacing (px)', type: 'number', defaultValue: 11 },
        keyboardShortcut: { label: 'Keyboard Shortcut', type: 'text', defaultValue: 'mod+k' },
        ariaHidden: { label: 'Aria Hidden', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'RichTooltip',
      id: 'rich-tooltip',
      docs: 'https://design.discord.tools/components/web/tooltip',
      component: RichTooltipStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Title goes here' },
        body: { label: 'Body', type: 'text', defaultValue: 'Body copy goes in this section.' },
        assetSize: {
          label: 'Asset Size',
          type: 'select',
          defaultValue: 16,
          options: [
            { label: '16px', value: 16 },
            { label: '20px', value: 20 },
            { label: '24px', value: 24 },
            { label: '32px', value: 32 },
            { label: '48px', value: 48 },
            { label: '80px', value: 80 },
          ],
        },
        padding: {
          label: 'Padding',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Large', value: 'lg' },
          ],
        },
        position: positionControl,
        align: alignControl,
        caretAlign: caretAlignControl,
        customOffset: { label: 'Custom Offset', type: 'number', defaultValue: 0 },
        delay: { label: 'Delay (ms)', type: 'number', defaultValue: 0 },
        spacing: { label: 'Spacing (px)', type: 'number', defaultValue: 11 },
        forceOpen: { label: 'Force Open', type: 'boolean', defaultValue: false },
        showAsset: { label: 'Show Asset', type: 'boolean', defaultValue: true },
      },
    },
  ],
};

export default tooltip;
