import { useState } from 'react';
import clsx from 'clsx';
import { Checkbox, Switch, Text, TextInput } from '@discord-mana/components';
import {
  isMessageFieldAllowed,
  limits,
  MessageFlag,
  ROOT_UID,
  useBuilderRestrictions,
  useBuilderSelector,
  useBuilderTarget,
  useNodeIssues,
  type AllowedMentionType,
  type APIAllowedMentions,
} from '../core';
import { useBuilderContext } from './useBuilderContext';
import styles from './MessageOptions.module.css';

// What a message does when it's sent, beyond what it shows: notifications, link previews, text-to-speech,
// who its mentions ping, and a forum post's tags. Each is hidden when the builder's restrictions turn it off.

const useRootError = (prefix: string) => {
  const issues = useNodeIssues(ROOT_UID);
  return (
    issues
      .filter((issue) => issue.field === prefix || issue.field?.startsWith(`${prefix}.`))
      .map((issue) => issue.message)
      .filter((message, index, all) => all.indexOf(message) === index)
      .join(' ') || undefined
  );
};

const EMPTY: readonly string[] = [];

/** IDs typed or pasted in any form (spaces, commas, mentions like `<@123>`). */
export const parseIds = (text: string) => text.match(/\d{17,20}/g) ?? [];

/** A list of IDs as text, keeping what is being typed until it parses. */
const IdListInput = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  max,
}: {
  label: string;
  value: readonly string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  error?: string;
  max: number;
}) => {
  const [text, setText] = useState(() => value.join(', '));
  const [synced, setSynced] = useState(value);
  // Changed from elsewhere (undo, imported JSON): show the new list.
  if (synced !== value && parseIds(text).join(',') !== value.join(',')) {
    setSynced(value);
    setText(value.join(', '));
  }
  return (
    <TextInput
      label={label}
      value={text}
      placeholder={placeholder}
      description={value.length > 0 ? `${value.length} / ${max}` : undefined}
      errorMessage={error}
      onChange={(next) => {
        setText(next);
        const ids = parseIds(next);
        setSynced(ids);
        onChange(ids);
      }}
      inputMode="numeric"
      spellCheck={false}
      autoComplete="off"
    />
  );
};

const MENTION_TYPES: { type: AllowedMentionType; label: string }[] = [
  { type: 'users', label: 'Users' },
  { type: 'roles', label: 'Roles' },
  { type: 'everyone', label: '@everyone and @here' },
];

/**
 * `allowed_mentions`: off, mentions ping as Discord decides (everything in the content); on, only the kinds
 * ticked, or only the listed users and roles.
 */
