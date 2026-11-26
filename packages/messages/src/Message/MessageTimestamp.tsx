import { memo, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { Tooltip, useManaContext } from '@discord-components/components';
import { formatCalendarTimestamp, formatDate } from '../formatTimestamp';
import { useMessageI18n } from './messageI18n';
import styles from './Message.module.css';

const longFormatters = new Map<string, Intl.DateTimeFormat>();

/** The client's `LLLL` format ("Thursday, November 26, 2026 at 12:00 PM"). */
export const formatLongTimestamp = (date: Date, locale: string) => {
  let formatter = longFormatters.get(locale);
  if (formatter == null) {
    try {
      formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' });
    } catch {
      formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });
    }
    longFormatters.set(locale, formatter);
  }
  return formatter.format(date);
};

// Compact timestamps get a width class so they line up: "4:20 PM" vs "12:00 PM" vs 24h and Asian locales.
const getCompactWidthClass = (formatted: string) =>
  /(AM|PM)$/.test(formatted)
    ? styles.latin24CompactTimeStamp
    : formatted.length <= 5
      ? styles.latin12CompactTimeStamp
      : styles.asianCompactTimeStamp;

export interface MessageTimestampProps {
  /** ISO 8601 timestamp or Date. */
  timestamp: string | Date;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  isVisibleOnlyOnHover?: boolean;
  cozyAlt?: boolean;
  isInline?: boolean;
  id?: string;
  isEdited?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/** A message's time, with the full date in a tooltip ("— 4:20 PM" in cozy headers, "(edited)" after edits). */
export const MessageTimestamp = memo(
  ({
    children,
    className,
    compact = false,
    timestamp,
    isVisibleOnlyOnHover = false,
    cozyAlt = false,
    isInline = true,
    id,
    isEdited: _isEdited = false,
    tooltipPosition,
  }: MessageTimestampProps) => {
    const { locale } = useManaContext();
    const i18n = useMessageI18n();
    const date = useMemo(() => new Date(timestamp), [timestamp]);
    const long = useMemo(() => formatLongTimestamp(date, locale), [date, locale]);
    const formatted = useMemo(
      () => (compact ? formatDate(date, 'LT', locale) : formatCalendarTimestamp(date, i18n, locale, true)),
      [date, compact, locale, i18n],
    );
    const widthClass = useMemo(() => (compact ? getCompactWidthClass(formatted) : null), [compact, formatted]);
    return (
      <span
        className={clsx(className, widthClass, {
          [styles.timestamp]: true,
          [styles.timestampVisibleOnHover]: isVisibleOnlyOnHover,
          [styles.timestampInline]: isInline,
          [styles.alt]: cozyAlt,
        })}
      >
        <Tooltip asContainer __unsupportedReactNodeAsText={long} position={tooltipPosition} delay={750}>
          <time id={id} dateTime={date.toISOString()}>
            {children ?? (
              <>
                <i className={styles.separator} aria-hidden>
                  {compact ? '[' : ' — '}
                </i>
                {formatted}
                {compact && (
                  <i className={styles.separator} aria-hidden>
                    {']'}{' '}
                  </i>
                )}
              </>
            )}
          </time>
        </Tooltip>
      </span>
    );
  },
);

MessageTimestamp.displayName = 'MessageTimestamp';
