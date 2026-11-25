import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

export interface FieldContextValue {
  labelId: string | undefined;
  controlId: string;
  describedById: string | undefined;
  errorMessageId: string | undefined;
  helperTextId: string | undefined;
  descriptionId: string | undefined;
  trailingAuxiliaryContentId: string | undefined;
  isLabelHovered: boolean;
  setIsLabelHovered: Dispatch<SetStateAction<boolean>>;
}

/** Ids and label hover state a `Field` shares with the control inside it. */
export const FieldContext = createContext<FieldContextValue | undefined>(undefined);

FieldContext.displayName = 'FieldContext';

export const useFieldContext = () => useContext(FieldContext);
