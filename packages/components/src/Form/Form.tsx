import { useContext, type FormHTMLAttributes, type Ref } from 'react';
import { Stack } from '../Stack';
import { FormSpacingContext } from './FormSpacingContext';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  ref?: Ref<HTMLFormElement>;
}

export const Form = ({ children, ...props }: FormProps) => {
  const { spacing } = useContext(FormSpacingContext);
  return (
    <form {...props}>
      <Stack direction="vertical" gap={spacing}>
        {children}
      </Stack>
    </form>
  );
};

Form.displayName = 'Form';
