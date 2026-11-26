// Validation of the commands an embedding page sends a preview. Loaded only when interactions are on, since it
// carries the same zod schemas the API validates messages with.
import { z } from 'zod';
import type { APIMessage, APIModalInteractionResponseCallbackData } from '@discord-mana/messages';
import {
  formatIssues,
  messageSchema,
  modalSchema,
  normalizeMessages,
  scrubUrls,
  snowflake,
  type ValidMessage,
} from '../../shared/messages';

const interactionId = z.string().min(1).max(64);

const application = z.strictObject({
  id: snowflake,
  name: z.string().min(1).max(80),
  icon_url: z
    .string()
    .max(2048)
    .refine((value) => /^https?:\/\//.test(value), 'Expected an http(s) URL')
    .optional(),
});

const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('discord-mana:append-message'),
    message: messageSchema,
    interactionId: interactionId.optional(),
  }),
  z.strictObject({
    type: z.literal('discord-mana:update-message'),
    messageId: snowflake,
    message: z.looseObject({}),
    interactionId: interactionId.optional(),
  }),
  z.strictObject({
    type: z.literal('discord-mana:delete-message'),
    messageId: snowflake,
    interactionId: interactionId.optional(),
  }),
  z.strictObject({
    type: z.literal('discord-mana:open-modal'),
    interactionId,
    modal: modalSchema,
    application: application.optional(),
  }),
  z.strictObject({ type: z.literal('discord-mana:set-loading'), interactionId }),
  z.strictObject({ type: z.literal('discord-mana:ack'), interactionId }),
  z.strictObject({
    type: z.literal('discord-mana:interaction-failed'),
    interactionId,
    message: z.string().max(200).optional(),
  }),
  z.strictObject({ type: z.literal('discord-mana:ping') }),
]);

export type Command =
  | { type: 'discord-mana:append-message'; message: APIMessage; interactionId?: string }
  | { type: 'discord-mana:update-message'; messageId: string; patch: Record<string, unknown>; interactionId?: string }
  | { type: 'discord-mana:delete-message'; messageId: string; interactionId?: string }
  | {
      type: 'discord-mana:open-modal';
      interactionId: string;
      modal: APIModalInteractionResponseCallbackData;
      application?: { id: string; name: string; icon_url?: string };
    }
  | { type: 'discord-mana:set-loading' | 'discord-mana:ack'; interactionId: string }
  | { type: 'discord-mana:interaction-failed'; interactionId: string; message?: string }
  | { type: 'discord-mana:ping' };

export type CommandResult = { command: Command } | { error: unknown };

const DISCORD_EPOCH = 1420070400000n;
let sequence = 0n;

/** A snowflake for a message the page adds, unique within this page. */
const nextSnowflake = () => String(((BigInt(Date.now()) - DISCORD_EPOCH) << 22n) + (sequence++ % 4096n));

const normalize = (message: ValidMessage): APIMessage => {
  const [normalized] = normalizeMessages([{ ...message, id: message.id ?? nextSnowflake() }], new Date());
  return scrubUrls(normalized) as APIMessage;
};

/** Checks a command's shape and its messages and modals as strictly as the API does. */
export const parseCommand = (value: unknown): CommandResult => {
  const result = commandSchema.safeParse(value);
  if (!result.success) return { error: formatIssues(result.error) };
  const command = result.data;
  try {
    switch (command.type) {
      case 'discord-mana:append-message':
        return { command: { ...command, message: normalize(command.message) } };
      case 'discord-mana:update-message':
        return {
          command: {
            type: command.type,
            messageId: command.messageId,
            patch: command.message,
            interactionId: command.interactionId,
          },
        };
      case 'discord-mana:open-modal':
        return {
          command: { ...command, modal: scrubUrls(command.modal) as APIModalInteractionResponseCallbackData },
        };
      default:
        return { command };
    }
  } catch (error) {
    return { error };
  }
};

/** Applies a partial update to a message and validates the result like a new message. */
export const mergeMessage = (
  current: APIMessage,
  patch: Record<string, unknown>,
): { message: APIMessage } | { error: unknown } => {
  const merged = messageSchema.safeParse({ ...current, ...patch, id: current.id });
  if (!merged.success) return { error: formatIssues(merged.error) };
  try {
    return { message: normalize(merged.data) };
  } catch (error) {
    return { error };
  }
};
