import { useContext, type CSSProperties } from 'react';
import clsx from 'clsx';
import { getPopoverCaretPosition, PopoverContext } from './BasePopover';
import styles from './Popover.module.css';
import caretStyles from './PopoverCaret.module.css';

const PopoverCaretIcon = () => (
  <svg
    width="22"
    height="14"
    viewBox="0 0 22 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.caretIcon}
  >
    <path
      className={styles.caretFill}
      d="M14.0535 9.39127C12.4557 11.2796 9.54425 11.2796 7.94646 9.39127L1 1Q0 0 1 0L21 0Q22 0 21 1L14.0535 9.39127Z"
    />
    <path
      className={styles.caretGradient}
      d="M14.0535 9.39127C12.4557 11.2796 9.54425 11.2796 7.94646 9.39127L1 1Q0 0 1 0L21 0Q22 0 21 1L14.0535 9.39127Z"
    />
    <mask id="mask0_caret" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="11">
      <path
        d="M14.0535 9.39126C12.4557 11.2796 9.54425 11.2796 7.94646 9.39126L1 1Q0 0 1 0L21 0Q22 0 21 1L14.0535 9.39126Z"
        className={styles.caretFill}
      />
    </mask>
    <g mask="url(#mask0_caret)">
      <path
        className={styles.caretStroke}
        d="M13.6572 9.13184C12.2604 10.761 9.73957 10.761 8.34277 9.13184L1.0869141 0.5Q0.0869141 -0.5 1.0869141 -0.5L20.9131 -0.5Q21.9131 -0.5 20.9131 0.5L13.6572 9.13184Z"
      />
    </g>
  </svg>
);

PopoverCaretIcon.displayName = 'PopoverCaretIcon';

const clampCaretOffset = (offset: number, width = 240) => {
  const limit = width / 2 - 12;
  return Math.max(-limit, Math.min(limit, offset));
};

// The arrow pointing from a popover at its target. Reads its side and alignment from BasePopover.
export const PopoverCaret = ({ className }: { className?: string }) => {
  const context = useContext(PopoverContext);
  if (context == null) throw Error('PopoverCaret must be used within a BasePopover');
  const { position, caretConfig } = context;
  const caretPosition = getPopoverCaretPosition(position);
  const { align, customOffset } = caretConfig;
  const style =
    align === 'custom' && customOffset !== undefined
      ? ({
          '--custom-caret-offset-x': ['top', 'bottom'].includes(caretPosition)
            ? `${clampCaretOffset(customOffset)}px`
            : '0px',
          '--custom-caret-offset-y': ['left', 'right'].includes(caretPosition)
            ? `${clampCaretOffset(customOffset)}px`
            : '0px',
        } as CSSProperties)
      : undefined;
  return (
    <div
      className={clsx(
        caretStyles.caret,
        caretStyles[`caret--${caretPosition}`],
        caretStyles[`caret--${align}`],
        className,
      )}
      style={style}
    >
      <PopoverCaretIcon />
    </div>
  );
};

PopoverCaret.displayName = 'PopoverCaret';
