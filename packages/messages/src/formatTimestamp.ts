import type { EmbedI18n } from './Embed/embedI18n';

const DAY = 864e5;

// Day number in local time, so "today" flips at local midnight.
const localDay = (date: Date) => Math.floor((date.getTime() - 6e4 * date.getTimezoneOffset()) / DAY);

const formatters = new Map<string, Intl.DateTimeFormat['format']>();

const getFormatter = (locale: string, options: Intl.DateTimeFormatOptions) => {
  const key = `${locale}:${options.dateStyle}:${options.timeStyle}`;
  let format = formatters.get(key);
  if (format == null) {
    try {
      format = new Intl.DateTimeFormat(locale, options).format;
    } catch {
      format = new Intl.DateTimeFormat(undefined, options).format;
    }
    formatters.set(key, format);
  }
  return format;
};

/** The client's long-format tokens (`L`, `LT`, `L LT`) map onto Intl date/time styles. */
export const formatDate = (date: Date, format: 'L' | 'LT' | 'L LT', locale: string) => {
  const options: Intl.DateTimeFormatOptions =
    format === 'L'
      ? { dateStyle: 'short' }
      : format === 'LT'
        ? { timeStyle: 'short' }
        : { dateStyle: 'short', timeStyle: 'short' };
  return getFormatter(locale, options)(date);
};

/**
 * Formats a timestamp like the client's calendar format (embed footers, message timestamps):
 * "Today at 4:20 PM", "Yesterday at …", "Tomorrow at …", otherwise the short date (and time if past).
 */
export const formatCalendarTimestamp = (
  date: Date,
  i18n: Pick<EmbedI18n, 'CALENDAR_TODAY_AT' | 'CALENDAR_YESTERDAY_AT' | 'CALENDAR_TOMORROW_AT'>,
  locale: string,
  timeOnlyToday = false,
  now: Date = new Date(),
) => {
  const days = localDay(date) - localDay(now);
  if (days < -1) return formatDate(date, 'L LT', locale);
  const time = () => formatDate(date, 'LT', locale);
  if (days < 0) return i18n.CALENDAR_YESTERDAY_AT(time());
  if (days < 1) return timeOnlyToday ? time() : i18n.CALENDAR_TODAY_AT(time());
  if (days < 2) return i18n.CALENDAR_TOMORROW_AT(time());
  return formatDate(date, 'L', locale);
};
