import { memo, type MouseEvent } from 'react';
import clsx from 'clsx';
import { Clickable } from '@discord-mana/components';
import { Emoji } from '../Emoji/Emoji';
import { useMessageResolvers } from '../MessageComponents/resolvers';
import { getMessageReactionsId } from './MessageHeader';
import { useMessageI18n } from './messageI18n';
import type { APIMessage, APIReaction, APIReactionEmoji } from './types';
import styles from './Reactions.module.css';

export const ReactionType = { NORMAL: 0, BURST: 1 } as const;

export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType];

/** A reaction pill as the client counts it: super reactions and normal reactions show separately. */
export interface MessageReaction {
  emoji: APIReactionEmoji;
  count: number;
  burstCount: number;
  me: boolean;
  meBurst: boolean;
  type: ReactionType;
}

/** Splits the API's reactions into the pills the client shows (super reactions first). */
export const getMessageReactions = (reactions: readonly APIReaction[]): MessageReaction[] =>
  reactions
    .filter((reaction) => (reaction.count_details?.normal ?? reaction.count) + (reaction.count_details?.burst ?? 0) > 0)
    .flatMap((reaction) => {
      const count = Math.max(0, reaction.count_details?.normal ?? reaction.count);
      const burstCount = Math.max(0, reaction.count_details?.burst ?? 0);
      const base = { emoji: reaction.emoji, count, burstCount, me: reaction.me, meBurst: reaction.me_burst ?? false };
      const pills: MessageReaction[] = [];
      if (burstCount > 0) pills.push({ ...base, type: ReactionType.BURST });
      if (count > 0) pills.push({ ...base, type: ReactionType.NORMAL });
      return pills;
    });

/** The digit-width the client reserves for a count (12px per digit). */
const getCountWidth = (value: number) => Math.ceil(Math.log10(value + 1)) * 12;

export interface ReactionsProps {
  message: Pick<APIMessage, 'id' | 'reactions'>;
  /** Called when a reaction is clicked; `me` is whether the viewer had reacted (so it should be removed). */
  onReactionClick?: (emoji: APIReactionEmoji, options: { me: boolean; burst: boolean }) => void;
  /** Makes the pills read-only (the client does without permission to react). */
  readOnly?: boolean;
}

const Reaction = memo(
  ({
    reaction,
    readOnly,
    onReactionClick,
  }: {
    reaction: MessageReaction;
    readOnly: boolean;
    onReactionClick?: ReactionsProps['onReactionClick'];
  }) => {
    const i18n = useMessageI18n();
    const resolvers = useMessageResolvers();
    const isBurst = reaction.type === ReactionType.BURST;
    const me = isBurst ? reaction.meBurst : reaction.me;
    const value = isBurst ? reaction.burstCount : reaction.count;
    const name = (resolvers.getEmojiName?.(reaction.emoji) ?? reaction.emoji.name ?? '').replace(/[:_]/g, ' ').trim();
    const handleClick = (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (readOnly) return;
      onReactionClick?.(reaction.emoji, { me, burst: isBurst });
    };
    return (
      <div>
        <div className={clsx(styles.reaction, { [styles.reactionMe]: me, [styles.reactionReadOnly]: readOnly })}>
          {/* The client's reactors popout hangs off this (it needs the reaction's user list). */}
          <Clickable
            aria-expanded={false}
            className={styles.reactionInner}
            onClick={handleClick}
            aria-disabled={readOnly}
            aria-label={i18n.REACTION_LABEL(name, value, me, isBurst)}
            aria-pressed={me}
          >
            <div className={clsx({ [styles.burstGlow]: isBurst })} />
            <div>
              <Emoji
                emojiId={reaction.emoji.id}
                emojiName={reaction.emoji.name}
                size="reaction"
                animated={reaction.emoji.animated}
              />
            </div>
            <div className={styles.reactionCount} style={{ minWidth: getCountWidth(value) }}>
              {value}
            </div>
          </Clickable>
        </div>
      </div>
    );
  },
);

Reaction.displayName = 'Reaction';

/** The reaction pills under a message (chat font scaling, like the message list). */
export const Reactions = ({ message, onReactionClick, readOnly = false }: ReactionsProps) => {
  const reactions = getMessageReactions(message.reactions ?? []);
  if (reactions.length === 0) return null;
  return (
    <div className={styles.reactions} role="group" id={getMessageReactionsId(message)}>
      <div />
      {reactions.map((reaction) => (
        <Reaction
          key={`${reaction.type === ReactionType.BURST ? 'burst:' : ''}${reaction.emoji.id ?? 0}:${reaction.emoji.name}`}
          reaction={reaction}
          readOnly={readOnly}
          onReactionClick={onReactionClick}
        />
      ))}
    </div>
  );
};

Reactions.displayName = 'Reactions';
