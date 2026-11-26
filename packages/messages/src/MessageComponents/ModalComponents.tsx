import type { ReactNode } from 'react';
import type {
  CheckboxComponent,
  CheckboxGroupComponent,
  FileUploadComponent,
  LabelComponent,
  MessageComponent,
  RadioGroupComponent,
  TextInputComponent,
} from './types';

export const TextInput = (_component: TextInputComponent) => null;
export const Label = (
  _component: LabelComponent & {
    renderComponent: (component: MessageComponent, key?: string, location?: 'label-child') => ReactNode;
  },
) => null;
export const FileUpload = (_component: FileUploadComponent) => null;
export const RadioGroup = (_component: RadioGroupComponent) => null;
export const CheckboxGroup = (_component: CheckboxGroupComponent) => null;
export const Checkbox = (_component: CheckboxComponent & { location?: 'label-child' }) => null;