export const AllowedMentionsEditor = () => {
  const { actions } = useBuilderContext();
  const value = useBuilderSelector((state) => state.doc.allowed_mentions);
  const error = useRootError('allowed_mentions');
  const usersError = useRootError('allowed_mentions.users');
  const rolesError = useRootError('allowed_mentions.roles');
  const set = (next: APIAllowedMentions | undefined) => actions.updateMessage({ allowed_mentions: next });
  const limited = value != null;
  const parse = value?.parse ?? [];
  const toggle = (type: AllowedMentionType, on: boolean) => {
    const next = on ? [...parse.filter((item) => item !== type), type] : parse.filter((item) => item !== type);
    const lists = type === 'users' || type === 'roles' ? { [type]: on ? undefined : value?.[type] } : {};
    set({ ...value, ...lists, parse: next });
  };
  return (
    <div className={styles.group}>
      <Switch
        label="Limit mentions"
        checked={limited}
        onChange={(on: boolean) => set(on ? { parse: [] } : undefined)}
      />
      {limited ? (
        <div className={styles.nested}>
          <div className={styles.checks} role="group" aria-label="Mentions that ping">
            {MENTION_TYPES.map(({ type, label }) => (
              <Checkbox
                key={type}
                label={label}
                checked={parse.includes(type)}
                onChange={(checked: boolean) => toggle(type, checked)}
              />
            ))}
          </div>
          {!parse.includes('users') ? (
            <IdListInput
              label="Only these users"
              value={value?.users ?? EMPTY}
              placeholder="User IDs"
              max={limits.allowedMentions.users}
              error={usersError}
              onChange={(ids) => set({ ...value, users: ids.length > 0 ? ids : undefined })}
            />
          ) : null}
          {!parse.includes('roles') ? (
            <IdListInput
              label="Only these roles"
              value={value?.roles ?? EMPTY}
              placeholder="Role IDs"
              max={limits.allowedMentions.roles}
              error={rolesError}
              onChange={(ids) => set({ ...value, roles: ids.length > 0 ? ids : undefined })}
            />
          ) : null}
          <Checkbox
            label="Mention the replied user"
            checked={value?.replied_user === true}
            onChange={(checked: boolean) => set({ ...value, replied_user: checked ? true : undefined })}
          />
          {error != null && usersError == null && rolesError == null ? (
            <Text variant="body-xs/normal" color="text-feedback-critical">
              {error}
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

AllowedMentionsEditor.displayName = 'AllowedMentionsEditor';

const FlagSwitch = ({ flag, label, description }: { flag: number; label: string; description?: string }) => {
  const { actions } = useBuilderContext();
  const flags = useBuilderSelector((state) => state.doc.flags ?? 0);
  return (
    <Switch
      label={label}
      description={description}
      checked={(flags & flag) !== 0}
      onChange={(on: boolean) => {
        const next = on ? flags | flag : flags & ~flag;
        actions.updateMessage({ flags: next === 0 ? undefined : next });
      }}
    />
  );
};

FlagSwitch.displayName = 'FlagSwitch';

export interface MessageOptionsProps {
  className?: string;
}

/** Notifications, link previews, text-to-speech and mentions, as the builder's restrictions allow. */
export const MessageOptions = ({ className }: MessageOptionsProps) => {
  const { actions } = useBuilderContext();
  const restrictions = useBuilderRestrictions();
  const mode = useBuilderSelector((state) => state.doc.mode);
  const tts = useBuilderSelector((state) => state.doc.tts === true);
  const target = useBuilderTarget();
  const flags = isMessageFieldAllowed(restrictions, 'flags');
  const allowsTts = isMessageFieldAllowed(restrictions, 'tts') && mode === 'classic';
  const mentions = isMessageFieldAllowed(restrictions, 'allowed_mentions');
  if (!flags && !allowsTts && !mentions) return null;
  return (
    <section className={clsx(styles.options, className)} aria-label="Message options">
      {flags && target === 'interaction' ? (
        <FlagSwitch flag={MessageFlag.Ephemeral} label="Only visible to the user" />
      ) : null}
      {flags ? <FlagSwitch flag={MessageFlag.SuppressNotifications} label="Silent" /> : null}
      {flags && mode === 'classic' ? <FlagSwitch flag={MessageFlag.SuppressEmbeds} label="Hide link previews" /> : null}
      {allowsTts ? (
        <Switch
          label="Text-to-speech"
          checked={tts}
          onChange={(on: boolean) => actions.updateMessage({ tts: on ? true : undefined })}
        />
      ) : null}
      {mentions ? <AllowedMentionsEditor /> : null}
    </section>
  );
};

MessageOptions.displayName = 'MessageOptions';

/** A forum or media channel post's tags (`applied_tags`), as IDs. */
export const AppliedTagsInput = () => {
  const { actions } = useBuilderContext();
  const tags = useBuilderSelector((state) => state.doc.applied_tags);
  const error = useRootError('applied_tags');
  return (
    <IdListInput
      label="Tags"
      value={tags ?? EMPTY}
      placeholder="Tag IDs"
      max={limits.webhook.appliedTags}
      error={error}
      onChange={(ids) => actions.updateMessage({ applied_tags: ids.length > 0 ? ids : undefined })}
    />
  );
};

AppliedTagsInput.displayName = 'AppliedTagsInput';
