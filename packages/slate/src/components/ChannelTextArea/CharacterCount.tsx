import clsx from 'clsx';
import { HiddenVisually, Text, Tooltip } from '@discord-mana/components';
import { NitroWheelIcon } from '@discord-mana/icons';
import type { ChatInputType } from '../../chatInputTypes';
import styles from './CharacterCount.module.css';

/** Messages longer than this are a Nitro perk (the default limit without it is 2000). */
export const NON_PREMIUM_MAX_MESSAGE_LENGTH = 2000;

export interface CharacterCountVisibilityOptions {
  type: ChatInputType;
  textValue: string;
  maxCharacterCount: number;
  showRemainingCharsAfterCount?: number;
  /** Whether the user has Nitro's longer messages. */
  canUseIncreasedMessageLength?: boolean;
}

export const getCharacterCountVisibility = ({
  type,
  textValue,
  maxCharacterCount,
  showRemainingCharsAfterCount,
  canUseIncreasedMessageLength = false,
}: CharacterCountVisibilityOptions) => {
  const length = textValue.length;
  const premiumFlair =
    type.upsellLongMessages != null && length > NON_PREMIUM_MAX_MESSAGE_LENGTH && canUseIncreasedMessageLength;
  const upsell = type.upsellLongMessages != null && !canUseIncreasedMessageLength;
  const remaining = maxCharacterCount - length;
  const hidden = remaining > (showRemainingCharsAfterCount ?? maxCharacterCount / 10);
  return { isVisible: (premiumFlair && remaining >= 0) || !hidden, showsUpsell: upsell && !hidden };
};

export interface CharacterCountProps extends CharacterCountVisibilityOptions {
  className?: string;
}

/** The remaining characters in the corner of the chat bar, shown near the limit. */
export const CharacterCount = ({ className, ...options }: CharacterCountProps) => {
  const {
    type,
    textValue,
    maxCharacterCount,
    showRemainingCharsAfterCount,
    canUseIncreasedMessageLength = false,
  } = options;
  const threshold = showRemainingCharsAfterCount ?? maxCharacterCount / 10;
  const length = textValue.length;
  const premiumFlair =
    type.upsellLongMessages != null && length > NON_PREMIUM_MAX_MESSAGE_LENGTH && canUseIncreasedMessageLength;
  const remaining = maxCharacterCount - length;
  const hidden = remaining > threshold;
  const label =
    remaining === 0
      ? 'Message is at max length'
      : remaining > 0
        ? `${remaining} characters remaining`
        : 'Message is too long';
  const { isVisible } = getCharacterCountVisibility(options);
  if (!isVisible) return null;
  const withinLimit = remaining >= 0;
  return (
    <div className={clsx(className, styles.characterCount)}>
      <div className={styles.flairContainer}>
        {premiumFlair && withinLimit ? (
          <Tooltip text={`Nitro is powering you with ${maxCharacterCount} characters per message!`} position="top">
            <NitroWheelIcon size="md" color="currentColor" className={styles.premiumFlair} />
          </Tooltip>
        ) : null}
        {hidden ? null : (
          <Tooltip text={label} position="top">
            <Text
              variant="body-sm/semibold"
              tabularNumbers
              aria-hidden
              color={withinLimit ? 'text-default' : 'text-feedback-critical'}
            >
              {remaining}
            </Text>
          </Tooltip>
        )}
      </div>
      <HiddenVisually aria-live="polite">{`${remaining} characters remaining`}</HiddenVisually>
    </div>
  );
};

CharacterCount.displayName = 'CharacterCount';
