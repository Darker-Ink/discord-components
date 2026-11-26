import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ClockIcon, TimerIcon } from '@discord-components/icons';
import { HiddenVisually } from '../HiddenVisually';
import { useStableCallback } from '../hooks';
import { useManaContext } from '../ManaContext';
import { Text } from '../Text';
import styles from './Countdown.module.css';

export type CountdownAppearance = 'timer' | 'days-left';
export type CountdownSize = 'md' | 'sm';
export type CountdownVariant = 'overlay-secondary' | 'overlay-primary';

interface CountdownBaseProps {
  endsAt: Date;
  // `md` for large promotions, `sm` to sit next to a Badge.
  size?: CountdownSize;
  variant: CountdownVariant;
  // Hide it when a clock or timer icon is already beside the countdown.
  showIcon?: boolean;
  // Called once when the countdown reaches zero.
  onEnd?: () => void;
}

export interface CountdownTimerProps extends CountdownBaseProps {
  appearance: 'timer';
  // Splits days out of the hours, for offers longer than a day.
  showDays?: boolean;
  showSeconds?: boolean;
}

export interface CountdownDaysLeftProps extends CountdownBaseProps {
  appearance: 'days-left';
}

export type CountdownProps = CountdownTimerProps | CountdownDaysLeftProps;

type TimeUnit = 'day' | 'hour' | 'minute' | 'second';

interface TimePart {
  unit: TimeUnit;
  value: number;
}

const SECONDS: Record<TimeUnit, number> = { day: 86400, hour: 3600, minute: 60, second: 1 };

const VARIANT_CLASS_NAMES: Record<CountdownVariant, string> = {
  'overlay-secondary': styles.overlaySecondary,
  'overlay-primary': styles.overlayPrimary,
};

const TEXT_VARIANTS = { md: 'body-sm/semibold', sm: 'body-xs/semibold' } as const;
const ICON_SIZES = { md: 'xs', sm: 'xxs' } as const;
const ICONS = { timer: TimerIcon, 'days-left': ClockIcon };

const splitSeconds = (seconds: number, units: TimeUnit[]): TimePart[] => {
  let remaining = seconds;
  return units.map((unit) => {
    const value = Math.floor(remaining / SECONDS[unit]);
    remaining -= value * SECONDS[unit];
    return { unit, value };
  });
};

// Days and hours while more than a day is left (a single day reads as 24 hours), then the largest
// unit that isn't zero.
const getDaysLeftParts = (seconds: number) => {
  if (seconds >= SECONDS.day) {
    const [days, hours] = splitSeconds(seconds, ['day', 'hour']);
    return days.value === 1 && hours.value === 0 ? [{ unit: 'hour' as const, value: 24 }] : [days, hours];
  }
  const unit = seconds >= SECONDS.hour || seconds <= 0 ? 'hour' : seconds >= SECONDS.minute ? 'minute' : 'second';
  return splitSeconds(seconds, [unit]);
};

// Screen readers hear only the units that aren't zero (or the last one), and seconds only in the
// final minute.
const getSpokenTimerParts = (seconds: number, units: TimeUnit[]) => {
  if (units.includes('second') && seconds < SECONDS.minute) return splitSeconds(seconds, ['second']);
  const parts = splitSeconds(
    seconds,
    units.filter((unit) => unit !== 'second'),
  );
  const nonZero = parts.filter((part) => part.value > 0);
  return nonZero.length > 0 ? nonZero : parts.slice(-1);
};

const getParts = (appearance: CountdownAppearance, seconds: number, showDays: boolean, showSeconds: boolean) => {
  if (appearance === 'days-left') {
    const parts = getDaysLeftParts(seconds);
    return { visibleParts: parts, spokenParts: parts };
  }
  const inLastMinute = seconds > 0 && seconds < SECONDS.minute;
  const units: TimeUnit[] = [
    ...(showDays ? (['day'] as const) : []),
    'hour',
    'minute',
    ...(showSeconds || inLastMinute ? (['second'] as const) : []),
  ];
  return { visibleParts: splitSeconds(seconds, units), spokenParts: getSpokenTimerParts(seconds, units) };
};

