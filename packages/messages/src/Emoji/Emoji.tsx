import { memo, useMemo, useState, type HTMLAttributes, type Ref } from 'react';
import clsx from 'clsx';
import { useMediaContext } from '../media/MediaContext';
import { useWindowFocused } from '../media/useWindowFocused';
import { createResolver, useMessageResolvers } from '../MessageComponents/resolvers';
import './Emoji.css';

// The client's emoji sizes (CSS pixels it requests from the CDN).
export const EMOJI_SIZES = { reaction: 40, default: 44, jumbo: 96 } as const;

export type EmojiSize = keyof typeof EMOJI_SIZES;

export interface EmojiProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** An explicit image URL; otherwise it is built from `emojiId` or looked up for `emojiName`. */
  src?: string;
  alt?: string;
  emojiId?: string | null;
  /** The custom emoji's name, or the unicode emoji itself. */
  emojiName?: string | null;
  animated?: boolean;
  size?: EmojiSize;
  /** Plays animated custom emojis without hovering. */
  shouldAnimate?: boolean;
  isInteracting?: boolean;
  autoplay?: boolean;
  ref?: Ref<HTMLImageElement & HTMLSpanElement>;
}

/** A custom or unicode emoji image (`img.emoji`), or the emoji's text when there's no image for it. */
export const Emoji = memo(
  ({
    src,
    alt,
    className,
    emojiId,
    emojiName,
    animated,
    size = 'default',
    isInteracting = false,
    shouldAnimate,
    autoplay,
    onMouseEnter,
    onMouseLeave,
    ref,
    ...rest
  }: EmojiProps) => {
    const resolver = createResolver(useMessageResolvers(), null);
    const { gifAutoPlay, isWindowFocused } = useMediaContext();
    const windowFocused = useWindowFocused();
    const focused = isWindowFocused ?? windowFocused;
    const [hovered, setHovered] = useState(false);
    const canAnimate = autoplay ?? gifAutoPlay;
    const url = useMemo(() => {
      if (src != null) return src;
      if (emojiId != null) {
        const animate = shouldAnimate === true && canAnimate;
        return resolver.emojiURL({
          id: emojiId,
          name: emojiName,
          animated: focused && animated === true && (animate || hovered || isInteracting),
          size: EMOJI_SIZES[size],
        });
      }
      if (emojiName != null) return resolver.emojiURL({ name: emojiName, size: EMOJI_SIZES[size] });
      return null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, emojiId, emojiName, animated, shouldAnimate, canAnimate, focused, hovered, isInteracting, size]);
    const data = emojiId != null && emojiId !== '' ? { 'data-id': emojiId } : { 'data-name': emojiName ?? undefined };
    const props = {
      ...rest,
      className: clsx('emoji', className, { jumboable: size === 'jumbo' }),
      onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
        if (animated) setHovered(true);
        onMouseEnter?.(event);
      },
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        if (animated) setHovered(false);
        onMouseLeave?.(event);
      },
      'data-type': 'emoji',
      ...data,
    };
    if (url == null || url === '')
      return (
        <span {...props} ref={ref} className={clsx('emoji', 'emoji-text')}>
          {emojiName}
        </span>
      );
    return <img {...props} ref={ref} src={url} alt={alt ?? emojiName ?? undefined} draggable={false} />;
  },
);

Emoji.displayName = 'Emoji';
