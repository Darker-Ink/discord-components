import { useLayoutEffect, useRef, useState, type Ref, type TextareaHTMLAttributes } from 'react';
import { FocusRing } from '../FocusRing';

const HIDDEN_TEXTAREA_STYLE = `
  visibility:hidden;
  overflow:hidden;
  position:absolute;
  z-index:-1000;
  top:0;
  right:0;
`;

const SIZING_STYLE = [
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-bottom',
  'font-family',
  'font-weight',
  'font-size',
  'text-transform',
  'width',
  'padding-left',
  'padding-right',
  'border-width',
  'box-sizing',
];

// One off-screen textarea, shared by every autosizing textarea, that copies the sizing styles to measure.
let hiddenTextArea: HTMLTextAreaElement | undefined;

const getHiddenTextArea = () => {
  if (hiddenTextArea == null && document.body != null) {
    hiddenTextArea = document.createElement('textarea');
    document.body.appendChild(hiddenTextArea);
  }
  return hiddenTextArea;
};

const firstTruthy = (...values: string[]) => values.find((value) => value != null && value !== '');

const calculateHeight = (
  element: HTMLTextAreaElement | null,
  rows: number | undefined,
  maxRows: number,
  value: string | undefined,
) => {
  if (element == null) return undefined;
  const text = value ?? element.value;
  const hidden = getHiddenTextArea();
  if (hidden == null) return undefined;
  const computed = window.getComputedStyle(element);
  const boxSizing = firstTruthy(
    computed.getPropertyValue('box-sizing'),
    computed.getPropertyValue('-moz-box-sizing'),
    computed.getPropertyValue('-webkit-box-sizing'),
  );
  const paddingSize =
    parseFloat(computed.getPropertyValue('padding-bottom')) + parseFloat(computed.getPropertyValue('padding-top'));
  const borderSize =
    parseFloat(computed.getPropertyValue('border-bottom-width')) +
    parseFloat(computed.getPropertyValue('border-top-width'));
  const sizingStyle = SIZING_STYLE.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(';');

  hidden.setAttribute('style', `${sizingStyle};${HIDDEN_TEXTAREA_STYLE}`);
  hidden.setAttribute('rows', '1');
  hidden.value = '';
  let minHeight = hidden.scrollHeight;
  hidden.setAttribute('rows', `${maxRows}`);
  hidden.value = '';
  let maxHeight = hidden.scrollHeight;
  if (boxSizing === 'border-box') {
    minHeight += borderSize;
    maxHeight += borderSize;
  } else if (boxSizing === 'content-box') {
    minHeight -= paddingSize;
    maxHeight -= paddingSize;
  }

  hidden.setAttribute('style', `${sizingStyle};${HIDDEN_TEXTAREA_STYLE}`);
  hidden.value = text;
  if (rows != null) hidden.setAttribute('rows', `${rows}`);
  else hidden.removeAttribute('rows');
  let height = Math.ceil(hidden.scrollHeight + 1);
  if (boxSizing === 'border-box') height += borderSize;
  else if (boxSizing === 'content-box') height -= paddingSize;
  return Math.max(minHeight, Math.min(height, maxHeight));
};

export interface TextAreaAutosizeProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

/** A textarea that grows with its content, from `rows` up to `maxRows`. */
export const TextAreaAutosize = ({
  style,
  autoFocus = false,
  disabled = false,
  autoCorrect = 'off',
  maxRows = 15,
  ref,
  ...props
}: TextAreaAutosizeProps) => {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const value = props.value as string | undefined;
  const [height, setHeight] = useState(() => calculateHeight(elementRef.current, props.rows, maxRows, value));
  useLayoutEffect(() => {
    setHeight(calculateHeight(elementRef.current, props.rows, maxRows, value));
  }, [props.rows, maxRows, value]);
  return (
    <FocusRing>
      <textarea
        {...props}
        ref={(element) => {
          elementRef.current = element;
          if (typeof ref === 'function') ref(element);
          else if (ref != null) ref.current = element;
        }}
        style={{ ...style, height }}
        autoFocus={autoFocus}
        disabled={disabled}
        autoCorrect={autoCorrect}
      />
    </FocusRing>
  );
};

TextAreaAutosize.displayName = 'TextAreaAutosize';
