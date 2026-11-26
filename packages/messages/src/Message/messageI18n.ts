import { createContext, useContext } from 'react';

// Strings messages, message components and interaction modals render, in the client's en-US wording.
// Apps can provide translations through MessageI18nContext.
export const DEFAULT_MESSAGE_I18N = {
  MESSAGE: 'Message',
  EDITED: 'edited',
  EDITED_AT: (timeFormatted: string) => `Edited ${timeFormatted}`,
  APP_TAG: 'APP',
  APP_TAG_LABEL: 'App',
  VERIFIED_APP: 'Verified App',
  OFFICIAL_TAG: 'OFFICIAL',
  OFFICIAL_MESSAGE: 'Official Discord Message',
  SERVER_TAG: 'SERVER',
  SERVER_TAG_LABEL: 'Server',
  SILENT_MESSAGE: 'This is a @silent message.',
  REACTIONS: 'Reactions',
  REACTION_LABEL: (emojiName: string, count: number, me: boolean, burst: boolean) => {
    const counted = `${emojiName}, ${count} ${burst ? 'super reaction' : 'reaction'}${count === 1 ? '' : 's'}`;
    if (burst) return `${counted}, ${me ? 'press to remove your super reaction' : 'press to super react'}`;
    return `${counted}, ${me ? 'press to remove your reaction' : 'press to react'}`;
  },
  ADD_REACTION: 'Add Reaction',
  OFFICIAL_MESSAGE_LABEL: 'Official message',
  OPEN_IMAGE_DIALOG: 'click to open image dialog',
  ONLY_YOU_CAN_SEE_THIS: 'Only you can see this',
  DISMISS_MESSAGE: 'Dismiss message',
  SENDING_COMMAND: 'Sending command...',
  APP_IS_THINKING: (applicationName: string) => `${applicationName} is thinking...`,
  APP_DID_NOT_RESPOND: 'The application did not respond',
  INTERACTION_FAILED: 'This interaction failed',
  INTERACTION_RATE_LIMITED: "Slow down! You're clicking too fast.",
  UPDATE_TO_VIEW: 'Please update Discord to view this message',
  BLOCKED_MESSAGE: 'Blocked message',
  IGNORED_MESSAGE: 'Ignored message',
  MESSAGE_PINNED: 'Message pinned.',
  FORWARDED: 'Forwarded',
  FORWARDED_FROM: (origin: string, timestamp: string) => `Message originally sent in ${origin} at ${timestamp}`,
  REPLYING_TO: (author: string, repliedAuthor: string) => `${author} replying to ${repliedAuthor}`,
  JUMP_TO_REPLY: 'Jump To Reply',
  REPLY_NOT_LOADED: 'Message could not be loaded',
  REPLY_DELETED: 'Original message was deleted',
  /** Between the user and the command of "<user> used <command>". */
  USED_COMMAND: 'used',
  CLICK_TO_SEE_STICKER: 'Click to see sticker',
  CLICK_TO_SEE_COMMAND: 'Click to see command',
  CLICK_TO_SEE_VOICE_MESSAGE: 'Click to see voice message',
  CLICK_TO_SEE_MESSAGE: 'Click to see message',
  CLICK_TO_SEE_ATTACHMENT: 'Click to see attachment',
  MAKE_A_SELECTION: 'Make a selection',
  SELECT: 'Select',
  CLEAR: 'Clear',
  CLEAR_SELECTION: 'Clear selection',
  FIELD_REQUIRED: 'This field is required.',
  SELECT_AT_LEAST: (count: number) => `Select at least ${count}`,
  SELECT_AT_MOST: (count: number) => `Select at most ${count}`,
  TEXT_LENGTH_RANGE: (min: number, max: number) => `Must be between ${min} and ${max} in length.`,
  ADDITIONAL_ACTIONS: 'Additional Actions',
  BUTTON_LINK_ACTIONS: 'Button Link Actions',
  COPY_LINK: 'Copy link',
  PRODUCT_UNAVAILABLE: 'Product Unavailable',
  PRODUCT_PRICE: (skuName: string, price: string) => `${skuName} - ${price}`,
  UNKNOWN: 'unknown',
  FILE_UPLOAD_MIN: (minValues: number) => `You need to upload at least ${minValues} files.`,
  FILE_UPLOAD_MAX: (maxValues: number) => `You can upload up to ${maxValues === 1 ? '1 file' : `${maxValues} files`}.`,
  FILE_UPLOAD_DROP: (maxValues: number) => ({
    before: `Drop ${maxValues === 1 ? 'file' : 'files'} here or `,
    link: 'browse',
  }),
  FILE_UPLOAD_DROP_HERE: 'Drop here to upload',
  FILE_UPLOAD_LIMIT_REACHED: 'File upload limit reached',
  FILE_UPLOAD_REMOVE_SOME: 'Remove some files to upload new ones.',
  FILE_UPLOAD_UNKNOWN_FILE: 'Unknown file',
  FILE_UPLOAD_REMOVE: 'Remove',
  FILE_UPLOAD_TOO_MANY: 'Too many uploads!',
  FILE_UPLOAD_HINT: (minValues: number, maxValues: number, types: string | null, maxSize: string) => {
    const typed = types != null ? `${types} ` : '';
    if (types != null) {
      if (!(minValues > 1))
        return maxValues === 1
          ? `Upload 1 ${typed}file under ${maxSize}.`
          : `Upload up to ${maxValues} ${typed}files under ${maxSize}.`;
      if (minValues === maxValues) return `Upload ${minValues} ${typed}files under ${maxSize}.`;
      return `Upload ${minValues}–${maxValues} ${typed}files under ${maxSize}.`;
    }
    if (minValues > 1)
      return minValues === maxValues
        ? `Upload ${minValues} files under ${maxSize}.`
        : `Upload ${minValues}–${maxValues} files under ${maxSize}.`;
    return maxValues === 1 ? `Upload a file under ${maxSize}.` : `Upload up to ${maxValues} files under ${maxSize}.`;
  },
  CALENDAR_TODAY_AT: (time: string) => `Today at ${time}`,
  CALENDAR_YESTERDAY_AT: (time: string) => `Yesterday at ${time}`,
  CALENDAR_TOMORROW_AT: (time: string) => `Tomorrow at ${time}`,
};

export type MessageI18n = typeof DEFAULT_MESSAGE_I18N;

export const MessageI18nContext = createContext<MessageI18n>(DEFAULT_MESSAGE_I18N);

MessageI18nContext.displayName = 'MessageI18nContext';

export const useMessageI18n = () => useContext(MessageI18nContext);
