import type { HTMLAttributes, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { Button, Text } from '@discord-mana/components';
import { Emoji } from '../Emoji/Emoji';
import type { APIPoll, APIPollMedia } from '../Message/types';
import styles from './MessagePoll.module.css';

type Answer = APIPoll['answers'][number];

/** How the client counts a poll down: "3d left", "23h left", "5m left", or "Poll closed". */
export const formatPollTimeLeft = (expiry: string | null, now: Date) => {
  if (expiry == null) return null;
  const left = Date.parse(expiry) - now.getTime();
  if (Number.isNaN(left)) return null;
  if (left <= 0) return 'Poll closed';
  const hours = left / 3_600_000;
  if (hours >= 24) return `${Math.round(hours / 24)}d left`;
  if (hours >= 1) return `${Math.round(hours)}h left`;
  return `${Math.max(1, Math.round(left / 60_000))}m left`;
};

const SelectionIcon = ({ multiple, className }: { multiple: boolean; className?: string }) => (
  <svg className={clsx(styles.selectionIcon, className)} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    {multiple ? (
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    ) : (
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    )}
  </svg>
);

export const PollSelectionIcon = SelectionIcon;

/** An answer's emoji, at the client's size. */
export const PollAnswerEmoji = ({ emoji }: { emoji: NonNullable<APIPollMedia['emoji']> }) => (
  <span className={styles.emoji}>
    <Emoji emojiId={emoji.id ?? undefined} emojiName={emoji.name ?? undefined} animated={emoji.animated === true} />
  </span>
);

export interface MessagePollProps {
  poll: APIPoll;
  /** "Now", for the time left (defaults to the current time). */
  now?: Date;
  className?: string;
  /** Replaces the question's text (e.g. an inline editor). */
  renderQuestion?: (text: string) => ReactNode;
  /** Replaces an answer's text. */
  renderAnswerText?: (answer: Answer, index: number) => ReactNode;
  /** Replaces what is before an answer's text (its emoji). */
  renderAnswerStart?: (answer: Answer, index: number) => ReactNode;
  /** Replaces what is after an answer's text (the radio or checkbox). */
  renderAnswerEnd?: (answer: Answer, index: number) => ReactNode;
  /** After the answers (e.g. an "add answer" button). */
  afterAnswers?: ReactNode;
  /** Inside the card, after the vote bar. */
  children?: ReactNode;
  /** Props for the card itself. */
  containerProps?: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement>; [key: `data-${string}`]: unknown };
}

/**
 * A message's poll as the client shows it before voting: the question, "Select one answer" (or "one or more"),
 * the answers with their emoji, and the vote count, time left and Vote button.
 */
export const MessagePoll = ({
  poll,
  now,
  className,
  renderQuestion,
  renderAnswerText,
  renderAnswerStart,
  renderAnswerEnd,
  afterAnswers,
  children,
  containerProps,
}: MessagePollProps) => {
  const multiple = poll.allow_multiselect;
  const votes = (poll.results?.answer_counts ?? []).reduce((sum, answer) => sum + answer.count, 0);
  const timeLeft = formatPollTimeLeft(poll.expiry, now ?? new Date());
  const question = poll.question.text ?? '';
  return (
    <div className={clsx(styles.pollContainer, className)}>
      <div {...containerProps} className={clsx(styles.container, containerProps?.className)}>
        <div className={styles.header}>
          <Text variant="body-lg/semibold" color="text-strong" className={styles.question} selectable>
            {renderQuestion != null ? renderQuestion(question) : question}
          </Text>
          <Text variant="body-sm/normal" color="text-muted" className={styles.prompt}>
            {multiple ? 'Select one or more answers' : 'Select one answer'}
          </Text>
        </div>
        <div className={styles.answersContainer}>
          {poll.answers.map((answer, index) => {
            const emoji = answer.poll_media.emoji;
            return (
              <div key={answer.answer_id} className={styles.answer}>
                <div className={styles.answerInner}>
                  {renderAnswerStart != null ? (
                    renderAnswerStart(answer, index)
                  ) : emoji != null ? (
                    <PollAnswerEmoji emoji={emoji} />
                  ) : null}
                  <Text variant="body-md/medium" color="text-default" className={styles.label} selectable>
                    {renderAnswerText != null ? renderAnswerText(answer, index) : (answer.poll_media.text ?? '')}
                  </Text>
                  {renderAnswerEnd != null ? renderAnswerEnd(answer, index) : <SelectionIcon multiple={multiple} />}
                </div>
              </div>
            );
          })}
          {afterAnswers}
        </div>
        <div className={styles.bottomBar}>
          <Text variant="body-sm/normal" color="text-muted" className={styles.detailsText}>
            <span>{votes === 1 ? '1 vote' : `${votes} votes`}</span>
            {timeLeft != null ? <span>{timeLeft}</span> : null}
          </Text>
          <Button variant="primary" size="md" text="Vote" disabled />
        </div>
        {children}
      </div>
    </div>
  );
};

MessagePoll.displayName = 'MessagePoll';
