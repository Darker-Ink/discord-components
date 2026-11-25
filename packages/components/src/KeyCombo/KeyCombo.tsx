import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useManaContext } from '../ManaContext';
import styles from './KeyCombo.module.css';

type ArrowDirection = 'up' | 'down' | 'left' | 'right';

const BindArrow = ({ direction = 'up' }: { direction?: ArrowDirection }) => (
  <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" className={clsx(styles.bindArrow, styles[direction])}>
    <g fill="#FFFFFF">
      <polygon
        transform="translate(5.025000, 5.000000) scale(1, -1) translate(-5.025000, -5.000000) "
        points="4.16666667 10 4.16666672 3.33333333 1.25 6.25 0.05 5 5.00000005 0 9.99999967 5 8.75 6.25 5.83333338 3.33333333 5.83333333 10"
      />
    </g>
  </svg>
);

BindArrow.displayName = 'BindArrow';

// Discord's desktop app on macOS reports its platform; in a browser, the user agent tells.
const isMac = () => {
  const native = (window as { DiscordNative?: { process: { platform: string } } }).DiscordNative;
  return native?.process.platform === 'darwin' || navigator.userAgent?.match(/Macintosh/i) != null;
};

interface KeyProps {
  children?: ReactNode;
  text?: ReactNode;
  macText?: ReactNode;
  label?: string;
  macLabel?: string;
}

const Key = ({ children, text, macText, label, macLabel }: KeyProps) => {
  const mac = isMac();
  const className = mac && macText != null ? styles.systemFont : undefined;
  const ariaLabel = mac && macLabel != null ? macLabel : label;
  const content = mac && macText != null ? macText : (children ?? text);
  return (
    <span className={className} role={ariaLabel != null ? 'img' : undefined} aria-label={ariaLabel ?? undefined}>
      {content}
    </span>
  );
};

Key.displayName = 'Key';

export interface KeyComboProps {
  // Keys joined with '+' (e.g. 'mod+shift+k') or as a list. Named keys render as symbols.
  shortcut: string | string[];
  dim?: boolean;
  className?: string;
  keyClassName?: string;
}

export const KeyCombo = ({ shortcut, dim = false, className, keyClassName }: KeyComboProps) => {
  const { i18n } = useManaContext();
  const keys: Record<string, () => ReactNode> = {
    ctrl: () => <Key macText={'⌃'} text="ctrl" label={i18n.KEY_CTRL_A11Y_LABEL} />,
    cmd: () => <Key macText={'⌘'} text="cmd" label={i18n.KEY_CMD_A11Y_LABEL} />,
    mod: () => <Key macText={'⌘'} text="ctrl" label={i18n.KEY_CTRL_A11Y_LABEL} macLabel={i18n.KEY_CMD_A11Y_LABEL} />,
    alt: () => <Key macText={'⌥'} text="alt" label={i18n.KEY_ALT_A11Y_LABEL} macLabel={i18n.KEY_OPTION_A11Y_LABEL} />,
    shift: () => <Key macText={'⇧'} text={i18n.KEY_SHIFT} label={i18n.KEY_SHIFT_A11Y_LABEL} />,
    up: () => (
      <Key label={i18n.KEY_UP_A11Y_LABEL} macText={'▲'}>
        <BindArrow direction="up" />
      </Key>
    ),
    down: () => (
      <Key label={i18n.KEY_DOWN_A11Y_LABEL} macText={'▼'}>
        <BindArrow direction="down" />
      </Key>
    ),
    left: () => (
      <Key label={i18n.KEY_LEFT_A11Y_LABEL} macText={'◀'}>
        <BindArrow direction="left" />
      </Key>
    ),
    right: () => (
      <Key label={i18n.KEY_RIGHT_A11Y_LABEL} macText={'▶'}>
        <BindArrow direction="right" />
      </Key>
    ),
    pageup: () => i18n.KEY_PAGEUP,
    pagedown: () => i18n.KEY_PAGEDOWN,
    'any-character': () => i18n.KEY_ANY,
    plus: () => '+',
    return: () => (
      <Key
        macText={'⏎'}
        text={i18n.KEY_ENTER}
        label={i18n.KEY_ENTER_A11Y_LABEL}
        macLabel={i18n.KEY_RETURN_A11Y_LABEL}
      />
    ),
    enter: () => (
      <Key
        macText={'⏎'}
        text={i18n.KEY_ENTER}
        label={i18n.KEY_ENTER_A11Y_LABEL}
        macLabel={i18n.KEY_RETURN_A11Y_LABEL}
      />
    ),
    escape: () => <Key text={i18n.KEY_ESCAPE} label={i18n.KEY_ESCAPE_A11Y_LABEL} />,
    esc: () => <Key text={i18n.KEY_ESCAPE} label={i18n.KEY_ESCAPE_A11Y_LABEL} />,
    backspace: () => (
      <Key
        macText={'⌫'}
        text={i18n.KEY_BACKSPACE}
        label={i18n.KEY_BACKSPACE_A11Y_LABEL}
        macLabel={i18n.KEY_DELETE_A11Y_LABEL}
      />
    ),
  };
  const parts = Array.isArray(shortcut) ? shortcut : shortcut.split('+');
  return (
    <div className={clsx(styles.combo, className, { [styles.dim]: dim })}>
      {parts
        .map((key) => (keys[key] != null ? keys[key]() : key))
        .map((key, index) => (
          // Keys can repeat, so their position is their identity.
          <span key={index} className={clsx(styles.key, keyClassName)}>
            {key}
          </span>
        ))}
    </div>
  );
};

KeyCombo.displayName = 'KeyCombo';
