import { createContext, useContext } from 'react';

// Strings embeds render on their own, in the client's en-US wording (shared media strings such as
// "Image" and "Play" come from MediaContext). Apps can provide translations through EmbedI18nContext.
export const DEFAULT_EMBED_I18N = {
  GIF: 'GIF',
  OPEN_LINK: 'Open Link',
  REMOVE_ALL_EMBEDS: 'Remove all embeds',
  CALENDAR_TODAY_AT: (time: string) => `Today at ${time}`,
  CALENDAR_YESTERDAY_AT: (time: string) => `Yesterday at ${time}`,
  CALENDAR_TOMORROW_AT: (time: string) => `Tomorrow at ${time}`,
};

export type EmbedI18n = typeof DEFAULT_EMBED_I18N;

export const EmbedI18nContext = createContext<EmbedI18n>(DEFAULT_EMBED_I18N);

EmbedI18nContext.displayName = 'EmbedI18nContext';

export const useEmbedI18n = () => useContext(EmbedI18nContext);
