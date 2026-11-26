import {
  Suspense,
  createContext,
  lazy,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import type { ColorResult, HSLColor as ReactColorHSL } from 'react-color';
import { EyeDropperIcon } from '@discord-mana/icons';
import { Clickable } from '../Clickable';
import { DialogAnnouncerTarget, useFocusLock } from '../Dialog';
import { FocusRingScope } from '../FocusRing';
import { HeadingLevel } from '../HeadingLevel';
import { TextInput } from '../TextInput';
import { hex2int, int2hex, int2hsl, isValidHex, type HSLColor } from './colorUtils';
import styles from './ColorPicker.module.css';

const SaturationHue = lazy(() => import('./ColorPickerSaturationHue'));

// The client's English strings.
const PICK_A_COLOR_LABEL = 'Pick a Color';
const EYE_DROPPER_LABEL = 'Pick a color from the page';
const suggestedColorLabel = (hex: string) => `Color ${hex}`;

export interface PopoutDialogContextValue {
  inDialog: boolean | undefined;
  setFocusLockDisabled?: (disabled: boolean) => void;
}

export const PopoutDialogContext = createContext<PopoutDialogContextValue>({ inDialog: undefined });

PopoutDialogContext.displayName = 'PopoutDialogContext';

type ReturnTarget = HTMLElement | { element: HTMLElement; focus: () => void } | null;

export interface PopoutDialogProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  returnRef?: RefObject<ReturnTarget>;
  children?: ReactNode;
}

// Discord's dialog for popouts: a focus-locked `role="dialog"` that children can hand the lock to
// a nested container (setFocusLockDisabled). Discord also tracks an impression for it.
export const PopoutDialog = ({ ref, children, returnRef, ...props }: PopoutDialogProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [lockDisabled, setLockDisabled] = useState(false);
  useFocusLock(lockDisabled ? placeholderRef : containerRef, { returnRef });
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref != null) ref.current = element;
    },
    [ref],
  );
  const setFocusLockDisabled = useCallback(
    (disabled: boolean) => {
      if (lockDisabled !== disabled) setLockDisabled(disabled);
    },
    [lockDisabled],
  );
  const context = useMemo(() => ({ inDialog: true, setFocusLockDisabled }), [setFocusLockDisabled]);
  return (
    <PopoutDialogContext.Provider value={context}>
      <div {...props} ref={setRef} role="dialog" tabIndex={-1} aria-modal>
        <DialogAnnouncerTarget />
        <HeadingLevel forceLevel={1}>
          <FocusRingScope containerRef={containerRef}>{children}</FocusRingScope>
        </HeadingLevel>
      </div>
    </PopoutDialogContext.Provider>
  );
};

PopoutDialog.displayName = 'PopoutDialog';

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open: () => Promise<EyeDropperResult>;
}

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance;
  }
}

// The browser's EyeDropper, where supported.
const useEyeDropper = () => {
  const [eyeDropper, setEyeDropper] = useState<EyeDropperInstance | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the API only exists in the browser.
    if (window?.EyeDropper != null) setEyeDropper(new window.EyeDropper());
  }, []);
  return eyeDropper;
};

interface PickerState {
  current: number;
  pending: { hex: string; hsl: HSLColor | ReactColorHSL };
  input: string;
}

const toColor = (value: number | string | null | undefined) => {
  if (value == null) return null;
  if (typeof value === 'string') return isValidHex(value) ? hex2int(value) : null;
  return value;
};

export interface CustomColorPickerProps {
  value: number | string | null | undefined;
  // Report every change while dragging instead of only when a drag ends.
  eagerUpdate?: boolean;
  onChange: (color: number) => void;
  // Called when the picker unmounts.
  onClose?: () => void;
  suggestedColors?: readonly string[];
  middle?: ReactNode;
  footer?: ReactNode;
  showEyeDropper?: boolean;
  wrapperComponentType?: ElementType<{ 'aria-label'?: string; className?: string; children?: ReactNode }>;
  className?: string;
}

const CustomColorPickerInner = ({
  value,
  eagerUpdate = false,
  onChange,
  onClose,
  suggestedColors,
  middle,
  footer,
  showEyeDropper,
  wrapperComponentType,
  className,
}: CustomColorPickerProps) => {
  const eyeDropper = useEyeDropper();
  const color = toColor(value);
  const initial = color ?? 0;
  const [state, setState] = useState<PickerState>(() => ({
    current: initial,
    pending: { hex: int2hex(initial), hsl: int2hsl(initial) },
    input: int2hex(initial),
  }));

  const commitInput = (text: string) => {
    const hex = text[0] === '#' ? text : `#${text}`;
    if (!isValidHex(hex)) {
      setState((previous) => ({ ...previous, input: hex }));
      return;
    }
    const next = hex2int(hex);
    setState({ current: next, pending: { hex, hsl: int2hsl(next) }, input: hex });
    onChange(next);
  };

  // A new value from outside resets the picker to it.
  useEffect(() => {
    if (color == null || color === state.current) return;
    const hex = int2hex(color);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors Discord's sync from props.
    setState({ current: color, pending: { hex, hsl: int2hsl(color) }, input: hex });
  }, [color, state]);

  useEffect(() => onClose, [onClose]);

  const handlePickerChange = useCallback(
    (result: ColorResult) => {
      setState((previous) => ({ ...previous, pending: result, input: result.hex }));
      if (eagerUpdate) onChange(hex2int(result.hex));
    },
    [eagerUpdate, onChange],
  );

  const contents = (
    <>
      <Suspense fallback={null}>
        <SaturationHue
          onChange={handlePickerChange}
          onChangeComplete={({ hex }) => onChange(hex2int(hex))}
          color={state.pending.hsl}
        />
      </Suspense>
      {middle}
      <TextInput
        value={state.input.slice(1)}
        onChange={commitInput}
        maxLength={6}
        leading="#"
        trailing={
          showEyeDropper && eyeDropper != null
            ? {
                icon: EyeDropperIcon,
                onClick: async () => {
                  try {
                    const { sRGBHex } = await eyeDropper.open();
                    commitInput(sRGBHex);
                  } catch {
                    // The user dismissed the eye dropper.
                  }
                },
                'aria-label': EYE_DROPPER_LABEL,
              }
            : undefined
        }
      />
      {suggestedColors != null && suggestedColors.length > 0 && (
        <div className={styles.suggestedColors}>
          {suggestedColors.map((suggested, index) => (
            <Clickable
              key={`${suggested}-${index}`}
              aria-label={suggestedColorLabel(suggested)}
              style={{ backgroundColor: suggested }}
              className={styles.suggestedColor}
              onClick={() => commitInput(suggested)}
            />
          ))}
        </div>
      )}
      {footer}
    </>
  );
  const Wrapper = wrapperComponentType ?? PopoutDialog;
  return (
    <Wrapper aria-label={PICK_A_COLOR_LABEL} className={clsx(styles.customColorPicker, className)}>
      {contents}
    </Wrapper>
  );
};

CustomColorPickerInner.displayName = 'CustomColorPicker';

// The popout for a ColorPicker's custom swatch: a saturation and hue picker, a hex field, an optional
// eye dropper and suggested colors.
export const CustomColorPicker = memo(CustomColorPickerInner);

CustomColorPicker.displayName = 'CustomColorPicker';