// Seconds left until `endsAt`, ticking on each whole second, and `onEnd` once it reaches zero.
const useSecondsLeft = (endsAt: Date, onEnd: (() => void) | undefined) => {
  const end = endsAt.getTime();
  const [now, setNow] = useState(() => Date.now());
  useLayoutEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const remaining = end - current;
      if (remaining > 0) {
        const untilNextSecond = remaining % 1000;
        timeout = setTimeout(tick, untilNextSecond === 0 ? 1000 : untilNextSecond);
      }
    };
    tick();
    return () => clearTimeout(timeout);
  }, [end]);
  const secondsLeft = Math.max(0, Math.ceil((end - now) / 1000));
  const handleEnd = useStableCallback(() => onEnd?.());
  const ended = useRef(false);
  useEffect(() => {
    if (end > Date.now()) ended.current = false;
  }, [end]);
  useEffect(() => {
    if (secondsLeft !== 0 || ended.current) return;
    ended.current = true;
    handleEnd();
  }, [secondsLeft, handleEnd]);
  return secondsLeft;
};

const formatParts = (parts: TimePart[], locale: string, unitDisplay: 'long' | 'narrow') => {
  const formatted = parts.map((part) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: part.unit, unitDisplay }).format(part.value),
  );
  return new Intl.ListFormat(locale, { style: unitDisplay, type: 'unit' }).format(formatted);
};

const TimerDigits = ({ parts, locale, size }: { parts: TimePart[]; locale: string; size: CountdownSize }) => {
  const format = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  return (
    <Text tag="span" variant={TEXT_VARIANTS[size]} color="none" tabularNumbers className={styles.digits}>
      {parts.map(({ unit, value }, index) => (
        <Fragment key={unit}>
          {index === 0 ? null : <span className={styles.separator} />}
          {format.format(value)}
        </Fragment>
      ))}
    </Text>
  );
};

TimerDigits.displayName = 'TimerDigits';

export const Countdown = (props: CountdownProps) => {
  const { endsAt, appearance, showIcon = true, size = 'sm', variant, onEnd } = props;
  const showDays = props.appearance === 'timer' ? (props.showDays ?? false) : false;
  const showSeconds = props.appearance === 'timer' ? (props.showSeconds ?? false) : false;
  const { locale, i18n } = useManaContext();
  const secondsLeft = useSecondsLeft(endsAt, onEnd);
  const { visibleParts, spokenParts } = getParts(appearance, secondsLeft, showDays, showSeconds);
  const spoken = i18n.GLOBAL_BANNER_COUNTDOWN_TIME_LEFT(formatParts(spokenParts, locale, 'long'));
  const Icon = ICONS[appearance];
  return (
    <span role="timer" data-countdown-appearance={appearance} className={styles.countdown}>
      <HiddenVisually>{spoken}</HiddenVisually>
      <span
        aria-hidden
        className={clsx(styles.pill, styles[size], VARIANT_CLASS_NAMES[variant], !showIcon && styles.withoutIcon)}
      >
        {showIcon ? <Icon size={ICON_SIZES[size]} color="currentColor" className={styles.icon} /> : null}
        {appearance === 'timer' ? (
          <TimerDigits parts={visibleParts} locale={locale} size={size} />
        ) : (
          <Text tag="span" variant={TEXT_VARIANTS[size]} color="none" tabularNumbers>
            {i18n.GLOBAL_BANNER_COUNTDOWN_TIME_LEFT(formatParts(visibleParts, locale, 'narrow'))}
          </Text>
        )}
      </span>
    </span>
  );
};

Countdown.displayName = 'Countdown';
