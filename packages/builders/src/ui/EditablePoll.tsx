import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { Button, Text } from '@discord-mana/components';
import { ClockIcon, PlusSmallIcon, ReactionIcon, TrashIcon, XSmallIcon } from '@discord-mana/icons';
import { Emoji, type APIMessageComponentEmoji } from '@discord-mana/messages';
import {
  limits,
  ROOT_UID,
  useBuilderSelector,
  useNodeIssues,
  type APIPollCreateRequest,
  type BuilderNode,
} from '../core';
import { BuilderTextField } from './BuilderTextField';
import { EmojiPicker } from './componentTools';
import { IssueBadge } from './IssueBadge';
import { AnchoredPopout, PopoutPanel, RemoveButton } from './popouts';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './EditablePoll.module.css';

// A poll as the client draws one in a message (question, answers, "0 votes · 1d left", Vote), with its texts
// edited in place. Classic messages only: Components v2 can't carry a poll.

/** A new poll: a question and two answers to type, for a day. */
export const createPoll = (): APIPollCreateRequest => ({
  question: { text: '' },
  answers: [{ poll_media: { text: '' } }, { poll_media: { text: '' } }],
  duration: 24,
  allow_multiselect: false,
});

/** Durations the client offers when creating a poll, in hours. */
export const POLL_DURATIONS: readonly { hours: number; label: string }[] = [
  { hours: 1, label: '1 hour' },
  { hours: 4, label: '4 hours' },
  { hours: 8, label: '8 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
  { hours: 336, label: '2 weeks' },
];

const durationLabel = (hours: number) =>
  POLL_DURATIONS.find((option) => option.hours === hours)?.label ?? `${hours} hours`;

/** "24h left", "3d left": how the client counts down a poll. */
const timeLeft = (hours: number) => (hours < 24 || hours % 24 !== 0 ? `${hours}h left` : `${hours / 24}d left`);

const readPoll = (node: BuilderNode | null): APIPollCreateRequest | undefined =>
  (node as { poll?: APIPollCreateRequest } | null)?.poll;

const withAnswer = (poll: APIPollCreateRequest, index: number, patch: Partial<{ text: string; emoji: unknown }>) => ({
  ...poll,
  answers: poll.answers.map((answer, current) => {
    if (current !== index) return answer;
    const media = { ...answer.poll_media, ...patch } as Record<string, unknown>;
    if (media.emoji == null) delete media.emoji;
    return { ...answer, poll_media: media };
  }),
});

const SelectionIcon = ({ multiple }: { multiple: boolean }) => (
  <svg className={styles.selectionIcon} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    {multiple ? (
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    ) : (
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    )}
  </svg>
);

const AnswerEmoji = ({ emoji }: { emoji: APIMessageComponentEmoji }) => (
  <span className={styles.emoji}>
    <Emoji emojiId={emoji.id ?? undefined} emojiName={emoji.name ?? undefined} animated={emoji.animated === true} />
  </span>
);

export interface EditablePollProps {
  className?: string;
}

/** The message's poll, editable in place; nothing when the message has none. */
export const EditablePoll = ({ className }: EditablePollProps) => {
  const { actions, store } = useBuilderContext();
  const { readOnly } = useBuilderRender();
  const ui = useBuilderUIStore();
  const poll = useBuilderSelector((state) => state.doc.poll);
  const issues = useNodeIssues(ROOT_UID).filter((issue) => issue.field?.startsWith('poll'));
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Selecting something else, or pressing outside, leaves the poll.
  useEffect(() => {
    if (!active) return;
    const unsubscribe = ui.subscribe(() => {
      if (ui.getState().selectedId != null) setActive(false);
    });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (rootRef.current?.contains(target) || target.closest('[data-builder-ui]') != null) return;
      setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      unsubscribe();
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, ui]);

  if (poll == null) return null;
  const multiple = poll.allow_multiselect === true;
  const duration = poll.duration ?? 24;
  const editing = active && !readOnly;
  const update = (next: APIPollCreateRequest | undefined) => actions.updateMessage({ poll: next });
  const current = () => store.getState().doc.poll ?? poll;

  const activate = () => {
    if (readOnly || active) return;
    ui.set({ selectedId: null, contextMenu: null });
    setActive(true);
  };

  return (
    <div className={clsx(styles.pollContainer, className)}>
      <div
        ref={rootRef}
        className={styles.container}
        role="group"
        aria-label="Poll"
        tabIndex={readOnly ? undefined : 0}
        data-active={editing || undefined}
        data-issue={issues.some((issue) => issue.severity === 'error') ? 'error' : undefined}
        onPointerDown={activate}
        onFocus={activate}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape' && event.target === event.currentTarget) setActive(false);
        }}
      >
        <div className={styles.header}>
          <Text variant="body-lg/semibold" color="text-strong" className={styles.question} selectable>
            <BuilderTextField
              uid={ROOT_UID}
              kind="message"
              field="poll.question.text"
              rules="EMBED_TITLE_RULES"
              placeholder="Ask a question"
              renderPreview={(value) => value}
              limit={limits.poll.question}
              write={(node, value) => ({
                poll: { ...readPoll(node)!, question: { ...readPoll(node)!.question, text: value } },
              })}
              disabled={readOnly}
              aria-label="Poll question"
            />
          </Text>
          <Text variant="body-sm/normal" color="text-muted" className={styles.prompt}>
            {multiple ? 'Select one or more answers' : 'Select one answer'}
          </Text>
        </div>
        <div className={styles.answersContainer}>
          {poll.answers.map((answer, index) => {
            const emoji = answer.poll_media?.emoji;
            return (
              <div key={index} className={styles.answer}>
                <div className={styles.answerInner}>
                  {editing ? (
                    <AnchoredPopout
                      position="bottom"
                      align="left"
                      renderPopout={() => (
                        <PopoutPanel
                          title={`Answer ${index + 1} emoji`}
                          footer={
                            emoji != null ? (
                              <RemoveButton
                                label="Remove"
                                onClick={() => update(withAnswer(current(), index, { emoji: undefined }))}
                              />
                            ) : null
                          }
                        >
                          <EmojiPicker
                            value={emoji}
                            onChange={(next) => update(withAnswer(current(), index, { emoji: next }))}
                          />
                        </PopoutPanel>
                      )}
                    >
                      {(props) => (
                        <button
                          type="button"
                          className={styles.emojiButton}
                          aria-label={`Answer ${index + 1} emoji`}
                          data-builder-ui
                          {...props}
                        >
                          {emoji != null ? (
                            <AnswerEmoji emoji={emoji} />
                          ) : (
                            <ReactionIcon size="sm" color="currentColor" />
                          )}
                        </button>
                      )}
                    </AnchoredPopout>
                  ) : emoji != null ? (
                    <AnswerEmoji emoji={emoji} />
                  ) : null}
                  <Text variant="body-md/medium" color="text-default" className={styles.label} selectable>
                    <BuilderTextField
                      uid={ROOT_UID}
                      kind="message"
                      field={`poll.answers.${index}.poll_media.text`}
                      rules="EMBED_TITLE_RULES"
                      placeholder={`Answer ${index + 1}`}
                      renderPreview={(value) => value}
                      limit={limits.poll.answer}
                      write={(node, value) => ({ poll: withAnswer(readPoll(node)!, index, { text: value }) })}
                      disabled={readOnly}
                      aria-label={`Answer ${index + 1}`}
                    />
                  </Text>
                  {editing && poll.answers.length > 1 ? (
                    <button
                      type="button"
                      className={styles.removeAnswer}
                      aria-label={`Remove answer ${index + 1}`}
                      data-builder-ui
                      onClick={() => {
                        const latest = current();
                        update({ ...latest, answers: latest.answers.filter((_, other) => other !== index) });
                      }}
                    >
                      <XSmallIcon size="xs" color="currentColor" />
                    </button>
                  ) : (
                    <SelectionIcon multiple={multiple} />
                  )}
                </div>
              </div>
            );
          })}
          {editing && poll.answers.length < limits.poll.answers ? (
            <button
              type="button"
              className={styles.addAnswer}
              data-builder-ui
              onClick={() => {
                const latest = current();
                update({ ...latest, answers: [...latest.answers, { poll_media: { text: '' } }] });
                requestAnimationFrame(() => {
                  const fields = rootRef.current?.querySelectorAll<HTMLElement>(
                    '[aria-label^="Answer "][role="textbox"]',
                  );
                  fields?.[fields.length - 1]?.focus();
                });
              }}
            >
              <PlusSmallIcon size="xs" color="currentColor" />
              Add answer
            </button>
          ) : null}
        </div>
        <div className={styles.bottomBar}>
          <Text variant="body-sm/normal" color="text-muted" className={styles.detailsText}>
            <span>0 votes</span>
            <span>{timeLeft(duration)}</span>
          </Text>
          <Button variant="primary" size="md" text="Vote" disabled />
        </div>
        {editing ? (
          <div className={styles.editRow} data-builder-ui>
            <AnchoredPopout
              position="bottom"
              align="left"
              renderPopout={({ closePopout }) => (
                <PopoutPanel title="Duration" width={220}>
                  <div role="radiogroup" aria-label="Duration" className={styles.durations}>
                    {POLL_DURATIONS.map((option) => (
                      <button
                        key={option.hours}
                        type="button"
                        role="radio"
                        aria-checked={option.hours === duration}
                        className={styles.durationOption}
                        onClick={() => {
                          update({ ...current(), duration: option.hours });
                          closePopout();
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </PopoutPanel>
              )}
            >
              {(props) => (
                <button type="button" className={styles.chip} {...props}>
                  <ClockIcon size="xs" color="currentColor" />
                  {durationLabel(duration)}
                </button>
              )}
            </AnchoredPopout>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={multiple}
              onClick={() => update({ ...current(), allow_multiselect: !multiple })}
            >
              <SelectionIcon multiple />
              Multiple answers
            </button>
            <button
              type="button"
              className={clsx(styles.chip, styles.danger)}
              onClick={() => {
                update(undefined);
                setActive(false);
              }}
            >
              <TrashIcon size="xs" color="currentColor" />
              Remove poll
            </button>
          </div>
        ) : null}
        {issues.length > 0 && !readOnly ? (
          <div className={styles.issues}>
            <IssueBadge issues={issues.filter((issue) => !issue.field?.endsWith('.text'))} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

EditablePoll.displayName = 'EditablePoll';
