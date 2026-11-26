import { useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Anchor, Clickable, HiddenVisually, Text, Tooltip } from '@discord-mana/components';
import { NitroWheelIcon } from '@discord-mana/icons';
import type { ChatInputType } from '../../chatInputTypes';
import styles from './CharacterCount.module.css';
import upsellStyles from './PremiumUpsell.module.css';

// The Nitro gradient the client defines once at its root for icons filled with `url(#…)`.
let premiumGradientId: string | null = null;
const PremiumGradient = () => {
  const [mount] = useState(() => {
    if (premiumGradientId != null || typeof document === 'undefined') return false;
    premiumGradientId = crypto.randomUUID();
    return true;
  });
  return mount
    ? createPortal(
        <svg
          viewBox="0 0 1 1"
          style={{ position: 'absolute', pointerEvents: 'none', top: -1, left: -1, width: 1, height: 1 }}
          aria-hidden
        >
          <linearGradient id={premiumGradientId!}>
            <stop stopColor="var(--premium-tier-2-purple-for-gradients)" />
            <stop offset="0.502368" stopColor="var(--premium-tier-2-purple-for-gradients-2)" />
            <stop offset="1" stopColor="var(--premium-tier-2-pink-for-gradients)" />
          </linearGradient>
        </svg>,
        document.body,
      )
    : null;
};

PremiumGradient.displayName = 'PremiumGradient';

/** "Send longer messages with Discord Nitro!" under the count for users without Nitro. */
const LongerMessagesUpsell = ({
  className,
  iconOnly,
  onLearnMore,
}: {
  className?: string;
  iconOnly: boolean;
  onLearnMore?: () => void;
}) =>
  iconOnly ? (
    <Clickable className={upsellStyles.iconOnly} onClick={onLearnMore}>
      <Tooltip text="Send longer messages with Discord Nitro!" position="top">
        <NitroWheelIcon size="md" color="currentColor" className={upsellStyles.premium} />
      </Tooltip>
    </Clickable>
  ) : (
    <div className={clsx(upsellStyles.root, className)}>
      <PremiumGradient />
      <NitroWheelIcon size="md" className={upsellStyles.premium} color={`url(#${premiumGradientId ?? ''})`} />
      <Text className={upsellStyles.text} variant="body-sm/normal">
        Send longer messages with <Anchor onClick={onLearnMore}>Discord Nitro!</Anchor>
      </Text>
    </div>
  );

LongerMessagesUpsell.displayName = 'LongerMessagesUpsell';

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
  /** "Learn more" in the Nitro upsell. */
  onPremiumUpsellClick?: () => void;
}

/** The remaining characters in the corner of the chat bar, shown near the limit. */
export const CharacterCount = ({ className, onPremiumUpsellClick, ...options }: CharacterCountProps) => {
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
      {type.upsellLongMessages != null && !canUseIncreasedMessageLength && !hidden ? (
        <LongerMessagesUpsell
          className={styles.upsell}
          iconOnly={type.upsellLongMessages.iconOnly}
          onLearnMore={onPremiumUpsellClick}
        />
      ) : null}
    </div>
  );
};

CharacterCount.displayName = 'CharacterCount';
