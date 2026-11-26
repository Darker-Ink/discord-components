import moment, { type Moment } from 'moment';

// `<t:unix:format>` timestamps, formatted like the client: its long date formats (`L`, `LLL`…) map onto
// Intl.DateTimeFormat styles in the app's locale, and relative times are moment's, counting seconds up to a
// minute and minutes up to an hour.

const formatters = new Map<string, Intl.DateTimeFormat['format']>();

const intlFormat = (
  locale: string,
  dateStyle: Intl.DateTimeFormatOptions['dateStyle'],
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle'],
) => {
  const key = `${locale}:${dateStyle}:${timeStyle}`;
  let format = formatters.get(key);
  if (format == null) {
    const options = { dateStyle, timeStyle };
    try {
      format = Intl.DateTimeFormat(locale, options).format;
    } catch {
      format = Intl.DateTimeFormat(undefined, options).format;
    }
    formatters.set(key, format);
  }
  return format;
};

const relative = (date: Moment) => {
  const seconds = moment.relativeTimeThreshold('s') as number;
  moment.relativeTimeThreshold('s', 60);
  const secondsWithNumber = moment.relativeTimeThreshold('ss') as number;
  moment.relativeTimeThreshold('ss', -1);
  const minutes = moment.relativeTimeThreshold('m') as number;
  moment.relativeTimeThreshold('m', 60);
  let result: string | null = null;
  try {
    result = moment(date.toDate()).fromNow();
  } catch {
    // Falls back to the default thresholds below.
  }
  moment.relativeTimeThreshold('s', seconds);
  moment.relativeTimeThreshold('ss', secondsWithNumber);
  moment.relativeTimeThreshold('m', minutes);
  return result ?? moment(date.toDate()).fromNow();
};

type Formatter = (date: Moment, locale?: string) => string;

export const DEFAULT_LOCALE = 'en-US';

export const TIMESTAMP_FORMATS: Record<string, Formatter> = Object.assign(Object.create(null), {
  t: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, undefined, 'short')(date.toDate()),
  T: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, undefined, 'medium')(date.toDate()),
  d: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'short')(date.toDate()),
  D: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'long')(date.toDate()),
  f: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'long', 'short')(date.toDate()),
  F: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'full', 'short')(date.toDate()),
  s: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'short', 'short')(date.toDate()),
  S: (date: Moment, locale = DEFAULT_LOCALE) => intlFormat(locale, 'short', 'medium')(date.toDate()),
  R: (date: Moment) => relative(date),
});

export type TimestampFormat = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 's' | 'S' | 'R';

export const TIMESTAMP_RE = new RegExp(`^<t:(-?\\d{1,17})(?::(${Object.keys(TIMESTAMP_FORMATS).join('|')}))?>`);

export interface ParsedTimestamp {
  timestamp: string;
  format: string | undefined;
  parsed: Moment;
  /** The full date for the tooltip (`F`). */
  full: string;
  formatted: string;
}

export const parseTimestamp = (
  timestamp: string,
  format: string | undefined,
  locale: string = DEFAULT_LOCALE,
): ParsedTimestamp | null => {
  const parsed = moment(Number(timestamp) * 1000);
  if (!parsed.isValid()) return null;
  let formatter = format != null ? TIMESTAMP_FORMATS[format] : undefined;
  if (formatter == null) formatter = TIMESTAMP_FORMATS.f;
  return { timestamp, format, parsed, full: TIMESTAMP_FORMATS.F(parsed, locale), formatted: formatter(parsed, locale) };
};

export const timestampMarkdown = (timestamp: string, format?: TimestampFormat) =>
  format != null ? `<t:${timestamp}:${format}>` : `<t:${timestamp}>`;
