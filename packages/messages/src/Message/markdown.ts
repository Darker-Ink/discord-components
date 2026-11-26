import { createContext, useContext, type ReactNode } from 'react';

export interface MessageMarkdownContext {
  /**
   * Where the text is: the message's content, a Components v2 Text Display, or text in an interaction modal.
   * Embeds use `MessageEmbeds`' own `renderMarkdown`.
   */
  kind: 'content' | 'text-display' | 'reply-preview';
  /** The message id, when the text belongs to a message. */
  messageId?: string;
  channelId?: string;
}

/** Renders markdown the client would parse; without one, the raw text is shown in the same containers. */
export type RenderMessageMarkdown = (text: string, context: MessageMarkdownContext) => ReactNode;

export const MessageMarkdownRendererContext = createContext<RenderMessageMarkdown | undefined>(undefined);

MessageMarkdownRendererContext.displayName = 'MessageMarkdownRendererContext';

export const useRenderMarkdown = () => {
  const render = useContext(MessageMarkdownRendererContext);
  return (text: string, context: MessageMarkdownContext) => (render != null ? render(text, context) : text);
};
