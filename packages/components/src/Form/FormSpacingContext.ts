import { createContext } from 'react';
import type { StackSpace } from '../Stack';

/** Gap between the fields of a `Form` or `FieldSet`. */
export const FormSpacingContext = createContext<{ spacing: StackSpace }>({ spacing: 24 });

FormSpacingContext.displayName = 'FormSpacingContext';
