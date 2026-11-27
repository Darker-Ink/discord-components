import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ClockIcon, PlusSmallIcon, ReactionIcon, XSmallIcon } from '@discord-mana/icons';
import {
  MessagePoll,
  PollAnswerEmoji,
  PollSelectionIcon,
  type APIMessage,
  type APIMessageComponentEmoji,
  type APIPoll,
} from '@discord-mana/messages';
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

// A poll message (`mode: 'poll'`): the client's poll (@discord-mana/messages' `MessagePoll`), with its question
// and answers edited in place, and a row of settings while it is being edited. A poll can't come with anything
// else, so this is the whole message.

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

/** A poll request as the API returns it on the sent message (answer ids, expiry, no votes yet). */
export const toPreviewPoll = (poll: APIPollCreateRequest, sentAt: string): APIPoll => ({
  question: { text: poll.question?.text ?? '' },
  answers: (poll.answers ?? []).map((answer, index) => ({
    answer_id: index + 1,
    poll_media: answer.poll_media as APIPoll['answers'][number]['poll_media'],
  })),
  expiry: new Date(Date.parse(sentAt) + (poll.duration ?? 24) * 3_600_000).toISOString(),
  allow_multiselect: poll.allow_multiselect === true,
  layout_type: poll.layout_type ?? 1,
  results: { is_finalized: false, answer_counts: [] },
});

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

export interface EditablePollProps {
  /** The message the poll is drawn in (its timestamp sets the time left). */
  message?: Pick<APIMessage, 'timestamp'>;
  className?: string;
}

/** The message's poll, editable in place; nothing when the message has none. */
export const EditablePoll = ({ message, className }: EditablePollProps) => {
  const { actions, store } = useBuilderContext();
  const { readOnly } = useBuilderRender();
  const ui = useBuilderUIStore();
  const poll = useBuilderSelector((state) => state.doc.poll);
  const issues = useNodeIssues(ROOT_UID).filter((issue) => issue.field?.startsWith('poll'));
  const [active, setActive] = useState(false);
  const [sentAt] = useState(() => message?.timestamp ?? new Date().toISOString());
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
  const timestamp = message?.timestamp ?? sentAt;
  const multiple = poll.allow_multiselect === true;
  const duration = poll.duration ?? 24;
  const editing = active && !readOnly;
  const update = (next: APIPollCreateRequest) => actions.updateMessage({ poll: next });
  const current = () => store.getState().doc.poll ?? poll;

  const activate = () => {
    if (readOnly || active) return;
    ui.set({ selectedId: null, contextMenu: null });
    setActive(true);
  };

  const emojiOf = (index: number) => poll.answers[index]?.poll_media?.emoji as APIMessageComponentEmoji | undefined;

  return (
    <MessagePoll
      poll={toPreviewPoll(poll, timestamp)}
      now={new Date(timestamp)}
      className={className}
      containerProps={{
        ref: rootRef,
        role: 'group',
        'aria-label': 'Poll',
        tabIndex: readOnly ? undefined : 0,
        className: styles.editable,
        'data-active': editing || undefined,
        'data-issue': issues.some((issue) => issue.severity === 'error') ? 'error' : undefined,
        onPointerDown: activate,
        onFocus: activate,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape' && event.target === event.currentTarget) setActive(false);
        },
      }}
      renderQuestion={() => (
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
      )}
      renderAnswerText={(_answer, index) => (
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
      )}
      renderAnswerStart={
        editing
          ? (_answer, index) => {
              const emoji = emojiOf(index);
              return (
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
                        <PollAnswerEmoji emoji={emoji as never} />
                      ) : (
                        <ReactionIcon size="sm" color="currentColor" />
                      )}
                    </button>
                  )}
                </AnchoredPopout>
              );
            }
          : undefined
      }
      renderAnswerEnd={
        editing && poll.answers.length > 1
          ? (_answer, index) => (
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
            )
          : undefined
      }
      afterAnswers={
        editing && poll.answers.length < limits.poll.answers ? (
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
        ) : null
      }
    >
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
            <PollSelectionIcon multiple className={styles.chipIcon} />
            Multiple answers
          </button>
        </div>
      ) : null}
      {issues.length > 0 && !readOnly ? (
        <div className={styles.issues}>
          <IssueBadge issues={issues.filter((issue) => !issue.field?.endsWith('.text'))} />
        </div>
      ) : null}
    </MessagePoll>
  );
};

EditablePoll.displayName = 'EditablePoll';
