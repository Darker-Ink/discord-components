import { useState, type KeyboardEvent } from 'react';
import moment, { type Moment } from 'moment';
import type { ListboxOption } from '../Listbox';
import { SearchableSelect, type SearchableSelectProps } from '../SearchableSelect';

const LEADING_ZEROS = /^[0]+/;
const ZERO_MINUTES = /:00/;
const AM = /(AM|ΠΜ|सुबह)/i;
const PM = /(PM|ΜΜ|शाम)/i;
const WHITESPACE = /\s+/;

const normalizeAM = (value: string) =>
  value.replace(LEADING_ZEROS, '').replace(ZERO_MINUTES, '').replace(AM, '').replace(WHITESPACE, '');

const normalizePM = (value: string) => value.replace(LEADING_ZEROS, '').replace(PM, '').replace(WHITESPACE, '');

const LABEL_FORMAT = 'LT';

// Reads a typed time ("3:30 pm", "15.30") on the given day.
const parseTime = (day: Moment | null | undefined, text: string) => {
  const query = text.toUpperCase().trim();
  if (query.length === 0) return undefined;
  for (const format of [LABEL_FORMAT, 'H:mm', 'H.mm']) {
    const parsed = moment(`${day?.format('YYYY-MM-DD')} ${query}`, `YYYY-MM-DD ${format}`);
    if (normalizeAM(parsed.format(format)) === normalizeAM(query)) return parsed;
  }
  return undefined;
};

const REFERENCE_DAY = moment('2021-04-12T00:00:00');

const withTimeOf = (day: Moment, time: Moment) => day.clone().hours(time.hour()).minutes(time.minutes()).seconds(0);

interface TimeOption extends ListboxOption<Moment> {
  id: string;
  label: string;
  value: Moment;
}

const byTime = (a: TimeOption, b: TimeOption) => a.value.unix() - b.value.unix();

// The day's times every `intervalInMinutes`, plus times the user typed that aren't on the grid.
class TimeOptions {
  intervalInMinutes: number;
  labelFormat: string;
  options: TimeOption[] = [];
  private index: Record<number, Moment> = {};

  constructor({
    intervalInMinutes = 15,
    labelFormat = LABEL_FORMAT,
  }: { intervalInMinutes?: number; labelFormat?: string } = {}) {
    if (intervalInMinutes <= 0) throw Error(`intervalInMinutes should be positive number, got ${intervalInMinutes}`);
    this.intervalInMinutes = intervalInMinutes;
    this.labelFormat = labelFormat;
    this.generateTimeOptions();
  }

  lookupByValue(value: Moment | null | undefined) {
    if (value == null) return undefined;
    return this.index[withTimeOf(REFERENCE_DAY, value).unix()];
  }

  private createLabel(time: Moment) {
    return time.locale(moment.locale()).format(this.labelFormat);
  }

  private generateTimeOptions() {
    this.options = [];
    this.index = {};
    const start = moment(REFERENCE_DAY);
    const end = moment(start).add(1, 'day');
    const time = moment(start);
    while (time < end) {
      const option = this.createOption(time.clone());
      this.options.push(option);
      this.index[option.value.unix()] = option.value;
      time.add(this.intervalInMinutes, 'minutes');
    }
  }

  private createOption(time: Moment): TimeOption {
    const value = withTimeOf(REFERENCE_DAY, time);
    return { id: value.toISOString(), label: this.createLabel(value), value };
  }

  private addOption(time: Moment) {
    const value = withTimeOf(REFERENCE_DAY, time);
    this.index[value.unix()] = value;
    this.options.push({ id: value.toISOString(), label: this.createLabel(value), value });
    this.options.sort(byTime);
    return time;
  }

  private guessOptions(query: string) {
    const guesses: Moment[] = [];
    if (/[:\\.]/.test(query)) {
      const parsed = parseTime(REFERENCE_DAY, query);
      if (parsed != null) {
        guesses.push(parsed.clone());
        const afternoon = parsed.add({ hours: 12 });
        if (
          afternoon.isBefore(REFERENCE_DAY.clone().add({ hours: 24 })) &&
          normalizePM(afternoon.format('LT')) === normalizePM(query)
        ) {
          guesses.push(afternoon);
        }
      }
    }
    return guesses;
  }

  getOptions(query: string) {
    const guesses = this.guessOptions(query);
    if (!(guesses.length > 0)) return this.options;
    const options = [...this.options];
    guesses.forEach((guess) => {
      if (this.lookupByValue(guess) == null) options.push(this.createOption(guess));
    });
    options.sort(byTime);
    return options;
  }

  selectValue(value: Moment) {
    const existing = this.lookupByValue(value);
    return existing == null ? this.addOption(value) : existing;
  }
}

export type TimeInputProps = Omit<
  SearchableSelectProps<TimeOption>,
  'selectionMode' | 'options' | 'value' | 'onSelectionChange' | 'disabled' | 'onQueryChange' | 'onKeyDown' | 'onBlur'
> & {
  /** The date and time; picking a time keeps its date. */
  value?: Moment | null;
  onChange: (value: Moment) => void;
  hideValue?: boolean;
  disabled?: boolean;
};

/** Picks a time of day from a searchable list in 15-minute steps, or from what the user types. */
export const TimeInput = ({ value, onChange, hideValue, disabled = false, ...props }: TimeInputProps) => {
  const [timeOptions] = useState(() => new TimeOptions());
  const [query, setQuery] = useState('');
  const select = (time: Moment | null | undefined) => {
    if (value != null && time != null) onChange(withTimeOf(value, timeOptions.selectValue(time)));
  };
  const selectTypedTime = () => {
    const parsed = parseTime(value, query);
    if (parsed != null) select(parsed);
  };
  return (
    <SearchableSelect<TimeOption>
      {...props}
      selectionMode="single"
      options={timeOptions.getOptions(query)}
      value={hideValue ? undefined : timeOptions.lookupByValue(value)}
      onSelectionChange={select}
      disabled={disabled}
      onQueryChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') selectTypedTime();
      }}
      onBlur={selectTypedTime}
    />
  );
};

TimeInput.displayName = 'TimeInput';
