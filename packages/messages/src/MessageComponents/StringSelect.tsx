import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  VoidVariableSelect,
  selectMultiToggle,
  selectSingle,
  selectSingleToggle,
  useVariableSelect,
} from '@discord-components/components';
import { Emoji } from '../Emoji/Emoji';
import { useMessageI18n } from '../Message/messageI18n';
import { ComponentStatusLine, errorStatus } from './ComponentStatus';
import { ComponentVisualState, isSelectOptional, useComponentContext, useComponentState } from './ComponentState';
import { ComponentType, type ComponentEmoji, type StringSelectComponent, type StringSelectOption } from './types';
import styles from './StringSelect.module.css';

type SelectOption = StringSelectOption & { disabled?: boolean };

const OptionLabel = ({
  emoji,
  label,
  description,
  isDisabled,
  isOffset,
}: {
  emoji?: ComponentEmoji;
  label: string;
  description?: string;
  isDisabled: boolean;
  isOffset: boolean;
}) => (
  <div className={styles.option}>
    {emoji != null ? (
      <Emoji className={styles.emoji} emojiId={emoji.id} emojiName={emoji.name} animated={emoji.animated} />
    ) : null}
    <div
      className={clsx(styles.labelContainer, {
        [styles.disabled]: isDisabled,
        [styles.offset]: emoji == null && isOffset,
      })}
    >
      <strong className={styles.label}>{label}</strong>
      {description != null ? <span className={styles.description}>{description}</span> : null}
    </div>
  </div>
);

OptionLabel.displayName = 'OptionLabel';

const SingleValue = ({ emoji, label }: { emoji?: ComponentEmoji; label: string }) => (
  <div className={styles.option}>
    <div className={clsx(styles.value, styles.singleValue)}>
      {emoji != null ? (
        <Emoji
          className={styles.emoji}
          src={emoji.src}
          emojiId={emoji.id}
          emojiName={emoji.name}
          animated={emoji.animated}
        />
      ) : null}
      <span className={styles.singleValueLabel}>{label}</span>
    </div>
  </div>
);

SingleValue.displayName = 'SingleValue';

const MultiValue = ({ options }: { options: SelectOption[] }) => (
  <div className={styles.option}>
    <div className={styles.value}>
      {options.map((option, index) => (
        <div key={index} className={styles.optionTag}>
          {option.emoji != null ? (
            <Emoji
              className={styles.smallEmoji}
              src={option.emoji.src}
              emojiId={option.emoji.id}
              emojiName={option.emoji.name}
              animated={option.emoji.animated}
            />
          ) : null}
          <span key={option.value} className={styles.tag}>
            {option.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

MultiValue.displayName = 'MultiValue';

/** A string select: the popout select with the options' emojis and descriptions. */
export const StringSelect = (component: StringSelectComponent) => {
  const { type, options, id, maxValues = 1, disabled } = component;
  const i18n = useMessageI18n();
  const placeholder = component.placeholder ?? i18n.MAKE_A_SELECTION;
  const defaults = useMemo(() => options.filter((option) => option.default).map((option) => option.value), [options]);
  const context = useComponentContext();
  if (context == null) throw new Error('StringSelectActionComponent must be rendered inside a ComponentStateContext');
  const { state, executeStateUpdate, visualState, isDisabled, error } = useComponentState(
    component,
    defaults.length > 0 ? { type, values: defaults } : undefined,
  );
  const inModal = context.modal != null;
  const multi = maxValues > 1;
  const processing = visualState === ComponentVisualState.LOADING;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(
    () => new Set(options.filter((option) => option.default).map((option) => option.value)),
  );
  const [committed, setCommitted] = useState(values);
  const hasEmoji = useMemo(() => options.some((option) => option.emoji != null), [options]);
  // The client resyncs the local selection with the stored state (or the defaults) when either changes.
  useEffect(() => {
    const next = new Set(state?.type === ComponentType.StringSelect ? state.values : defaults);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(next);
    setCommitted(next);
  }, [id, defaults, state]);
  const commit = useCallback(() => {
    if (committed !== values && executeStateUpdate({ type: ComponentType.StringSelect, values: Array.from(values) }))
      setCommitted(values);
  }, [values, committed, executeStateUpdate]);
  // Multi selects commit once the popout closes; single selects right away.
  useEffect(() => {
    if (!open && !(values.size === committed.size && Array.from(committed).every((value) => values.has(value))))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      commit();
  }, [open, values, committed, commit]);
  const optional = isSelectOptional(component, inModal ? 'modal' : 'message');
  const onSelectInteraction = multi ? selectMultiToggle : optional ? selectSingleToggle : selectSingle;
  const selectProps = useVariableSelect({ value: values, onChange: setValues, onSelectInteraction });
  const limitReached = (option: StringSelectOption) => multi && !values.has(option.value) && values.size === maxValues;
  return (
    <Fragment>
      <div className={styles.container}>
        <VoidVariableSelect<string, SelectOption>
          isProcessing={processing}
          isDisabled={disabled || visualState === ComponentVisualState.DISABLED || isDisabled}
          className={clsx(styles.select, { [styles.inModal]: inModal })}
          options={options.map((option) => ({ ...option, disabled: limitReached(option) }))}
          placeholder={placeholder}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          maxVisibleItems={5}
          closeOnSelect={!multi}
          optionClassName={styles.selectOption}
          renderOptionLabel={(option) => (
            <OptionLabel {...option} isDisabled={limitReached(option)} isOffset={hasEmoji} />
          )}
          renderOptionValue={(selected) =>
            multi ? <MultiValue options={selected} /> : <SingleValue {...selected[0]} />
          }
          {...selectProps}
        />
      </div>
      {error == null || inModal ? null : <ComponentStatusLine {...errorStatus(error)} className={styles.error} />}
    </Fragment>
  );
};

StringSelect.displayName = 'StringSelect';
