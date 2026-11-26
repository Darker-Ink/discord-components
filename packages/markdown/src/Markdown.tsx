import { createContext, useContext, useMemo } from 'react';
import {
  useMessageResolvers,
  type MessageMarkdownContext,
  type RenderEmbedMarkdown,
  type RenderMessageMarkdown,
} from '@discord-mana/messages';
import { toReact, type MarkdownOptions } from './parser';
import { DEFAULT_MARKDOWN_STRINGS, type MarkdownStrings } from './state';

/** Translations of the strings markdown renders itself (unknown mentions, channel icon labels…). */
export const MarkdownStringsContext = createContext<MarkdownStrings>(DEFAULT_MARKDOWN_STRINGS);

MarkdownStringsContext.displayName = 'MarkdownStringsContext';

export interface MarkdownProps extends MarkdownOptions {
  /** The markdown source. */
  content: string;
}

/**
 * Discord markdown rendered like the client. Put it inside the container the context renders it in (the
 * message content's `.markup` div, an embed's description…), which carries the styles.
 */
export const Markdown = ({
  content,
  preset,
  rules,
  context,
  resolvers,
  strings,
  inline,
  allowJumboEmoji,
}: MarkdownProps) => {
  const contextResolvers = useMessageResolvers();
  const contextStrings = useContext(MarkdownStringsContext);
  const activeResolvers = resolvers ?? contextResolvers;
  const activeStrings = strings ?? contextStrings;
  return useMemo(
    () =>
      toReact(content, {
        preset,
        rules,
        context,
        resolvers: activeResolvers,
        strings: activeStrings,
        inline,
        allowJumboEmoji,
      }),
    [content, preset, rules, context, activeResolvers, activeStrings, inline, allowJumboEmoji],
  );
};

Markdown.displayName = 'Markdown';

const PRESET_BY_KIND = {
  content: 'message',
  'text-display': 'textDisplay',
  'reply-preview': 'reply',
} as const satisfies Record<MessageMarkdownContext['kind'], MarkdownOptions['preset']>;

/** `<Message renderMarkdown={renderMessageMarkdown}>`: message content, replies and Text Displays as the client renders them. */
export const renderMessageMarkdown: RenderMessageMarkdown = (text, { kind, messageId, channelId }) => (
  <Markdown content={text} preset={PRESET_BY_KIND[kind]} context={{ messageId, channelId }} />
);

/** `<Message renderEmbedMarkdown={renderEmbedMarkdown}>`: rich embed titles, descriptions and fields. */
export const renderEmbedMarkdown: RenderEmbedMarkdown = (text, { embed, kind, channelId }) => {
  const preset =
    kind === 'title'
      ? embed.url != null && embed.url !== ''
        ? 'embedTitleWithoutLinks'
        : 'embedTitle'
      : kind === 'description'
        ? 'embedDescription'
        : 'embedFieldValue';
  return <Markdown content={text} preset={preset} context={{ channelId }} />;
};
