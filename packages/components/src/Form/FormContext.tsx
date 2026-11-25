import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

// Shared with Discord's older form items (a title and error around a control). Mana inputs read it to
// label themselves and report focus and value back to the form item.
export interface FormContextValue {
  titleId: string | undefined;
  errorId: string | undefined;
  error: ReactNode | undefined;
  isFocused: boolean | undefined;
  setIsFocused: Dispatch<SetStateAction<boolean>> | ((isFocused: boolean) => void);
  hasValue: boolean | undefined;
  setHasValue: Dispatch<SetStateAction<boolean>> | ((hasValue: boolean) => void);
}

const noop = () => {};

export const FormContext = createContext<FormContextValue>({
  titleId: undefined,
  errorId: undefined,
  error: undefined,
  isFocused: undefined,
  setIsFocused: noop,
  hasValue: undefined,
  setHasValue: noop,
});

FormContext.displayName = 'FormContext';

export interface FormContextProviderProps extends FormContextValue {
  children?: ReactNode;
}

export const FormContextProvider = ({ children, ...value }: FormContextProviderProps) => (
  <FormContext.Provider value={value}>{children}</FormContext.Provider>
);

FormContextProvider.displayName = 'FormContextProvider';

export const useFormContext = () => useContext(FormContext);
