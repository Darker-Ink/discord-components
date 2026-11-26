import { createContext, useContext } from 'react';
import { renderEmbedMarkdown, renderMessageMarkdown } from '@discord-mana/markdown';
import type { RenderEmbedMarkdown, RenderMessageMarkdown } from '@discord-mana/messages';

export interface BuilderRenderOptions {
  /** Markdown of the content and Text Displays (defaults to @discord-mana/markdown's, like the client). */
  renderMessageMarkdown: RenderMessageMarkdown;
  /** Markdown of embed titles, descriptions and field values. */
  renderEmbedMarkdown: RenderEmbedMarkdown;
  /** Shows the message without editing affordances. */
  readOnly: boolean;
  /**
   * Where a selected node's tools go: `floating` next to it, or `docked` in a bar along the bottom of the
   * screen (phones, where a floating bar would cover what is being edited).
   */
  toolbar: 'floating' | 'docked';
  /** The channel the message is drawn in (mentions resolve against it). */
  channelId: string;
  guildId: string | null;
}

export const DEFAULT_RENDER_OPTIONS: BuilderRenderOptions = {
  renderMessageMarkdown,
  renderEmbedMarkdown,
  readOnly: false,
  toolbar: 'floating',
  channelId: '1300000000000000003',
  guildId: null,
};

export const BuilderRenderContext = createContext<BuilderRenderOptions>(DEFAULT_RENDER_OPTIONS);

BuilderRenderContext.displayName = 'BuilderRenderContext';

export const useBuilderRender = () => useContext(BuilderRenderContext);
