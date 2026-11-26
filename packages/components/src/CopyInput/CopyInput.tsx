import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { FocusRing } from '../FocusRing';
import { Flex } from '../Flex';
import { useFormContext } from '../Form';
import {
  ButtonColors,
  ButtonLooks,
  ButtonSizes,
  LegacyButton,
  type ButtonColor,
  type ButtonLook,
} from '../LegacyButton';
import styles from './CopyInput.module.css';

export const CopyInputModes = {
  DEFAULT: 'default',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type CopyInputMode = (typeof CopyInputModes)[keyof typeof CopyInputModes];

// The client's English strings.
const COPY_LABEL = 'Copy';
const COPIED_ANNOUNCEMENT = 'Copied';

const MODE_SUFFIX: Record<CopyInputMode, 'Default' | 'Success' | 'Error'> = {
  default: 'Default',
  success: 'Success',
  error: 'Error',
};

export interface CopyInputHandle {
  select: () => void;
}

export interface CopyInputProps {
  value: string;
  onCopy: (value: string) => void;
  mode?: CopyInputMode;
  text?: ReactNode;
  hideMessage?: ReactNode;
  className?: string;
  inputClassName?: string;
  buttonColor?: ButtonColor;
  buttonLook?: ButtonLook;
  supportsCopy?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
  placeholder?: string;
  ref?: Ref<CopyInputHandle>;
}

export const CopyInput = ({
  value,
  onCopy,
  mode = CopyInputModes.DEFAULT,
  text = COPY_LABEL,
  hideMessage,
  className,
  inputClassName,
  buttonColor = ButtonColors.PRIMARY,
  buttonLook = ButtonLooks.FILLED,
  supportsCopy = true,
  disabled,
  autoFocus,
  spellCheck,
  placeholder,
  ref,
}: CopyInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { titleId } = useFormContext();
  const previousMode = useRef(mode);

  useImperativeHandle(ref, () => ({ select: () => inputRef.current?.select() }), []);

  useEffect(() => {
    if (previousMode.current !== mode && mode === CopyInputModes.SUCCESS) {
      AccessibilityAnnouncer.announce(COPIED_ANNOUNCEMENT);
    }
    previousMode.current = mode;
  }, [mode]);

  const hidden = hideMessage != null;
  const suffix = MODE_SUFFIX[mode];
  let color: ButtonColor;
  switch (mode) {
    case CopyInputModes.SUCCESS:
      color = ButtonColors.GREEN;
      break;
    case CopyInputModes.ERROR:
      color = ButtonColors.RED;
      break;
    default:
      color = buttonColor;
  }

  return (
    <FocusRing focusTarget={inputRef} ringTarget={containerRef}>
      <div className={clsx(styles[`copyInput${suffix}`], className)} ref={containerRef} data-disabled={disabled}>
        <Flex className={styles.layout}>
          <Flex className={styles.inputWrapper}>
            <input
              className={clsx(styles[`input${suffix}`], inputClassName, { [styles.inputHidden]: hidden })}
              ref={inputRef}
              type="text"
              value={value}
              onClick={() => inputRef.current?.select()}
              readOnly
              aria-labelledby={titleId}
              autoFocus={autoFocus}
              spellCheck={spellCheck}
              placeholder={placeholder}
            />
            {hidden ? <div className={styles.hiddenMessage}>{hideMessage}</div> : null}
          </Flex>
          {supportsCopy ? (
            <Flex shrink={1} grow={0} style={{ margin: 0 }}>
              <LegacyButton
                data-migration-pending
                className={styles.button}
                onClick={() => onCopy(value)}
                size={ButtonSizes.MIN}
                color={color}
                look={buttonLook}
                disabled={disabled}
              >
                {text}
              </LegacyButton>
            </Flex>
          ) : null}
        </Flex>
      </div>
    </FocusRing>
  );
};

CopyInput.displayName = 'CopyInput';

CopyInput.Modes = CopyInputModes;
CopyInput.ButtonColors = ButtonColors;
CopyInput.ButtonLooks = ButtonLooks;
