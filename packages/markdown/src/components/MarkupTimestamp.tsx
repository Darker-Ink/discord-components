import { useEffect, useState } from 'react';
import clsx from 'clsx';
import moment, { type Moment } from 'moment';
import { Tooltip } from '@discord-mana/components';
import { markupStyles } from '@discord-mana/messages';
import { TIMESTAMP_FORMATS, type ParsedTimestamp } from '../timestamp';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// How often a relative timestamp refreshes, by how far away it is.
const REFRESH_INTERVALS: [within: number, every: number][] = [
  [2 * MINUTE, SECOND],
  [5 * MINUTE, MINUTE],
  [45 * MINUTE, 2 * MINUTE],
  [21 * HOUR, 5 * MINUTE],
];

const refreshInterval = (date: Moment, now: Moment = moment()) => {
  const distance = Math.abs(date.diff(now));
  for (const [within, every] of REFRESH_INTERVALS) if (distance < within) return every;
  return 2 * HOUR;
};

/** The text of a timestamp; relative ones (`R`) keep counting. */
export const useTimestampText = (node: Pick<ParsedTimestamp, 'format' | 'parsed' | 'formatted'>) => {
  const [relative, setRelative] = useState<{ parsed: Moment; formatted: string } | null>(null);
  useEffect(() => {
    if (node.format !== 'R') return;
    const timer = setInterval(
      () => setRelative({ parsed: node.parsed, formatted: TIMESTAMP_FORMATS.R(node.parsed) }),
      refreshInterval(node.parsed),
    );
    return () => clearInterval(timer);
  }, [node.format, node.parsed]);
  if (node.format !== 'R') return node.formatted;
  return relative != null && relative.parsed === node.parsed ? relative.formatted : TIMESTAMP_FORMATS.R(node.parsed);
};

export interface MarkupTimestampProps {
  node: Pick<ParsedTimestamp, 'format' | 'parsed' | 'formatted' | 'full'>;
  /** Shows the full date on hover. */
  showTooltip?: boolean;
  className?: string;
}

/** A `<t:…>` timestamp, in the reader's time zone, with the full date in a tooltip. */
export const MarkupTimestamp = ({ node, showTooltip = true, className }: MarkupTimestampProps) => {
  const text = useTimestampText(node);
  const timestamp = <span className={clsx(markupStyles.timestamp, className)}>{text}</span>;
  if (showTooltip !== true) return timestamp;
  return (
    <Tooltip __unsupportedReactNodeAsText={node.full} ariaHidden>
      {timestamp}
    </Tooltip>
  );
};

MarkupTimestamp.displayName = 'MarkupTimestamp';
