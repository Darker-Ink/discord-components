import { useRef, useState, type MouseEvent } from 'react';
import clsx from 'clsx';
import { Clickable, Popout, RichTooltip, type PopoutTriggerProps } from '@discord-mana/components';
import { Emoji, useMessageActions } from '@discord-mana/messages';
import { DEFAULT_MARKDOWN_STRINGS, type MarkdownStrings } from '../state';
import styles from './MarkupEmoji.module.css';

// The emoji tooltip's delay and default side.
const TOOLTIP_DELAY = 300;

export interface MarkupEmojiNode {
  name: string;
  /** Unicode emoji */
  surrogate?: string;
  src?: string;
  /** Custom emoji */
  emojiId?: string;
  animated?: boolean;
  /** Emoji-only messages show their emojis big. */
  jumboable?: boolean;
  originalMatch?: { 0: string } | null;
}

export interface MarkupEmojiProps {
  node: MarkupEmojiNode;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Clicking shows the emoji's details (the client's emoji popout). */
  enableClick?: boolean;
  focusable?: boolean;
  channelId?: string;
  messageId?: string;
  strings?: MarkdownStrings;
}

const EmojiTooltip = ({
  node,
  custom,
  tooltipPosition,
  enableClick,
  focusable,
  strings,
  popoutOpen,
  setPopoutOpen,
  triggerProps,
  targetRef,
}: Required<Pick<MarkupEmojiProps, 'node' | 'tooltipPosition' | 'enableClick' | 'focusable' | 'strings'>> & {
  custom: boolean;
  popoutOpen: boolean;
  setPopoutOpen: (open: boolean) => void;
  triggerProps?: PopoutTriggerProps;
  targetRef: { current: HTMLElement | null };
}) => {
  const actions = useMessageActions();
  const renderEmoji = (size?: 'jumbo') => (
    <Emoji
      emojiName={node.name}
      size={size ?? (node.jumboable ? 'jumbo' : 'default')}
      src={custom ? undefined : node.src}
      emojiId={custom ? node.emojiId : undefined}
      alt={custom ? undefined : node.originalMatch?.[0]}
      animated={custom ? node.animated : false}
    />
  );
  return (
    <RichTooltip
      asset={renderEmoji('jumbo')}
      title={node.name ?? ''}
      titleLineClamp={1}
      body={enableClick ? strings.EMOJI_TOOLTIP_CLICK_CTA : ''}
      ariaHidden
      delay={TOOLTIP_DELAY}
      position={tooltipPosition}
      shouldShow={!popoutOpen}
    >
      <Clickable
        {...triggerProps}
        innerRef={targetRef}
        tag="span"
        tabIndex={focusable ? 0 : -1}
        onClick={
          custom && !enableClick
            ? undefined
            : (event: MouseEvent<HTMLElement>) => {
                setPopoutOpen(true);
                actions.onMarkdownInteraction?.({
                  type: 'emoji',
                  emojiId: node.emojiId ?? null,
                  name: node.name,
                  event,
                });
                triggerProps?.onClick(event);
              }
        }
        className={clsx(styles.emojiContainer, {
          [styles.emojiContainerClickable]: enableClick,
          [styles.emojiJumbo]: node.jumboable,
        })}
      >
        {renderEmoji()}
      </Clickable>
    </RichTooltip>
  );
};

const MarkupEmojiBase = ({
  node,
  custom,
  tooltipPosition = 'top',
  enableClick = true,
  focusable = true,
  strings = DEFAULT_MARKDOWN_STRINGS,
}: MarkupEmojiProps & { custom: boolean }) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const [popoutOpen, setPopoutOpen] = useState(false);
  const shared = {
    node,
    custom,
    tooltipPosition,
    enableClick,
    focusable,
    strings,
    popoutOpen,
    setPopoutOpen,
    targetRef,
  };
  if (!enableClick) return <EmojiTooltip {...shared} />;
  return (
    <Popout
      animation={custom ? Popout.Animation.FADE : Popout.Animation.TRANSLATE}
      scrollBehavior="close"
      align="center"
      autoInvert
      nudgeAlignIntoViewport
      position="right"
      onRequestClose={() => setPopoutOpen(false)}
      targetElementRef={targetRef}
    >
      {(props) => <EmojiTooltip {...shared} triggerProps={props} />}
    </Popout>
  );
};

/** A unicode emoji in message text, with its name in a tooltip. */
export const MarkupUnicodeEmoji = (props: MarkupEmojiProps) => <MarkupEmojiBase {...props} custom={false} />;

MarkupUnicodeEmoji.displayName = 'MarkupUnicodeEmoji';

/** A custom emoji (`<:name:id>`) in message text, with its name in a tooltip. */
export const MarkupCustomEmoji = (props: MarkupEmojiProps) => <MarkupEmojiBase {...props} custom />;

MarkupCustomEmoji.displayName = 'MarkupCustomEmoji';
