import { useMemo, useState, type ReactNode } from 'react';
import { useManaContext } from '../ManaContext';

export type InputValidateOn = 'change' | 'blur' | 'submit';

export interface UseInputValidationOptions {
  validateOn?: InputValidateOn | string;
  /** An error to show as is; `null` or `''` turns validation off. */
  error?: ReactNode | null;
  value?: string | null;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Validate before the first change. */
  defaultDirty?: boolean;
}

/** Length and range validation for text inputs, once the value has changed (or right away with `defaultDirty`). */
export const useInputValidation = ({
  validateOn,
  error,
  value,
  minLength,
  maxLength,
  min,
  max,
  defaultDirty,
}: UseInputValidationOptions) => {
  const { i18n } = useManaContext();
  const [shouldValidate, setShouldValidate] = useState(defaultDirty);
  const errorMessage = useMemo((): ReactNode => {
    if (validateOn !== 'change') return null;
    if (error === null || error === '') return null;
    if (error != null) return error;
    if (!shouldValidate) return null;
    if (minLength != null && (value?.length ?? 0) < minLength) return i18n.MINIMUM_LENGTH_ERROR(minLength);
    if (maxLength != null && (value?.length ?? 0) > maxLength) return i18n.MAXIMUM_LENGTH_ERROR(maxLength);
    const number = value != null && value !== '' ? Number(value) : undefined;
    if (number != null && Number.isFinite(number)) {
      if (min != null && number < min) return i18n.MINIMUM_VALUE_ERROR(min);
      if (max != null && number > max) return i18n.MAXIMUM_VALUE_ERROR(max);
    }
    return null;
  }, [validateOn, error, shouldValidate, minLength, value, maxLength, min, max, i18n]);
  const hasError = (error != null && error !== '') || errorMessage != null;
  return { errorMessage, hasError, setShouldValidate };
};
